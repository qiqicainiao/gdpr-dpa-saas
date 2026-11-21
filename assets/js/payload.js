export function buildRequest(form) {
  const cfg = window.__SITE_CONFIG__;
  const authorization = radioValue(form, 'subprocessor_authorization', 'general');

  return {
    site_id: cfg.SITE_ID,
    controller: {
      legal_name: text(form, 'controller_legal_name'),
      address: text(form, 'controller_address'),
      country: value(form, 'controller_country'),
      contact_email: optionalText(form, 'controller_contact_email')
    },
    processor: {
      legal_name: text(form, 'processor_legal_name'),
      address: text(form, 'processor_address'),
      country: value(form, 'processor_country'),
      contact_email: optionalText(form, 'processor_contact_email')
    },
    processing: {
      service_summary: text(form, 'service_summary'),
      purposes: checkedValues(form, 'purposes'),
      data_categories: checkedValues(form, 'data_categories'),
      data_subject_categories: checkedValues(form, 'data_subject_categories'),
      special_category_data: radioValue(form, 'special_category_data', 'false') === 'true',
      duration: value(form, 'duration')
    },
    subprocessors: {
      authorization: authorization,
      notice_days: number(form, 'notice_days', 30),
      items: authorization === 'none' ? [] : subprocessorItems(form)
    },
    transfers: (function () {
      const mode = radioValue(form, 'transfer_mode', 'eea_only');
      return mode === 'third_country_scc'
        ? { region: 'third_country', mechanism: 'scc' }
        : { region: 'eea_only', mechanism: 'not_applicable' };
    })(),
    termination: {
      data_disposition: radioValue(form, 'termination_data_disposition', 'controller_choice'),
      completion_days: number(form, 'termination_completion_days', 30)
    },
    security: {
      measures: checkedValues(form, 'security_measures'),
      breach_notice_hours: number(form, 'breach_notice_hours', 24)
    }
  };
}

export function buildPreset(form) {
  const authorization = radioValue(form, 'subprocessor_authorization', 'general');
  return {
    purposes: checkedValues(form, 'purposes'),
    data_categories: checkedValues(form, 'data_categories'),
    data_subject_categories: checkedValues(form, 'data_subject_categories'),
    special_category_data: radioValue(form, 'special_category_data', 'false') === 'true',
    duration: value(form, 'duration'),
    subprocessor_authorization: authorization,
    notice_days: number(form, 'notice_days', 30),
    subprocessor_categories: authorization === 'none' ? [] : subprocessorCategories(form),
    transfer_mode: radioValue(form, 'transfer_mode', 'eea_only'),
    security_measures: checkedValues(form, 'security_measures'),
    breach_notice_hours: number(form, 'breach_notice_hours', 24),
    termination_data_disposition: radioValue(form, 'termination_data_disposition', 'controller_choice'),
    termination_completion_days: number(form, 'termination_completion_days', 30)
  };
}

export function applyPreset(form, preset) {
  if (!preset || typeof preset !== 'object') return;

  setChecked(form, 'purposes', preset.purposes);
  setChecked(form, 'data_categories', preset.data_categories);
  setChecked(form, 'data_subject_categories', preset.data_subject_categories);
  setChecked(form, 'security_measures', preset.security_measures);

  setRadio(form, 'special_category_data', preset.special_category_data ? 'true' : 'false');
  setRadio(form, 'subprocessor_authorization', preset.subprocessor_authorization || 'general');
  setRadio(form, 'transfer_mode', preset.transfer_mode || 'eea_only');
  setRadio(form, 'termination_data_disposition', preset.termination_data_disposition || 'controller_choice');

  setValue(form, 'duration', preset.duration);
  setValue(form, 'notice_days', preset.notice_days);
  setValue(form, 'breach_notice_hours', preset.breach_notice_hours);
  setValue(form, 'termination_completion_days', preset.termination_completion_days);
}

function subprocessorItems(form) {
  const rows = Array.from(form.querySelectorAll('#subprocessor-rows .repeater-row'));
  const items = [];
  rows.forEach((row) => {
    const name = row.querySelector('[name="subprocessor_name"]');
    const country = row.querySelector('[name="subprocessor_country"]');
    const category = row.querySelector('[name="subprocessor_service_category"]');
    const legalName = name ? String(name.value || '').trim() : '';
    if (legalName === '') return;
    items.push({
      legal_name: legalName,
      country: country ? String(country.value || '') : '',
      service_category: category ? String(category.value || '') : ''
    });
  });
  return items;
}

function subprocessorCategories(form) {
  return Array.from(form.querySelectorAll('#subprocessor-rows [name="subprocessor_service_category"]'))
    .map((control) => String(control.value || ''))
    .filter((item) => item !== '');
}

function text(form, name) {
  const control = form.querySelector(`[name="${name}"]`);
  return control ? String(control.value || '').trim() : '';
}

function optionalText(form, name) {
  const result = text(form, name);
  return result === '' ? null : result;
}

function value(form, name) {
  const control = form.querySelector(`[name="${name}"]`);
  return control ? String(control.value || '') : '';
}

function number(form, name, fallback) {
  const control = form.querySelector(`[name="${name}"]`);
  if (!control) return fallback;
  const parsed = Number(control.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function radioValue(form, name, fallback) {
  const checked = form.querySelector(`[name="${name}"]:checked`);
  return checked ? String(checked.value) : fallback;
}

function checkedValues(form, name) {
  return Array.from(form.querySelectorAll(`[name="${name}"]:checked`)).map((control) => String(control.value));
}

function setChecked(form, name, values) {
  if (!Array.isArray(values)) return;
  form.querySelectorAll(`[name="${name}"]`).forEach((control) => {
    control.checked = values.indexOf(String(control.value)) !== -1;
  });
}

function setRadio(form, name, target) {
  if (!target) return;
  form.querySelectorAll(`[name="${name}"]`).forEach((control) => {
    control.checked = String(control.value) === String(target);
  });
}

function setValue(form, name, target) {
  if (target === undefined || target === null || target === '') return;
  const control = form.querySelector(`[name="${name}"]`);
  if (!control) return;
  control.value = String(target);

  const wrapper = control.closest('[data-select]');
  const button = wrapper ? wrapper.querySelector('.select-button') : null;
  if (button) {
    const option = Array.from(control.options).find((item) => item.value === control.value);
    button.textContent = option ? option.textContent : control.value;
  }
}
