/* ==========================================================================
   Assistant — js/config.js
   Version : V002 — 2026-10-12 18:47 (heure de Paris)
   Modifs  : Extrait de index.html (V01). Constantes : catégories, statuts,
             dimensions de la matrice. Crée l'espace de noms global `App`.
   Dépend de : (rien) — à charger en premier.
   ========================================================================== */
(function(){
  "use strict";
  window.App = window.App || {};

  App.config = {
    STORAGE_KEY: "assistant_v1_tasks",
    SVG_NS: "http://www.w3.org/2000/svg",

    CATEGORIES: {
      achat:     { label:"Achat",     icon:"🛒", color:"var(--cat-achat)",     hex:"#2450F0" },
      admin:     { label:"Admin.",    icon:"📋", color:"var(--cat-admin)",     hex:"#8B2FD1" },
      travaux:   { label:"Travaux",   icon:"🔨", color:"var(--cat-travaux)",   hex:"#F0631E" },
      entretien: { label:"Entretien", icon:"🔧", color:"var(--cat-entretien)", hex:"#0FA37F" },
      autre:     { label:"Autre",     icon:"⭐", color:"var(--cat-autre)",     hex:"#64748B" }
    },

    STATUSES: [
      { id:"todo",    label:"À faire" },
      { id:"doing",   label:"En cours" },
      { id:"blocked", label:"Bloqué" },
      { id:"done",    label:"Fait" }
    ],

    // Matrice : taille du canevas SVG, marge, rayons des bulles
    MX: { size:460, pad:34 },
    R_MIN: 14,   // complexité 1 -> 14px
    R_STEP: 11   // complexité 5 -> 58px
  };
})();
