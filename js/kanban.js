/* ==========================================================================
   Assistant — js/kanban.js
   Version : V004a — 2026-10-17 15:20 (heure de Paris)
   Modifs  : Colonnes déduites du taux d'exécution (+ indicateur Bloqué), urgence effective
             (↑ si héritée), « en attente » (⏳) distinct de « Bloqué » (🔒) ; déplacer
             un parent ne change que son indicateur Bloqué (statut calculé).
   Dépend de : config.js, state.js, calc.js, helpers.js (appelle App.sheet à l'exécution)
   ========================================================================== */
(function(){
  "use strict";
  const { CATEGORIES, STATUSES } = App.config;
  const { findTask, scopedTasks, unmetDependencies, subtaskCount, subtaskDoneCount, persist } = App.model;
  const { dueLabel, scoreOf, escapeHtml, toast } = App.helpers;
  const calc = App.calc;

  let kanbanDrag = null;

  function render(){
    const root = document.getElementById('kanban-root');
    root.innerHTML = "";
    STATUSES.forEach(s=>{
      const col = document.createElement('div');
      col.className = 'kcol';
      col.dataset.status = s.id;
      const list = scopedTasks().filter(t=>calc.columnOf(t) === s.id).sort((a,b)=> scoreOf(b)-scoreOf(a));
      col.innerHTML = `<div class="kcol-head"><span class="kcol-title">${s.label}</span><span class="kcol-count">${list.length}</span></div>
                        <div class="kcol-body" data-status="${s.id}"></div>`;
      root.appendChild(col);
      const body = col.querySelector('.kcol-body');
      list.forEach(t=> body.appendChild(makeCard(t)));
    });
  }

  function makeCard(t){
    const cat = CATEGORIES[t.category] || CATEGORIES.autre;
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = t.id;
    const due = dueLabel(t.due);
    const unmet = unmetDependencies(t);
    const subCount = subtaskCount(t.id);
    const eff = calc.effectiveUrgency(t);
    const ui = eff === null ? `I${t.importance}` : `U${eff}${calc.isUrgencyInherited(t) ? '↑' : ''} · I${t.importance}`;
    card.innerHTML = `
      <div class="card-top"><span class="card-cat">${cat.icon}</span><span class="card-title">${escapeHtml(t.title)}</span></div>
      <div class="card-meta">
        <span class="tag ghost">${ui}</span>
        ${due ? `<span class="tag ${due.cls}">${due.text}</span>` : ''}
        ${unmet.length ? `<span class="tag due" title="${unmet.map(d=>escapeHtml(d.title)).join(', ')}"><span class="lock-badge">⏳</span> ${unmet.length}</span>` : ''}
        ${subCount ? `<span class="tag ghost">📁 ${subtaskDoneCount(t.id)}/${subCount}</span>` : ''}
      </div>`;
    card.addEventListener('pointerdown', onCardPointerDown);
    card.addEventListener('click', ()=>{ if(!card._dragged) App.sheet.open(t.id); });
    return card;
  }

  function onCardPointerDown(ev){
    const card = ev.currentTarget;
    card._dragged = false;
    const startX = ev.clientX, startY = ev.clientY;

    // Le repère a la taille de la carte déplacée, pas celle de la colonne.
    const rect = card.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.className = 'card-placeholder';
    placeholder.style.height = rect.height + 'px';

    kanbanDrag = { id: card.dataset.id, card, placeholder };
    card.setPointerCapture(ev.pointerId);

    function positionPlaceholder(clientX, clientY){
      const el = document.elementFromPoint(clientX, clientY);
      const body = el && el.closest && el.closest('.kcol-body');
      if(!body) return;
      const siblings = Array.from(body.querySelectorAll('.card:not(.dragging)'));
      let target = null;
      for(const sib of siblings){
        const r = sib.getBoundingClientRect();
        if(clientY < r.top + r.height / 2){ target = sib; break; }
      }
      if(target) body.insertBefore(placeholder, target);
      else body.appendChild(placeholder);
    }

    function move(e){
      if(!card._dragged && Math.hypot(e.clientX-startX, e.clientY-startY) > 8){
        card._dragged = true;
        card.classList.add('dragging');
        card.parentElement.insertBefore(placeholder, card.nextSibling);
      }
      if(!card._dragged) return;
      positionPlaceholder(e.clientX, e.clientY);
    }
    function up(){
      card.classList.remove('dragging');
      if(card._dragged){
        const body = placeholder.parentElement;
        if(body && body.classList.contains('kcol-body')){
          const t = findTask(kanbanDrag.id);
          if(t){
            const r = calc.applyColumn(t, body.dataset.status);
            persist();
            if(r === 'computed') toast('Statut calculé à partir du contenu : seul « Bloqué » est modifiable');
          }
        }
      }
      placeholder.remove();
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerup', up);
      card.removeEventListener('pointercancel', up);
      kanbanDrag = null;
      render();
    }
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
  }

  App.kanban = { render };
})();
