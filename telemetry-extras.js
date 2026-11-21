/**
 * telemetry-extras.js — 补充采集（P0 三项），给**自研 SDK** 的站点用。
 *
 * 为什么要单独一份：9 站里有 5 站（gdpr / chatgpt-seo-audit / li-resume-check /
 * takehome-pay / youtube-tag）用的是各自实现的 SDK，不是 public/js/telemetry-sdk.js。
 * 如果按站各写一遍 page_vitals / js_error / utm，就是五份重复实现、五个独立的 bug。
 * 这里只做"采集"，发送与同意门控**完全交给宿主 SDK**——不自己建队列、不自己发请求，
 * 避免出现第二套上报路径（那会让"拒绝后零上报"这句话失效）。
 *
 * 用法（任选其一）：
 *   A. 先注册再加载：
 *        window.__VR_TRACK__ = function (name, payload) { ...站内 SDK 的 track... };
 *        <script src=".../telemetry-extras.js" defer></script>
 *   B. 脚本先到、SDK 后到：SDK 就绪后派发
 *        window.dispatchEvent(new CustomEvent('vr-track-ready'));
 *   C. 显式启动：
 *        window.VRTelemetryExtras.boot({ track: fn, isGranted: fn, siteId: 'x' });
 *
 * 不传 track 时按顺序自动发现：window.__VR_TRACK__ → window.Telemetry.track
 *   → window.__TELEMETRY__.track → window.TPTelemetry.track
 *
 * 门控：**fail-closed**。只有 isGranted() 明确返回 true 才发。未传 isGranted 时
 *   读 window.__VR_CONSENT__（各站自己写），读不到就当未同意、不发。
 *   与主 SDK 的差别：主 SDK 在 unset 时会内存排队等同意后补发；本脚本没有队列，
 *   未同意期间直接丢弃——这比"偷偷发"正确，也是自研站现阶段唯一安全的做法。
 */
