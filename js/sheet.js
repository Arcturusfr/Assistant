/* ==========================================================================
   Assistant — js/sheet.js
   Version : V002 — 2026-10-12 18:47 (heure de Paris)
   Modifs  : Extrait de index.html (V01). Feuille modale de création/édition
             de tâche : formulaire, dépendances, sous-tâches, enregistrer,
             supprimer, bouton +.
   Dépend de : config.js, state.js, helpers.js
   Expose    : App.sheet.open(id|null), App.sheet.close()
   ========================================================================== */
(function(){
  "use strict";
  const { CATEGORIES, STATUSES } = App.config;
  const state = App.state;
  const { uid, persist, findTask, subtaskCount, subtaskDoneCount, enterSubtasks, unmetDependencies, isBlockedByDeps, wouldCreateCycle } = App.model;
  const { toast, escapeHtml } = App.helpers;

  const backdrop = document.getElementById('sheet-backdrop');
  const fTitle = document.getElementById('f-title');
  const fCategory = document.getElementById('f-category');
  const fUrgency = document.getElementById('f-urgency');
  const fImportance = document.getElementById('f-importance');
  const fComplexity = document.getElementById('f-complexity');
  const fDue = document.getElementById('f-due');
  const fStatus = document.getElementById('f-status');
  const fNotes = document.getElementById('f-notes');
  const fDepSearch = document.getElementById('f-dep-search');
  const fDependencies = document.getElementById('f-dependencies');
  const depBanner = document.getElementById('dep-pending-banner');

  function buildCatPicker(selected){
    fCategory.innerHTML = Object.entries(CATEGORIES).map(([k,c])=>
      `<div class="cat-opt ${k===selected?'sel':''}" data-cat="${k}"><span class="ic">${c.icon}</span>${c.label}</div>`
    ).join('');
    fCategory.querySelectorAll('.cat-opt').forEach(el=>{
      el.addEventListener('click', ()=>{
        fCategory.querySelectorAll('.cat-opt').forEach(o=>o.classList.remove('sel'));
        el.classList.add('sel');
      });
    });
  }
  function buildStatusPicker(selected){
    fStatus.innerHTML = STATUSES.map(s=>`<div class="status-opt ${s.id===selected?'sel':''}" data-status="${s.id}">${s.label}</div>`).join('');
    fStatus.querySelectorAll('.status-opt').forEach(el=>{
      el.addEventListener('click', ()=>{
        fStatus.querySelectorAll('.status-opt').forEach(o=>o.classList.remove('sel'));
        el.classList.add('sel');
      });
    });
  }
  [['f-urgency','f-urgency-val'], ['f-importance','f-importance-val'], ['f-complexity','f-complexity-val']].forEach(([inputId,valId])=>{
    document.getElementById(inputId).addEventListener('input', e=>{
      document.getElementById(valId).textContent = e.target.value;
    });
  });

  // Dépendances cochées pendant que la feuille est ouverte (séparées de `state.tasks`
  // jusqu'à l'appui sur Enregistrer)
  let selectedDeps = [];
  let currentDepScope = null;

  function buildDepPicker(currentId, filterText, scopeParentId){
    const q = (filterText || '').trim().toLowerCase();
    const candidates = state.tasks.filter(t=>{
      if(currentId && t.id === currentId) return false; // pas de dépendance à soi-même
      if((t.parentId || null) !== scopeParentId) return false; // seulement les tâches du même niveau
      if(q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
    if(candidates.length === 0){
      fDependencies.innerHTML = `<div class="dep-empty">Aucune tâche${q ? ' ne correspond' : ' disponible'}</div>`;
      return;
    }
    fDependencies.innerHTML = candidates.map(t=>{
      const cat = CATEGORIES[t.category] || CATEGORIES.autre;
      const checked = selectedDeps.includes(t.id);
      const cyclic = currentId ? wouldCreateCycle(currentId, t.id) : false;
      return `<div class="dep-row ${checked?'checked':''} ${cyclic?'disabled':''}" data-id="${t.id}" ${cyclic?'title="Créerait une dépendance circulaire"':''}>
        <span class="dep-check">${checked?'✓':''}</span>
        <span class="dep-cat">${cat.icon}</span>
        <span class="dep-title">${escapeHtml(t.title)}</span>
        ${t.status==='done' ? '<span class="dep-done-tag">Fait</span>' : ''}
      </div>`;
    }).join('');
    fDependencies.querySelectorAll('.dep-row:not(.disabled)').forEach(row=>{
      row.addEventListener('click', ()=>{
        const id = row.dataset.id;
        if(selectedDeps.includes(id)) selectedDeps = selectedDeps.filter(d=>d!==id);
        else selectedDeps.push(id);
        buildDepPicker(currentId, fDepSearch.value, scopeParentId);
      });
    });
  }

  function renderDepBanner(t){
    if(!t){ depBanner.style.display = 'none'; return; }
    const unmet = unmetDependencies(t);
    if(unmet.length === 0){ depBanner.style.display = 'none'; return; }
    depBanner.style.display = 'block';
    depBanner.innerHTML = `<div class="dep-banner"><span class="ic">🔒</span><div>
      <b>En attente de ${unmet.length} tâche${unmet.length>1?'s':''}</b>
      ${unmet.map(d=>escapeHtml(d.title)).join(' · ')}
    </div></div>`;
  }

  // Le bloc « Sous-tâches » ne concerne que les tâches globales (une sous-tâche ne peut
  // pas avoir de sous-tâches). Pour une nouvelle tâche, il faut d'abord l'enregistrer.
  function updateSubtasksField(t){
    const field = document.getElementById('subtasks-field');
    const box = document.getElementById('subtasks-box');
    const isTopLevelContext = t ? !t.parentId : (state.activeParentId === null);
    if(!isTopLevelContext){ field.style.display = 'none'; return; }
    field.style.display = 'block';
    if(!t){
      box.innerHTML = `<div class="subtasks-hint">Enregistrez d'abord la tâche pour pouvoir lui ajouter des sous-tâches.</div>`;
      return;
    }
    const count = subtaskCount(t.id), done = subtaskDoneCount(t.id);
    box.innerHTML = `<button type="button" class="subtasks-open-btn" id="subtasks-open-btn">📁 ${count ? `${done}/${count} sous-tâche${count>1?'s':''}` : 'Ajouter des sous-tâches'} →</button>`;
    document.getElementById('subtasks-open-btn').addEventListener('click', ()=>{
      close();
      enterSubtasks(t.id);
    });
  }

  function open(id){
    state.editingId = id || null;
    const t = id ? findTask(id) : null;
    document.getElementById('sheet-title').textContent = t ? 'Modifier la tâche' : (state.activeParentId ? 'Nouvelle sous-tâche' : 'Nouvelle tâche');
    document.getElementById('btn-delete').style.display = t ? 'block' : 'none';

    fTitle.value = t ? t.title : '';
    buildCatPicker(t ? t.category : 'achat');
    fUrgency.value = t ? t.urgency : 3; document.getElementById('f-urgency-val').textContent = fUrgency.value;
    fImportance.value = t ? t.importance : 3; document.getElementById('f-importance-val').textContent = fImportance.value;
    fComplexity.value = t ? t.complexity : 2; document.getElementById('f-complexity-val').textContent = fComplexity.value;
    fDue.value = t && t.due ? t.due : '';
    buildStatusPicker(t ? t.status : 'todo');
    fNotes.value = t ? (t.notes||'') : '';

    const depScope = t ? (t.parentId || null) : state.activeParentId;
    currentDepScope = depScope;
    selectedDeps = t ? (t.dependsOn || []).slice() : [];
    fDepSearch.value = '';
    buildDepPicker(state.editingId, '', depScope);
    renderDepBanner(t);
    updateSubtasksField(t);

    backdrop.classList.add('open');
    setTimeout(()=> fTitle.focus(), 50);
  }
  function close(){
    backdrop.classList.remove('open');
    state.editingId = null;
  }

  function save(){
    const title = fTitle.value.trim();
    if(!title){ toast('Ajoutez un titre'); fTitle.focus(); return; }
    const cat = fCategory.querySelector('.cat-opt.sel')?.dataset.cat || 'achat';
    const status = fStatus.querySelector('.status-opt.sel')?.dataset.status || 'todo';
    const dependsOn = selectedDeps.slice();

    let savedTask;
    if(state.editingId){
      const t = findTask(state.editingId);
      Object.assign(t, {
        title, category:cat,
        urgency:Number(fUrgency.value), importance:Number(fImportance.value), complexity:Number(fComplexity.value),
        due: fDue.value || null, status, notes: fNotes.value.trim(), dependsOn
      });
      savedTask = t;
    } else {
      savedTask = {
        id: uid(), title, category:cat,
        urgency:Number(fUrgency.value), importance:Number(fImportance.value), complexity:Number(fComplexity.value),
        due: fDue.value || null, status, notes: fNotes.value.trim(), dependsOn,
        parentId: state.activeParentId, createdAt: new Date().toISOString()
      };
      state.tasks.push(savedTask);
    }
    persist();
    close();
    App.renderAll();
    if(status === 'done' && isBlockedByDeps(savedTask)){
      toast('Enregistré — attention, des dépendances ne sont pas encore terminées');
    } else {
      toast('Enregistré');
    }
  }

  function remove(){
    if(!state.editingId) return;
    // Supprimer une tâche globale supprime aussi ses sous-tâches
    const idsToDelete = new Set([state.editingId, ...state.tasks.filter(t=>t.parentId===state.editingId).map(t=>t.id)]);
    state.tasks = state.tasks.filter(t=>!idsToDelete.has(t.id));
    // Nettoyage : aucune autre tâche ne doit pointer vers une dépendance supprimée
    state.tasks.forEach(t=>{
      if(t.dependsOn) t.dependsOn = t.dependsOn.filter(id=>!idsToDelete.has(id));
    });
    persist();
    close();
    App.renderAll();
    toast(idsToDelete.size > 1 ? 'Tâche et ses sous-tâches supprimées' : 'Tâche supprimée');
  }

  fDepSearch.addEventListener('input', ()=> buildDepPicker(state.editingId, fDepSearch.value, currentDepScope));
  document.getElementById('fab-add').addEventListener('click', ()=> open(null));
  document.getElementById('btn-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e)=>{ if(e.target === backdrop) close(); });
  document.getElementById('btn-save').addEventListener('click', save);
  document.getElementById('btn-delete').addEventListener('click', remove);

  App.sheet = { open, close };
})();
