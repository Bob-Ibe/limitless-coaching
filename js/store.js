// Opslag van de KPI-boom. Lokaal (deze browser) of gedeeld via Supabase als config.js is ingevuld.
// Elk punt is een object: { id, parent, owner, type, title, target, current, unit, deadline, status, notes, createdBy, createdAt, updatedAt }
window.Store = (function () {
  const cfg = window.LIMITLESS_CONFIG || {};
  const KEY = 'limitless-items-v1', TABLE = 'kpi_items';
  const shared = !!(cfg.supabaseUrl && cfg.supabaseKey);
  let items = {}, listeners = [], lastSync = null, error = null, pending = 0;

  try { items = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { items = {}; }
  const cache = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} };
  const emit = () => listeners.forEach((f) => f());

  const api = (path, opt) => fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + path, Object.assign({
    headers: { apikey: cfg.supabaseKey, Authorization: 'Bearer ' + cfg.supabaseKey, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
  }, opt)).then((r) => { if (!r.ok) throw new Error('Supabase ' + r.status); return r.status === 204 || r.headers.get('content-length') === '0' ? null : r.json().catch(() => null); });

  async function pull() {
    if (!shared || pending) return;
    try {
      const rows = await api(TABLE + '?select=id,data', { method: 'GET' });
      const next = {};
      (rows || []).forEach((r) => { if (r && r.data) next[r.id] = r.data; });
      items = next; cache(); lastSync = new Date(); error = null; emit();
    } catch (e) { error = e.message; emit(); }
  }
  async function push(item) {
    if (!shared) return;
    pending++;
    try { await api(TABLE, { method: 'POST', body: JSON.stringify([{ id: item.id, data: item }]) }); lastSync = new Date(); error = null; }
    catch (e) { error = e.message; }
    pending--; emit();
  }
  async function drop(id) {
    if (!shared) return;
    pending++;
    try { await api(TABLE + '?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }); lastSync = new Date(); error = null; }
    catch (e) { error = e.message; }
    pending--; emit();
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const Store = {
    shared,
    status: () => ({ shared, lastSync, error }),
    all: () => Object.values(items),
    get: (id) => items[id],
    children: (id) => Object.values(items).filter((x) => x.parent === id).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))),
    on: (f) => listeners.push(f),
    save(item) {
      const now = new Date().toISOString();
      item = Object.assign({ notes: [], status: 'todo', createdAt: now }, item, { updatedAt: now });
      if (!item.id) item.id = uid();
      items[item.id] = item; cache(); emit(); push(item);
      return item;
    },
    remove(id) {
      // een punt weghalen haalt ook alles erboven (de kinderen) weg
      const kill = (x) => { Store.children(x).forEach((c) => kill(c.id)); delete items[x]; drop(x); };
      kill(id); cache(); emit();
    },
    // het einddoel bovenaan bestaat altijd
    ensureRoot() {
      if (items.root) return;
      const d = cfg.doel || {};
      Store.save({ id: 'root', parent: null, owner: 'bob', type: 'einddoel', title: d.titel || '€ 10.000 per maand', target: d.target || 10000, current: 0, unit: d.eenheid || '€', deadline: '', createdBy: 'bob' });
    },
    pull,
  };
  if (shared) {
    pull().then(() => Store.ensureRoot());
    setInterval(pull, 8000);
    addEventListener('focus', pull);
  }
  return Store;
})();
