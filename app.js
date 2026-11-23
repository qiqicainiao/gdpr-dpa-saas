import {
  initSelects,
  setStatus,
  setFieldError,
  clearFieldError,
  showToast
} from './assets/js/ui.js?v=0.3.2';
import { requestCheck, traceTail } from './assets/js/api.js?v=0.3.2';
import { createStore } from './assets/js/state.js?v=0.3.2';
import { buildRequest, buildPreset, applyPreset } from './assets/js/payload.js?v=0.3.2';
import { renderResult, buildDocumentText, copyToClipboard } from './assets/js/generator.js?v=0.3.2';
import {
  loadHistory,
  saveHistory,
  removeHistory,
  findHistory,
  createEntry
} from './assets/js/history.js?v=0.3.2';
import { renderHistoryPanel } from './assets/js/history-panel.js?v=0.3.2';
import { initConsent } from './assets/js/consent.js?v=0.3.4';
import { initCorrection, mountCorrections } from './assets/js/correction.js?v=0.3.2';

const config = window.__SITE_CONFIG__;
const MAX_SUBPROCESSORS = 10;
const DAY_MIN = 1;
const DAY_MAX = 365;

const form = document.getElementById('dpa-form');
const addSubprocessorButton = document.getElementById('add-subprocessor');
const subprocessorBlock = document.getElementById('subprocessor-items-block');
const subprocessorRows = document.getElementById('subprocessor-rows');
const subprocessorTemplate = document.getElementById('subprocessor-row-template');
const resultRegion = document.getElementById('result-region');
const historyPanel = document.getElementById('history-panel');
const customerRefSelect = document.getElementById('customer-ref');

const store = createStore();
const telemetry = window.__TELEMETRY__ || null;
let activeController = null;
let lastResult = null;
let countdownTimer = null;
let runSequence = 0;
let inputSource = 'new';
let toolStarted = false;
let toolStartedAt = 0;
let resultRenderedAt = 0;
let resultItemCount = 0;
let expandedClauses = new Set();

if (!config) {

  setStatus('server_error', 'Site configuration failed to load. Reload the page and try again.');
}

if (form) {
  initSelects(document);
  bindConditionals();
  bindRepeater();
  bindFieldClearing();
  form.addEventListener('submit', handleSubmit);
  form.addEventListener('reset', handleReset);
  syncConditionals();
  bindResultActions();
  bindCustomerRef();
  refreshHistory();
  initConsent();
  initCorrection({ telemetry: telemetry, getContext: currentContext });
  bindTelemetryGlobal();
}

function fieldWrapOf(control) {
  return control ? control.closest('.field') : null;
}

function controlsOf(name) {
  return Array.from(form.querySelectorAll(`[name="${name}"]`));
}

function bindFieldClearing() {
  form.addEventListener('input', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLElement)) return;
    const wrap = fieldWrapOf(control);
    if (wrap) clearFieldError(wrap);
  });

  form.addEventListener('change', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLElement)) return;
    if (control.type === 'checkbox' || control.type === 'radio') {
      const wrap = fieldWrapOf(control);
      if (wrap) clearFieldError(wrap);
    }
  });

  form.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches('.select-button')) {
      validateOneField(target.closest('.select')?.querySelector('select'));
      return;
    }
    if (target.matches('input, textarea, select')) {
      if (target.type === 'checkbox' || target.type === 'radio') return;
      validateOneField(target);
    }
  });
}

function bindConditionals() {
  controlsOf('subprocessor_authorization').forEach((radio) => {
    radio.addEventListener('change', syncConditionals);
  });
  controlsOf('special_category_data').forEach((radio) => {
    radio.addEventListener('change', syncConditionals);
  });
  controlsOf('transfer_mode').forEach((radio) => {
    radio.addEventListener('change', syncConditionals);
  });
}

