export const STATES = Object.freeze([
  'idle',
  'validating',
  'loading',
  'success',
  'empty',
  'param_error',
  'rate_limited',
  'quota_blocked',
  'server_error',
  'network_timeout'
]);

export function createStore() {
  const listeners = [];
  let state = {
    status: 'idle',
    message: '',
    result: null,
    traceId: '',
    traceTail: '',
    retryAfter: 0,
    plan: 'free',
    freeQuotaUsed: 0,
    quotaInfo: null,
    renderingStartedAt: 0,
    renderedAt: 0
  };

  function notify() {
    listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {

      }
    });
  }

  return {
    get() {
      return state;
    },

    subscribe(listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      return function () {
        const index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    },

    setStatus(status, message) {
      if (STATES.indexOf(status) === -1) return;
      state = Object.assign({}, state, { status: status, message: message || '' });
      notify();
    },

    setLoading(renderingStartedAt) {
      state = Object.assign({}, state, {
        status: 'loading',
        message: '',
        renderingStartedAt: renderingStartedAt || 0
      });
      notify();
    },

    setResult(data, meta) {
      const items = data && Array.isArray(data.items) ? data.items : [];
      const summary = data && data.summary ? data.summary : {};
      state = Object.assign({}, state, {
        status: items.length === 0 ? 'empty' : 'success',
        message: '',
        result: data,
        traceId: meta && meta.traceId ? meta.traceId : '',
        traceTail: meta && meta.traceTail ? meta.traceTail : '',
        renderedAt: meta && meta.renderedAt ? meta.renderedAt : 0,
        plan: data && data.plan ? data.plan : 'free',
        freeQuotaUsed: data && typeof data.free_quota_used === 'number' ? data.free_quota_used : 0,
        quotaInfo: data && data.quota_info ? data.quota_info : null
      });
      notify();
      return { items: items, summary: summary };
    },

    setError(status, message, extra) {
      state = Object.assign({}, state, {
        status: STATES.indexOf(status) !== -1 ? status : 'server_error',
        message: message || '',
        result: null,
        traceId: extra && extra.traceId ? extra.traceId : '',
        traceTail: extra && extra.traceTail ? extra.traceTail : '',
        retryAfter: extra && extra.retryAfter ? extra.retryAfter : 0,
        quotaInfo: extra && extra.quotaInfo ? extra.quotaInfo : null
      });
      notify();
    },

    clearResult() {
      state = Object.assign({}, state, {
        status: 'idle',
        message: '',
        result: null,
        traceId: '',
        traceTail: '',
        retryAfter: 0,
        renderedAt: 0
      });
      notify();
    }
  };
}
