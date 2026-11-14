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

  let revealed = false;

  function reveal() {
    if (revealed) return;
    revealed = true;
    region.hidden = false;
    document.removeEventListener('pointerdown', reveal);
    document.removeEventListener('keydown', reveal);
  }

  document.addEventListener('pointerdown', reveal, { passive: true });
  document.addEventListener('keydown', reveal);

  accept.addEventListener('click', function () {
    telemetry.setConsent(true);
    region.hidden = true;
  });

  reject.addEventListener('click', function () {
    telemetry.setConsent(false);
    region.hidden = true;
  });
}