function syncConditionals() {
  const authorization = form.querySelector('[name="subprocessor_authorization"]:checked')?.value || 'general';
  const hasSubprocessors = authorization !== 'none';
  if (subprocessorBlock) {
    subprocessorBlock.hidden = !hasSubprocessors;

    subprocessorBlock.querySelectorAll('input, select, textarea, button').forEach((control) => {
      control.disabled = !hasSubprocessors;
    });
    subprocessorBlock.querySelectorAll('.select-button').forEach((button) => {
      button.disabled = !hasSubprocessors;
    });
  }
  syncRepeaterState();

  const specialCategory = form.querySelector('[name="special_category_data"]:checked')?.value === 'true';
  const specialAlert = document.getElementById('special-category-alert');
  if (specialAlert) specialAlert.hidden = !specialCategory;

  const transferMode = form.querySelector('[name="transfer_mode"]:checked')?.value || 'eea_only';
  const eeaNote = document.getElementById('transfer-note-eea');
  const sccNote = document.getElementById('transfer-note-scc');
  if (eeaNote) eeaNote.hidden = transferMode !== 'eea_only';
  if (sccNote) sccNote.hidden = transferMode !== 'third_country_scc';
}

function bindRepeater() {
  if (!subprocessorRows || !subprocessorTemplate || !addSubprocessorButton) return;

  addSubprocessorButton.addEventListener('click', () => {
    if (subprocessorRows.querySelectorAll('.repeater-row').length >= MAX_SUBPROCESSORS) {
      showToast('You can list up to 10 sub-processors.', 'info');
      return;
    }
    addRow();
    syncRepeaterState();
  });

  subprocessorRows.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-action="remove-subprocessor"]');
    if (!remove) return;
    remove.closest('.repeater-row')?.remove();
    syncRepeaterState();
    initSelects(subprocessorRows);
  });

  addRow();
  syncRepeaterState();
}

