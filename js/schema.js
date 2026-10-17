/* ==========================================================================
   Assistant — js/schema.js
   Version : V004a — 2026-10-17 15:20 (heure de Paris)
   Modifs  : Nouveau fichier. Format de données v2 : migration d'une tâche
             (conversion 5→4 niveaux, statut → taux d'exécution + indicateur Bloqué),
             valeurs par défaut, assainissement (références orphelines, cycles,
             profondeur, dépendances interdites). Fonctions pures, idempotentes.
   Dépend de : config.js (ne dépend pas de state.js : utilisable à l'import)
   ========================================================================== */
(function(){
  "use strict";
  const { CATEGORIES, DOMAINS, DURATIONS, LEVELS, PROGRESS_MAX, LEGACY_LEVEL_MAP, MAX_DEPTH } = App.config;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, fallback) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
  const level = (v, fallback) => clamp(Math.round(num(v, fallback)), 1, LEVELS);

  // Une tâche v1 n'a pas de taux d'exécution (elle porte un `status`)
  function isLegacyTask(t){ return typeof t.progress !== 'number'; }
  function mapLegacyLevel(v){ return LEGACY_LEVEL_MAP[clamp(Math.round(num(v, 3)), 1, 5)]; }

  function fromLegacy(t){
    const out = Object.assign({}, t);
    delete out.status;
    out.urgency = mapLegacyLevel(t.urgency);
    out.importance = mapLegacyLevel(t.importance);
    out.complexity = mapLegacyLevel(t.complexity);
    // todo → 0 ; doing → 2 (50 %) ; done → 4 ; blocked → taux 0 + indicateur Bloqué
    out.progress = t.status === 'done' ? PROGRESS_MAX : (t.status === 'doing' ? 2 : 0);
    out.blocked = t.status === 'blocked';
    return out;
  }

  // Valeurs par défaut et bornes (appliquées aussi aux tâches déjà au format v2)
  function normalize(t){
    const dateOrNull = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : null;
    const ids = Array.isArray(t.dependsOn) ? t.dependsOn.filter(x => typeof x === 'string') : [];
    return Object.assign({}, t, {
      id: String(t.id),
      title: typeof t.title === 'string' ? t.title : '',
      category: CATEGORIES[t.category] ? t.category : 'autre',
      parentId: t.parentId ? String(t.parentId) : null,
      domain: DOMAINS[t.domain] ? t.domain : null,       // précisé par sanitize (racines uniquement)
      urgency: level(t.urgency, 2),
      urgencyMode: t.urgencyMode === 'auto' ? 'auto' : 'manual',
      importance: level(t.importance, 2),
      complexity: level(t.complexity, 2),
      duration: DURATIONS.some(d => d.id === t.duration) ? t.duration : 'court',
      progress: clamp(Math.round(num(t.progress, 0)), 0, PROGRESS_MAX),
      blocked: !!t.blocked,
      tag: typeof t.tag === 'string' ? t.tag : '',
      startDate: dateOrNull(t.startDate),
      due: dateOrNull(t.due),
      notes: typeof t.notes === 'string' ? t.notes : '',
      dependsOn: Array.from(new Set(ids)),
      createdAt: t.createdAt || new Date().toISOString()
    });
  }

  function migrateTask(t){ return normalize(isLegacyTask(t) ? fromLegacy(t) : t); }

  /* Assainissement de l'ensemble : références orphelines, cycles de parenté,
     profondeur maximale, dépendances interdites (soi-même, parent, enfant, cycle). */
  function sanitize(tasks){
    const byId = new Map(tasks.map(t => [t.id, t]));

    tasks.forEach(t => { if(t.parentId && (!byId.has(t.parentId) || t.parentId === t.id)) t.parentId = null; });

    // Cycles de parenté : on détache la tâche qui referme la boucle
    tasks.forEach(t => {
      const seen = new Set([t.id]);
      let cur = t;
      while(cur.parentId){
        if(seen.has(cur.parentId)){ cur.parentId = null; break; }
        seen.add(cur.parentId);
        cur = byId.get(cur.parentId);
      }
    });

    const depthOf = t => { let d = 0, cur = t; while(cur.parentId){ d++; cur = byId.get(cur.parentId); } return d; };
    // Profondeur excessive : on remonte la tâche d'un niveau jusqu'à respecter MAX_DEPTH
    tasks.forEach(t => {
      while(depthOf(t) > MAX_DEPTH - 1){ t.parentId = byId.get(t.parentId).parentId || null; }
    });

    // Domaine : propre aux racines
    tasks.forEach(t => { t.domain = t.parentId ? null : (t.domain || 'autre'); });

    const ancestorsOf = t => { const out = new Set(); let cur = t; while(cur.parentId){ out.add(cur.parentId); cur = byId.get(cur.parentId); } return out; };
    const reaches = (fromId, targetId) => { // fromId dépend-il (transitivement) de targetId ?
      const seen = new Set(), stack = [fromId];
      while(stack.length){
        const cur = stack.pop();
        if(cur === targetId) return true;
        if(seen.has(cur)) continue;
        seen.add(cur);
        const c = byId.get(cur);
        if(c) c.dependsOn.forEach(d => stack.push(d));
      }
      return false;
    };
    tasks.forEach(t => {
      const anc = ancestorsOf(t);
      const kept = [];
      t.dependsOn = t.dependsOn.filter(dep => {
        if(dep === t.id || !byId.has(dep)) return false;
        if(anc.has(dep)) return false;                          // dépend de son propre parent
        if(ancestorsOf(byId.get(dep)).has(t.id)) return false;  // dépend de l'un de ses enfants
        if(reaches(dep, t.id)) return false;                    // créerait un cycle
        kept.push(dep);
        return true;
      });
    });
    return tasks;
  }

  function migrateAll(list){
    if(!Array.isArray(list)) return [];
    const tasks = list
      .filter(t => t && typeof t === 'object' && t.id !== undefined && t.id !== null && t.id !== '')
      .map(migrateTask);
    // Doublons d'identifiant : on garde la première occurrence
    const seen = new Set();
    return sanitize(tasks.filter(t => { if(seen.has(t.id)) return false; seen.add(t.id); return true; }));
  }

  function hasLegacyTasks(list){
    return Array.isArray(list) && list.some(t => t && typeof t === 'object' && isLegacyTask(t));
  }

  App.schema = { migrateTask, migrateAll, sanitize, hasLegacyTasks, isLegacyTask };
})();
