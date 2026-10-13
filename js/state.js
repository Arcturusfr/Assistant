/* ==========================================================================
   Assistant — js/state.js
   Version : V002 — 2026-10-12 18:47 (heure de Paris)
   Modifs  : Extrait de index.html (V01). État global (App.state) et logique
             métier sur les tâches (App.model) : sous-tâches, dépendances.
   Dépend de : config.js, storage.js
   Note    : toujours lire les tâches via App.state.tasks (le tableau est
             réassigné lors d'un import ou d'une suppression).
   ========================================================================== */
(function(){
  "use strict";

  const state = {
    tasks: App.storage.get() || [],
    currentView: "matrix",
    editingId: null,        // null = création
    listFilter: "all",
    activeParentId: null    // null = vues principales ; sinon "zoom" sur les sous-tâches de cette tâche
  };

  // Migration douce des anciennes données
  state.tasks.forEach(t=>{
    if(!Array.isArray(t.dependsOn)) t.dependsOn = [];
    if(t.parentId === undefined) t.parentId = null;
  });

  function uid(){ return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function persist(){ App.storage.set(state.tasks); }
  function findTask(id){ return state.tasks.find(t => t.id === id); }

  /* ---------- Sous-tâches ---------- */
  // Tâches visibles dans le périmètre courant : tâches globales, ou sous-tâches de activeParentId.
  function scopedTasks(){
    return state.tasks.filter(t => (t.parentId || null) === state.activeParentId);
  }
  function subtaskCount(taskId){
    return state.tasks.filter(t => t.parentId === taskId).length;
  }
  function subtaskDoneCount(taskId){
    return state.tasks.filter(t => t.parentId === taskId && t.status === 'done').length;
  }
  function enterSubtasks(parentId){
    state.activeParentId = parentId;
    App.renderAll();
  }
  function exitSubtasks(){
    state.activeParentId = null;
    App.renderAll();
  }

  /* ---------- Dépendances ---------- */
  // Tâches dont celle-ci attend encore la fin (ignore les dépendances supprimées ou terminées)
  function unmetDependencies(t){
    return (t.dependsOn || []).map(id=>findTask(id)).filter(dep=> dep && dep.status !== 'done');
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

  App.state = state;
  App.model = {
    uid, persist, findTask,
    scopedTasks, subtaskCount, subtaskDoneCount, enterSubtasks, exitSubtasks,
    unmetDependencies, isBlockedByDeps, wouldCreateCycle
  };
})();
