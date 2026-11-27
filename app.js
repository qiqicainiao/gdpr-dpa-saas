import {
  initSelects,
  setStatus,
  setFieldError,
  clearFieldError,
  showToast
} from './assets/js/ui.js?v=0.3.2';
import { requestCheck, traceTail } from './assets/js/api.js?v=0.3.3';
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
import { initConsent } from './assets/js/consent.js?v=0.3.5';
import { initCorrection, mountCorrections } from './assets/js/correction.js?v=0.3.4';

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
let activeController = null;
let activeRun = null;
let lastResult = null;
let countdownTimer = null;

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
  initCorrection({ getContext: currentContext });
  window.addEventListener('pagehide', () => {
    if (!activeRun) return;
    const run = activeRun;
    if (activeController) activeController.abort();
    activeController = null;
    finishRun(run, 'timeout');
  });
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

function finishRun(run, errorCode) {
  if (activeRun !== run) return;
  activeRun = null;
  if (errorCode) run.fail(errorCode);
  else run.ok();
}

function runErrorCode(response) {
  if (response.state === 'param_error') return 'input_invalid';
  if (response.state === 'auth') return 'auth';
  if (response.state === 'rate_limited' || response.state === 'quota_blocked') return 'quota';
  if (response.state === 'network_timeout') return 'timeout';
  if (response.state === 'aborted') return 'unknown';
  return 'upstream_5xx';
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!config) return;
  if (store.get().status === 'loading') return;

  const run = window.VR.run('gdpr-dpa-saas');
  activeRun = run;
  try {
    await generateDraft(run);
  } catch (error) {
    if (activeRun !== run) return;
    if (activeController) activeController.abort();
    activeController = null;
    setBusy(document.getElementById('generate-button'), false);
    finishRun(run, 'unknown');
    handleFailure({ state: 'server_error' });
  }
}

async function generateDraft(run) {
  clearCountdown();

  const result = validate();

  if (!result.ok) {
    finishRun(run, 'input_invalid');
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
  hideResult();
  lastResult = null;
  store.setLoading(0);
  setStatus('loading', 'Generating your draft on the server…');

  const request = buildRequest(form);

  if (activeController) activeController.abort();
  activeController = new AbortController();
  const controller = activeController;

  const response = await requestCheck(request, { signal: controller.signal });

  if (activeRun !== run) return;
  if (activeController === controller) activeController = null;
  setBusy(button, false);

  if (response.state === 'aborted') {
    finishRun(run, 'unknown');
    return;
  }

  if (response.state !== 'success') {
    finishRun(run, runErrorCode(response));
    handleFailure(response);
    return;
  }

  const tail = traceTail(response.traceId);
  const data = response.data;
  const saved = store.setResult(data, {
    traceId: response.traceId,
    traceTail: tail,
    renderedAt: Date.now()
  });

  if (saved.items.length === 0) {
    setStatus(
      'empty',
      'No applicable clauses were generated for this fact pattern. Review your inputs and try again.'
    );
    finishRun(run);
    return;
  }

  renderResult(resultRegion, data, { traceTail: tail });
  resultRegion.hidden = false;
  const feedback = document.getElementById('result-feedback');
  if (feedback) feedback.hidden = false;
  mountCorrections(data);

  lastResult = data;

  setStatus(
    'success',
    saved.items.length + ' clauses generated. Review each clause, then copy or print the draft.'
  );
  showToast('Draft generated. Review every clause before copying.', 'info');

  persistHistory(data, tail);

  resultRegion.scrollIntoView({ block: 'start', behavior: 'smooth' });
  document.getElementById('result-region-title')?.focus({ preventScroll: true });
  finishRun(run);
}

function handleFailure(response) {
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
  } else if (response.state === 'network_timeout' || response.state === 'network_error') {
    status = 'network_timeout';
    message = 'We could not reach the generation service. Check your connection and try again.';
  } else {
    status = 'server_error';
    message = 'The generation service reported an error. Try again in a moment.' + ref;
  }

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
      window.print();
    });
  }
}

function handleReset() {
  window.setTimeout(() => {
    clearAllErrors();
    hideResult();
    const feedback = document.getElementById('result-feedback');
    if (feedback) feedback.hidden = true;
    lastResult = null;
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
