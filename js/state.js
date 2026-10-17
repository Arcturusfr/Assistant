/* ==========================================================================
   Assistant — js/state.js
   Version : V004a — 2026-10-17 15:20 (heure de Paris)
   Modifs  : Chargement avec migration automatique v1 → v2 (l'ancienne clé de
             stockage est conservée intacte). Outils d'arborescence (enfants,
             descendants, ancêtres, profondeur). Dépendances entre niveaux et
             branches (garde-fous : soi-même, parent, enfants, cycles).
             « Retour » remonte d'un seul niveau.
   Dépend de : config.js, storage.js, schema.js
   Note    : toujours lire les tâches via App.state.tasks (le tableau est
             réassigné lors d'un import ou d'une suppression).
   ========================================================================== */
(function(){
  "use strict";

  const state = {
    tasks: [],
    currentView: "matrix",
    editingId: null,        // null = création
    listFilter: "all",
    activeParentId: null,   // null = racine ; sinon « zoom » sur le contenu de cet élément
    migratedFromV1: false   // vrai si les données viennent d'être converties depuis l'ancien format
  };

  /* ---------- Chargement / migration ---------- */
  (function load(){
    const raw = App.storage.get();
    if(Array.isArray(raw)){
      state.tasks = App.schema.migrateAll(raw);
      return;
    }
    const legacy = App.storage.getLegacy();
    if(Array.isArray(legacy) && legacy.length){
      state.tasks = App.schema.migrateAll(legacy);
      state.migratedFromV1 = true;
      App.storage.set(state.tasks);  // la clé v1 n'est pas touchée : elle reste la sauvegarde
    }
  })();

  function uid(){ return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function persist(){ App.storage.set(state.tasks); }
  function findTask(id){ return state.tasks.find(t => t.id === id); }

  /* ---------- Arborescence ---------- */
  function childrenOf(id){ return state.tasks.filter(t => t.parentId === id); }
  function descendantsOf(id){
    const out = [], stack = [id];
    while(stack.length){
      const cur = stack.pop();
      childrenOf(cur).forEach(c => { out.push(c); stack.push(c.id); });
    }
    return out;
  }
  function ancestorsOf(id){
    const out = [];
    let cur = findTask(id);
    while(cur && cur.parentId){
      cur = findTask(cur.parentId);
      if(cur) out.push(cur);
    }
    return out;
  }
  // 0 = Projet, 1 = Tâche, 2 = Sous-tâche
  function depthOf(t){ return ancestorsOf(t.id).length; }

  // Éléments visibles dans le périmètre courant : racines, ou contenu de activeParentId.
  function scopedTasks(){
    return state.tasks.filter(t => (t.parentId || null) === state.activeParentId);
  }
  function subtaskCount(taskId){ return childrenOf(taskId).length; }
  function subtaskDoneCount(taskId){ return childrenOf(taskId).filter(t => App.calc.isDone(t)).length; }
  function enterSubtasks(parentId){
    state.activeParentId = parentId;
    App.renderAll();
  }
  // Remonte d'un seul niveau (et non plus directement à la racine)
  function exitSubtasks(){
    const cur = findTask(state.activeParentId);
    state.activeParentId = cur ? (cur.parentId || null) : null;
    App.renderAll();
  }

  /* ---------- Dépendances ---------- */
  // Éléments dont celui-ci attend encore la fin (ignore les dépendances supprimées ou terminées)
  function unmetDependencies(t){
    return (t.dependsOn || []).map(id=>findTask(id)).filter(dep=> dep && !App.calc.isDone(dep));
  }
  function isBlockedByDeps(t){ return unmetDependencies(t).length > 0; }
  // Ajouter candidateId comme dépendance de taskId créerait-il un cycle ?
  function wouldCreateCycle(taskId, candidateId){
    const seen = new Set();
    const stack = [candidateId];
    while(stack.length){
      const cur = stack.pop();
      if(cur === taskId) return true;
      if(seen.has(cur)) continue;
      seen.add(cur);
      const curTask = findTask(cur);
      if(curTask) (curTask.dependsOn||[]).forEach(d=> stack.push(d));
    }
    return false;
  }
  // Dépendance autorisée ? Pas soi-même, pas son parent / ancêtre, pas un descendant, pas de cycle.
  // (taskId = null pour un élément pas encore enregistré : seuls les garde-fous de lien existent après enregistrement.)
  function canDependOn(taskId, candidateId){
    if(!taskId) return true;
    if(taskId === candidateId) return false;
    if(ancestorsOf(taskId).some(a => a.id === candidateId)) return false;
    if(descendantsOf(taskId).some(d => d.id === candidateId)) return false;
    return !wouldCreateCycle(taskId, candidateId);
  }

  App.state = state;
  App.model = {
    uid, persist, findTask,
    childrenOf, descendantsOf, ancestorsOf, depthOf,
    scopedTasks, subtaskCount, subtaskDoneCount, enterSubtasks, exitSubtasks,
    unmetDependencies, isBlockedByDeps, wouldCreateCycle, canDependOn
  };
})();