function addRow() {
  const fragment = subprocessorTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.repeater-row');
  if (!row) return;
  const uid = `sp-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
  row.querySelectorAll('[id]').forEach((element) => {
    element.id = `${element.id}-${uid}`;
  });
  row.querySelectorAll('label[for]').forEach((label) => {
    label.htmlFor = `${label.htmlFor}-${uid}`;
  });
  row.querySelectorAll('[aria-describedby]').forEach((element) => {
    const ids = element.getAttribute('aria-describedby').split(/\s+/).filter(Boolean);
    element.setAttribute(
      'aria-describedby',
      ids.map((id) => `${id}-${uid}`).join(' ')
    );
  });
  subprocessorRows.appendChild(fragment);
  initSelects(row);
}

function syncRepeaterState() {
  if (!subprocessorRows || !addSubprocessorButton) return;
  const authorization =
    form.querySelector('[name="subprocessor_authorization"]:checked')?.value || 'general';
  const count = subprocessorRows.querySelectorAll('.repeater-row').length;
  addSubprocessorButton.disabled =
    authorization === 'none' || count >= MAX_SUBPROCESSORS;
}

const TEXT_RULES = {
  controller_legal_name: 'Enter your customer’s legal name.',
  controller_address: 'Enter your customer’s address.',
  controller_country: 'Select your customer’s country.',
  processor_legal_name: 'Enter your company’s legal name.',
  processor_address: 'Enter your company’s address.',
  processor_country: 'Select your company’s country.',
  service_summary: 'Describe the service in one or two sentences.'
};

const EMAIL_RULES = {
  controller_contact_email: 'Enter a valid email address or leave this field empty.',
  processor_contact_email: 'Enter a valid email address or leave this field empty.'
};

function validateOneField(control) {
  if (!control) return;
  const name = control.name;
  if (!name) return;

  const wrap = fieldWrapOf(control);
  if (wrap) clearFieldError(wrap);

  if (TEXT_RULES[name]) {
    requireText(name, TEXT_RULES[name]);
    return;
  }
  if (EMAIL_RULES[name]) {
    optionalEmail(name, EMAIL_RULES[name]);
    return;
  }

  const authorization =
    form.querySelector('[name="subprocessor_authorization"]:checked')?.value || 'general';

  if (name === 'notice_days') {
    if (authorization !== 'none' && !inRange(control.value)) {
      setFieldError(
        wrap,
        `Enter a notice period between ${DAY_MIN} and ${DAY_MAX} days.`
      );
    }
    return;
  }

  if (name === 'termination_completion_days') {
    if (!inRange(control.value)) {
      setFieldError(
        wrap,
        `Enter a deletion or return period between ${DAY_MIN} and ${DAY_MAX} days.`
      );
    }
    return;
  }

  if (name === 'subprocessor_name' && authorization !== 'none' && !control.value.trim()) {
    setFieldError(wrap, 'Enter the sub-processor’s legal name or remove this row.');
    return;
  }

  if (
    (name === 'subprocessor_country' || name === 'subprocessor_service_category') &&
    authorization !== 'none' &&
    control.value === ''
  ) {
    setFieldError(
      wrap,
      name === 'subprocessor_country' ? 'Select a country.' : 'Select a service category.'
    );
  }
}

function validate() {
  const errorWraps = [];
  const record = (wrap) => {
    if (wrap) errorWraps.push(wrap);
  };

  clearAllErrors();

  record(requireText('controller_legal_name', 'Enter your customer’s legal name.'));
  record(requireText('controller_address', 'Enter your customer’s address.'));
  record(requireText('controller_country', 'Select your customer’s country.'));
  record(requireText('processor_legal_name', 'Enter your company’s legal name.'));
  record(requireText('processor_address', 'Enter your company’s address.'));
  record(requireText('processor_country', 'Select your company’s country.'));
  record(requireText('service_summary', 'Describe the service in one or two sentences.'));

  record(
    optionalEmail(
      'controller_contact_email',
      'Enter a valid email address or leave this field empty.'
    )
  );
  record(
    optionalEmail(
      'processor_contact_email',
      'Enter a valid email address or leave this field empty.'
    )
  );

  record(requireGroup('purposes', 'Select at least one processing purpose.'));
  record(requireGroup('data_categories', 'Select at least one category of personal data.'));
  record(requireGroup('data_subject_categories', 'Select at least one category of data subjects.'));
  record(requireGroup('security_measures', 'Select at least one security measure.'));

  const authorization =
    form.querySelector('[name="subprocessor_authorization"]:checked')?.value || 'general';

  if (authorization !== 'none') {
    const noticeDays = form.querySelector('[name="notice_days"]');
    if (noticeDays && !inRange(noticeDays.value)) {
      const wrap = fieldWrapOf(noticeDays);
      setFieldError(wrap, `Enter a notice period between ${DAY_MIN} and ${DAY_MAX} days.`);
      record(wrap);
    }

    const rows = Array.from(subprocessorRows?.querySelectorAll('.repeater-row') || []);
    rows.forEach((row) => {
      const nameInput = row.querySelector('[name="subprocessor_name"]');
      const countrySelect = row.querySelector('[name="subprocessor_country"]');
      const categorySelect = row.querySelector('[name="subprocessor_service_category"]');
      if (nameInput && nameInput.value.trim() === '') {
        const wrap = fieldWrapOf(nameInput);
        setFieldError(wrap, 'Enter the sub-processor’s legal name or remove this row.');
        record(wrap);
      }
      if (countrySelect && countrySelect.value === '') {
        const wrap = fieldWrapOf(countrySelect);
        setFieldError(wrap, 'Select a country.');
        record(wrap);
      }
      if (categorySelect && categorySelect.value === '') {
        const wrap = fieldWrapOf(categorySelect);
        setFieldError(wrap, 'Select a service category.');
        record(wrap);
      }
    });
  }

  const completionDays = form.querySelector('[name="termination_completion_days"]');
  if (completionDays && !inRange(completionDays.value)) {
    const wrap = fieldWrapOf(completionDays);
    setFieldError(
      wrap,
      `Enter a deletion or return period between ${DAY_MIN} and ${DAY_MAX} days.`
    );
    record(wrap);
  }

  return { ok: errorWraps.length === 0, firstError: errorWraps[0] };
}

function requireText(name, message) {
  const control = controlsOf(name)[0];
  if (!control) return null;
  const value = String(control.value || '').trim();
  if (value === '') {
    const wrap = fieldWrapOf(control);
    setFieldError(wrap, message);
    return wrap;
  }
  const limit = control.maxLength && control.maxLength > 0 ? control.maxLength : null;
  if (limit && value.length > limit) {
    const wrap = fieldWrapOf(control);
    setFieldError(wrap, `Keep this under ${limit} characters.`);
    return wrap;
  }
  return null;
}

function optionalEmail(name, message) {
  const control = controlsOf(name)[0];
  if (!control) return null;
  const value = String(control.value || '').trim();
  if (value === '') return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    const wrap = fieldWrapOf(control);
    setFieldError(wrap, message);
    return wrap;
  }
  return null;
}

function requireGroup(name, message) {
  const controls = controlsOf(name);
  if (controls.some((control) => control.checked)) return null;
  if (!controls.length) return null;
  const wrap = fieldWrapOf(controls[0]);
  setFieldError(wrap, message);
  return wrap;
}

function inRange(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= DAY_MIN && number <= DAY_MAX;
}

function clearAllErrors() {
  form.querySelectorAll('.field.has-error').forEach((wrap) => clearFieldError(wrap));
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!config) return;
  if (store.get().status === 'loading') return;

  clearCountdown();

  const result = validate();

  if (!result.ok) {
    store.setError('param_error', 'Some details need your attention.');
    setStatus(
      'param_error',
      'Some details need your attention. Fix the highlighted fields and try again.'
    );
    document.getElementById('request-status')?.scrollIntoView({ block: 'nearest' });
    if (result.firstError) {
      const focusable = result.firstError.querySelector(
        '.select-button, input:not([type="hidden"]):not([hidden]), textarea'
      );
      focusable?.focus();
    }
    return;
  }

  const button = document.getElementById('generate-button');
  setBusy(button, true);
  flushDwell();
  hideResult();
  lastResult = null;
  store.setLoading(0);
  setStatus('loading', 'Generating your draft on the server…');

  const request = buildRequest(form);
  runSequence += 1;
  const checkStartedAt = performance.now();

  track('check_started', {
    input_source: inputSource,
    run_sequence: runSequence,
    purpose_count: request.processing.purposes.length,
    data_category_count: request.processing.data_categories.length,
    subprocessor_count_bucket: subprocessorBucket(request.subprocessors.items.length),
    transfer_region: request.transfers.region,
    security_measure_count: request.security.measures.length
  });
  inputSource = 'new';

  if (activeController) activeController.abort();
  activeController = new AbortController();
  const controller = activeController;

  const response = await requestCheck(request, { signal: controller.signal });
  const checkDuration = Math.round(performance.now() - checkStartedAt);

  if (activeController === controller) activeController = null;
  setBusy(button, false);

  if (response.state === 'aborted') return;

  if (response.state !== 'success') {
    handleFailure(response, checkDuration);
    return;
  }

  const tail = traceTail(response.traceId);
  const data = response.data;
  const saved = store.setResult(data, {
    traceId: response.traceId,
    traceTail: tail,
    renderedAt: Date.now()
  });

  const provenance = summaryProvenance(saved.summary);

  if (saved.items.length === 0) {
    setStatus(
      'empty',
      'No applicable clauses were generated for this fact pattern. Review your inputs and try again.'
    );
    return;
  }

  const renderStart = performance.now();
  renderResult(resultRegion, data, { traceTail: tail });
  resultRegion.hidden = false;
  const feedback = document.getElementById('result-feedback');
  if (feedback) feedback.hidden = false;
  mountCorrections(data);
  const renderMs = Math.round(performance.now() - renderStart);

  track('check_completed', Object.assign({
    check_duration_ms: checkDuration,
    processing_time_ms: Math.round(checkDuration + renderMs),
    render_ms: renderMs,
    item_count: saved.items.length,
    warning_count: typeof saved.summary.warning_count === 'number' ? saved.summary.warning_count : 0
  }, provenance));

  lastResult = data;
  resultRenderedAt = Date.now();
  resultItemCount = saved.items.length;
  expandedClauses = new Set();

  track('result_viewed', {
    render_ms: renderMs,
    item_count: saved.items.length,
    warning_count: typeof saved.summary.warning_count === 'number' ? saved.summary.warning_count : 0,
    sample_source: 'system'
  });
  track('tool_completed', {
    tool_name: 'gdpr_dpa_generator',
    succeeded: true,
    duration_ms: toolStartedAt > 0 ? Math.round(Date.now() - toolStartedAt) : 0
  });

  setStatus(
    'success',
    saved.items.length + ' clauses generated. Review each clause, then copy or print the draft.'
  );
  showToast('Draft generated. Review every clause before copying.', 'info');

  persistHistory(data, tail);

  resultRegion.scrollIntoView({ block: 'start', behavior: 'smooth' });
  document.getElementById('result-region-title')?.focus({ preventScroll: true });
}

function handleFailure(response, checkDuration) {
  const tail = response.traceId ? traceTail(response.traceId) : '';
  const ref = tail ? ' Reference ' + tail + '.' : '';
  let message = '';
  let status = 'server_error';

  if (response.state === 'param_error') {
    status = 'param_error';
    message = 'The server could not accept these details. Check the form and try again.' + ref;
  } else if (response.state === 'rate_limited') {
    status = 'rate_limited';
    const seconds = Math.max(1, Number(response.retryAfter) || 60);
    message = 'Too many drafts in a short time. Try again in ' + seconds + ' seconds.';
    startCountdown(seconds);
  } else if (response.state === 'quota_blocked') {
    status = 'quota_blocked';
    message = 'The free quota for this workspace is used up.' + ref;
  } else if (response.state === 'network_timeout') {
    status = 'network_timeout';
    message = 'We could not reach the generation service. Check your connection and try again.';
  } else {
    status = 'server_error';
    message = 'The generation service reported an error. Try again in a moment.' + ref;
  }

  track('check_failed', {
    error_code: status,
    check_duration_ms: typeof checkDuration === 'number' ? checkDuration : 0,
    degraded: false,
    rule_id: null,
    rule_version: null,
    confidence: null,
    matched_terms: null,
    diff_detail: null,
    sample_source: 'system'
  });
  // error_stage：把"失败了"细化到哪一段。这里是检查请求失败的统一出口，
  // 按状态串粗分：超时/网络/其余算 compute——比一律 unknown 有定位价值。
  track('tool_failed', {
    error_code: status,
    error_stage: /timeout/i.test(status) ? 'timeout' : (/network|fetch|offline/i.test(status) ? 'network' : 'compute')
  });

  inputSource = 'retry';

  store.setError(status, message, {
    traceId: response.traceId,
    traceTail: tail,
    retryAfter: response.retryAfter,
    quotaInfo: response.quotaInfo
  });
  setStatus(status, message);
}

function startCountdown(seconds) {
  clearCountdown();
  let remaining = seconds;
  countdownTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearCountdown();
      setStatus('idle', 'You can try generating the draft again.');
      return;
    }
    setStatus('rate_limited', 'Too many drafts in a short time. Try again in ' + remaining + ' seconds.');
  }, 1000);
}

function clearCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  if (busy) {
    button.setAttribute('aria-busy', 'true');
  } else {
    button.removeAttribute('aria-busy');
  }
}

function hideResult() {
  if (resultRegion) resultRegion.hidden = true;
  const list = document.getElementById('clause-list');
  if (list) list.textContent = '';
}

function persistHistory(data, tail) {
  const customerRef = customerRefSelect ? String(customerRefSelect.value || 'C01') : 'C01';
  const summary = data.summary || {};
  const items = Array.isArray(data.items) ? data.items : [];

  const entry = createEntry(customerRef, buildPreset(form), {
    clauseCount: items.length,
    warningCount: typeof summary.warning_count === 'number' ? summary.warning_count : 0,
    coverageRatio: typeof summary.coverage_ratio === 'number' ? summary.coverage_ratio : null,
    templateVersion: summary.template_version ? String(summary.template_version) : '',
    traceTail: tail
  });

  saveHistory(entry);
  refreshHistory();
}

function refreshHistory() {
  renderHistoryPanel(historyPanel, loadHistory(), {
    onLoad: loadWorkspace,
    onRemove: deleteWorkspace
  });
}

function loadWorkspace(entry) {
  if (!entry) return;
  inputSource = 'history';
  if (customerRefSelect) {
    customerRefSelect.value = entry.customer_ref;
    syncSelectLabel(customerRefSelect);
  }
  applyPreset(form, entry.preset);
  syncConditionals();
  clearAllErrors();
  setStatus(
    'info',
    'Preset for ' + entry.customer_ref + ' loaded. Party details and the service summary are not stored locally — enter them again.'
  );
  showToast('Preset ' + entry.customer_ref + ' loaded.', 'info');
}

function deleteWorkspace(entry) {
  if (!entry) return;
  removeHistory(entry.uuid);
  refreshHistory();
  showToast('Workspace ' + entry.customer_ref + ' removed.', 'info');
}

function bindCustomerRef() {
  if (!customerRefSelect) return;
  customerRefSelect.addEventListener('change', () => {
    const entry = findHistory(customerRefSelect.value);
    if (entry) loadWorkspace(entry);
  });
}

function syncSelectLabel(select) {
  const wrapper = select.closest('[data-select]');
  const button = wrapper ? wrapper.querySelector('.select-button') : null;
  if (!button) return;
  const option = Array.from(select.options).find((item) => item.value === select.value);
  button.textContent = option ? option.textContent : select.value;
}

function bindResultActions() {
  const copyButton = document.getElementById('copy-dpa');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      if (!lastResult) return;
      const copied = await copyToClipboard(buildDocumentText(lastResult));
      if (copied) {
        track('dpa_copied', {
          copy_scope: 'full_dpa',
          item_count: resultItemCount,
          time_on_result_s: secondsOnResult()
        });
        track('result_copied', { copy_format: 'text', item_count: resultItemCount });
      }
      showToast(
        copied
          ? 'Draft copied to the clipboard.'
          : 'Copy was blocked. Select the draft text and copy it manually.',
        copied ? 'info' : 'error'
      );
    });
  }

  const printButton = document.getElementById('print-dpa');
  if (printButton) {
    printButton.addEventListener('click', () => {
      if (!lastResult) return;
      track('print_requested', {
        print_scope: 'full_dpa',
        item_count: resultItemCount,
        time_on_result_s: secondsOnResult()
      });
      // 打印 = 把结果带走（用户存 PDF 是这条链上最强的"愿意用"信号），对齐 Q3 的 export。
      track('export', { export_format: 'print_pdf', item_count: resultItemCount });
      window.print();
    });
  }
}

function handleReset() {
  window.setTimeout(() => {
    flushDwell();
    clearAllErrors();
    hideResult();
    const feedback = document.getElementById('result-feedback');
    if (feedback) feedback.hidden = true;
    lastResult = null;
    resultRenderedAt = 0;
    expandedClauses = new Set();
    clearCountdown();
    store.clearResult();
    setStatus('idle', 'No draft generated yet.');
    syncConditionals();
    if (subprocessorRows && subprocessorRows.querySelectorAll('.repeater-row').length === 0) {
      addRow();
    }
    syncRepeaterState();
  }, 0);
}

function track(event, fields) {
  if (!telemetry || typeof telemetry.track !== 'function') return;
  try {
    telemetry.track(event, fields);
  } catch (error) {

  }
}

function bindTelemetryGlobal() {
  const markToolStart = () => {
    if (toolStarted) return;
    toolStarted = true;
    toolStartedAt = Date.now();
    track('tool_started', { tool_name: 'gdpr_dpa_generator' });
  };

  form.addEventListener('input', markToolStart);
  form.addEventListener('change', markToolStart);

  document.addEventListener('toggle', (event) => {
    const node = event.target;
    if (!node || !node.classList || !node.classList.contains('clause-alternatives')) return;
    if (!node.open) return;
    const card = node.closest('[data-clause-key]');
    const key = card ? card.getAttribute('data-clause-key') : '';
    if (!key || expandedClauses.has(key)) return;
    expandedClauses.add(key);
    track('clause_expanded', { clause_key: key });
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDwell();
  });
}

function flushDwell() {
  if (!resultRenderedAt || !lastResult) return;
  const seconds = Math.round((Date.now() - resultRenderedAt) / 1000);
  if (seconds < 1) return;

  track('result_dwell', {
    dwell_seconds: seconds,
    expanded_clause_count: expandedClauses.size,
    item_count: resultItemCount,
    sample_source: 'system'
  });
  resultRenderedAt = Date.now();
}

function secondsOnResult() {
  if (!resultRenderedAt) return 0;
  return Math.round((Date.now() - resultRenderedAt) / 1000);
}

function summaryProvenance(summary) {
  return {
    rule_id: summary.rule_id ? String(summary.rule_id) : '',
    rule_version: Number(summary.rule_version) || 0,
    confidence: Number(summary.confidence) || 0,
    matched_terms: Array.isArray(summary.matched_terms) ? summary.matched_terms : [],
    diff_detail: summary.diff_detail ? String(summary.diff_detail) : '',
    sample_source: summary.sample_source ? String(summary.sample_source) : 'system'
  };
}

function subprocessorBucket(count) {
  if (!count) return '0';
  if (count <= 3) return '1-3';
  return '4-10';
}

function currentContext() {
  const request = buildRequest(form);
  const preset = buildPreset(form);
  return {
    transferRegion: request.transfers.region,
    preset: {
      processing_purposes: preset.purposes.join(','),
      processing_data_categories: preset.data_categories.join(','),
      processing_data_subject_categories: preset.data_subject_categories.join(','),
      processing_duration: preset.duration,
      subprocessor_authorization: preset.subprocessor_authorization,
      subprocessor_notice_days: preset.notice_days,
      security_measures: preset.security_measures.join(','),
      termination_data_disposition: preset.termination_data_disposition,
      termination_completion_days: preset.termination_completion_days,
      breach_notice_hours: preset.breach_notice_hours
    }
  };
}
