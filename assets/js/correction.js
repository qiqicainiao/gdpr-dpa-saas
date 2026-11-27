const REASONS = [
  ['unspecified', 'Not specified'],
  ['party_role', 'Party roles'],
  ['processing_scope', 'Processing scope'],
  ['transfer', 'International transfers'],
  ['subprocessor', 'Sub-processors'],
  ['security', 'Security measures'],
  ['retention', 'Retention and deletion'],
  ['breach_notice', 'Breach notice'],
  ['missing_clause', 'Missing clause'],
  ['other', 'Other']
];

const MISSING = REASONS.filter((item) => item[0] !== 'unspecified');

let getContext = null;
let attempts = new Map();
let activePanel = null;

export function initCorrection(options) {
  getContext = options.getContext;

  const flagButton = document.getElementById('report-missing');
  if (flagButton) {
    flagButton.addEventListener('click', toggleFalseNegative);
  }
}

export function mountCorrections(result) {
  attempts = new Map();
  closeActivePanel();

  const list = document.getElementById('clause-list');
  if (!list || !result) return;

  const items = Array.isArray(result.items) ? result.items : [];
  items.forEach((item) => {
    const card = list.querySelector('[data-clause-key="' + cssEscape(item.clause_key) + '"]');
    if (!card) return;
    card.appendChild(buildClauseActions(item));
  });
}

function buildClauseActions(item) {
  const wrap = document.createElement('div');
  wrap.className = 'clause-actions';

  const correct = document.createElement('button');
  correct.type = 'button';
  correct.className = 'btn btn-quiet';
  correct.textContent = 'Suggest a correction';

  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'btn btn-quiet';
  accept.textContent = 'Accept as written';
  accept.addEventListener('click', () => confirmClause(item, accept));

  const panelHost = document.createElement('div');
  panelHost.className = 'correction-panel';
  panelHost.hidden = true;

  correct.addEventListener('click', () => {
    if (activePanel && activePanel !== panelHost) closeActivePanel();
    if (panelHost.hidden) {
      buildCorrectionPanel(panelHost, item);
      panelHost.hidden = false;
      activePanel = panelHost;
    } else {
      panelHost.hidden = true;
      activePanel = null;
    }
  });

  wrap.appendChild(correct);
  wrap.appendChild(accept);
  wrap.appendChild(panelHost);
  return wrap;
}

function buildCorrectionPanel(host, item) {
  if (host.dataset.ready === 'true') return;
  host.dataset.ready = 'true';

  const label = document.createElement('label');
  label.className = 'field-label';
  label.setAttribute('for', 'reason-' + item.clause_key);
  label.textContent = 'What needs changing in this clause?';

  const select = document.createElement('select');
  select.id = 'reason-' + item.clause_key;
  select.className = 'native-select';
  REASONS.forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  });

  const hint = document.createElement('p');
  hint.className = 'small muted';
  hint.textContent = 'Your correction is recorded to improve clause generation. It does not rewrite this draft.';

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'btn btn-secondary';
  submit.textContent = 'Submit correction';
  submit.addEventListener('click', () => {
    submitCorrection(item, select.value, submit);
  });

  host.appendChild(label);
  host.appendChild(select);
  host.appendChild(hint);
  host.appendChild(submit);
}

function trainingEventId() {
  const bytes = new Uint8Array(8);
  try {
    window.crypto.getRandomValues(bytes);
  } catch (error) {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function reportTrainingEvent(event, fields) {
  const debug = window.VR.debug();
  if (debug.isolated || debug.consentMode !== 'granted') return;

  const userAgent = String(window.navigator.userAgent || '').toLowerCase();
  let deviceType = 'unknown';
  if (userAgent) {
    deviceType = /ipad|tablet/.test(userAgent) || (/android/.test(userAgent) && !/mobile/.test(userAgent))
      ? 'tablet'
      : (/mobile|iphone|ipod|android|phone/.test(userAgent) ? 'mobile' : 'desktop');
  }
  let referrerHost = 'direct';
  if (document.referrer) {
    try {
      referrerHost = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '') || 'direct';
    } catch (error) {}
  }

  fetch(debug.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      site_id: debug.siteId,
      consent: true,
      sess_ref: debug.sessRef,
      page_path: debug.path || window.location.pathname,
      device_type: deviceType,
      referrer_host: referrerHost,
      schema_v: 1,
      sdk_v: debug.version,
      events: [Object.assign({
        event: event,
        event_id: trainingEventId(),
        ts: Date.now()
      }, fields)]
    }),
    keepalive: true
  }).catch(function () {});
}

