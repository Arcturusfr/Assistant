/* ==========================================================================
   Assistant — js/tree.js
   Version : V006 — 2026-10-18 21:54 (heure de Paris)
   Modifs  : Flèches de dépendance (SVG superposé) : de l'élément dont on dépend vers celui qui attend,
             en pointillés, tracées dans une gouttière à droite ; orange tant que la dépendance n'est
             pas terminée. Branche repliée : la flèche rejoint le parent visible (regroupement, trait
             en points). Bouton « Dépendances » pour les afficher / masquer.
   Dépend de : config.js, state.js, calc.js, helpers.js (appelle App.sheet / App.renderAll à l'exécution)
   ========================================================================== */
(function(){
  "use strict";
  const { CATEGORIES, DOMAINS, MAX_DEPTH } = App.config;
  const state = App.state;
  const { findTask, childrenOf, ancestorsOf, unmetDependencies, subtaskCount, subtaskDoneCount } = App.model;
  const { dueLabel, scoreOf, escapeHtml, urgencyPill, progressBar } = App.helpers;
  const calc = App.calc;

  const BORDER_PX = { 1:1, 2:2, 3:3, 4:5 };   // complexité -> épaisseur (px), cf. tree.css
  const expanded = new Set();                 // éléments dépliés
  let seeded = false;                         // premier rendu : les projets sont dépliés

  const root = document.getElementById('tree-root');
  let showDeps = true;                        // flèches affichées (état en mémoire, non stocké)

  /* ---------- Flèches de dépendance ---------- */
  // Élément réellement visible qui représente id : lui-même, ou son plus haut ancêtre replié
  function visibleId(id){
    const chain = ancestorsOf(id).map(a => a.id).reverse();   // racine … parent
    for(const a of chain){ if(!expanded.has(a)) return a; }
    return id;
  }
  function svgEl(tag, attrs){
    const el = document.createElementNS(App.config.SVG_NS, tag);
    for(const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function drawArrows(){
    if(!showDeps || !root.offsetParent) return;
    const pairs = new Map();
    state.tasks.forEach(t => (t.dependsOn || []).forEach(depId => {
      const dep = findTask(depId);
      if(!dep) return;
      const from = visibleId(depId), to = visibleId(t.id);
      if(from === to) return;
      const key = from + '>' + to;
      const p = pairs.get(key) || { from, to, unmet:false, grouped:false };
      if(!calc.isDone(dep)) p.unmet = true;
      if(from !== depId || to !== t.id) p.grouped = true;
      pairs.set(key, p);
    }));
    if(!pairs.size) return;
    const base = root.getBoundingClientRect();
    const svg = svgEl('svg', { class:'tdeps', width:base.width, height:root.scrollHeight });
    const defs = svgEl('defs', {});
    [['unmet','#F0631E'], ['met','#8991A3']].forEach(([k,c]) => {
      const m = svgEl('marker', { id:'tdep-'+k, viewBox:'0 0 10 10', refX:9, refY:5, markerWidth:7, markerHeight:7, orient:'auto' });
      m.appendChild(svgEl('path', { d:'M0,0 L10,5 L0,10 z', fill:c }));
      defs.appendChild(m);
    });
    svg.appendChild(defs);
    let i = 0;
    pairs.forEach(p => {
      const a = root.querySelector(`.tnode[data-id="${p.from}"]`), b = root.querySelector(`.tnode[data-id="${p.to}"]`);
      if(!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.right - base.left, y1 = ra.top + ra.height/2 - base.top;
      const x2 = rb.right - base.left, y2 = rb.top + rb.height/2 - base.top;
      const gx = x1 + 7 + (i++ % 4) * 6;             // 4 couloirs pour limiter les chevauchements
      const k = p.unmet ? 'unmet' : 'met';
      svg.appendChild(svgEl('path', {
        d:`M${x1},${y1} H${gx} V${y2} H${x2}`, fill:'none', class:'tdep ' + k + (p.grouped ? ' grouped' : ''),
        'marker-end':`url(#tdep-${k})`
      }));
    });
    root.appendChild(svg);
  }
  let rafId = 0;
  function scheduleArrows(){
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => { const old = root.querySelector('svg.tdeps'); if(old) old.remove(); drawArrows(); });
  }

  function domainOf(t){
    const anc = ancestorsOf(t.id);
    const top = anc.length ? anc[anc.length - 1] : t;
    return DOMAINS[top.domain] ? top.domain : 'autre';
  }
  const bySCore = (a, b) => scoreOf(b) - scoreOf(a);

  function nodeHtml(t, depth){
    const kids = childrenOf(t.id).slice().sort(bySCore);
    const open = kids.length > 0 && expanded.has(t.id);
    const cat = CATEGORIES[t.category] || CATEGORIES.autre;
    const dom = domainOf(t);
    const type = calc.typeAtDepth(depth);
    const due = dueLabel(t.due);
    const unmet = unmetDependencies(t);
    const done = calc.isDone(t);
    const cx = calc.effectiveComplexity(t);
    const typeTxt = type.label + (depth === 0 ? ' · ' + DOMAINS[dom].label : '');
    const canAdd = depth < MAX_DEPTH - 1;

    const head = `
      <div class="tnode dom-${dom} cx${cx} ${done ? 'done' : ''} ${t.blocked ? 'is-blocked' : ''}" data-id="${t.id}" title="Complexité ${cx}">
        ${kids.length
          ? `<button type="button" class="t-toggle" data-act="toggle" aria-expanded="${open}" aria-label="Déplier / replier">▸</button>`
          : `<span class="t-spacer"></span>`}
        <div class="t-body">
          <div class="t-title">${escapeHtml(t.title)}</div>
          <div class="t-meta">
            <span class="t-type">${typeTxt}</span>
            ${urgencyPill(calc.effectiveUrgency(t), calc.isUrgencyInherited(t))}
            ${due ? `<span class="tag ${due.cls}">${due.text}</span>` : ''}
            ${t.blocked ? '<span class="tag ghost">🔒 Bloqué</span>' : ''}
            ${unmet.length ? `<span class="tag due" title="${unmet.map(d => escapeHtml(d.title)).join(', ')}">⏳ ${unmet.length}</span>` : ''}
            ${kids.length ? `<span class="tag ghost">📁 ${subtaskDoneCount(t.id)}/${subtaskCount(t.id)}</span>` : ''}
            ${calc.effectiveDuration(t) === 'long' ? '<span class="tag ghost">Long</span>' : ''}
            ${t.tag ? `<span class="tag ghost">${escapeHtml(t.tag)}</span>` : ''}
          </div>
          <div class="t-prog">${progressBar(calc.effectiveProgress(t))}</div>
        </div>
        <div class="t-side">
          <span class="t-cat" title="${cat.label}">${cat.icon}</span>
          ${canAdd ? `<button type="button" class="t-add" data-act="add" title="${calc.typeAtDepth(depth + 1).add}" aria-label="${calc.typeAtDepth(depth + 1).add}">+</button>` : ''}
        </div>
      </div>`;
    const children = open
      ? `<ul class="tchildren">${kids.map(k => nodeHtml(k, depth + 1)).join('')}</ul>`
      : '';
    return `<li class="tli">${head}${children}</li>`;
  }

  function render(){
    const roots = state.tasks.filter(t => !t.parentId).sort(bySCore);
    if(!seeded && state.tasks.length){
      roots.forEach(r => { if(childrenOf(r.id).length) expanded.add(r.id); });
      seeded = true;
    }
    document.getElementById('tree-legend').style.display = roots.length ? '' : 'none';
    if(!roots.length){
      root.innerHTML = `<div class="empty-state"><span class="ic">🌳</span><strong>Aucun projet pour l'instant</strong><span>Ajoutez-en un avec le bouton +</span></div>`;
      return;
    }
    root.classList.toggle('with-deps', showDeps);
    root.innerHTML = `<ul class="tree">${roots.map(r => nodeHtml(r, 0)).join('')}</ul>`;
    drawArrows();
  }

  function renderLegend(){
    document.getElementById('tree-legend').innerHTML =
      Object.entries(DOMAINS).map(([k, d]) => `<span class="dom-${k}"><i class="sw"></i>${d.label}</span>`).join('') +
      `<span>Bordure épaisse = complexité élevée</span>` +
      `<span><svg class="tl-arrow" width="34" height="10"><path d="M1,5 H28" class="tdep unmet"/><path d="M26,1 L33,5 L26,9 z" fill="#F0631E"/></svg>attend la fin de l'autre (grisé : terminé ; en points : branche repliée)</span>`;
  }

  /* ---------- Interactions (délégation : le contenu est reconstruit à chaque rendu) ---------- */
  root.addEventListener('click', (ev)=>{
    const node = ev.target.closest('.tnode');
    if(!node) return;
    const id = node.dataset.id;
    const actEl = ev.target.closest('[data-act]');
    const act = actEl ? actEl.dataset.act : null;
    if(act === 'toggle'){
      if(expanded.has(id)) expanded.delete(id); else expanded.add(id);
      render();
    } else if(act === 'add'){
      // Ajoute un enfant : on « zoome » sur le parent (le bandeau « Retour » l'indique) puis on ouvre la feuille
      expanded.add(id);
      state.activeParentId = id;
      App.renderAll();
      App.sheet.open(null);
    } else {
      App.sheet.open(id);
    }
  });

  document.getElementById('tree-expand').addEventListener('click', ()=>{
    state.tasks.forEach(t => { if(childrenOf(t.id).length) expanded.add(t.id); });
    render();
  });
  document.getElementById('tree-collapse').addEventListener('click', ()=>{
    expanded.clear();
    render();
  });

  document.getElementById('tree-deps').addEventListener('click', (ev)=>{
    showDeps = !showDeps;
    ev.currentTarget.setAttribute('aria-pressed', showDeps ? 'true' : 'false');
    ev.currentTarget.classList.toggle('on', showDeps);
    render();
  });
  window.addEventListener('resize', scheduleArrows);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleArrows);

  renderLegend();
  App.tree = { render };
})();
