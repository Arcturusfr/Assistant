/* ==========================================================================
   Assistant — js/app.js
   Version : V004b — 2026-10-18 00:40 (heure de Paris)
   Modifs  : Le bouton + annonce l'élément à créer (projet / tâche / sous-tâche) selon le niveau affiché.
   Dépend de : tous les autres fichiers js — à charger en dernier.
   ========================================================================== */
(function(){
  "use strict";
  const state = App.state;
  const { findTask, scopedTasks, exitSubtasks } = App.model;

  function updateDrillBanner(){
    const banner = document.getElementById('drill-banner');
    const label = document.getElementById('drill-label');
    if(state.activeParentId){
      const parent = findTask(state.activeParentId);
      banner.style.display = 'flex';
      label.textContent = parent ? `Dans ${App.calc.typeOf(parent).inWord} : ${parent.title}` : 'Contenu';
    } else {
      banner.style.display = 'none';
    }
  }

  function renderAll(){
    updateDrillBanner();
    document.getElementById('fab-add').title = App.calc.typeAtDepth(App.calc.contextDepth()).add;
    App.matrix.maybeShowEmpty();
    if(scopedTasks().length){ App.matrix.render(); }
    App.kanban.render();
    App.list.renderFilters();
    App.list.render();
  }
  App.renderAll = renderAll;

  /* ---------- Navigation entre vues ---------- */
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.currentView = btn.dataset.view;
      document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b===btn));
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id === 'view-'+state.currentView));
      renderAll();
    });
  });

  document.getElementById('drill-back').addEventListener('click', exitSubtasks);

  window.addEventListener('resize', ()=>{
    if(state.currentView==='matrix' && scopedTasks().length) App.matrix.render();
  });

  /* ---------- Initialisation ---------- */
  App.helpers.initViewportFix();
  App.matrix.init();
  renderAll();
  if(state.migratedFromV1){
    App.helpers.toast('Données converties au nouveau format — ancienne version conservée', 3500);
  }
})();
