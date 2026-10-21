<!--
  ARCHITECTURE.md — Version V009 — 2026-10-20 21:31 (heure de Paris)
  Modifs : pop-up de création / modification refaite (en-tête fixe, corps défilant, accordéon avancé, pied fixe, confirmation de suppression) ; V009a : `App.tree.expand`.
-->
# Assistant — Architecture du code

Application web personnelle de suivi de tâches/projets (matrice de priorité, kanban, liste, arbre).
Cible principale : Samsung ZFold 8 Ultra. Test : aperçu local de QEdit (ouverture `file://`). Hébergement : GitHub.

## 1. Contraintes structurantes

- Fichier racine toujours nommé `index.html` ; CSS dans `css/`, JS dans `js/`.
- **Pas de modules ES** (`import`/`export`) : ils sont bloqués en `file://`. Les scripts sont **classiques**, chargés dans l'ordre par `index.html`, et partagent **un seul espace de noms global : `window.App`**.
- Aucune dépendance externe hormis les polices Google Fonts (avec polices de secours : Segoe UI, Roboto, Noto Sans, system-ui).
- Données stockées dans `localStorage` (clé `assistant_v2_tasks`), repli en mémoire si indisponible. Export/import JSON manuel (format 2.0). L'ancienne clé `assistant_v1_tasks` n'est jamais modifiée ni supprimée : elle reste la sauvegarde après la migration automatique.

## 2. Arborescence

```
index.html          Structure HTML (DOM statique), badge de version, chargement css/js
css/
  base.css          Variables (couleurs, couleurs d'urgence, rayons, polices), reset, états vides, toast, pastille d'urgence (.urg), barre de progression (.pbar)
  layout.css        Coque de l'app : topbar, navigation, bouton +, vues, bandeau sous-tâches, media queries grand écran
  matrix.css        Vue Matrice (SVG, légende)
  kanban.css        Vue Kanban (colonnes, cartes, tags)
  list.css          Vue Liste (filtres, lignes)
  tree.css          Vue Arbre (cartes par domaine, épaisseur de bordure = complexité, traits hiérarchiques, flèches de dépendance, légende)
  sheet.css         Pop-up d'édition en trois zones (en-tête fixe, corps défilant, pied fixe) : accordéons, sélecteurs à boutons .seg, bascule Auto/Manuelle, dépendances, ligne « contenu » avec +, confirmation de suppression
js/
  config.js         Crée window.App ; constantes (niveaux, types, catégories, domaines, statuts, seuils d'urgence, dimensions matrice)
  storage.js        Lecture/écriture localStorage (+ lecture seule de l'ancienne clé v1)
  schema.js         Format v2 : migration v1 → v2, valeurs par défaut, assainissement des données (fonctions pures)
  state.js          État (App.state) + arborescence, dépendances (App.model)
  calc.js           Attributs calculés : complexité, durée, taux, statut, urgence propre / effective, vocabulaire par profondeur
  helpers.js        Utilitaires (dates, toast, échappement HTML, couleurs, correctif hauteur écran)
  matrix.js         Vue Matrice : rendu SVG, glisser/redimensionner, état vide
  kanban.js         Vue Kanban : colonnes, cartes, glisser-déposer
  list.js           Vue Liste : filtres, lignes triées par score
  tree.js           Vue Arbre : accordéon, cartes encodées, bouton + par carte, flèches de dépendance
  sheet.js          Pop-up de création/édition : champs essentiels, accordéon avancé, dépendances, contenu (+), enregistrer / supprimer avec confirmation
  io.js             Export / import JSON
  app.js            Point d'entrée : navigation, rendu global (App.renderAll), initialisation
```

## 3. Ordre de chargement (obligatoire)

`config` → `storage` → `schema` → `state` → `calc` → `helpers` → `matrix` → `kanban` → `list` → `tree` → `sheet` → `io` → `app`

Chaque fichier lit au chargement ce que les précédents ont exposé (`App.config`, `App.schema`, `App.state`, `App.model`, `App.calc`). `helpers` n'est utilisé par `calc` qu'à l'exécution (`daysUntil`).
Les appels entre vues (ex. `App.sheet.open`, `App.renderAll`) se font **à l'exécution**, donc l'ordre entre vues/sheet/app n'a pas d'impact tant que `app.js` reste en dernier.

