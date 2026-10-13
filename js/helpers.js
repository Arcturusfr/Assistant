/* ==========================================================================
   Assistant — js/helpers.js
   Version : V002 — 2026-10-12 18:47 (heure de Paris)
   Modifs  : Extrait de index.html (V01). Utilitaires : dates, score, toast,
             échappement HTML, nuances de couleur, correctif hauteur écran
             (dépliants / Samsung Internet).
   Dépend de : config.js
   ========================================================================== */
(function(){
  "use strict";

  /* Correctif hauteur : certaines combinaisons Android/Samsung + One UI calculent mal
     100vh/100dvh après rotation (surtout sur dépliants) et rognent le bas de l'écran,
     barre de navigation comprise. On calcule la hauteur réelle en JS. */
  function initViewportFix(){
    const setAppHeight = ()=>{
      document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
    };
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', ()=>{
      // Certains appareils annoncent la nouvelle taille avec un léger retard
      setTimeout(setAppHeight, 50);
      setTimeout(setAppHeight, 300);
      setTimeout(setAppHeight, 600);
    });
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize', setAppHeight);
    }
  }

  function daysUntil(dateStr){
    if(!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr + "T00:00:00");
    return Math.round((d - today) / 86400000);
  }
  function dueLabel(dateStr){
    const n = daysUntil(dateStr);
    if(n === null) return null;
    if(n < 0) return { text:`Retard ${Math.abs(n)}j`, cls:"due" };
    if(n === 0) return { text:"Aujourd'hui", cls:"due" };
    if(n <= 7) return { text:`Dans ${n}j`, cls:"due soon" };
    return { text: new Date(dateStr+"T00:00:00").toLocaleDateString('fr-FR',{day:'numeric', month:'short'}), cls:"due later" };
  }
  function scoreOf(t){ return t.urgency * t.importance; }

  function toast(msg){
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> el.classList.remove('show'), 1800);
  }

  function escapeHtml(s){
    return (s||"").replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Éclaircit (percent > 0) ou assombrit (percent < 0) une couleur hex, ex. shade('#2450F0', 0.3)
  function shade(hex, percent){
    const num = parseInt(hex.slice(1), 16);
    let r = (num>>16)&255, g=(num>>8)&255, b=num&255;
    const target = percent < 0 ? 0 : 255, p = Math.abs(percent);
    r = Math.round((target-r)*p) + r;
    g = Math.round((target-g)*p) + g;
    b = Math.round((target-b)*p) + b;
    return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  }

  App.helpers = { initViewportFix, daysUntil, dueLabel, scoreOf, toast, escapeHtml, shade };
})();
