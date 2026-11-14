(function () {
  'use strict';

  var SITE_ID = 'gdpr-dpa-saas';
  var host = window.location.hostname;
  var isDev =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    /\.local$/.test(host);

  var devOrigin = window.location.protocol + '//' + window.location.hostname + ':8090';
  var bffBase = isDev ? devOrigin + '/bff/' + SITE_ID : '/bff/' + SITE_ID;

  window.__SITE_CONFIG__ = Object.freeze({
    SITE_ID: SITE_ID,
    SLUG: SITE_ID,

    KEYWORD: 'GDPR DPA generator for SaaS',

    ENV: isDev ? 'dev' : 'prod',
    IS_DEV: isDev,
    VERSION: '0.3.2',

    API_BASE: bffBase,
    TRACK_PATH: bffBase + '/track',
    HEALTH_PATH: bffBase + '/health',
    MANIFEST_URL: '/manifests/' + SITE_ID + '.json',

    CHECK_TIMEOUT_MS: 12000,

    TELEMETRY_FILE: SITE_ID + '-telemetry.js',

    SESSION_NAMESPACE: SITE_ID,
    SESSION_KEY: SITE_ID + ':session',
    TAB_DRAFT_KEY: SITE_ID + ':tab-draft',
    HISTORY_KEY: SITE_ID + ':history:v1',
    HISTORY_QUARANTINE_KEY: SITE_ID + ':history:quarantine',
    CONSENT_KEY: SITE_ID + ':consent:v1',

    QUEUE_LIMIT: 300,
    MAX_EVENT_BYTES: 2048,
    MAX_BATCH_BYTES: 32768,
    MAX_BATCH_EVENTS: 50,

    FREE_QUOTA: null,

    SITE_ORIGIN: 'https://saasdpalab.com',

    SALT_SECRET: null
  });
})();
