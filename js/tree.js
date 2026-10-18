/* ==========================================================================
   Assistant — js/tree.js
   Version : V005 — 2026-10-18 15:16 (heure de Paris)
   Modifs  : Nouveau fichier. Vue Arbre (sans flèches de dépendance) : tout l'arbre Projet › Tâche ›
             Sous-tâche, accordéon, couleur de fond = domaine du projet racine, épaisseur de
             bordure = complexité effective, pastille d'urgence, barre de progression, icône
             de catégorie, bouton + pour ajouter un enfant. L'arbre ignore le « zoom » des autres vues.
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
    root.innerHTML = `<ul class="tree">${roots.map(r => nodeHtml(r, 0)).join('')}</ul>`;
  }

  function renderLegend(){
    document.getElementById('tree-legend').innerHTML =
      Object.entries(DOMAINS).map(([k, d]) => `<span class="dom-${k}"><i class="sw"></i>${d.label}</span>`).join('') +
      `<span>Bordure épaisse = complexité élevée</span>`;
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

  renderLegend();
  App.tree = { render };
})();
