/* ==========================================================================
   Assistant — js/storage.js
   Version : V004a — 2026-10-17 15:20 (heure de Paris)
   Modifs  : Ajout de getLegacy() : lecture (jamais écriture) de l'ancienne clé
             v1, conservée intacte comme sauvegarde après migration.
   Dépend de : config.js
   ========================================================================== */
(function(){
  "use strict";
  const { STORAGE_KEY, LEGACY_STORAGE_KEY } = App.config;

  let memoryFallback = null;

  App.storage = {
    get(){
      try{
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      }catch(e){
        return memoryFallback;
      }
    },
    set(data){
      try{
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }catch(e){
        memoryFallback = data;
      }
    },
    // Ancien format (V01 à V003). Lecture seule : cette clé n'est jamais modifiée ni supprimée.
    getLegacy(){
      try{
        const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      }catch(e){
        return null;
      }
    }
  };
})();
