/* ==========================================================================
   Assistant — js/io.js
   Version : V004a — 2026-10-17 15:20 (heure de Paris)
   Modifs  : Export au format 2.0 ; import avec migration automatique des
             fichiers 1.0 (5 niveaux) et assainissement des données.
   Dépend de : config.js, schema.js, state.js, helpers.js (appelle App.renderAll à l'exécution)
   ========================================================================== */
(function(){
  "use strict";
  const state = App.state;
  const { persist } = App.model;
  const { toast } = App.helpers;

  document.getElementById('btn-export').addEventListener('click', ()=>{
    const data = { app:'assistant', version:'2.0', schema:App.config.SCHEMA_VERSION, exportedAt:new Date().toISOString(), tasks: state.tasks };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assistant-backup-v2-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Export JSON téléchargé');
  });

  const importInput = document.getElementById('import-input');
  document.getElementById('btn-import').addEventListener('click', ()=> importInput.click());
  importInput.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        const imported = Array.isArray(data) ? data : data.tasks;
        if(!Array.isArray(imported)) throw new Error('format invalide');
        const wasLegacy = App.schema.hasLegacyTasks(imported);
        state.tasks = App.schema.migrateAll(imported);
        state.activeParentId = null;
        persist();
        App.renderAll();
        toast(`${state.tasks.length} élément(s) importé(s)` + (wasLegacy ? ' — converti au nouveau format' : ''), wasLegacy ? 2800 : 1800);
      }catch(err){
        toast('Fichier JSON invalide');
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  });
})();