(function (global) {
  'use strict';

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var ERR_MAX = 20;      // 单文档错误上限（错误风暴保护）
  var ERR_PER_KEY = 3;   // 同一位置最多 3 条

  var booted = false;
  var trackFn = null;
  var grantedFn = null;
  var errCount = 0;
  var errKeys = {};
  var vitalsSent = {};
  var vitals = { path: null, fcp: null, lcp: null, cls: 0, inp: null, ttfb: null, nav: null };
  var utmSent = false;
  var utmSnapshot = null; // 落地页 URL 快照：SPA 切页后 location.search 可能被改写

  // 脚本一执行就快照：等到 boot（可能是 load 之后）再读，SPA 往往已经把 query 清了。
  try { utmSnapshot = String((global.location && global.location.search) || ''); } catch (e) { utmSnapshot = ''; }

  function nowPath() {
    try {
      var p = String(global.location.pathname || '/').split('?')[0].split('#')[0].toLowerCase();
      if (p.charAt(0) !== '/') { p = '/' + p; }
      if (p.length > 1) { p = p.replace(/\/+$/, '') || '/'; }
      return p.substring(0, 512);
    } catch (e) { return '/'; }
  }

  /** 明确"已同意"才发。读不到状态 = 未同意（fail-closed）。 */
  function isGranted() {
    try {
      if (typeof grantedFn === 'function') { return grantedFn() === true; }
      if (typeof global.__VR_CONSENT__ === 'boolean') { return global.__VR_CONSENT__ === true; }
    } catch (e) { /* noop */ }
    return false;
  }

  function emit(name, payload) {
    if (!trackFn || !isGranted()) { return; }
    try { trackFn(name, payload); } catch (e) { /* 宿主 track 异常不影响页面 */ }
  }

  // ---------------- UTM（每会话一次） ----------------

  function readUtm() {
    var out = {};
    var q = '';
    try { q = String(utmSnapshot !== null ? utmSnapshot : ((global.location && global.location.search) || '')); } catch (e) { return out; }
    if (!q) { return out; }
    if (q.charAt(0) === '?') { q = q.substring(1); }
    var parts = q.split('&');
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if (eq <= 0) { continue; }
      var k = '';
      var v = '';
      try {
        k = decodeURIComponent(parts[i].substring(0, eq)).toLowerCase();
        v = decodeURIComponent(parts[i].substring(eq + 1).replace(/\+/g, ' '));
      } catch (e) { continue; }
      if (UTM_KEYS.indexOf(k) === -1) { continue; }
      // 含 @ 整条丢弃：utm_source=邮箱 是最常见的 PII 泄漏路径，过滤后仍可识别。
      if (v.indexOf('@') !== -1) { continue; }
      v = v.replace(/[^A-Za-z0-9._~\-]/g, '-').replace(/-{2,}/g, '-').substring(0, 40);
      if (v) { out[k] = v; }
    }
    return out;
  }

  function captureUtm() {
    if (utmSent) { return; }
    // 未同意时**不置位**：置位就等于"本次会话的渠道记录权已用掉"，
    // 用户随后点同意也补不回来（线上实测：5 个自研站 utm 全丢，就是这么丢的）。
    if (!isGranted()) { return; }
    utmSent = true;
    var utm = readUtm();
    if (!utm.utm_source) { return; } // 没有来源键的零散参数不构成归因
    utm.page_path = nowPath();
    emit('utm_capture', utm);
  }

  /**
   * 同意的动作必然来自一次点击/按键，所以在捕获阶段挂一个"再试一次"，
   * 不依赖各站把 consent 变化回调告诉我们（5 站 5 种实现，接不全就会漏）。
   * captureUtm 内部有 utmSent + isGranted 双重短路，重复触发几乎零成本。
   */
  function armConsentWatcher() {
    var retry = function () { setTimeout(captureUtm, 400); };
    try {
      document.addEventListener('click', retry, true);
      document.addEventListener('keydown', retry, true);
    } catch (e) { /* noop */ }
  }

  // ---------------- Core Web Vitals ----------------

  function observe(type, cb) {
    try {
      if (!global.PerformanceObserver) { return; }
      var po = new global.PerformanceObserver(function (list) { cb(list.getEntries()); });
      po.observe({ type: type, buffered: true });
    } catch (e) { /* 老浏览器无该 entry 类型 */ }
  }

  function navType() {
    try {
      var navs = global.performance.getEntriesByType('navigation');
      if (navs && navs[0]) {
        vitals.ttfb = Math.round(navs[0].responseStart || 0) || null;
        return navs[0].type || 'navigate';
      }
      var t = global.performance.navigation;
      if (t) { return t.type === 1 ? 'reload' : (t.type === 2 ? 'back_forward' : 'navigate'); }
    } catch (e) { /* noop */ }
    return 'navigate';
  }

  function flushVitals(nextPath) {
    var path = vitals.path;
    if (!path || vitalsSent[path]) { return; }
    var hasAny = vitals.fcp !== null || vitals.lcp !== null || vitals.inp !== null
      || vitals.cls > 0 || vitals.ttfb !== null;
    if (!hasAny) { return; }
    vitalsSent[path] = true;
    var p = { page_path: path, nav_type: vitals.nav || 'navigate' };
    if (vitals.fcp !== null) { p.fcp_ms = vitals.fcp; }
    if (vitals.lcp !== null) { p.lcp_ms = vitals.lcp; }
    // CLS 累计位移分：0 是有效测量（这页很稳），不是"没值"，必须照发
    p.cls_x1000 = Math.round(vitals.cls * 1000) || 0; // 整数，避免浮点尾差
    if (vitals.inp !== null) { p.inp_ms = vitals.inp; }
    if (vitals.ttfb !== null) { p.ttfb_ms = vitals.ttfb; }
    emit('page_vitals', p);
    if (nextPath) {
      vitals.path = nextPath;
      vitals.fcp = null; vitals.lcp = null; vitals.cls = 0; vitals.inp = null;
    }
  }

  function setupVitals() {
    vitals.path = nowPath();
    vitals.nav = navType();
    observe('paint', function (es) {
      for (var i = 0; i < es.length; i++) {
        if (es[i].name === 'first-contentful-paint') { vitals.fcp = Math.round(es[i].startTime); }
      }
    });
    observe('largest-contentful-paint', function (es) {
      if (es.length) { vitals.lcp = Math.round(es[es.length - 1].startTime); }
    });
    observe('layout-shift', function (es) {
      for (var i = 0; i < es.length; i++) {
        if (!es[i].hadRecentInput) { vitals.cls += es[i].value; }
      }
    });
    observe('event', function (es) {
      for (var i = 0; i < es.length; i++) {
        if (es[i].interactionId && es[i].duration) {
          vitals.inp = Math.max(vitals.inp || 0, Math.round(es[i].duration));
        }
      }
    });
    observe('first-input', function (es) {
      if (es.length && !vitals.inp) { vitals.inp = Math.round(es[0].duration || 0) || null; }
    });

    try {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') { captureUtm(); flushVitals(null); }
      });
      global.addEventListener('pagehide', function () { captureUtm(); flushVitals(null); });
    } catch (e) { /* noop */ }
  }

  // SPA 路由切页：path 变了就先把上一页的 vitals 结掉，并把累积量归零
  function setupSpaRoute() {
    try {
      var wrap = function (name) {
        var orig = global.history && global.history[name];
        if (typeof orig !== 'function') { return; }
        global.history[name] = function () {
          var ret = orig.apply(this, arguments);
          try {
            // 只在 path 真的变了才结账；否则每次 pushState 都会把累积量清零
            var np = nowPath();
            if (vitals.path && np !== vitals.path) { flushVitals(np); }
          } catch (e) { /* noop */ }
          return ret;
        };
      };
      wrap('pushState');
      wrap('replaceState');
      global.addEventListener('popstate', function () {
        var np = nowPath();
        if (vitals.path && np !== vitals.path) { flushVitals(np); }
      });
    } catch (e) { /* noop */ }
  }

  // ---------------- 运行时脚本错误 ----------------

  function basename(src) {
    var s = String(src || '');
    if (!s) { return 'unknown'; }
    s = s.split('#')[0].split('?')[0];
    var i = s.lastIndexOf('/');
    if (i >= 0) { s = s.substring(i + 1); }
    s = s.replace(/[^A-Za-z0-9._\-]/g, '_').substring(0, 80);
    return s || 'unknown';
  }

  /**
   * 只报 类型/文件名/行列。**绝不报 message 与堆栈文本**：
   * 那里面会带出用户输入（解析失败的原文）、内部路径、第三方 SDK 调试信息。
   */
  function reportError(type, script, line, col) {
    if (errCount >= ERR_MAX) { return; }
    var key = type + '|' + script + '|' + line;
    errKeys[key] = (errKeys[key] || 0) + 1;
    if (errKeys[key] > ERR_PER_KEY) { return; }
    errCount++;
    emit('js_error', { error_type: type, script: script, line: line | 0, col: col | 0 });
  }

  function setupErrors() {
    try {
      global.addEventListener('error', function (ev) {
        var t = ev && ev.target;
        if (t && t !== global && t.tagName) {
          if (String(t.tagName).toLowerCase() !== 'script') { return; } // 只报脚本加载失败
          reportError('error', basename(t.src || ''), 0, 0);
          return;
        }
        reportError('error', basename(ev.filename || ''), ev.lineno, ev.colno);
      }, true);

      global.addEventListener('unhandledrejection', function (ev) {
        var script = 'unknown';
        try {
          var stack = (ev && ev.reason && ev.reason.stack) || '';
          var m = /(?:^|\s|\()((?:https?:\/\/|\/)[^\s):]+?\.js)(?::\d+)*/.exec(String(stack));
          if (m) { script = basename(m[1]); }
        } catch (e) { /* noop */ }
        reportError('unhandledrejection', script, 0, 0);
      });
    } catch (e) { /* noop */ }
  }

  // ---------------- 启动 ----------------

  function discoverTrack() {
    if (typeof global.__VR_TRACK__ === 'function') { return global.__VR_TRACK__; }
    if (global.Telemetry && typeof global.Telemetry.track === 'function') {
      return function (n, p) { global.Telemetry.track(n, p); };
    }
    if (global.__TELEMETRY__ && typeof global.__TELEMETRY__.track === 'function') {
      return function (n, p) { global.__TELEMETRY__.track(n, p); };
    }
    if (global.TPTelemetry && typeof global.TPTelemetry.track === 'function') {
      return function (n, p) { global.TPTelemetry.track(n, p); };
    }
    return null;
  }

  function boot(opts) {
    if (booted) { return true; }
    opts = opts || {};
    if (typeof opts.track === 'function') { trackFn = opts.track; }
    if (typeof opts.isGranted === 'function') { grantedFn = opts.isGranted; }
    if (!trackFn) { trackFn = discoverTrack(); }
    if (!trackFn) { return false; } // 宿主还没就绪，等 vr-track-ready
    booted = true;
    // 落地页 URL 快照要在最早期取：SPA 首屏常把 query 清掉，之后读就是空了
    if (utmSnapshot === null) {
      try { utmSnapshot = String((global.location && global.location.search) || ''); } catch (e) { utmSnapshot = ''; }
    }
    setupVitals();
    setupSpaRoute();
    setupErrors();
    captureUtm();
    armConsentWatcher();
    return true;
  }

  var api = { boot: boot, _diag: function () {
    return { booted: booted, trackReady: !!trackFn, utmSent: utmSent, errors: errCount };
  } };

  global.VRTelemetryExtras = api;

  function tryAutoBoot() {
    if (booted) { return; }
    boot({});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryAutoBoot);
  } else {
    tryAutoBoot();
  }
  // 宿主 SDK 可能晚于本脚本（async/defer/ESM），就绪后主动喊一声
  global.addEventListener('vr-track-ready', tryAutoBoot);
  // ESM 主包通常在 DOMContentLoaded 后才 init，再兜一次
  global.addEventListener('load', tryAutoBoot);
})(typeof window !== 'undefined' ? window : this);
