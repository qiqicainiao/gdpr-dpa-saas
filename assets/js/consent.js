export function initConsent() {
  const region = document.getElementById('consent-region');
  const accept = document.getElementById('consent-accept');
  const reject = document.getElementById('consent-reject');
  const telemetry = window.__TELEMETRY__;

  if (!region || !accept || !reject) return;

  if (!telemetry || telemetry.getConsent() !== 'unknown') {
    region.hidden = true;
    return;
  }

  // 2026-11-20 修：此前要等 pointerdown/keydown 才 reveal 横幅，
  // 结果"打开看一眼就走"的访客永远没有表态机会，pv_real 结构性偏低。首屏直接问。
  region.hidden = false;

  accept.addEventListener('click', function () {
    telemetry.setConsent(true);
    region.hidden = true;
  });

  reject.addEventListener('click', function () {
    telemetry.setConsent(false);
    region.hidden = true;
  });
}
