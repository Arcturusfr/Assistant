<!--
  ToDo_Utilisateur.md — Version V005 — 2026-10-18 15:16 (heure de Paris)
  Modifs : V004b validée ; tâches V005 (installer la vue Arbre et la tester).
-->
# Assistant — Tâches à exécuter par l'utilisateur

## Terminé

- [x] V002 : arborescence enregistrée, testée (plié / déplié), ajoutée à la base « Contexte »
- [x] Décisions de modélisation (complexité, durée, taux / statut, dépendances, « Autre », conversion 5→4, encodage visuel, urgence, catégorie)
- [x] V003 validée ; sauvegarde JSON exportée avant la migration
- [x] V004a validée (modèle de données v2, migration)
- [x] V004b validée (feuille à boutons, pastilles d'urgence, barres de progression)

## À faire (V005)

- [ ] Ajouter / remplacer sur le smartphone et GitHub :
  - nouveaux : `css/tree.css`, `js/tree.js`
  - modifiés : `index.html`, `js/app.js`
  - inchangés : tous les autres fichiers
- [ ] Vos données ne changent pas (aucune migration).
- [ ] Tester l'onglet **Arbre** : projets dépliés au départ ; flèche pour déplier / replier ; « Tout déplier / Tout replier » ; touche sur une carte = ouvre la feuille ; bouton **+** d'une carte = ajoute une tâche (ou sous-tâche) dedans.
- [ ] Vérifier la lisibilité : couleur de fond = domaine du projet, **épaisseur de bordure = complexité**, pastille d'urgence (↑ si héritée), barre de progression, icône de catégorie en coin. Les bordures épaisses restent-elles lisibles sur le fond pastel ?
- [ ] Après un **+**, l'application est « zoomée » dans l'élément (bandeau « ← Retour ») pour la Matrice, le Kanban et la Liste : est-ce gênant ? (l'Arbre, lui, affiche toujours tout)
- [ ] Remplacer dans la base « Contexte » : les fichiers ci-dessus + `ARCHITECTURE.md`, `roadmap-et-avancement.md`, `ToDo_Utilisateur.md`

## À trancher avant V006

Rien pour l'instant. À signaler après test : couleurs des domaines, épaisseurs de bordure, comportement du bouton +.
