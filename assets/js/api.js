const STATE = {
  SUCCESS: 'success',
  PARAM_ERROR: 'param_error',
  RATE_LIMITED: 'rate_limited',
  QUOTA_BLOCKED: 'quota_blocked',
  SERVER_ERROR: 'server_error',
  NETWORK_TIMEOUT: 'network_timeout',
  ABORTED: 'aborted'
};

export { STATE };

export function traceTail(traceId) {
  if (!traceId || typeof traceId !== 'string') return '';
  return traceId.slice(-6);
}

export async function requestCheck(payload, options = {}) {
  const cfg = window.__SITE_CONFIG__;
  const timeoutMs = options.timeoutMs || cfg.CHECK_TIMEOUT_MS || 12000;
  const externalSignal = options.signal || null;

  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const relayAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      window.clearTimeout(timer);
      return { state: STATE.ABORTED, message: 'Request cancelled.' };
    }
    externalSignal.addEventListener('abort', relayAbort, { once: true });
  }

  try {
    const response = await fetch(cfg.API_BASE + '/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal
    });

    let body = null;
    try {
      body = await response.json();
    } catch (error) {
      body = null;
    }

    const code = body && typeof body.code !== 'undefined' ? body.code : null;
    const traceId = body && body.trace_id ? String(body.trace_id) : '';
    const msg = body && body.msg ? String(body.msg) : '';

    if (response.status === 200 && code === 0 && body && body.data) {
      return { state: STATE.SUCCESS, data: body.data, traceId: traceId, message: msg };
    }

    if (response.status === 429 || code === 'RATE_LIMITED') {
      return {
        state: STATE.RATE_LIMITED,
        traceId: traceId,
        retryAfter: readRetryAfter(response),
        message: msg
      };
    }

    if (response.status === 403 || code === 'QUOTA_BLOCKED') {
      return {
        state: STATE.QUOTA_BLOCKED,
        traceId: traceId,
        quotaInfo: body && body.quota_info ? body.quota_info : null,
        message: msg
      };
    }

    if (response.status === 400 || response.status === 413 || code === 'INVALID_PARAM' || code === 'PAYLOAD_TOO_LARGE') {
      return { state: STATE.PARAM_ERROR, traceId: traceId, message: msg };
    }

    return { state: STATE.SERVER_ERROR, traceId: traceId, message: msg };
  } catch (error) {
    if (externalSignal && externalSignal.aborted && !timedOut) {
      return { state: STATE.ABORTED, message: 'Request cancelled.' };
    }
    if (timedOut) {
      return { state: STATE.NETWORK_TIMEOUT, message: 'The request timed out.' };
    }
    return { state: STATE.NETWORK_TIMEOUT, message: 'The generation service is unreachable.' };
  } finally {
    window.clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', relayAbort);
  }
}

function readRetryAfter(response) {
  const header = response.headers.get('Retry-After');
  if (header && /^\d+$/.test(header.trim())) return Number(header.trim());

  const reset = response.headers.get('X-RateLimit-Reset');
  if (reset && /^\d+$/.test(reset.trim())) {
    const seconds = Number(reset.trim()) - Math.floor(Date.now() / 1000);
    return seconds > 0 ? seconds : 1;
  }

  return 60;
}
