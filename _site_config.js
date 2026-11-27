(function () {
  'use strict';

  try {
    var legacyConsent = window.localStorage.getItem('gdpr-dpa-saas:consent:v1');
    if (legacyConsent === 'granted' || legacyConsent === 'denied') {
      var currentConsent = window.localStorage.getItem('vr_consent_v1');
      if (currentConsent !== 'granted' && currentConsent !== 'denied') {
        window.localStorage.setItem('vr_consent_v1', legacyConsent);
      }
      window.localStorage.removeItem('gdpr-dpa-saas:consent:v1');
    }
  } catch (error) {}

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
    VERSION: '0.3.5',

    API_BASE: bffBase,
    HEALTH_PATH: bffBase + '/health',

    CHECK_TIMEOUT_MS: 12000,

    SESSION_NAMESPACE: SITE_ID,
    SESSION_KEY: SITE_ID + ':session',
    TAB_DRAFT_KEY: SITE_ID + ':tab-draft',
    HISTORY_KEY: SITE_ID + ':history:v1',
    HISTORY_QUARANTINE_KEY: SITE_ID + ':history:quarantine',

    FREE_QUOTA: null,

    SITE_ORIGIN: 'https://saasdpalab.com',

    SALT_SECRET: null
  });
})();