## 4. Espace de noms `App`

| Propriété | Défini dans | Contenu |
|---|---|---|
| `App.config` | config.js | `STORAGE_KEY`, `LEGACY_STORAGE_KEY`, `SCHEMA_VERSION`, `SVG_NS`, `LEVELS`, `PROGRESS_MAX`, `MAX_DEPTH`, `TYPES`, `CATEGORIES`, `DOMAINS`, `DURATIONS`, `STATUSES`, `URGENCY_DAYS`, `LEGACY_LEVEL_MAP`, `MX`, `R_MIN`, `R_STEP` |
| `App.storage` | storage.js | `get()`, `set(data)`, `getLegacy()` |
| `App.schema` | schema.js | `migrateTask`, `migrateAll`, `sanitize`, `hasLegacyTasks`, `isLegacyTask` |
| `App.state` | state.js | `tasks`, `currentView`, `editingId`, `listFilter`, `activeParentId`, `migratedFromV1` |
| `App.model` | state.js | `uid`, `persist`, `findTask`, `childrenOf`, `descendantsOf`, `ancestorsOf`, `depthOf`, `scopedTasks`, `subtaskCount`, `subtaskDoneCount`, `enterSubtasks`, `exitSubtasks`, `unmetDependencies`, `isBlockedByDeps`, `wouldCreateCycle`, `canDependOn` |
| `App.calc` | calc.js | `isLeaf`, `effectiveComplexity`, `effectiveDuration`, `progressRatio`, `effectiveProgress`, `isDone`, `statusOf`, `columnOf`, `applyColumn`, `urgencyFromDue`, `ownUrgency`, `effectiveUrgency`, `isUrgencyInherited`, `scoreOf`, `typeAtDepth`, `typeOf`, `contextDepth` |
| `App.helpers` | helpers.js | `initViewportFix`, `daysUntil`, `dueLabel`, `scoreOf`, `toast(msg, ms?)`, `escapeHtml`, `shade`, `urgencyPill(u, inherited)`, `progressBar(level)` |
| `App.matrix` | matrix.js | `init`, `render`, `maybeShowEmpty` |
| `App.kanban` | kanban.js | `render` |
| `App.list` | list.js | `render`, `renderFilters` |
| `App.tree` | tree.js | `render`, `expand(id)` (déplie l'élément et ses ancêtres) |
| `App.sheet` | sheet.js | `open(id\|null)`, `close()` |
| `App.renderAll` | app.js | Re-rend bandeau, matrice, kanban, liste, arbre |

**Règle importante** : toujours lire les tâches via `App.state.tasks` (le tableau est réassigné lors d'une suppression ou d'un import ; ne jamais en garder une copie de référence dans une variable locale de module).

## 5. Modèle de données (format v2)

Un élément (objet JSON) :

```
{
  id: "t…",                    // généré par uid()
  title: string,
  parentId: id | null,         // null = Projet ; profondeur 1 = Tâche ; profondeur 2 = Sous-tâche (3 niveaux maximum)
  domain: "maison"|"administratif"|"loisirs"|"famille"|"autre" | null,   // propre aux Projets (null ailleurs)
  category: "achat" | "admin" | "travaux" | "entretien" | "autre",
  urgency: 1..4,               // valeur saisie (utilisée si urgencyMode = "manual", ou en repli sans échéance)
  urgencyMode: "manual" | "auto",   // auto : calculée depuis l'échéance
  importance: 1..4,
  complexity: 1..4,            // saisie sur les feuilles ; calculée pour un parent
  duration: "court" | "long",  // saisie sur les feuilles ; calculée pour un parent
  progress: 0..4,              // taux d'exécution (0 à 100 %) ; saisi sur les feuilles, calculé pour un parent
  blocked: boolean,            // indicateur Bloqué (manuel, indépendant du taux)
  tag: string,                 // étiquette libre optionnelle (ex. « Reporté »)
  startDate: "YYYY-MM-DD" | null,
  due: "YYYY-MM-DD" | null,
  notes: string,
  dependsOn: [id, …],          // dépendances : plusieurs, entre niveaux et branches différents
  createdAt: ISO string
}
```

Le **type** (Projet / Tâche / Sous-tâche) n'est pas stocké : il découle de la profondeur (`App.model.depthOf`).
Le **statut** n'est pas stocké : il est déduit du taux (`App.calc.statusOf`). L'**urgence effective**, la **complexité effective**, la **durée effective** et le **taux effectif** d'un parent ne sont jamais stockés (`App.calc`).

Fichier d'export : `{ app:"assistant", version:"2.0", schema:2, exportedAt, tasks:[…] }`. L'import accepte aussi un simple tableau et les fichiers `1.0` (migration automatique).

### Migration v1 → v2 (`schema.js`)
- Niveaux 5 → 4 : 1→1, 2→2, 3→3, 4→3, 5→4 (urgence, importance, complexité).
- Statut → taux : À faire → 0 ; En cours → 2 ; Fait → 4 ; Bloqué → taux 0 + `blocked = true`.
- Anciennes tâches → Projets (domaine « autre »), anciennes sous-tâches → Tâches. Urgence en mode `manual`, durée `court`.
- Idempotente (une donnée déjà en v2 n'est que bornée / complétée). `sanitize` retire références orphelines, cycles de parenté, profondeur excessive, dépendances vers soi / un parent / un enfant / en cycle.

## 6. Concepts fonctionnels

- **Périmètre (scope)** : les vues affichent `scopedTasks()` = Projets, ou contenu de `activeParentId` quand on est « zoomé » (bandeau « ← Retour », qui remonte d'un seul niveau).
- **Complexité d'un parent** : `max( moyenne(enfants), max(enfants) − 1 )`, arrondie. **Durée** : « long » dès qu'un enfant l'est.
- **Taux d'un parent** : moyenne des enfants arrondie ; 0 seulement si tous à 0, 4 seulement si tous à 4, sinon borné à 1-3. **Statut** : 0 → À faire ; 1-3 → En cours ; 4 → Fait.
- **Bloqué (🔒)** : indicateur manuel qui prend le pas sur le statut dans le Kanban. Sur un parent il se superpose au statut calculé. À distinguer de **en attente (⏳)** : dépendance non terminée, automatique.
- **Urgence** : propre (saisie, ou calculée depuis l'échéance en mode auto : ≤ 1 j → 4, ≤ 7 j → 3, ≤ 30 j → 2, sinon 1) ; **effective** d'un parent = `max(propre, effective des enfants non terminés)`. Un élément terminé n'a plus d'urgence.
- **Dépendances** : plusieurs, entre niveaux et branches ; interdites vers soi-même, son parent / ancêtres, ses descendants, et en cycle (`canDependOn`).
- **Matrice** : x = urgence effective, y = importance, rayon = complexité effective. Glisser = urgence/importance (horizontal bloqué si l'urgence est héritée ; une urgence auto glissée passe en manuel), poignée = complexité (bloquée pour un parent), tap = ouvrir la feuille. Les éléments terminés n'y apparaissent pas. Les doublons exacts sont répartis en cercle.
- **Arbre** (V005, flèches V006) : affiche tout l'arbre (ignore `activeParentId`), triée par score ; projets dépliés au premier rendu (état d'accordéon en mémoire, non stocké). Fond pastel = domaine du projet racine ; épaisseur de bordure = complexité effective (1 / 2 / 3 / 5 px) ; pastille d'urgence, barre de progression, icône de catégorie. Le bouton + d'une carte fixe `activeParentId` sur elle puis ouvre la feuille de création. **Flèches de dépendance (V006)** : un SVG (`svg.tdeps`) superposé à `#tree-root` est redessiné à chaque rendu et au redimensionnement ; une flèche part de l'élément dont on dépend (tiers **inférieur** du bord droit) vers celui qui attend (tiers **supérieur**) ; plusieurs flèches sur un même tiers sont réparties régulièrement, triées selon la position de l'autre extrémité. Tracé en pointillés par une gouttière à droite : 6 couloirs (`LANES`), attribués aux flèches courtes d'abord, dans le premier couloir où le tronçon vertical ne chevauche aucun autre. Les rectangles occupent 75 % de la largeur (≥ 620 px, écran déplié) ou 92 % (écran plié) ; la place libérée sert aux flèches. Triangle plier / déplier dessiné en CSS (38 px). Orange = dépendance non terminée, grise = terminée. Branche repliée : l'extrémité se reporte sur le plus haut ancêtre replié visible (trait en points) ; les flèches identiques sont fusionnées. Le bouton « Dépendances » les masque / affiche (état en mémoire).
- **Kanban** : colonnes = `columnOf`. Déplacer une feuille change son taux ; déplacer un parent ne change que son indicateur Bloqué.
- **Score** = urgence effective × importance (tri Kanban et Liste).
- **Pop-up de saisie** (`sheet.js`, refaite en V009) : trois zones. *En-tête fixe* : libellé (« Modifier la tâche »…), parents en fil d'Ariane (Projet ; Projet + Tâche pour une sous-tâche) et titre. *Corps défilant*, champs essentiels : domaine (Projets seulement), catégorie (une ligne de 5 tuiles), taux d'exécution (+ statut déduit + interrupteur Bloqué), dates de début / échéance, note, contenu (compteur + bouton +). *Accordéon « Paramètres avancés »* (fermé par défaut ; sa ligne fermée résume urgence, importance, complexité, durée, étiquette, nombre de dépendances et ⏳) : urgence (Auto / Manuelle), importance, complexité, durée, étiquette et, dans un second accordéon, les dépendances. *Pied fixe* : Supprimer / Annuler / Enregistrer ; Supprimer demande une confirmation qui annonce le contenu supprimé et les dépendances retirées. Un objet `form` porte l'état pendant l'édition (rien n'est écrit avant l'enregistrement) ; `commit()` applique le formulaire sans fermer, `save()` = `commit()` + fermeture. Le bouton + et « voir le contenu » appellent `commit()` d'abord (les modifications en cours sont enregistrées), puis zooment sur l'élément. Pas de focus automatique sur le titre en modification (le clavier ne surgit pas). Les niveaux se règlent par boutons (`buildSeg`) qui n'agissent qu'au tap ; le statut n'est pas saisi (déduit du taux). Taux, complexité et durée d'un parent sont affichés calculés (non modifiables) ; seul « Bloqué » reste modifiable. Après un +, la pop-up appelle `App.tree.expand(id)` pour que l'enfant créé reste visible dans l'Arbre.
- **Affichage des cartes / lignes** : pastille d'urgence effective (« ↑ » si héritée), barre de progression à 4 segments + valeur, icône de catégorie dans un coin (Kanban), type et domaine (Liste), « Long » et étiquette libre.
- **Suppression** : supprime l'élément et tout son contenu, et nettoie les dépendances orphelines.

## 7. Flux de rendu

`App.renderAll()` (app.js) → bandeau sous-tâches → `matrix.maybeShowEmpty` → `matrix.render` (si tâches) → `kanban.render` → `list.renderFilters` + `list.render` → `tree.render`.
Toute modification de données : modifier `App.state.tasks` → `App.model.persist()` → `App.renderAll()`. Les attributs calculés ne sont jamais écrits : on les relit via `App.calc`.
Exception : le glisser dans la matrice met à jour une seule bulle (`updateBubbleVisual`) puis fait un rendu complet à la fin du geste.

## 8. Conventions de livraison

- Fichiers complets uniquement ; seuls les fichiers modifiés sont livrés.
- En-tête de chaque fichier : version, horodatage (heure de Paris), résumé des modifs.
- Numéro de version `Vxxx` dans le badge de `index.html`, incrémenté à chaque nouveau `index.html`.
- Tests sous Chromium (Playwright) avant livraison. ZIP uniquement sur demande.

## 9. Pour ajouter une fonctionnalité

1. Nouvelle vue : créer `css/<vue>.css` et `js/<vue>.js` (exposer `App.<vue>.render`), ajouter section HTML + bouton de nav dans `index.html`, l'appeler depuis `App.renderAll`.
2. Nouveau champ de tâche : `schema.js` (valeur par défaut + borne dans `normalize`), `sheet.js` (formulaire + save), `index.html` (champ), éventuel calcul dans `calc.js`.
3. Nouvelle constante : `config.js`.
