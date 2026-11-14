export function renderHistoryPanel(panel, entries, handlers) {
  if (!panel) return;
  const list = panel.querySelector('#history-list');
  const empty = panel.querySelector('#history-empty');
  if (!list) return;

  list.textContent = '';
  if (!entries || entries.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  entries.forEach((entry) => {
    list.appendChild(buildItem(entry, handlers || {}));
  });
}

function buildItem(entry, handlers) {
  const item = document.createElement('li');
  item.className = 'history-item';

  const head = document.createElement('div');
  head.className = 'history-item-head';

  const load = document.createElement('button');
  load.type = 'button';
  load.className = 'history-load';
  load.textContent = String(entry.customer_ref || '');
  load.setAttribute('aria-label', 'Load workspace ' + String(entry.customer_ref || ''));
  load.addEventListener('click', () => {
    if (typeof handlers.onLoad === 'function') handlers.onLoad(entry);
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-button';
  remove.textContent = '×';
  remove.setAttribute('aria-label', 'Remove workspace ' + String(entry.customer_ref || ''));
  remove.addEventListener('click', () => {
    if (typeof handlers.onRemove === 'function') handlers.onRemove(entry);
  });

  head.appendChild(load);
  head.appendChild(remove);

  const meta = document.createElement('p');
  meta.className = 'history-meta';
  meta.textContent = describe(entry);

  item.appendChild(head);
  item.appendChild(meta);
  return item;
}

function describe(entry) {
  const info = entry.result_meta || {};
  const parts = [];

  const date = new Date(Number(entry.timestamp) || Date.now());
  parts.push(date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }));

  if (info.clause_count) parts.push(info.clause_count + ' clauses');
  if (typeof info.coverage_ratio === 'number') parts.push(Math.round(info.coverage_ratio * 100) + '% coverage');
  if (info.warning_count) parts.push(info.warning_count + ' to review');

  return parts.join(' · ');
}
