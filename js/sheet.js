/* ==========================================================================
   Assistant — js/sheet.js
   Version : V004b — 2026-10-18 00:40 (heure de Paris)
   Modifs  : Feuille refaite : sélecteurs à boutons (urgence, importance, complexité, durée,
             taux d'exécution) qui ne couvrent pas toute la largeur et ne réagissent qu'à un
             tap (le défilement vertical ne change plus de valeur) ; urgence Auto / Manuelle
             (valeur proposée depuis l'échéance, détail propre / héritée) ; interrupteur Bloqué ;
             durée Court / Long ; domaine (projets) ; étiquette libre ; date de début.
             Le statut n'est plus saisi : il est déduit du taux.
   Dépend de : config.js, state.js, calc.js, helpers.js
   Expose    : App.sheet.open(id|null), App.sheet.close()
   ========================================================================== */
(function(){
  "use strict";
  const { CATEGORIES, DOMAINS, DURATIONS, STATUSES, MAX_DEPTH, LEVELS, PROGRESS_MAX } = App.config;
  const state = App.state;
  const { uid, persist, findTask, childrenOf, descendantsOf, ancestorsOf, depthOf, subtaskCount, subtaskDoneCount, enterSubtasks, unmetDependencies, isBlockedByDeps, canDependOn } = App.model;
  const calc = App.calc;
  const { toast, escapeHtml, daysUntil } = App.helpers;

  const $ = id => document.getElementById(id);
  const backdrop = $('sheet-backdrop');
  const fTitle = $('f-title'), fCategory = $('f-category'), fDomain = $('f-domain');
  const fUrgency = $('f-urgency'), fUrgencyMode = $('f-urgency-mode'), urgencyHint = $('f-urgency-hint');
  const fImportance = $('f-importance');
  const fComplexity = $('f-complexity'), complexityHint = $('f-complexity-hint');
  const fDuration = $('f-duration'), durationHint = $('f-duration-hint');
  const fProgress = $('f-progress'), fBlocked = $('f-blocked'), progressHint = $('f-progress-hint');
  const fStart = $('f-start'), fDue = $('f-due'), fTag = $('f-tag'), fNotes = $('f-notes');
  const fDepSearch = $('f-dep-search'), fDependencies = $('f-dependencies');
  const depBanner = $('dep-pending-banner');

  /* État du formulaire (séparé de state.tasks jusqu'à « Enregistrer ») */
  let form = null;
  let selectedDeps = [];

  const levelOptions = (n, cls) => Array.from({length:n}, (_,i)=>({ value:i+1, label:String(i+1), cls: cls ? cls+(i+1) : '' }));

  /* Sélecteur à boutons : un tap choisit ; les boutons laissent passer le défilement vertical. */
  function buildSeg(el, options, value, onPick, opts){
    opts = opts || {};
    el.classList.toggle('disabled', !!opts.disabled);
    el.innerHTML = options.map((o,i)=>
      `<button type="button" class="seg-btn ${o.cls||''} ${o.value===value?'sel':''} ${o.off?'opt-off':''}" data-i="${i}" ${opts.disabled?'disabled':''}>${o.label}</button>`
    ).join('');
    if(opts.disabled) return;
    el.querySelectorAll('.seg-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const o = options[Number(btn.dataset.i)];
        if(o.off){ if(o.offMsg) toast(o.offMsg); return; }
        onPick(o.value);
      });
    });
  }

  /* ---------- Catégorie / domaine ---------- */
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
  function buildDomainPicker(){
    fDomain.innerHTML = Object.entries(DOMAINS).map(([k,d])=>
      `<button type="button" class="dom-opt ${k===form.domain?'sel':''}" data-d="${k}">${d.label}</button>`).join('');
    fDomain.querySelectorAll('.dom-opt').forEach(el=>{
      el.addEventListener('click', ()=>{ form.domain = el.dataset.d; buildDomainPicker(); });
    });
  }

  /* ---------- Urgence ---------- */
  function dueText(dateStr){
    const n = daysUntil(dateStr);
    if(n === null) return '';
    if(n < 0) return `en retard de ${Math.abs(n)} j`;
    if(n === 0) return "aujourd'hui";
    return `dans ${n} j`;
  }
  // Urgence la plus haute parmi le contenu non terminé (héritage)
  function childrenUrgency(t){
    let m = 0;
    if(!t) return m;
    childrenOf(t.id).forEach(k=>{ const e = calc.effectiveUrgency(k); if(e !== null && e > m) m = e; });
    return m;
  }
  function currentUrgencyShown(){
    if(form.urgencyMode === 'auto' && fDue.value){
      const u = calc.urgencyFromDue(fDue.value);
      if(u !== null) return u;
    }
    return form.urgency;
  }
  function renderUrgency(){
    const hasDue = !!fDue.value;
    const auto = form.urgencyMode === 'auto' && hasDue;
    const shown = currentUrgencyShown();
    buildSeg(fUrgency, levelOptions(LEVELS, 'u'), shown, v=>{ form.urgency = v; form.urgencyTouched = true; renderUrgency(); }, {disabled: auto});
    buildSeg(fUrgencyMode, [
      { value:'auto',   label:'Auto',     off:!hasDue, offMsg:"Ajoutez d'abord une échéance" },
      { value:'manual', label:'Manuelle' }
    ], auto ? 'auto' : 'manual', v=>{
      if(v === 'manual'){ form.urgency = shown; form.urgencyMode = 'manual'; }   // la valeur calculée sert de point de départ
      else form.urgencyMode = 'auto';
      form.urgencyTouched = true;
      renderUrgency();
    });
    // Indications : origine de la valeur, héritage
    const lines = [];
    if(auto) lines.push(`Calculée depuis l'échéance (${dueText(fDue.value)}).`);
    else if(!hasDue) lines.push("Sans échéance, l'urgence est saisie. Ajoutez une échéance pour la calculer automatiquement.");
    const inh = childrenUrgency(form.task);
    if(inh > shown) lines.push(`↑ Urgence effective ${inh} : héritée de son contenu (propre : ${shown}).`);
    urgencyHint.innerHTML = lines.map(escapeHtml).join('<br>');
    urgencyHint.style.display = lines.length ? 'block' : 'none';
  }

  /* ---------- Complexité / durée / taux ---------- */
  function renderComplexity(){
    const parent = form.isParent;
    const v = parent ? calc.effectiveComplexity(form.task) : form.complexity;
    buildSeg(fComplexity, levelOptions(LEVELS), v, x=>{ form.complexity = x; renderComplexity(); }, {disabled: parent});
    complexityHint.style.display = parent ? 'block' : 'none';
    complexityHint.textContent = parent ? 'Calculée à partir du contenu (non modifiable ici).' : '';
  }
  function renderDuration(){
    const parent = form.isParent;
    const v = parent ? calc.effectiveDuration(form.task) : form.duration;
    buildSeg(fDuration, DURATIONS.map(d=>({ value:d.id, label:d.label })), v, x=>{ form.duration = x; renderDuration(); }, {disabled: parent});
    durationHint.style.display = parent ? 'block' : 'none';
    durationHint.textContent = parent ? 'Long dès qu’un élément du contenu est long (non modifiable ici).' : '';
  }
  function renderProgress(){
    const parent = form.isParent;
    const level = parent ? calc.effectiveProgress(form.task) : form.progress;
    const frozen = parent || form.blocked;
    buildSeg(fProgress, Array.from({length:PROGRESS_MAX+1}, (_,i)=>({ value:i, label:(i*25)+' %' })), level, x=>{ form.progress = x; renderProgress(); }, {disabled: frozen});
    fBlocked.classList.toggle('on', form.blocked);
    fBlocked.setAttribute('aria-pressed', form.blocked ? 'true' : 'false');
    const status = STATUSES.find(s => s.id === (level === 0 ? 'todo' : (level === PROGRESS_MAX ? 'done' : 'doing'))).label;
    const bits = [`Statut déduit : ${status}.`];
    if(parent) bits.push('Taux calculé à partir du contenu.');
    else if(form.blocked) bits.push('Bloqué : le taux est figé.');
    progressHint.textContent = bits.join(' ');
  }

  /* ---------- Dépendances ---------- */
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
    const field = $('subtasks-field');
    const box = $('subtasks-box');
    const label = $('subtasks-label');
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
    $('subtasks-open-btn').addEventListener('click', ()=>{
      close();
      enterSubtasks(t.id);
    });
  }

  /* ---------- Ouverture ---------- */
  function open(id){
    state.editingId = id || null;
    const t = id ? findTask(id) : null;
    const type = t ? calc.typeOf(t) : calc.typeAtDepth(calc.contextDepth());
    $('sheet-title').textContent = t ? type.editTitle : type.newTitle;
    $('btn-delete').style.display = t ? 'block' : 'none';

    const isRoot = t ? !t.parentId : state.activeParentId === null;
    form = {
      task: t,
      isParent: !!t && !calc.isLeaf(t),
      isRoot,
      urgency: t ? Number(t.urgency) : 2,
      urgencyMode: t ? t.urgencyMode : 'manual',
      urgencyTouched: false,
      importance: t ? t.importance : 2,
      complexity: t ? t.complexity : 2,
      duration: t ? t.duration : 'court',
      progress: t ? t.progress : 0,
      blocked: t ? !!t.blocked : false,
      domain: t ? (t.domain || 'autre') : 'autre'
    };
    // Une urgence « auto » sans échéance retombe sur la valeur saisie
    if(form.urgencyMode === 'auto' && !(t && t.due)) form.urgencyMode = 'manual';

    fTitle.value = t ? t.title : '';
    buildCatPicker(t ? t.category : 'achat');
    $('domain-field').style.display = isRoot ? 'block' : 'none';
    if(isRoot) buildDomainPicker();

    fDue.value = t && t.due ? t.due : '';
    fStart.value = t && t.startDate ? t.startDate : '';
    fTag.value = t ? (t.tag || '') : '';
    fNotes.value = t ? (t.notes||'') : '';

    renderUrgency();
    renderImportance();
    renderComplexity();
    renderDuration();
    renderProgress();

    selectedDeps = t ? (t.dependsOn || []).slice() : [];
    fDepSearch.value = '';
    buildDepPicker(state.editingId, '');
    renderDepBanner(t);
    updateSubtasksField(t);

    backdrop.classList.add('open');
    setTimeout(()=> fTitle.focus(), 50);
  }
  function renderImportance(){
    buildSeg(fImportance, levelOptions(LEVELS), form.importance, v=>{ form.importance = v; renderImportance(); }, {});
  }
  function close(){
    backdrop.classList.remove('open');
    state.editingId = null;
    form = null;
  }

  /* ---------- Enregistrement ---------- */
  function save(){
    const title = fTitle.value.trim();
    if(!title){ toast('Ajoutez un titre'); fTitle.focus(); return; }
    const cat = fCategory.querySelector('.cat-opt.sel')?.dataset.cat || 'achat';
    const due = fDue.value || null;
    const auto = form.urgencyMode === 'auto' && !!due;
    const common = {
      title, category:cat, importance:form.importance,
      due, startDate: fStart.value || null, tag: fTag.value.trim(),
      notes: fNotes.value.trim(), dependsOn: selectedDeps.slice(),
      urgencyMode: auto ? 'auto' : 'manual',
      blocked: form.blocked
    };
    // En mode manuel on mémorise la valeur affichée ; en auto on garde la dernière valeur saisie
    if(!auto) common.urgency = currentUrgencyShown();

    let savedTask;
    if(state.editingId){
      const t = findTask(state.editingId);
      Object.assign(t, common);
      if(form.isRoot) t.domain = form.domain;
      if(!form.isParent){            // feuille : complexité, durée et taux sont saisis
        t.complexity = form.complexity;
        t.duration = form.duration;
        t.progress = form.progress;
      }
      savedTask = t;
    } else {
      savedTask = Object.assign({
        id: uid(),
        parentId: state.activeParentId,
        domain: state.activeParentId ? null : form.domain,
        urgency: form.urgency,
        complexity: form.complexity, duration: form.duration, progress: form.progress,
        createdAt: new Date().toISOString()
      }, common);
      state.tasks.push(savedTask);
    }
    persist();
    close();
    App.renderAll();
    if(calc.isDone(savedTask) && isBlockedByDeps(savedTask)){
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

  /* ---------- Écouteurs ---------- */
  // Échéance : première saisie sans choix manuel → urgence automatique proposée ; échéance effacée → manuelle
  fDue.addEventListener('input', ()=>{
    if(!form) return;
    if(fDue.value && !form.urgencyTouched && form.urgencyMode === 'manual') form.urgencyMode = 'auto';
    else if(!fDue.value && form.urgencyMode === 'auto'){ form.urgency = currentUrgencyShown(); form.urgencyMode = 'manual'; }
    renderUrgency();
  });
  fBlocked.addEventListener('click', ()=>{ form.blocked = !form.blocked; renderProgress(); });
  fDepSearch.addEventListener('input', ()=> buildDepPicker(state.editingId, fDepSearch.value));
  $('fab-add').addEventListener('click', ()=> open(null));
  $('btn-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e)=>{ if(e.target === backdrop) close(); });
  $('btn-save').addEventListener('click', save);
  $('btn-delete').addEventListener('click', remove);

  App.sheet = { open, close };
})();
