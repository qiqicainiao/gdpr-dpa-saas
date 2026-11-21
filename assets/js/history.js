const SCHEMA_VERSION = 1;
const MAX_ENTRIES = 20;

export function loadHistory() {
  const cfg = window.__SITE_CONFIG__;
  const raw = safeGet(cfg.HISTORY_KEY);
  if (!raw) return [];

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    quarantine(raw, 'unreadable_json');
    return [];
  }

  const entries = normalize(parsed);
  if (entries === null) {
    quarantine(raw, 'unknown_schema');
    return [];
  }
  return entries;
}

export function saveHistory(entry) {
  const cfg = window.__SITE_CONFIG__;
  if (!entry || !entry.uuid) return loadHistory();

  const list = loadHistory();
  const index = list.findIndex((item) => item.uuid === entry.uuid || item.customer_ref === entry.customer_ref);
  if (index === -1) {
    list.unshift(entry);
  } else {
    list[index] = entry;
  }

  const trimmed = list.slice(0, MAX_ENTRIES);
  safeSet(cfg.HISTORY_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function removeHistory(uuid) {
  const cfg = window.__SITE_CONFIG__;
  const list = loadHistory().filter((item) => item.uuid !== uuid);
  safeSet(cfg.HISTORY_KEY, JSON.stringify(list));
  return list;
}

export function findHistory(customerRef) {
  return loadHistory().find((item) => item.customer_ref === customerRef) || null;
}

export function createEntry(customerRef, preset, meta) {
  const cfg = window.__SITE_CONFIG__;
  return {
    uuid: uuid(),
    timestamp: Date.now(),
    schema_version: SCHEMA_VERSION,
    site_id: cfg.SITE_ID,
    customer_ref: customerRef,
    preset: preset,
    result_meta: {
      clause_count: meta.clauseCount || 0,
      warning_count: meta.warningCount || 0,
      coverage_ratio: typeof meta.coverageRatio === 'number' ? meta.coverageRatio : null,
      template_version: meta.templateVersion || '',
      trace_tail: meta.traceTail || ''
    }
  };
}

function normalize(parsed) {
  if (!Array.isArray(parsed)) return null;
  const result = [];
  parsed.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    if (item.schema_version !== SCHEMA_VERSION) {
      const migrated = migrate(item);
      if (!migrated) {
        quarantine(JSON.stringify(item), 'schema_' + String(item.schema_version));
        return;
      }
      result.push(migrated);
      return;
    }
    if (typeof item.uuid !== 'string' || !item.customer_ref) return;
    result.push(item);
  });
  return result;
}

function migrate(item) {
  if (!item || typeof item !== 'object') return null;
  if (!item.customer_ref || !item.preset) return null;
  return {
    uuid: typeof item.uuid === 'string' ? item.uuid : uuid(),
    timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
    schema_version: SCHEMA_VERSION,
    site_id: window.__SITE_CONFIG__.SITE_ID,
    customer_ref: String(item.customer_ref),
    preset: item.preset,
    result_meta: item.result_meta || {}
  };
}

function quarantine(raw, reason) {
  const cfg = window.__SITE_CONFIG__;
  const existing = safeGet(cfg.HISTORY_QUARANTINE_KEY);
  let bucket = [];
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) bucket = parsed;
    } catch (error) {
      bucket = [];
    }
  }
  bucket.push({ ts: Date.now(), reason: reason, payload: String(raw).slice(0, 2000) });
  safeSet(cfg.HISTORY_QUARANTINE_KEY, JSON.stringify(bucket.slice(-10)));
  safeSet(cfg.HISTORY_KEY, JSON.stringify([]));
}

function uuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  const pick = () => Math.random().toString(16).slice(2, 10);
  return `${pick()}-${pick()}-${pick()}-${pick()}`;
}

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}
