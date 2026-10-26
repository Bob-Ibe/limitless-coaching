// Limitless · KPI-boom van Bob, met Noah en Leon als coaches.
// Bob staat in het midden, de coaches links en rechts. Elke persoon heeft een boom die naar boven vertakt.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nl = (n) => Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 1 });
  const COLS = ['noah', 'bob', 'leon'];
  const TYPE = { doel: 'Doel', kpi: 'KPI', taak: 'Taak', einddoel: 'Einddoel' };
  const STATUS = { todo: 'Te doen', bezig: 'Bezig', klaar: 'Klaar' };

  /* ---------- inloggen ---------- */
  // Licht slot: het wachtwoord staat niet leesbaar in de code. Echte beveiliging van de data regel je in Supabase.
  const hash = (s) => { let h = 5381; for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h.toString(36); };
  const PW = '1hp2197', AUTH = 'limitless-auth';
  let me = null;
  try { const a = JSON.parse(localStorage.getItem(AUTH) || 'null'); if (a && a.until > Date.now() && PEOPLE[a.who]) me = a.who; } catch {}
  $('gate-crew').innerHTML = ['noah', 'bob', 'leon'].map((k) => `<div class="gc ${k === 'bob' ? 'mid' : ''}">${renderChar(PEOPLE[k].def)}<span>${PEOPLE[k].name}</span></div>`).join('');
  $('gate-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (hash($('gate-pw').value.trim().toLowerCase()) !== PW) { $('gate-err').hidden = false; $('gate-pw').select(); return; }
    $('gate-err').hidden = true; $('gate-form').hidden = true; $('gate-who').hidden = false;
  });
  $('gate-who').addEventListener('click', (e) => {
    const b = e.target.closest('[data-who]'); if (!b) return;
    me = b.dataset.who;
    try { localStorage.setItem(AUTH, JSON.stringify({ who: me, until: Date.now() + 30 * 864e5 })); } catch {}
    start();
  });
  $('me').addEventListener('click', () => {
    try { localStorage.removeItem(AUTH); } catch {}
    location.reload();
  });

  /* ---------- tekenen ---------- */
  const pct = (x) => (x.target ? Math.max(0, Math.min(100, ((Number(x.current) || 0) / Number(x.target)) * 100)) : null);
  function due(x) {
    if (!x.deadline || x.status === 'klaar') return '';
    const days = Math.ceil((new Date(x.deadline + 'T23:59') - Date.now()) / 864e5);
    return days < 0 ? 'late' : days <= 7 ? 'soon' : '';
  }
  const fmtDate = (d) => (d ? new Date(d + 'T12:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '');
  const amount = (x, v) => (x.unit === '€' ? '€ ' + nl(v) : nl(v) + (x.unit ? ' ' + x.unit : ''));

  function card(x) {
    const p = pct(x), d = due(x), notes = (x.notes || []).length;
    return `<div class="node t-${x.type} s-${x.status || 'todo'} ${d ? 'd-' + d : ''}">
      <button type="button" class="n-card" data-edit="${x.id}">
        <span class="n-top"><span class="n-type">${TYPE[x.type] || 'Punt'}</span><span class="n-who w-${x.owner}" title="${esc(PEOPLE[x.owner] ? PEOPLE[x.owner].name : '')}">${esc((PEOPLE[x.owner] || { name: '?' }).name[0])}</span></span>
        <b class="n-title">${esc(x.title)}</b>
        ${p != null ? `<span class="n-bar"><i style="width:${p}%"></i></span><span class="n-meta">${amount(x, x.current || 0)} van ${amount(x, x.target)}</span>` : ''}
        <span class="n-foot">${x.deadline ? `<span class="n-date">${fmtDate(x.deadline)}</span>` : ''}<span class="n-status">${STATUS[x.status || 'todo']}</span>${notes ? `<span class="n-notes">${notes} ${notes === 1 ? 'notitie' : 'notities'}</span>` : ''}</span>
      </button>
      <button type="button" class="n-add" data-add="${x.id}" title="Punt erboven toevoegen" aria-label="Punt erboven toevoegen">+</button>
    </div>`;
  }
  // boom die naar boven groeit: de kinderen staan boven hun ouder
  function branch(list) {
    if (!list.length) return '';
    return `<ul>${list.map((x) => { const kids = Store.children(x.id); return `<li class="${kids.length ? 'has-kids' : ''}">${card(x)}${branch(kids)}</li>`; }).join('')}</ul>`;
  }
  const topOf = (col) => (col === 'bob' ? Store.children('root') : Store.all().filter((x) => !x.parent && x.owner === col && x.id !== 'root').sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))));

  function renderGoal() {
    const r = Store.get('root'); if (!r) return;
    const p = pct(r) || 0, all = Store.all().filter((x) => x.id !== 'root'), done = all.filter((x) => x.status === 'klaar').length;
    $('goal').innerHTML = `
      <div class="g-main" data-edit="root" role="button" tabindex="0">
        <p class="kicker">Einddoel</p>
        <h1>${esc(r.title)}</h1>
        <div class="g-bar"><i style="width:${p}%"></i></div>
        <p class="g-meta">Nu <b>${amount(r, r.current || 0)}</b> per maand · nog ${amount(r, Math.max(0, r.target - (r.current || 0)))} te gaan${r.deadline ? ' · deadline ' + fmtDate(r.deadline) : ''}</p>
      </div>
      <div class="g-stats">
        <div><b>${all.filter((x) => x.type === 'doel').length}</b><span>doelen</span></div>
        <div><b>${all.filter((x) => x.type === 'kpi').length}</b><span>KPI's</span></div>
        <div><b>${done}/${all.length}</b><span>klaar</span></div>
      </div>`;
  }
  function renderCol(col) {
    const list = topOf(col);
    $('tree-' + col).innerHTML = list.length
      ? branch(list)
      : `<p class="empty">${col === 'bob' ? 'Nog niets op weg naar het einddoel. Zet hieronder je eerste doel.' : `Nog niets van ${PEOPLE[col].name}. Voeg een punt toe.`}</p>`;
    // een brede boom begint in het midden (op telefoon scroll je zelf opzij)
    const wrap = $('tree-' + col).parentElement;
    if (!wrap.dataset.centered && wrap.scrollWidth > wrap.clientWidth) { wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) / 2; wrap.dataset.centered = '1'; }
    const open = Store.all().filter((x) => x.owner === col && x.id !== 'root' && x.status !== 'klaar').length;
    $('p-' + col).innerHTML = `<div class="sprite-box ${col === 'bob' ? 'big' : ''} st-idle">${renderChar(PEOPLE[col].def)}</div>
      <div class="p-name"><b>${PEOPLE[col].name}</b><span>${PEOPLE[col].role}${open ? ' · ' + open + ' open' : ''}</span></div>
      <button type="button" class="btn small" data-new="${col}">+ ${col === 'bob' ? 'Doel' : 'Punt'}</button>`;
  }
  function renderSync() {
    const s = Store.status();
    $('sync').className = 'sync ' + (s.error ? 'err' : s.shared ? 'ok' : 'local');
    $('sync').textContent = s.error ? 'Kan niet synchroniseren' : s.shared ? (s.lastSync ? 'Gedeeld · ' + s.lastSync.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : 'Gedeeld · laden') : 'Alleen op dit apparaat';
    $('sync').title = s.shared ? 'Bob, Noah en Leon zien dezelfde boom.' : 'Vul Supabase in js/config.js in om samen te werken (zie SUPABASE.md).';
  }
  function renderTabs() {
    $('tabs').innerHTML = COLS.map((c) => `<button type="button" data-tab="${c}" class="${c === tab ? 'on' : ''}">${PEOPLE[c].name}</button>`).join('');
    document.querySelectorAll('.col').forEach((el) => el.classList.toggle('on', el.dataset.col === tab));
  }
  let tab = 'bob';
  function render() {
    renderGoal(); COLS.forEach(renderCol); renderSync(); renderTabs();
    const p = PEOPLE[me]; $('me').innerHTML = `<span class="me-dot w-${me}">${p.name[0]}</span>${p.name} <small>wissel</small>`;
  }

  /* ---------- bewerken ---------- */
  let editing = null;
  function openEditor(item, isNew) {
    editing = item;
    const f = $('edit');
    $('d-kicker').textContent = isNew ? 'Nieuw punt' : item.type === 'einddoel' ? 'Einddoel' : 'Punt aanpassen';
    ['title', 'type', 'owner', 'target', 'current', 'unit', 'deadline', 'status'].forEach((k) => { if (f[k]) f[k].value = item[k] == null ? '' : item[k]; });
    const root = item.type === 'einddoel';
    f.type.closest('.d-row').hidden = root; f.status.closest('label').hidden = root;
    $('d-del').hidden = isNew || root;
    $('d-notes').innerHTML = (item.notes || []).map((n) => `<div class="note"><span class="n-who w-${n.who}">${esc((PEOPLE[n.who] || { name: '?' }).name[0])}</span><div><b>${esc((PEOPLE[n.who] || { name: '?' }).name)}</b> <small>${new Date(n.at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</small><p>${esc(n.text)}</p></div></div>`).join('') || '<p class="small">Nog geen notities.</p>';
    $('d-note').value = '';
    $('d-note').placeholder = me === 'bob' ? 'Notitie toevoegen' : 'Tip of feedback van ' + PEOPLE[me].name;
    $('drawer').hidden = false;
    setTimeout(() => f.title.focus(), 50);
  }
  function closeEditor() { $('drawer').hidden = true; editing = null; }
  $('drawer').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeEditor(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('drawer').hidden) closeEditor(); });
  $('edit').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, x = Object.assign({}, editing);
    ['title', 'type', 'owner', 'unit', 'deadline', 'status'].forEach((k) => { if (f[k] && !f[k].closest('[hidden]')) x[k] = f[k].value.trim(); });
    ['target', 'current'].forEach((k) => { x[k] = f[k].value === '' ? null : Number(f[k].value); });
    const note = $('d-note').value.trim();
    if (note) x.notes = (x.notes || []).concat({ who: me, text: note, at: new Date().toISOString() });
    Store.save(x); closeEditor();
  });
  $('d-del').addEventListener('click', () => {
    if (!editing) return;
    const kids = Store.children(editing.id).length;
    if (confirm(kids ? `"${editing.title}" en alles erboven verwijderen?` : `"${editing.title}" verwijderen?`)) { Store.remove(editing.id); closeEditor(); }
  });
  const nextType = (t) => (t === 'einddoel' ? 'doel' : t === 'doel' ? 'kpi' : 'taak');
  document.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'), add = e.target.closest('[data-add]'), nw = e.target.closest('[data-new]'), tb = e.target.closest('[data-tab]');
    if (add) { const p = Store.get(add.dataset.add); openEditor({ parent: p.id, owner: p.owner, type: nextType(p.type), status: 'todo', createdBy: me }, true); return; }
    if (ed) { openEditor(Store.get(ed.dataset.edit), false); return; }
    if (nw) { const col = nw.dataset.new; openEditor({ parent: col === 'bob' ? 'root' : null, owner: col, type: col === 'bob' ? 'doel' : 'kpi', status: 'todo', createdBy: me }, true); return; }
    if (tb) { tab = tb.dataset.tab; renderTabs(); COLS.forEach((c) => { const w = $('tree-' + c).parentElement; if (!w.dataset.centered && w.scrollWidth > w.clientWidth) { w.scrollLeft = (w.scrollWidth - w.clientWidth) / 2; w.dataset.centered = '1'; } }); }
  });
  $('goal').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('[data-edit]')) openEditor(Store.get('root'), false); });

  /* ---------- starten ---------- */
  function start() {
    $('gate').hidden = true; $('app').hidden = false;
    tab = me;
    if (!Store.shared) Store.ensureRoot();
    render();
  }
  Store.on(() => { if (!$('app').hidden) render(); }); // het bewerkvenster staat los van de boom, dus altijd verversen
  if (window.IBEDots) IBEDots($('bg-dots'), { theme: 'dark', lion: null });
  if (me) start();
})();
