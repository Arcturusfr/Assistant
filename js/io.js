/* ==========================================================================
   Assistant — js/io.js
   Version : V002 — 2026-10-12 18:47 (heure de Paris)
   Modifs  : Extrait de index.html (V01). Export / import JSON des tâches.
   Dépend de : state.js, helpers.js (appelle App.renderAll à l'exécution)
   ========================================================================== */
(function(){
  "use strict";
  const state = App.state;
  const { persist } = App.model;
  const { toast } = App.helpers;

  document.getElementById('btn-export').addEventListener('click', ()=>{
    const data = { app:'assistant', version:'1.0', exportedAt:new Date().toISOString(), tasks: state.tasks };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assistant-backup-${new Date().toISOString().slice(0,10)}.json`;
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
        state.tasks = imported;
        persist();
        App.renderAll();
        toast(`${imported.length} tâche(s) importée(s)`);
      }catch(err){
        toast('Fichier JSON invalide');
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  });
})();
