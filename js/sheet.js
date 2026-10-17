/* ==========================================================================
   Assistant — js/sheet.js
   Version : V004a — 2026-10-17 15:20 (heure de Paris)
   Modifs  : Feuille adaptée au nouveau modèle (4 niveaux, statut → taux d'exécution
             + Bloqué, complexité et statut calculés pour un parent), dépendances
             entre niveaux / branches (avec chemin et garde-fous), contenu sur 3 niveaux
             (Projet › Tâche › Sous-tâche), suppression récursive. Les nouveaux champs
             (durée, taux, domaine, étiquette, début) viendront avec l'interface V004b.
   Dépend de : config.js, state.js, calc.js, helpers.js
   Expose    : App.sheet.open(id|null), App.sheet.close()
   ========================================================================== */
(function(){
  "use strict";
  const { CATEGORIES, STATUSES, MAX_DEPTH } = App.config;
  const state = App.state;
  const { uid, persist, findTask, childrenOf, descendantsOf, ancestorsOf, depthOf, subtaskCount, subtaskDoneCount, enterSubtasks, unmetDependencies, isBlockedByDeps, canDependOn } = App.model;
  const calc = App.calc;
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
  const complexityHint = document.getElementById('f-complexity-hint');
  const statusHint = document.getElementById('f-status-hint');

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
  // Urgence modifiée par l'utilisateur : l'élément passe en saisie manuelle à l'enregistrement
  let urgencyTouched = false;
  fUrgency.addEventListener('input', ()=>{ urgencyTouched = true; });

  // Dépendances cochées pendant que la feuille est ouverte (séparées de `state.tasks`
  // jusqu'à l'appui sur Enregistrer)
  let selectedDeps = [];

  function pathOf(t){
    return ancestorsOf(t.id).reverse().map(a=>a.title).join(' › ');
  }

  // Toutes les tâches de l'arbre sont candidates (niveaux et branches différents)
  function buildDepPicker(currentId, filterText){
    const q = (filterText || '').trim().toLowerCase();
    const candidates = state.tasks.filter(t=>{
      if(currentId && t.id === currentId) return false; // pas de dépendance à soi-même
      if(q && !(t.title.toLowerCase().includes(q) || pathOf(t).toLowerCase().includes(q))) return false;
      return true;
    });
    if(candidates.length === 0){
      fDependencies.innerHTML = `<div class="dep-empty">Aucun élément${q ? ' ne correspond' : ' disponible'}</div>`;
      return;
    }
    fDependencies.innerHTML = candidates.map(t=>{
      const cat = CATEGORIES[t.category] || CATEGORIES.autre;
      const checked = selectedDeps.includes(t.id);
      const forbidden = currentId ? !canDependOn(currentId, t.id) : false;
      const path = pathOf(t);
      return `<div class="dep-row ${checked?'checked':''} ${forbidden?'disabled':''}" data-id="${t.id}" ${forbidden?'title="Impossible : parent, sous-élément ou dépendance circulaire"':''}>
        <span class="dep-check">${checked?'✓':''}</span>
        <span class="dep-cat">${cat.icon}</span>
        <span class="dep-main"><span class="dep-title">${escapeHtml(t.title)}</span>${path ? `<span class="dep-path">${escapeHtml(path)}</span>` : ''}</span>
        ${calc.isDone(t) ? '<span class="dep-done-tag">Fait</span>' : ''}
      </div>`;
    }).join('');
    fDependencies.querySelectorAll('.dep-row:not(.disabled)').forEach(row=>{
      row.addEventListener('click', ()=>{
        const id = row.dataset.id;
        if(selectedDeps.includes(id)) selectedDeps = selectedDeps.filter(d=>d!==id);
        else selectedDeps.push(id);
        buildDepPicker(currentId, fDepSearch.value);
      });
    });
  }

  function renderDepBanner(t){
    if(!t){ depBanner.style.display = 'none'; return; }
    const unmet = unmetDependencies(t);
    if(unmet.length === 0){ depBanner.style.display = 'none'; return; }
    depBanner.style.display = 'block';
    depBanner.innerHTML = `<div class="dep-banner"><span class="ic">⏳</span><div>
      <b>En attente de ${unmet.length} élément${unmet.length>1?'s':''}</b>
      ${unmet.map(d=>escapeHtml(d.title)).join(' · ')}
    </div></div>`;
  }

  // Le bloc de contenu (Tâches / Sous-tâches) n'existe que si le niveau suivant est autorisé.
  // Pour un nouvel élément, il faut d'abord l'enregistrer.
  function updateSubtasksField(t){
    const field = document.getElementById('subtasks-field');
    const box = document.getElementById('subtasks-box');
    const label = document.getElementById('subtasks-label');
    const depth = t ? depthOf(t) : calc.contextDepth();
    if(depth >= MAX_DEPTH - 1){ field.style.display = 'none'; return; }
    const childWord = calc.typeAtDepth(depth).children;
    label.textContent = childWord;
    field.style.display = 'block';
    if(!t){
      box.innerHTML = `<div class="subtasks-hint">Enregistrez d'abord cet élément pour pouvoir lui ajouter des ${childWord.toLowerCase()}.</div>`;
      return;
    }
    const count = subtaskCount(t.id), done = subtaskDoneCount(t.id);
    box.innerHTML = `<button type="button" class="subtasks-open-btn" id="subtasks-open-btn">📁 ${count ? `${done}/${count} ${childWord.toLowerCase()}` : 'Ajouter des ' + childWord.toLowerCase()} →</button>`;
    document.getElementById('subtasks-open-btn').addEventListener('click', ()=>{
      close();
      enterSubtasks(t.id);
    });
  }

  function open(id){
    state.editingId = id || null;
    const t = id ? findTask(id) : null;
    const type = t ? calc.typeOf(t) : calc.typeAtDepth(calc.contextDepth());
    document.getElementById('sheet-title').textContent = t ? type.editTitle : type.newTitle;
    document.getElementById('btn-delete').style.display = t ? 'block' : 'none';

    const isParent = !!t && !calc.isLeaf(t);

    fTitle.value = t ? t.title : '';
    buildCatPicker(t ? t.category : 'achat');

    urgencyTouched = false;
    fUrgency.value = t ? calc.ownUrgency(t) : 2; document.getElementById('f-urgency-val').textContent = fUrgency.value;
    fImportance.value = t ? t.importance : 2; document.getElementById('f-importance-val').textContent = fImportance.value;
    fComplexity.value = t ? calc.effectiveComplexity(t) : 2; document.getElementById('f-complexity-val').textContent = fComplexity.value;
    fComplexity.disabled = isParent;
    complexityHint.style.display = isParent ? 'block' : 'none';
    complexityHint.textContent = isParent ? 'Calculée à partir du contenu (non modifiable ici).' : '';

    fDue.value = t && t.due ? t.due : '';
    buildStatusPicker(t ? calc.columnOf(t) : 'todo');
    statusHint.style.display = isParent ? 'block' : 'none';
    statusHint.textContent = isParent ? 'Statut calculé à partir du contenu : seul « Bloqué » est modifiable.' : '';
    fNotes.value = t ? (t.notes||'') : '';

    selectedDeps = t ? (t.dependsOn || []).slice() : [];
    fDepSearch.value = '';
    buildDepPicker(state.editingId, '');
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
    const col = fStatus.querySelector('.status-opt.sel')?.dataset.status || 'todo';
    const dependsOn = selectedDeps.slice();

    let savedTask;
    if(state.editingId){
      const t = findTask(state.editingId);
      const isParent = !calc.isLeaf(t);
      Object.assign(t, {
        title, category:cat, importance:Number(fImportance.value),
        due: fDue.value || null, notes: fNotes.value.trim(), dependsOn
      });
      // Urgence : on ne bascule en manuel que si l'utilisateur y a touché (ou si elle l'était déjà)
      if(urgencyTouched || t.urgencyMode !== 'auto'){
        t.urgency = Number(fUrgency.value);
        t.urgencyMode = 'manual';
      }
      if(!isParent) t.complexity = Number(fComplexity.value);
      if(isParent) t.blocked = (col === 'blocked');   // taux et statut restent calculés
      else calc.applyColumn(t, col);
      savedTask = t;
    } else {
      savedTask = {
        id: uid(), title, category:cat,
        parentId: state.activeParentId,
        domain: state.activeParentId ? null : 'autre',
        urgency:Number(fUrgency.value), urgencyMode:'manual',
        importance:Number(fImportance.value), complexity:Number(fComplexity.value),
        duration:'court', progress:0, blocked:false, tag:'', startDate:null,
        due: fDue.value || null, notes: fNotes.value.trim(), dependsOn,
        createdAt: new Date().toISOString()
      };
      calc.applyColumn(savedTask, col);
      state.tasks.push(savedTask);
    }
    persist();
    close();
    App.renderAll();
    if(col === 'done' && isBlockedByDeps(savedTask)){
      toast('Enregistré — attention, des dépendances ne sont pas encore terminées');
    } else {
      toast('Enregistré');
    }
  }

  function remove(){
    if(!state.editingId) return;
    // Supprimer un élément supprime aussi tout son contenu
    const idsToDelete = new Set([state.editingId, ...descendantsOf(state.editingId).map(t=>t.id)]);
    state.tasks = state.tasks.filter(t=>!idsToDelete.has(t.id));
    // Nettoyage : aucun autre élément ne doit pointer vers une dépendance supprimée
    state.tasks.forEach(t=>{
      if(t.dependsOn) t.dependsOn = t.dependsOn.filter(id=>!idsToDelete.has(id));
    });
    persist();
    close();
    App.renderAll();
    toast(idsToDelete.size > 1 ? 'Élément et son contenu supprimés' : 'Élément supprimé');
  }

  fDepSearch.addEventListener('input', ()=> buildDepPicker(state.editingId, fDepSearch.value));
  document.getElementById('fab-add').addEventListener('click', ()=> open(null));
  document.getElementById('btn-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e)=>{ if(e.target === backdrop) close(); });
  document.getElementById('btn-save').addEventListener('click', save);
  document.getElementById('btn-delete').addEventListener('click', remove);

  App.sheet = { open, close };
})();
