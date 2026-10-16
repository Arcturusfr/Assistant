<!--
  ARCHITECTURE.md — Version V002 — 2026-10-12 18:47 (heure de Paris)
  Modifs : Création initiale (découpage de index.html V01 en modules css/js).
-->
# Assistant — Architecture du code

Application web personnelle de suivi de tâches/projets (matrice de priorité, kanban, liste).
Cible principale : Samsung ZFold 8 Ultra. Test : aperçu local de QEdit (ouverture `file://`). Hébergement : GitHub.

## 1. Contraintes structurantes

- Fichier racine toujours nommé `index.html` ; CSS dans `css/`, JS dans `js/`.
- **Pas de modules ES** (`import`/`export`) : ils sont bloqués en `file://`. Les scripts sont **classiques**, chargés dans l'ordre par `index.html`, et partagent **un seul espace de noms global : `window.App`**.
- Aucune dépendance externe hormis les polices Google Fonts (avec polices de secours : Segoe UI, Roboto, Noto Sans, system-ui).
- Données stockées dans `localStorage` (clé `assistant_v1_tasks`), repli en mémoire si indisponible. Export/import JSON manuel.

## 2. Arborescence

```
index.html          Structure HTML (DOM statique), badge de version, chargement css/js
css/
  base.css          Variables (couleurs, rayons, polices), reset, états vides, toast
  layout.css        Coque de l'app : topbar, navigation, bouton +, vues, bandeau sous-tâches, media queries grand écran
  matrix.css        Vue Matrice (SVG, légende)
  kanban.css        Vue Kanban (colonnes, cartes, tags)
  list.css          Vue Liste (filtres, lignes)
  sheet.css         Feuille modale d'édition (formulaire, curseurs, dépendances, boutons)
js/
  config.js         Crée window.App ; constantes (catégories, statuts, dimensions matrice)
  storage.js        Lecture/écriture localStorage
  state.js          État (App.state) + logique métier (App.model)
  helpers.js        Utilitaires (dates, toast, échappement HTML, couleurs, correctif hauteur écran)
  matrix.js         Vue Matrice : rendu SVG, glisser/redimensionner, état vide
  kanban.js         Vue Kanban : colonnes, cartes, glisser-déposer
  list.js           Vue Liste : filtres, lignes triées par score
  sheet.js          Feuille de création/édition, dépendances, sous-tâches, enregistrer/supprimer
  io.js             Export / import JSON
  app.js            Point d'entrée : navigation, rendu global (App.renderAll), initialisation
```

## 3. Ordre de chargement (obligatoire)

`config` → `storage` → `state` → `helpers` → `matrix` → `kanban` → `list` → `sheet` → `io` → `app`

Chaque fichier lit au chargement ce que les précédents ont exposé (`App.config`, `App.state`, `App.model`, `App.helpers`).
Les appels entre vues (ex. `App.sheet.open`, `App.renderAll`) se font **à l'exécution**, donc l'ordre entre vues/sheet/app n'a pas d'impact tant que `app.js` reste en dernier.

## 4. Espace de noms `App`

| Propriété | Défini dans | Contenu |
|---|---|---|
| `App.config` | config.js | `STORAGE_KEY`, `SVG_NS`, `CATEGORIES`, `STATUSES`, `MX`, `R_MIN`, `R_STEP` |
| `App.storage` | storage.js | `get()`, `set(data)` |
| `App.state` | state.js | `tasks`, `currentView`, `editingId`, `listFilter`, `activeParentId` |
| `App.model` | state.js | `uid`, `persist`, `findTask`, `scopedTasks`, `subtaskCount`, `subtaskDoneCount`, `enterSubtasks`, `exitSubtasks`, `unmetDependencies`, `isBlockedByDeps`, `wouldCreateCycle` |
| `App.helpers` | helpers.js | `initViewportFix`, `daysUntil`, `dueLabel`, `scoreOf`, `toast`, `escapeHtml`, `shade` |
| `App.matrix` | matrix.js | `init`, `render`, `maybeShowEmpty` |
| `App.kanban` | kanban.js | `render` |
| `App.list` | list.js | `render`, `renderFilters` |
| `App.sheet` | sheet.js | `open(id\|null)`, `close()` |
| `App.renderAll` | app.js | Re-rend bandeau, matrice, kanban, liste |

**Règle importante** : toujours lire les tâches via `App.state.tasks` (le tableau est réassigné lors d'une suppression ou d'un import ; ne jamais en garder une copie de référence dans une variable locale de module).

## 5. Modèle de données

Une tâche (objet JSON) :

```
{
  id: "t…",                 // généré par uid()
  title: string,
  category: "achat" | "admin" | "travaux" | "entretien" | "autre",
  urgency: 1..5,  importance: 1..5,  complexity: 1..5,
  due: "YYYY-MM-DD" | null,
  status: "todo" | "doing" | "blocked" | "done",
  notes: string,
  dependsOn: [id, …],       // tâches du même niveau dont celle-ci dépend
  parentId: id | null,      // null = tâche globale ; sinon sous-tâche (un seul niveau)
  createdAt: ISO string
}
```

Fichier d'export : `{ app:"assistant", version:"1.0", exportedAt, tasks:[…] }` (l'import accepte aussi un simple tableau).

## 6. Concepts fonctionnels

- **Périmètre (scope)** : les vues affichent `scopedTasks()` = tâches globales, ou sous-tâches de `activeParentId` quand on est « zoomé » (bandeau « ← Retour »). Pas de sous-sous-tâches.
- **Dépendances** : une tâche est « bloquée » (🔒) tant qu'une de ses dépendances n'est pas `done`. Les cycles sont interdits (`wouldCreateCycle`). Les dépendances ne portent que sur des tâches du même niveau.
- **Matrice** : x = urgence, y = importance, rayon = complexité. Glisser = urgence/importance, poignée = complexité, tap = ouvrir la feuille. Les tâches `done` n'y apparaissent pas. Les doublons exacts sont répartis en cercle.
- **Score** = urgence × importance (tri Kanban et Liste).
- **Suppression** d'une tâche globale : supprime ses sous-tâches et nettoie les dépendances orphelines.

## 7. Flux de rendu

`App.renderAll()` (app.js) → bandeau sous-tâches → `matrix.maybeShowEmpty` → `matrix.render` (si tâches) → `kanban.render` → `list.renderFilters` + `list.render`.
Toute modification de données : modifier `App.state.tasks` → `App.model.persist()` → `App.renderAll()`.
Exception : le glisser dans la matrice met à jour une seule bulle (`updateBubbleVisual`) puis fait un rendu complet à la fin du geste.

## 8. Conventions de livraison

- Fichiers complets uniquement ; seuls les fichiers modifiés sont livrés.
- En-tête de chaque fichier : version, horodatage (heure de Paris), résumé des modifs.
- Numéro de version `Vxxx` dans le badge de `index.html`, incrémenté à chaque nouveau `index.html`.
- Tests sous Chromium (Playwright) avant livraison. ZIP uniquement sur demande.

## 9. Pour ajouter une fonctionnalité

1. Nouvelle vue : créer `css/<vue>.css` et `js/<vue>.js` (exposer `App.<vue>.render`), ajouter section HTML + bouton de nav dans `index.html`, l'appeler depuis `App.renderAll`.
2. Nouveau champ de tâche : `sheet.js` (formulaire + save), `index.html` (champ), éventuelle migration douce dans `state.js`.
3. Nouvelle constante : `config.js`.
