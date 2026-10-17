<!--
  ToDo_Utilisateur.md — Version V004a — 2026-10-17 15:45 (heure de Paris)
  Modifs : V003 validée, sauvegarde JSON faite ; tâches V004a (installer, tester la migration).
-->
# Assistant — Tâches à exécuter par l'utilisateur

## Terminé

- [x] V002 : arborescence enregistrée, testée (plié / déplié), ajoutée à la base « Contexte »
- [x] Décisions de modélisation : complexité, durée, taux d'exécution / statut, dépendances, « Autre », conversion 5→4 niveaux, encodage visuel
- [x] Décisions urgence (auto / manuelle / héritée), durée Court / Long, icône de catégorie
- [x] V003 validée sur smartphone ; sauvegarde JSON exportée avant la migration

## À faire (V004a)

- [ ] Remplacer sur le smartphone et GitHub (arborescence complète) :
  - `index.html`
  - `css/sheet.css`
  - `js/config.js`, `js/storage.js`, `js/state.js`, `js/helpers.js`, `js/matrix.js`, `js/kanban.js`, `js/list.js`, `js/sheet.js`, `js/io.js`, `js/app.js`
  - **nouveaux fichiers** : `js/schema.js`, `js/calc.js`
  - inchangés : `css/base.css`, `css/layout.css`, `css/matrix.css`, `css/kanban.css`, `css/list.css`
- [ ] Ouvrir l'application : un message « Données converties… » doit apparaître **une seule fois**. Vos données de V003 restent sauvegardées en l'état (ne les supprimez pas du navigateur).
- [ ] Vérifier vos données : mêmes éléments (anciennes tâches = Projets, anciennes sous-tâches = Tâches), statuts cohérents, dépendances conservées.
- [ ] Tester : matrice (bulles, glisser, poignée), kanban (déplacer une carte ; déplacer un projet qui a du contenu), liste, création d'un projet → tâche → sous-tâche, bouton « Retour » (remonte d'un niveau), export puis import.
- [ ] Me dire si les bulles (rayons recalés sur 4 niveaux) conviennent
- [ ] Remplacer dans la base « Contexte » : tous les fichiers ci-dessus + `ARCHITECTURE.md`, `roadmap-et-avancement.md`, `ToDo_Utilisateur.md`

## À trancher avant V004b

Rien : tout est décidé. Dès que V004a est validée, on lance V004b (interface complète).
