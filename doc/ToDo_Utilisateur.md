<!--
  ToDo_Utilisateur.md — Version V006 — 2026-10-18 21:54 (heure de Paris)
  Modifs : V005 validée ; tâches V006 (installer les flèches de dépendance et les tester).
-->
# Assistant — Tâches à exécuter par l'utilisateur

## Terminé

- [x] V002 : arborescence enregistrée, testée (plié / déplié), ajoutée à la base « Contexte »
- [x] Décisions de modélisation (complexité, durée, taux / statut, dépendances, « Autre », conversion 5→4, encodage visuel, urgence, catégorie)
- [x] V003 validée ; sauvegarde JSON exportée avant la migration
- [x] V004a validée (modèle de données v2, migration)
- [x] V004b validée (feuille à boutons, pastilles d'urgence, barres de progression)
- [x] V005 validée (vue Arbre) ; point « zoom après + » reporté après V006 (avec V008)

## À faire (V006)

- [ ] Ajouter / remplacer sur le smartphone et GitHub :
  - modifiés : `index.html`, `js/tree.js`, `css/tree.css`
  - inchangés : tous les autres fichiers
- [ ] Vos données ne changent pas (aucune migration).
- [ ] Tester l'onglet **Arbre** avec quelques dépendances (champ « Dépend de » d'une feuille) : une flèche part de l'élément dont on dépend vers celui qui attend ; **orange** tant que la dépendance n'est pas terminée, **grise** une fois terminée.
- [ ] Replier une branche contenant un élément lié : la flèche doit rejoindre le parent replié (trait **en points**). Replier / déplier, « Tout replier », rotation de l'écran : les flèches suivent-elles ?
- [ ] Bouton **Dépendances** : masque / affiche les flèches. Les flèches (couloir à droite) restent-elles lisibles avec vos vraies données ?
- [ ] Remplacer dans la base « Contexte » : les fichiers ci-dessus + `ARCHITECTURE.md`, `roadmap-et-avancement.md`, `ToDo_Utilisateur.md`

## À trancher avant V007

Rien pour l'instant. À signaler après test : lisibilité des flèches, sens de lecture (de la dépendance vers l'élément qui attend), couleurs.
