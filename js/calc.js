/* ==========================================================================
   Assistant — js/calc.js
   Version : V004a — 2026-10-17 15:20 (heure de Paris)
   Modifs  : Nouveau fichier. Attributs calculés (jamais stockés) : complexité,
             durée, taux d'exécution et statut des parents ; urgence propre
             (manuelle ou issue de l'échéance) et urgence effective héritée ;
             colonne Kanban ; type / libellés selon la profondeur.
   Dépend de : config.js, state.js (appelle App.helpers à l'exécution)
   ========================================================================== */
(function(){
  "use strict";
  const { LEVELS, PROGRESS_MAX, URGENCY_DAYS, TYPES } = App.config;
  const M = App.model;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const level = v => clamp(Math.round(Number(v) || 1), 1, LEVELS);

  function isLeaf(t){ return M.childrenOf(t.id).length === 0; }

  /* ---------- Complexité : feuille = saisie ; parent = max( moyenne, max − 1 ), arrondie ---------- */
  function effectiveComplexity(t){
    const kids = M.childrenOf(t.id);
    if(!kids.length) return level(t.complexity);
    const v = kids.map(effectiveComplexity);
    const mean = v.reduce((a,b)=>a+b, 0) / v.length;
    return clamp(Math.round(Math.max(mean, Math.max(...v) - 1)), 1, LEVELS);
  }

  /* ---------- Durée : feuille = saisie ; parent « long » dès qu'un enfant l'est ---------- */
  function effectiveDuration(t){
    const kids = M.childrenOf(t.id);
    if(!kids.length) return t.duration === 'long' ? 'long' : 'court';
    return kids.some(k => effectiveDuration(k) === 'long') ? 'long' : 'court';
  }

  /* ---------- Taux d'exécution (0..4) ---------- */
  // Moyenne exacte des feuilles-enfants, entre 0 et 1 (pour une future barre de progression)
  function progressRatio(t){
    const kids = M.childrenOf(t.id);
    if(!kids.length) return clamp(Number(t.progress) || 0, 0, PROGRESS_MAX) / PROGRESS_MAX;
    return kids.map(progressRatio).reduce((a,b)=>a+b, 0) / kids.length;
  }
  // Niveau affiché : 0 seulement si tous les enfants sont à 0, 4 seulement si tous sont à 4,
  // sinon borné à 1-3 (99,9 % s'affiche 3).
  function effectiveProgress(t){
    const kids = M.childrenOf(t.id);
    if(!kids.length) return clamp(Math.round(Number(t.progress) || 0), 0, PROGRESS_MAX);
    const v = kids.map(effectiveProgress);
    if(v.every(x => x === 0)) return 0;
    if(v.every(x => x === PROGRESS_MAX)) return PROGRESS_MAX;
    const mean = v.reduce((a,b)=>a+b, 0) / v.length;
    return clamp(Math.round(mean), 1, PROGRESS_MAX - 1);
  }
  function isDone(t){ return effectiveProgress(t) === PROGRESS_MAX; }

  // Statut déduit du taux : 0 → À faire ; 1 à 3 → En cours ; 4 → Fait
  function statusOf(t){
    const p = effectiveProgress(t);
    return p === 0 ? 'todo' : (p === PROGRESS_MAX ? 'done' : 'doing');
  }
  // Colonne Kanban : « Bloqué » (indicateur manuel) prend le pas sur le statut déduit
  function columnOf(t){ return t.blocked ? 'blocked' : statusOf(t); }

  /* Applique un déplacement vers une colonne.
     Feuille : agit sur le taux. Parent : le taux reste calculé, seul l'indicateur Bloqué change.
     Renvoie 'ok' ou 'computed' (statut demandé impossible à imposer à un parent). */
  function applyColumn(t, col){
    if(col === 'blocked'){ t.blocked = true; return 'ok'; }
    t.blocked = false;
    if(!isLeaf(t)) return col === statusOf(t) ? 'ok' : 'computed';
    if(col === 'todo') t.progress = 0;
    else if(col === 'doing'){ if(t.progress < 1 || t.progress > PROGRESS_MAX - 1) t.progress = 2; }
    else if(col === 'done') t.progress = PROGRESS_MAX;
    return 'ok';
  }

  /* ---------- Urgence ---------- */
  // Échéance → niveau 1..4 (null si pas d'échéance)
  function urgencyFromDue(dateStr){
    const n = App.helpers.daysUntil(dateStr);
    if(n === null) return null;
    const [a, b, c] = URGENCY_DAYS;
    if(n <= a) return 4;
    if(n <= b) return 3;
    if(n <= c) return 2;
    return 1;
  }
  // Urgence propre : calculée depuis l'échéance en mode « auto » (si elle existe), sinon saisie
  function ownUrgency(t){
    if(t.urgencyMode === 'auto'){
      const u = urgencyFromDue(t.due);
      if(u !== null) return u;
    }
    return level(t.urgency);
  }
  // Urgence effective : max(propre, effective des enfants non terminés). null si l'élément est terminé.
  function effectiveUrgency(t){
    if(isDone(t)) return null;
    let u = ownUrgency(t);
    M.childrenOf(t.id).forEach(k => {
      const e = effectiveUrgency(k);
      if(e !== null && e > u) u = e;
    });
    return u;
  }
  function isUrgencyInherited(t){
    const e = effectiveUrgency(t);
    return e !== null && e > ownUrgency(t);
  }
  // Score = urgence effective × importance (tri Kanban et Liste) ; 0 si terminé
  function scoreOf(t){ return (effectiveUrgency(t) || 0) * t.importance; }

  /* ---------- Vocabulaire selon la profondeur ---------- */
  function typeAtDepth(d){ return TYPES[Math.min(Math.max(d, 0), TYPES.length - 1)]; }
  function typeOf(t){ return typeAtDepth(M.depthOf(t)); }
  // Profondeur d'un nouvel élément créé dans le périmètre courant
  function contextDepth(){
    const parent = M.findTask(App.state.activeParentId);
    return parent ? M.depthOf(parent) + 1 : 0;
  }

  App.calc = {
    isLeaf, effectiveComplexity, effectiveDuration,
    progressRatio, effectiveProgress, isDone, statusOf, columnOf, applyColumn,
    urgencyFromDue, ownUrgency, effectiveUrgency, isUrgencyInherited, scoreOf,
    typeAtDepth, typeOf, contextDepth
  };
})();
