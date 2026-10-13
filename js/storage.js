/* ==========================================================================
   Assistant — js/storage.js
   Version : V002 — 2026-10-12 18:47 (heure de Paris)
   Modifs  : Extrait de index.html (V01). Persistance localStorage avec repli
             en mémoire si le stockage est indisponible.
   Dépend de : config.js
   ========================================================================== */
(function(){
  "use strict";
  const { STORAGE_KEY } = App.config;

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
    }
  };
})();
