/* ==========================================================================
   Assistant — js/list.js
   Version : V002 — 2026-10-12 18:47 (heure de Paris)
   Modifs  : Extrait de index.html (V01). Vue Liste : filtres par catégorie
             et lignes triées par score.
   Dépend de : config.js, state.js, helpers.js (appelle App.sheet à l'exécution)
   ========================================================================== */
(function(){
  "use strict";
  const { CATEGORIES, STATUSES } = App.config;
  const state = App.state;
  const { scopedTasks, unmetDependencies, subtaskCount, subtaskDoneCount } = App.model;
  const { dueLabel, scoreOf, escapeHtml } = App.helpers;

  function renderFilters(){
    const wrap = document.getElementById('list-filters');
    const opts = [{id:'all', label:'Toutes'}, ...Object.entries(CATEGORIES).map(([k,c])=>({id:k, label:c.icon+' '+c.label}))];
    wrap.innerHTML = opts.map(o=>`<button class="chip ${state.listFilter===o.id?'active':''}" data-f="${o.id}">${o.label}</button>`).join('');
    wrap.querySelectorAll('.chip').forEach(ch=>{
      ch.addEventListener('click', ()=>{ state.listFilter = ch.dataset.f; render(); renderFilters(); });
    });
  }

  function render(){
    const root = document.getElementById('list-root');
    let list = scopedTasks();
    if(state.listFilter !== 'all') list = list.filter(t=>t.category===state.listFilter);
    list.sort((a,b)=> scoreOf(b)-scoreOf(a));
    document.getElementById('list-count-sub').textContent = `${list.length} tâche${list.length>1?'s':''}`;

    if(list.length === 0){
      const msg = state.activeParentId ? 'Ajoutez une sous-tâche avec le bouton +' : 'Ajoutez une tâche avec le bouton +';
      root.innerHTML = `<div class="empty-state"><span class="ic">🗂️</span><strong>Rien ici</strong><span>${msg}</span></div>`;
      return;
    }
    root.innerHTML = "";
    list.forEach(t=>{
      const cat = CATEGORIES[t.category] || CATEGORIES.autre;
      const due = dueLabel(t.due);
      const unmet = unmetDependencies(t);
      const subCount = subtaskCount(t.id);
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `
        <span class="list-cat">${cat.icon}</span>
        <div class="list-main">
          <div class="list-title">${escapeHtml(t.title)}</div>
          <div class="list-sub">${STATUSES.find(s=>s.id===t.status).label}${due ? ' · '+due.text : ''}${unmet.length ? ` · 🔒 en attente de ${unmet.length}` : ''}${subCount ? ` · 📁 ${subtaskDoneCount(t.id)}/${subCount} sous-tâches` : ''}</div>
        </div>
        <div class="list-score">score<b>${Math.round(scoreOf(t))}</b></div>`;
      row.addEventListener('click', ()=> App.sheet.open(t.id));
      root.appendChild(row);
    });
  }

  App.list = { render, renderFilters };
})();
