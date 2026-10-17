/* ==========================================================================
   Assistant — js/config.js
   Version : V004a — 2026-10-17 15:20 (heure de Paris)
   Modifs  : Nouveau modèle de données : 4 niveaux (LEVELS), clé de stockage v2 +
             clé historique, hiérarchie Projet › Tâche › Sous-tâche (TYPES, MAX_DEPTH),
             domaines, durées, seuils d'urgence automatique, table de conversion 5→4.
             Rayons des bulles recalés sur 4 niveaux (R_STEP 11 → 15).
   Dépend de : (rien) — à charger en premier.
   ========================================================================== */
(function(){
  "use strict";
  window.App = window.App || {};

  App.config = {
    STORAGE_KEY: "assistant_v2_tasks",
    LEGACY_STORAGE_KEY: "assistant_v1_tasks",   // ancien format (5 niveaux) : conservé tel quel comme sauvegarde
    SCHEMA_VERSION: 2,
    SVG_NS: "http://www.w3.org/2000/svg",

    LEVELS: 4,          // urgence, importance, complexité : 1..4
    PROGRESS_MAX: 4,    // taux d'exécution : 0..4 (0 à 100 %)
    MAX_DEPTH: 3,       // Projet › Tâche › Sous-tâche

    // Type d'un élément = sa profondeur dans l'arbre (index 0 = racine)
    TYPES: [
      { label:"Projet",      inWord:"le projet",      add:"Ajouter un projet",      none:"Aucun projet pour l'instant",      newTitle:"Nouveau projet",      editTitle:"Modifier le projet",      children:"Tâches" },
      { label:"Tâche",       inWord:"la tâche",       add:"Ajouter une tâche",      none:"Aucune tâche pour l'instant",      newTitle:"Nouvelle tâche",      editTitle:"Modifier la tâche",      children:"Sous-tâches" },
      { label:"Sous-tâche",  inWord:"la sous-tâche",  add:"Ajouter une sous-tâche", none:"Aucune sous-tâche pour l'instant", newTitle:"Nouvelle sous-tâche", editTitle:"Modifier la sous-tâche", children:"" }
    ],

    CATEGORIES: {
      achat:     { label:"Achat",     icon:"🛒", color:"var(--cat-achat)",     hex:"#2450F0" },
      admin:     { label:"Admin.",    icon:"📋", color:"var(--cat-admin)",     hex:"#8B2FD1" },
      travaux:   { label:"Travaux",   icon:"🔨", color:"var(--cat-travaux)",   hex:"#F0631E" },
      entretien: { label:"Entretien", icon:"🔧", color:"var(--cat-entretien)", hex:"#0FA37F" },
      autre:     { label:"Autre",     icon:"⭐", color:"var(--cat-autre)",     hex:"#64748B" }
    },

    // Domaine : attribut propre aux Projets (racines)
    DOMAINS: {
      maison:         { label:"Maison" },
      administratif:  { label:"Administratif" },
      loisirs:        { label:"Loisirs" },
      famille:        { label:"Famille" },
      autre:          { label:"Autre" }
    },

    DURATIONS: [
      { id:"court", label:"Court" },
      { id:"long",  label:"Long" }
    ],

    // Colonnes du Kanban / libellés de statut. Le statut est DÉDUIT du taux d'exécution ;
    // « Bloqué » est un indicateur indépendant qui prend le pas dans l'affichage.
    STATUSES: [
      { id:"todo",    label:"À faire" },
      { id:"doing",   label:"En cours" },
      { id:"blocked", label:"Bloqué" },
      { id:"done",    label:"Fait" }
    ],

    // Urgence automatique : seuils en jours avant l'échéance.
    // ≤ 1 j (moins de 48 h, retard compris) → 4 ; ≤ 7 j → 3 ; ≤ 30 j → 2 ; au-delà → 1
    URGENCY_DAYS: [1, 7, 30],

    // Conversion des anciennes données (5 niveaux) vers 4 niveaux
    LEGACY_LEVEL_MAP: { 1:1, 2:2, 3:3, 4:3, 5:4 },

    // Matrice : taille du canevas SVG, marge, rayons des bulles
    MX: { size:460, pad:34 },
    R_MIN: 14,   // complexité 1 -> 14px
    R_STEP: 15   // complexité 4 -> 59px
  };
})();
