<!--
  ToDo_Utilisateur.md — Version V007 — 2026-10-19 12:50 (heure de Paris)
  Modifs : V006 validée ; tâches V007 (ergonomie de l'Arbre).
-->
# Assistant — Tâches à exécuter par l'utilisateur

## Terminé

- [x] V002 : arborescence enregistrée, testée (plié / déplié), ajoutée à la base « Contexte »
- [x] Décisions de modélisation (complexité, durée, taux / statut, dépendances, « Autre », conversion 5→4, encodage visuel, urgence, catégorie)
- [x] V003 validée ; sauvegarde JSON exportée avant la migration
- [x] V004a validée (modèle de données v2, migration)
- [x] V004b validée (feuille à boutons, pastilles d'urgence, barres de progression)
- [x] V005 validée (vue Arbre) ; point « zoom après + » reporté (avec V009)
- [x] V006 validée (flèches de dépendance dans l'Arbre)

## À faire (V007)

- [ ] Ajouter / remplacer sur le smartphone et GitHub :
  - modifiés : `index.html`, `js/tree.js`, `css/tree.css`, `css/base.css`
  - inchangés : tous les autres fichiers
- [ ] Vos données ne changent pas (aucune migration).
- [ ] Onglet **Arbre** : les triangles plier / déplier sont-ils assez grands et faciles à toucher ?
- [ ] Les flèches partent-elles bien du **bas** du côté droit de l'élément dont on dépend et arrivent-elles en **haut** du côté droit de l'élément qui attend ? Plusieurs flèches sur un même rectangle sont-elles bien séparées ?
- [ ] Largeur des rectangles : −25 % écran déplié, −8 % écran plié. Convient-elle (à ajuster si besoin) ?
- [ ] Barres grises de progression (visibles aussi dans le Kanban et la Liste) : assez contrastées ? Les barres bleues et vertes n'ont pas changé.
- [ ] Remplacer dans la base « Contexte » : les fichiers ci-dessus + `ARCHITECTURE.md`, `roadmap-et-avancement.md`, `ToDo_Utilisateur.md`

## À trancher avant V008

Rien pour l'instant. À signaler après test : lisibilité des flèches, sens départ / arrivée (bas / haut), largeur des rectangles.
