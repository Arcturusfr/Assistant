<!--
  ToDo_Utilisateur.md — Version V004b — 2026-10-18 00:40 (heure de Paris)
  Modifs : V004a validée ; tâches V004b (installer, tester la feuille et les nouvelles cartes).
-->
# Assistant — Tâches à exécuter par l'utilisateur

## Terminé

- [x] V002 : arborescence enregistrée, testée (plié / déplié), ajoutée à la base « Contexte »
- [x] Décisions de modélisation : complexité, durée, taux d'exécution / statut, dépendances, « Autre », conversion 5→4 niveaux, encodage visuel
- [x] Décisions urgence (auto / manuelle / héritée), durée Court / Long, icône de catégorie
- [x] V003 validée sur smartphone ; sauvegarde JSON exportée avant la migration
- [x] V004a validée (modèle de données v2, migration)

## À faire (V004b)

- [ ] Remplacer sur le smartphone et GitHub :
  - `index.html`
  - `css/base.css`, `css/kanban.css`, `css/list.css`, `css/sheet.css`
  - `js/helpers.js`, `js/matrix.js`, `js/kanban.js`, `js/list.js`, `js/sheet.js`, `js/app.js`
  - inchangés : `css/layout.css`, `css/matrix.css`, `js/config.js`, `js/storage.js`, `js/schema.js`, `js/state.js`, `js/calc.js`, `js/io.js`
- [ ] Vos données ne changent pas : aucune nouvelle migration (message de conversion absent).
- [ ] Tester la feuille : boutons faciles à toucher, **défilement vertical sans changement involontaire de valeur** ; urgence Auto / Manuelle (saisir une échéance → Auto proposée) ; interrupteur Bloqué ; durée Court / Long ; taux d'exécution ; domaine (projets) ; étiquette ; date de début.
- [ ] Tester l'affichage : pastille d'urgence (↑ si héritée), barre de progression, icône de catégorie en coin sur les cartes Kanban, type et domaine dans la Liste, bouton + qui annonce « Ajouter un projet / une tâche / une sous-tâche ».
- [ ] Matrice : sur une petite bulle (complexité 1), déplacer depuis le centre, redimensionner avec la poignée.
- [ ] Renseigner le **domaine** de vos projets (tous sont en « Autre » après la migration) et l'**échéance** quand elle existe.
- [ ] Remplacer dans la base « Contexte » : tous les fichiers ci-dessus + `ARCHITECTURE.md`, `roadmap-et-avancement.md`, `ToDo_Utilisateur.md`

## À trancher avant V005

Rien : tout est décidé. Dès que V004b est validée, on lance V005 (vue Arbre, sans flèches).
