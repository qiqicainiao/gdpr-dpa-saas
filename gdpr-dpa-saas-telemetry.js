(function () {
  'use strict';

  var cfg = window.__SITE_CONFIG__;
  if (!cfg) return;

  var SCHEMA = {
    page_view: { page_path: 's512', referrer_host: 's128', device_type: 'enum:desktop|mobile|tablet' },
    tool_started: { tool_name: 's64' },
    tool_completed: { tool_name: 's64', succeeded: 'b', duration_ms: 'i' },
    tool_failed: { error_code: 's40' },
    check_started: {
      input_source: 'enum:new|history|retry',
      run_sequence: 'i',
      purpose_count: 'i',
      data_category_count: 'i',
      subprocessor_count_bucket: 'enum:0|1-3|4-10',
      transfer_region: 'enum:eea_only|third_country',
      security_measure_count: 'i'
    },
    check_completed: {
      check_duration_ms: 'i',
      processing_time_ms: 'i',
      render_ms: 'i',
      item_count: 'i',
      warning_count: 'i',
      rule_id: 's64',
      rule_version: 'i',
      confidence: 'n',
      matched_terms: 't',
      diff_detail: 's64',
      sample_source: 'enum:user|system|mock'
    },
    check_failed: {
      error_code: 's32',
      check_duration_ms: 'i',
      degraded: 'b',
      rule_id: 'nullable',
      rule_version: 'nullable',
      confidence: 'nullable',
      matched_terms: 'nullable',
      diff_detail: 'nullable',
      sample_source: 'enum:user|system|mock'
    },
    result_viewed: { render_ms: 'i', item_count: 'i', warning_count: 'i', sample_source: 'enum:user|system|mock' },
    result_dwell: {
      dwell_seconds: 'i',
      expanded_clause_count: 'i',
      item_count: 'i',
      sample_source: 'enum:user|system|mock'
    },
    clause_expanded: { clause_key: 's48' },
    dpa_copied: { copy_scope: 'enum:full_dpa', item_count: 'i', time_on_result_s: 'nullable' },
    print_requested: { print_scope: 'enum:full_dpa', item_count: 'i', time_on_result_s: 'nullable' },
    correction_submitted: {
      rule_id: 's64',
      rule_version: 'i',
      confidence: 'n',
      matched_terms: 't',
      diff_detail: 's64',
      sample_source: 'enum:user|system|mock',
      attempt_count: 'i',
      clause_key: 's48',
      finding_id: 's48',
      audit_dim: 's32',
      system_variant: 's48',
      corrected_variant: 's48',
      reason_tag: 'enum:unspecified|party_role|processing_scope|transfer|subprocessor|security|retention|breach_notice|missing_clause|other',
      transfer_region: 'enum:eea_only|third_country',
      degraded: 'b',
      processing_purposes: 'enum:hosted_application|customer_support|product_analytics|service_communications|billing',
      processing_data_categories: 'enum:account_identifiers|contact_details|usage_metadata|support_content|billing_records',
      processing_data_subject_categories: 'enum:customer_personnel|end_users|prospects',
      processing_duration: 'enum:service_term|twelve_months|twenty_four_months|project_term',
      subprocessor_authorization: 'enum:none|general|specific',
      subprocessor_notice_days: 'i',
      security_measures: 'enum:encryption_in_transit|encryption_at_rest|access_control|audit_logs|backups|incident_response|staff_training',
      termination_data_disposition: 'enum:controller_choice|delete|return',
      termination_completion_days: 'i',
      breach_notice_hours: 'i'
    },
    correction_confirmed: {
      rule_id: 's64',
      rule_version: 'i',
      confidence: 'n',
      matched_terms: 't',
      sample_source: 'enum:user|system|mock',
      clause_key: 's48',
      clause_variant: 's48',
      transfer_region: 'enum:eea_only|third_country',
      degraded: 'b',
      processing_purposes: 'enum:hosted_application|customer_support|product_analytics|service_communications|billing',
      processing_data_categories: 'enum:account_identifiers|contact_details|usage_metadata|support_content|billing_records',
      processing_data_subject_categories: 'enum:customer_personnel|end_users|prospects',
      processing_duration: 'enum:service_term|twelve_months|twenty_four_months|project_term',
      subprocessor_authorization: 'enum:none|general|specific',
      subprocessor_notice_days: 'i',
      security_measures: 'enum:encryption_in_transit|encryption_at_rest|access_control|audit_logs|backups|incident_response|staff_training',
      termination_data_disposition: 'enum:controller_choice|delete|return',
      termination_completion_days: 'i',
      breach_notice_hours: 'i'
    },
    false_negative_flagged: {
      rule_id: 'nullable',
      rule_version: 'nullable',
      confidence: 'nullable',
      matched_terms: 'nullable',
      diff_detail: 'nullable',
      sample_source: 'enum:user|system|mock',
      missing_category: 'enum:party_role|processing_scope|transfer|subprocessor|security|retention|breach_notice|missing_clause|other',
      system_variant: 'nullable',
      expected_variant: 'enum:party_role|processing_scope|transfer|subprocessor|security|retention|breach_notice|missing_clause|other',
      reason_tag: 'enum:unspecified|party_role|processing_scope|transfer|subprocessor|security|retention|breach_notice|missing_clause|other',
      transfer_region: 'enum:eea_only|third_country',
      degraded: 'b',
      processing_purposes: 'enum:hosted_application|customer_support|product_analytics|service_communications|billing',
      processing_data_categories: 'enum:account_identifiers|contact_details|usage_metadata|support_content|billing_records',
      processing_data_subject_categories: 'enum:customer_personnel|end_users|prospects',
      processing_duration: 'enum:service_term|twelve_months|twenty_four_months|project_term',
      subprocessor_authorization: 'enum:none|general|specific',
      subprocessor_notice_days: 'i',
      security_measures: 'enum:encryption_in_transit|encryption_at_rest|access_control|audit_logs|backups|incident_response|staff_training',
      termination_data_disposition: 'enum:controller_choice|delete|return',
      termination_completion_days: 'i',
      breach_notice_hours: 'i'
    },
    consent_changed: { consent: 'b' },
    paywall_exposed: { trigger_source: 's32', plan: 'enum:free' },
    paywall_clicked: { trigger_source: 's32', plan: 'enum:free' },
    plan_activated: { plan: 'enum:free' }
  };

  var queue = [];
  var dropped = 0;
  var sending = false;
  var consent = readConsent();
  var flushTimer = null;
  var stats = { sent: 0, retried: 0, failed: 0 };

  var deviceType = detectDevice();
  var referrerHost = referrer();

  var api = {
    track: track,
    flush: flush,
    setConsent: setConsent,
    getConsent: function () { return consent; },
    stats: function () { return { sent: stats.sent, retried: stats.retried, failed: stats.failed, queued: queue.length, dropped: dropped }; },
    session: null
  };
  window.__TELEMETRY__ = api;

  function boot() {
    api.session = {
      sess_ref: sessRef(),
      started_at: Date.now(),
      tool_started_at: 0,
      result_rendered_at: 0,
      result_items: 0,
      expanded: {},
      render_ms: 0
    };

    track('page_view', {
      page_path: window.location.pathname,
      referrer_host: referrerHost,
      device_type: deviceType
    });

    flushTimer = window.setInterval(flush, 8000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush(true);
    });
    window.addEventListener('pagehide', function () { flush(true); });
    window.addEventListener('online', function () { flush(); });
  }

  function track(event, fields) {
    var spec = SCHEMA[event];
    if (!spec) return;

    var row = { event: event, event_id: hex16() };
    var payload = fields || {};

    Object.keys(spec).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(payload, key)) return;
      var value = coerce(spec[key], payload[key]);
      if (value !== undefined) row[key] = value;
    });

    if (byteLength(JSON.stringify(row)) > cfg.MAX_EVENT_BYTES) {
      dropped += 1;
      return;
    }

    queue.push(row);
    while (queue.length > cfg.QUEUE_LIMIT) {
      queue.shift();
      dropped += 1;
    }
  }

  function flush(useBeacon) {
    if (sending || queue.length === 0) return;
    sending = true;

    var batch = [];
    var bytes = 0;
    while (queue.length > 0 && batch.length < cfg.MAX_BATCH_EVENTS) {
      var next = queue[0];
      var size = byteLength(JSON.stringify(next));
      if (bytes + size > cfg.MAX_BATCH_BYTES) break;
      batch.push(queue.shift());
      bytes += size;
    }

    if (batch.length === 0) {
      sending = false;
      return;
    }

    var granted = consent === 'granted';
    var body = granted
      ? {
          site_id: cfg.SITE_ID,
          consent: true,
          sess_ref: api.session ? api.session.sess_ref : sessRef(),
          page_path: window.location.pathname,
          device_type: deviceType,
          referrer_host: referrerHost,
          dropped_count: dropped,
          events: batch
        }
      : {
          site_id: cfg.SITE_ID,
          consent: false,
          dropped_count: dropped,
          events: aggregate(batch)
        };

    var text = JSON.stringify(body);
    var url = cfg.TRACK_PATH;

    if (useBeacon && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(url, new Blob([text], { type: 'application/json' }));
        dropped = 0;
        sending = false;
        return;
      } catch (error) {

      }
    }

    sendWithRetry(url, text, batch, 0);
  }

  function sendWithRetry(url, text, batch, attempt) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: text,
      credentials: 'omit',
      cache: 'no-store'
    }).then(function (response) {
      sending = false;
      if (response.status === 204) {
        stats.sent += 1;
        dropped = 0;
        return;
      }

      if (response.status === 400 || response.status === 413) {
        stats.failed += 1;
        dropped += batch.length;
        return;
      }
      retry(batch, attempt);
    }).catch(function () {
      sending = false;
      stats.retried += 1;
      retry(batch, attempt);
    });
  }

  function retry(batch, attempt) {
    if (attempt >= 3) {
      dropped += batch.length;
      return;
    }
    var delay = Math.pow(2, attempt) * 500;
    window.setTimeout(function () {
      sending = true;
      var granted = consent === 'granted';
      var body = granted
        ? {
            site_id: cfg.SITE_ID,
            consent: true,
            sess_ref: api.session ? api.session.sess_ref : sessRef(),
            page_path: window.location.pathname,
            device_type: deviceType,
            referrer_host: referrerHost,
            dropped_count: dropped,
            events: batch
          }
        : { site_id: cfg.SITE_ID, consent: false, dropped_count: dropped, events: aggregate(batch) };
      sendWithRetry(cfg.TRACK_PATH, JSON.stringify(body), batch, attempt + 1);
    }, delay);
  }

  function aggregate(batch) {
    var counts = {};
    batch.forEach(function (row) {
      counts[row.event] = (counts[row.event] || 0) + 1;
    });
    return Object.keys(counts).map(function (name) {
      return { event: name, total: counts[name] };
    });
  }

  function setConsent(granted) {
    consent = granted ? 'granted' : 'denied';
    try {
      window.localStorage.setItem(cfg.CONSENT_KEY, consent);
    } catch (error) {

    }
    track('consent_changed', { consent: granted });
    flush();
  }

  function readConsent() {
    try {
      var value = window.localStorage.getItem(cfg.CONSENT_KEY);
      if (value === 'granted' || value === 'denied') return value;
    } catch (error) {

    }
    return 'unknown';
  }

  function coerce(type, raw) {
    if (type === 'nullable') return raw === null || raw === undefined ? null : String(raw).slice(0, 64);

    if (raw === null || raw === undefined || raw === '') return type === 't' ? undefined : undefined;

    if (type === 'i') {
      var intValue = parseInt(raw, 10);
      return isNaN(intValue) ? undefined : intValue;
    }
    if (type === 'n') {
      var numValue = parseFloat(raw);
      return isNaN(numValue) ? undefined : Math.round(numValue * 100) / 100;
    }
    if (type === 'b') return raw === true || raw === 'true' ? true : false;
    if (type === 't') {
      if (!Array.isArray(raw)) return String(raw).slice(0, 200);
      return raw.join(',').slice(0, 200);
    }
    if (type.indexOf('enum:') === 0) {
      var allowed = type.slice(5).split('|');
      var values = Array.isArray(raw) ? raw.map(String) : String(raw).split(',');
      var valid = values.filter(function (item) { return allowed.indexOf(item) !== -1; });
      if (valid.length === 0) return undefined;
      return valid.join(',');
    }
    if (type.indexOf('s') === 0) {
      var limit = parseInt(type.slice(1), 10) || 64;
      return String(raw).slice(0, limit);
    }
    return undefined;
  }

  function byteLength(text) {
    if (window.TextEncoder) return new TextEncoder().encode(text).length;
    return text.length * 2;
  }

  function hex16() {
    var bytes = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function sessRef() {
    var key = cfg.SESSION_KEY;
    try {
      var existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
    } catch (error) {

    }
    var random = hex16() + hex16();
    var salt = cfg.SALT_SECRET || cfg.SITE_ID + '@' + cfg.VERSION;
    var mixed = hash(salt + ':' + random + ':' + Date.now());
    var value = 'gdpa-' + random.slice(0, 6) + '-' + mixed;
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {

    }
    return value;
  }

  function hash(text) {
    var h = 5381;
    for (var i = 0; i < text.length; i++) {
      h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function detectDevice() {
    var width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1080) return 'tablet';
    return 'desktop';
  }

  function referrer() {
    try {
      if (!document.referrer) return 'direct';
      return new URL(document.referrer).hostname || 'direct';
    } catch (error) {
      return 'direct';
    }
  }

  boot();
})();
