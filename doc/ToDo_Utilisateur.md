<!--
  ToDo_Utilisateur.md — Version V009 — 2026-10-20 21:31 (heure de Paris)
  Modifs : V007 et V008 validées ; tâches V009 (pop-up de création / modification).
-->
# Assistant — Tâches à exécuter par l'utilisateur

## Terminé

- [x] V002 : arborescence enregistrée, testée (plié / déplié), ajoutée à la base « Contexte »
- [x] Décisions de modélisation (complexité, durée, taux / statut, dépendances, « Autre », conversion 5→4, encodage visuel, urgence, catégorie)
- [x] V003 validée ; sauvegarde JSON exportée avant la migration
- [x] V004a validée (modèle de données v2, migration)
- [x] V004b validée (feuille à boutons, pastilles d'urgence, barres de progression)
- [x] V005 validée (vue Arbre) ; point « zoom après + » reporté
- [x] V006 validée (flèches de dépendance dans l'Arbre)
- [x] V007 validée (ergonomie de l'Arbre)
- [x] V008 validée (traits hiérarchiques de l'Arbre plus visibles)

## À faire (V009)

- [ ] Ajouter / remplacer sur le smartphone et GitHub :
  - modifiés : `index.html`, `js/sheet.js`, `css/sheet.css`, `js/tree.js` (V009a : l'Arbre déplie le parent après un + de la pop-up)
  - inchangés : tous les autres fichiers (y compris vos fichiers V008, par exemple `css/tree.css`)
- [ ] Vos données ne changent pas (aucune migration).
- [ ] Pop-up, **création** d'un projet : le titre prend le focus (clavier). Tout l'essentiel est-il lisible sans trop défiler ? La ligne « Paramètres avancés » est-elle visible ou faut-il trop défiler pour l'atteindre ?
- [ ] Pop-up, **modification** d'une tâche et d'une sous-tâche : le clavier ne surgit plus ; les parents (Projet / Tâche) s'affichent bien sous le libellé.
- [ ] Ouvrir « Paramètres avancés » : la ligne fermée résume-t-elle assez bien (urgence, importance, complexité, durée, étiquette, dépendances) ? Le second accordéon « Dépend de » fonctionne-t-il ?
- [ ] Taux d'exécution : l'interrupteur « Bloqué » et le statut déduit tiennent-ils sur une ligne ?
- [ ] Bouton **+** de la ligne « Tâches » / « Sous-tâches » : enregistre d'abord les modifications en cours, puis ouvre la création d'un enfant.
- [ ] Vue Arbre : replier tout, ouvrir un projet, taper **+** de la pop-up et enregistrer un enfant : le projet est déplié et l'enfant visible.
- [ ] **Supprimer** : la confirmation s'affiche, annonce le contenu supprimé, et « Annuler » revient à la pop-up.
- [ ] Remplacer dans la base « Contexte » : les 4 fichiers ci-dessus + `ARCHITECTURE.md`, `roadmap-et-avancement.md`, `ToDo_Utilisateur.md`. La base contenait encore les fichiers V007 : V009 est construite dessus. Si V008 a modifié un autre fichier que `css/tree.css` et le badge de `index.html`, me le signaler.

## À trancher avant V010

Rien pour l'instant. À signaler après test : hauteur de la pop-up d'un Projet (le domaine ajoute une ligne), lisibilité du résumé avancé, comportement du bouton +.
