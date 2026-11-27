export function initConsent() {
  const region = document.getElementById('consent-region');
  const accept = document.getElementById('consent-accept');
  const reject = document.getElementById('consent-reject');

  if (!region || !accept || !reject) return;

  // 2026-11-20 修：此前要等 pointerdown/keydown 才 reveal 横幅，
  // 结果"打开看一眼就走"的访客永远没有表态机会，pv_real 结构性偏低。首屏直接问。
  // P1-7：未表态才自动展示；已有决定则收起，但**按钮与页脚入口照旧绑定**，
  // 否则"同意过的人"永远没有撤回路径（原实现在这里直接 return）。
  region.hidden = window.VR.debug().consentMode !== 'unset';

  accept.addEventListener('click', function () {
    window.VR.setConsent(true);
    region.hidden = true;
  });

  reject.addEventListener('click', function () {
    window.VR.setConsent(false);
    region.hidden = true;
  });

  // P1-7：页脚 Cookie settings = 撤回入口。撤回后立刻重开区域，可以马上改主意。
  const settings = document.getElementById('gdpr-consent-settings');
  if (settings) {
    settings.addEventListener('click', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      window.VR.setConsent(false);
      region.hidden = false;
    });
  }
}