function submitCorrection(item, reason, button) {
  const context = getContext ? getContext() : null;
  if (!context) return;

  const attempt = (attempts.get(item.clause_key) || 0) + 1;
  attempts.set(item.clause_key, attempt);

  const degraded = !item.rule_id || !item.rule_version;
  const fields = Object.assign({
    rule_id: item.rule_id || null,
    rule_version: typeof item.rule_version === 'number' ? item.rule_version : item.rule_version || null,
    confidence: typeof item.confidence === 'number' ? item.confidence : Number(item.confidence) || 0,
    matched_terms: Array.isArray(item.matched_terms) ? item.matched_terms : [],
    diff_detail: item.diff_detail || '',
    sample_source: item.sample_source || 'system',
    attempt_count: attempt,
    clause_key: item.clause_key,
    finding_id: String(item.clause_key) + '-' + String(item.position || 0),
    audit_dim: String(item.clause_key).slice(0, 32),
    system_variant: String(item.clause_variant || item.clause_key).slice(0, 48),
    corrected_variant: String(reason).slice(0, 48),
    reason_tag: reason || 'unspecified',
    transfer_region: context.transferRegion,
    degraded: degraded
  }, context.preset);

  reportTrainingEvent('correction_submitted', fields);

  if (button) {
    button.disabled = true;
    button.textContent = 'Correction recorded';
  }
}

function confirmClause(item, button) {
  const context = getContext ? getContext() : null;
  if (!context) return;

  const degraded = !item.rule_id || !item.rule_version;
  const fields = Object.assign({
    rule_id: item.rule_id || null,
    rule_version: typeof item.rule_version === 'number' ? item.rule_version : item.rule_version || null,
    confidence: typeof item.confidence === 'number' ? item.confidence : Number(item.confidence) || 0,
    matched_terms: Array.isArray(item.matched_terms) ? item.matched_terms : [],
    sample_source: item.sample_source || 'system',
    clause_key: item.clause_key,
    clause_variant: String(item.clause_variant || '').slice(0, 48),
    transfer_region: context.transferRegion,
    degraded: degraded
  }, context.preset);

  reportTrainingEvent('correction_confirmed', fields);

  if (button) {
    button.disabled = true;
    button.textContent = 'Clause accepted';
  }
}

function toggleFalseNegative() {
  const host = document.getElementById('false-negative-panel');
  if (!host) return;
  if (host.hidden) {
    buildFalseNegativePanel(host);
    host.hidden = false;
  } else {
    host.hidden = true;
  }
}

function buildFalseNegativePanel(host) {
  if (host.dataset.ready === 'true') return;
  host.dataset.ready = 'true';

  const missingLabel = document.createElement('label');
  missingLabel.className = 'field-label';
  missingLabel.setAttribute('for', 'fn-category');
  missingLabel.textContent = 'Which requirement is missing?';

  const missingSelect = document.createElement('select');
  missingSelect.id = 'fn-category';
  missingSelect.className = 'native-select';
  MISSING.forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    missingSelect.appendChild(option);
  });

  const reasonLabel = document.createElement('label');
  reasonLabel.className = 'field-label';
  reasonLabel.setAttribute('for', 'fn-reason');
  reasonLabel.textContent = 'Why does it matter?';

  const reasonSelect = document.createElement('select');
  reasonSelect.id = 'fn-reason';
  reasonSelect.className = 'native-select';
  REASONS.forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    reasonSelect.appendChild(option);
  });

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'btn btn-secondary';
  submit.textContent = 'Report missing requirement';
  submit.addEventListener('click', () => {
    const context = getContext ? getContext() : null;
    if (!context) return;

    const fields = Object.assign({
      rule_id: null,
      rule_version: null,
      confidence: null,
      matched_terms: null,
      diff_detail: null,
      sample_source: 'user',
      missing_category: missingSelect.value,
      system_variant: null,
      expected_variant: missingSelect.value,
      reason_tag: reasonSelect.value,
      transfer_region: context.transferRegion,
      degraded: false
    }, context.preset);

    reportTrainingEvent('false_negative_flagged', fields);

    submit.disabled = true;
    submit.textContent = 'Report recorded';
  });

  host.appendChild(missingLabel);
  host.appendChild(missingSelect);
  host.appendChild(reasonLabel);
  host.appendChild(reasonSelect);
  host.appendChild(submit);
}

function closeActivePanel() {
  if (activePanel) {
    activePanel.hidden = true;
    activePanel = null;
  }
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
  return String(value).replace(/"/g, '\\"');
}
