/* ==========================================================================
   Assistant — js/sheet.js
   Version : V009 — 2026-10-20 21:31 (heure de Paris)
   Modifs  : Pop-up refaite. Champs essentiels toujours à l'écran (parents en fil d'Ariane, titre,
             domaine, catégorie, taux d'exécution + Bloqué, dates, note, contenu avec bouton +) ;
             urgence, importance, complexité, durée, étiquette et dépendances dans l'accordéon
             « Paramètres avancés » dont la ligne fermée résume les valeurs. Le bouton + (et « voir
             le contenu ») enregistre d'abord les modifications en cours. Pas de focus automatique
             sur le titre en modification (le clavier ne surgit plus). Confirmation avant suppression
             (contenu supprimé et dépendances retirées annoncés).
   Dépend de : config.js, state.js, calc.js, helpers.js
   Expose    : App.sheet.open(id|null), App.sheet.close()
   ========================================================================== */
(function(){
  "use strict";
  const { CATEGORIES, DOMAINS, DURATIONS, STATUSES, MAX_DEPTH, LEVELS, PROGRESS_MAX } = App.config;
  const state = App.state;
  const { uid, persist, findTask, childrenOf, descendantsOf, ancestorsOf, depthOf, subtaskCount, subtaskDoneCount, enterSubtasks, isBlockedByDeps, canDependOn } = App.model;
  const calc = App.calc;
  const { toast, escapeHtml, daysUntil } = App.helpers;

  const $ = id => document.getElementById(id);
  const backdrop = $('sheet-backdrop'), sheetBody = $('sheet-body'), crumb = $('sheet-crumb');
  const fTitle = $('f-title'), fCategory = $('f-category'), fDomain = $('f-domain');
  const fUrgency = $('f-urgency'), fUrgencyMode = $('f-urgency-mode'), urgencyHint = $('f-urgency-hint');
  const fImportance = $('f-importance');
  const fComplexity = $('f-complexity'), complexityHint = $('f-complexity-hint');
  const fDuration = $('f-duration'), durationHint = $('f-duration-hint');
  const fProgress = $('f-progress'), fBlocked = $('f-blocked'), progressHint = $('f-progress-hint'), fStatus = $('f-status');
  const fStart = $('f-start'), fDue = $('f-due'), fTag = $('f-tag'), fNotes = $('f-notes');
  const fDepSearch = $('f-dep-search'), fDependencies = $('f-dependencies');
  const depBanner = $('dep-pending-banner');
  const advToggle = $('adv-toggle'), advBody = $('adv-body'), advSummary = $('adv-summary');
  const depToggle = $('dep-toggle'), depBody = $('dep-body'), depSummary = $('dep-summary');
  const actionsMain = $('actions-main'), actionsConfirm = $('actions-confirm'), confirmText = $('confirm-text');

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

  /* Accordéon : un bouton d'en-tête + un corps masqué par l'attribut hidden */
  function setAcc(btn, body, open){
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.hidden = !open;
  }
  // À l'ouverture d'un accordéon, on amène son en-tête en haut de la zone défilante pour voir son contenu
  function toggleAcc(btn, body){
    const open = body.hidden;
    setAcc(btn, body, open);
    if(open){
      const delta = btn.getBoundingClientRect().top - sheetBody.getBoundingClientRect().top - 8;
      sheetBody.scrollTo({ top: sheetBody.scrollTop + delta, behavior:'smooth' });
    }
  }

  /* ---------- En-tête : parents en fil d'Ariane ---------- */
  // Nouvel élément : parents = le périmètre courant et ses ancêtres ; existant : ses ancêtres
  function renderCrumb(t){
    let chain;
    if(t) chain = ancestorsOf(t.id).slice().reverse();
    else {
      const p = findTask(state.activeParentId);
      chain = p ? ancestorsOf(p.id).slice().reverse().concat([p]) : [];
    }
    crumb.innerHTML = chain.map(a =>
      `<div class="crumb-line"><span class="crumb-type">${calc.typeOf(a).label}</span><span class="crumb-name">${escapeHtml(a.title)}</span></div>`
    ).join('');
    crumb.style.display = chain.length ? 'block' : 'none';
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

  /* ---------- Résumé de la ligne « Paramètres avancés » ---------- */
  const unmetOf = ids => ids.map(findTask).filter(d => d && !calc.isDone(d));
  function renderAdvSummary(){
    if(!form) return;
    const shown = currentUrgencyShown();
    const inh = childrenUrgency(form.task);
    const c = form.isParent ? calc.effectiveComplexity(form.task) : form.complexity;
    const d = form.isParent ? calc.effectiveDuration(form.task) : form.duration;
    const parts = [
      `Urgence ${Math.max(shown, inh)}${inh > shown ? ' ↑' : ''}`,
      `Importance ${form.importance}`,
      `Complexité ${c}`,
      d === 'long' ? 'Long' : 'Court'
    ];
    const tag = fTag.value.trim();
    if(tag) parts.push(tag);
    if(selectedDeps.length) parts.push('🔗 ' + selectedDeps.length);
    const unmet = unmetOf(selectedDeps).length;
    if(unmet) parts.push('⏳ ' + unmet);
    advSummary.textContent = parts.join(' · ');
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
    renderAdvSummary();
  }

  /* ---------- Importance / complexité / durée ---------- */
  function renderImportance(){
    buildSeg(fImportance, levelOptions(LEVELS), form.importance, v=>{ form.importance = v; renderImportance(); }, {});
    renderAdvSummary();
  }
  function renderComplexity(){
    const parent = form.isParent;
    const v = parent ? calc.effectiveComplexity(form.task) : form.complexity;
    buildSeg(fComplexity, levelOptions(LEVELS), v, x=>{ form.complexity = x; renderComplexity(); }, {disabled: parent});
    complexityHint.style.display = parent ? 'block' : 'none';
    complexityHint.textContent = parent ? 'Calculée à partir du contenu (non modifiable ici).' : '';
    renderAdvSummary();
  }
  function renderDuration(){
    const parent = form.isParent;
    const v = parent ? calc.effectiveDuration(form.task) : form.duration;
    buildSeg(fDuration, DURATIONS.map(d=>({ value:d.id, label:d.label })), v, x=>{ form.duration = x; renderDuration(); }, {disabled: parent});
    durationHint.style.display = parent ? 'block' : 'none';
    durationHint.textContent = parent ? 'Long dès qu’un élément du contenu est long (non modifiable ici).' : '';
    renderAdvSummary();
  }

  /* ---------- Taux d'exécution (essentiel) ---------- */
  function renderProgress(){
    const parent = form.isParent;
    const level = parent ? calc.effectiveProgress(form.task) : form.progress;
    const frozen = parent || form.blocked;
    buildSeg(fProgress, Array.from({length:PROGRESS_MAX+1}, (_,i)=>({ value:i, label:(i*25)+' %' })), level, x=>{ form.progress = x; renderProgress(); }, {disabled: frozen});
    fBlocked.classList.toggle('on', form.blocked);
    fBlocked.setAttribute('aria-pressed', form.blocked ? 'true' : 'false');
    fStatus.textContent = STATUSES.find(s => s.id === (level === 0 ? 'todo' : (level === PROGRESS_MAX ? 'done' : 'doing'))).label;
    fStatus.title = 'Statut déduit du taux';
    const hint = parent ? 'Taux calculé à partir du contenu.' : (form.blocked ? 'Bloqué : le taux est figé.' : '');
    progressHint.textContent = hint;
    progressHint.style.display = hint ? 'block' : 'none';
  }

  /* ---------- Dépendances (dans l'accordéon avancé) ---------- */
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
        depsChanged();
      });
    });
  }
  function renderDepBanner(){
    const unmet = unmetOf(selectedDeps);
    if(unmet.length === 0){ depBanner.style.display = 'none'; return; }
    depBanner.style.display = 'block';
    depBanner.innerHTML = `<div class="dep-banner"><span class="ic">⏳</span><div>
      <b>En attente de ${unmet.length} élément${unmet.length>1?'s':''}</b>
      ${unmet.map(d=>escapeHtml(d.title)).join(' · ')}
    </div></div>`;
  }
  function renderDepSummary(){
    const n = selectedDeps.length;
    const unmet = unmetOf(selectedDeps).length;
    depSummary.textContent = n
      ? `${n} élément${n>1?'s':''}${unmet ? ` · ⏳ ${unmet} en attente` : ''}`
      : 'Aucune dépendance';
  }
  function depsChanged(){
    renderDepBanner();
    renderDepSummary();
    renderAdvSummary();
  }

  /* ---------- Contenu : compteur + bouton + (si le niveau suivant est autorisé) ---------- */
  function renderChildren(t){
    const field = $('subtasks-field'), box = $('subtasks-box'), hint = $('subtasks-hint');
    const depth = t ? depthOf(t) : calc.contextDepth();
    if(depth >= MAX_DEPTH - 1){ field.style.display = 'none'; return; }
    const type = calc.typeAtDepth(depth), childType = calc.typeAtDepth(depth + 1);
    const single = childType.label.toLowerCase(), plural = single + 's';
    $('subtasks-label').textContent = type.children;
    field.style.display = 'block';
    const count = t ? subtaskCount(t.id) : 0, done = t ? subtaskDoneCount(t.id) : 0;
    const openTxt = count
      ? `📁 ${count} ${count > 1 ? plural : single} · ${done} terminée${done > 1 ? 's' : ''} →`
      : `Aucune ${single}`;
    box.innerHTML = `<button type="button" class="child-open" id="child-open" ${count ? '' : 'disabled'}>${openTxt}</button>
      <button type="button" class="child-add" id="child-add" title="${childType.add}" aria-label="${childType.add}">+</button>`;
    $('child-open').addEventListener('click', onChildOpen);
    $('child-add').addEventListener('click', onChildAdd);
    hint.textContent = t ? '' : "« + » enregistre d'abord cet élément.";
    hint.style.display = t ? 'none' : 'block';
  }
  // Voir le contenu : on enregistre d'abord les modifications en cours, puis on « zoome »
  function onChildOpen(){
    const t = commit();
    if(!t) return;
    persist(); close();
    enterSubtasks(t.id);
  }
  // + : on enregistre d'abord les modifications en cours, puis on ouvre la création d'un enfant
  function onChildAdd(){
    const t = commit();
    if(!t) return;
    persist(); close();
    if(App.tree && App.tree.expand) App.tree.expand(t.id);   // (si la vue Arbre l'expose)
    state.activeParentId = t.id;
    App.renderAll();
    toast('Enregistré', 1200);
    open(null);
  }

  /* ---------- Ouverture ---------- */
  function open(id){
    state.editingId = id || null;
    const t = id ? findTask(id) : null;
    const type = t ? calc.typeOf(t) : calc.typeAtDepth(calc.contextDepth());
    $('sheet-title').textContent = t ? type.editTitle : type.newTitle;
    $('btn-delete').style.display = t ? 'block' : 'none';
    resetConfirm();

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
    selectedDeps = t ? (t.dependsOn || []).slice() : [];

    fTitle.value = t ? t.title : '';
    renderCrumb(t);
    buildCatPicker(t ? t.category : 'achat');
    $('domain-field').style.display = isRoot ? 'block' : 'none';
    if(isRoot) buildDomainPicker();

    fDue.value = t && t.due ? t.due : '';
    fStart.value = t && t.startDate ? t.startDate : '';
    fTag.value = t ? (t.tag || '') : '';
    fNotes.value = t ? (t.notes||'') : '';

    renderProgress();
    renderUrgency();
    renderImportance();
    renderComplexity();
    renderDuration();

    fDepSearch.value = '';
    buildDepPicker(state.editingId, '');
    depsChanged();
    renderChildren(t);

    setAcc(advToggle, advBody, false);
    setAcc(depToggle, depBody, false);
    backdrop.classList.add('open');
    sheetBody.scrollTop = 0;   // après l'affichage : une zone masquée mémorise l'ancienne position
    // Création : on saisit tout de suite le titre. Modification : pas de clavier intempestif.
    if(!t) setTimeout(()=> fTitle.focus(), 50);
  }
  function close(){
    backdrop.classList.remove('open');
    state.editingId = null;
    form = null;
    resetConfirm();
  }

  /* ---------- Enregistrement ---------- */
  // Applique le formulaire à state.tasks (sans fermer ni rendre). Renvoie l'élément, ou null si le titre manque.
  function commit(){
    const title = fTitle.value.trim();
    if(!title){ toast('Ajoutez un titre'); fTitle.focus(); return null; }
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
    return savedTask;
  }

  function save(){
    const savedTask = commit();
    if(!savedTask) return;
    persist();
    close();
    App.renderAll();
    if(calc.isDone(savedTask) && isBlockedByDeps(savedTask)){
      toast('Enregistré — attention, des dépendances ne sont pas encore terminées');
    } else {
      toast('Enregistré');
    }
  }

  /* ---------- Suppression avec confirmation ---------- */
  function resetConfirm(){
    actionsConfirm.style.display = 'none';
    actionsMain.style.display = 'flex';
  }
  function askDelete(){
    if(!state.editingId) return;
    const t = findTask(state.editingId);
    if(!t) return;
    const ids = new Set([t.id, ...descendantsOf(t.id).map(x=>x.id)]);
    const inside = ids.size - 1;
    const dependents = state.tasks.filter(x => !ids.has(x.id) && (x.dependsOn || []).some(d => ids.has(d))).length;
    let msg = `Supprimer ${calc.typeOf(t).inWord} « ${t.title} » ?`;
    if(inside) msg += ` Son contenu (${inside} élément${inside > 1 ? 's' : ''}) sera supprimé aussi.`;
    if(dependents) msg += ` ${dependents} autre${dependents > 1 ? 's' : ''} élément${dependents > 1 ? 's' : ''} en dépendai${dependents > 1 ? 'ent' : 't'} : le lien sera retiré.`;
    msg += ' Cette action est définitive.';
    confirmText.textContent = msg;
    actionsMain.style.display = 'none';
    actionsConfirm.style.display = 'block';
    $('btn-confirm-cancel').focus();
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
    // Si l'on était « zoomé » dans un élément supprimé, on remonte à la racine
    if(state.activeParentId && idsToDelete.has(state.activeParentId)) state.activeParentId = null;
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
  fTag.addEventListener('input', renderAdvSummary);
  fTitle.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); fTitle.blur(); } });
  fBlocked.addEventListener('click', ()=>{ form.blocked = !form.blocked; renderProgress(); });
  fDepSearch.addEventListener('input', ()=> buildDepPicker(state.editingId, fDepSearch.value));
  advToggle.addEventListener('click', ()=> toggleAcc(advToggle, advBody));
  depToggle.addEventListener('click', ()=> toggleAcc(depToggle, depBody));
  $('fab-add').addEventListener('click', ()=> open(null));
  $('btn-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', (e)=>{ if(e.target === backdrop) close(); });
  $('btn-save').addEventListener('click', save);
  $('btn-delete').addEventListener('click', askDelete);
  $('btn-confirm-cancel').addEventListener('click', resetConfirm);
  $('btn-confirm-delete').addEventListener('click', remove);

  App.sheet = { open, close };
})();
