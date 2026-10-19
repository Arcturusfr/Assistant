<!--
  roadmap-et-avancement.md — Version V007 — 2026-10-19 12:50 (heure de Paris)
  Modifs : V006 validée ; V007 (ergonomie de l'Arbre) livrée ; filtres décalés en V008, refonte du formulaire en V009.
-->
# Assistant — Roadmap et avancement

## Où on en est (V007)

- [x] V01 : application monofichier (matrice, kanban, liste, sous-tâches, dépendances, export/import JSON)
- [x] V002 : découpage en modules `css/` (6 fichiers) et `js/` (10 fichiers), scripts classiques ; validée sur ZFold 8 Ultra
- [x] `ARCHITECTURE.md` créé
- [x] V003 : correctif des libellés de la matrice — validé sur smartphone
- [x] V004a : nouveau modèle de données v2 (4 niveaux, Projet › Tâche › Sous-tâche, taux d'exécution, urgence propre / effective), migration automatique, export 2.0, calculs des parents (`js/schema.js`, `js/calc.js`) ; vues adaptées au strict nécessaire — validée sur smartphone
- [x] V004b : interface complète du nouveau modèle (feuille à boutons, urgence Auto / Manuelle avec détail propre / héritée, durée, taux, Bloqué, domaine, étiquette, date de début ; pastille d'urgence et barre de progression ; icône de catégorie en coin ; libellés Projet / Tâche / Sous-tâche ; poignée des petites bulles) — validée sur smartphone
- [x] V005 : vue Arbre sans flèches (accordéon, domaine en couleur de fond, complexité en épaisseur de bordure, urgence, progression, catégorie, bouton + par carte) — validée sur smartphone
- [x] V006 : flèches de dépendance dans l'Arbre (pointillés, orange si en attente, regroupement des branches repliées, bouton « Dépendances ») — validée sur smartphone
- [x] V007 : ergonomie de l'Arbre (triangle plier / déplier agrandi, flèches reliées au tiers inférieur (départ) / supérieur (arrivée) du bord droit, rectangles moins larges : −25 % déplié, −8 % plié, barres de progression grises plus visibles) — **à valider sur smartphone**
- [ ] V008 : filtres et vues prédéfinies
- [ ] V009 : refonte ergonomique du formulaire de création / modification / suppression

## Limites connues

- Vue Arbre : les flèches passent par une gouttière à droite (peu lisibles si beaucoup de dépendances : masquer via « Dépendances ») ; la vue ignore le « zoom » des autres vues ; le bouton + d'une carte zoome les autres vues sur cet élément (bandeau « ← Retour »). **Point UX reporté** : à reprendre avec les évolutions ergonomiques sur le zoom (V009).
- Le statut n'est plus saisi dans la feuille : il se déduit du taux d'exécution (affiché en indication). Le Kanban reste un moyen rapide de changer le statut d'une feuille.
- Migration (rappel) : « En cours » est devenu taux 2 (50 %), tous les Projets ont le domaine « Autre » (à renseigner à la main), toutes les urgences sont en mode Manuel.
- Sur une bulle de complexité 1, la poignée est maintenant décalée vers l'extérieur : la bulle se déplace depuis son centre et se redimensionne depuis la poignée.

## Anomalies connues

- [x] ~~Matrice : libellés des bulles illisibles~~ → corrigé en V003 : police calculée en pixels écran (10 à 14 px), découpage en lignes adapté à la bulle, libellé masqué si la bulle est trop petite, **étiquette flottante avec le titre complet** au toucher / survol / glisser, infobulle au survol.
  - Limite connue : sur écran étroit (≈ 360 px), les bulles de complexité 1-2 n'ont pas de libellé (voir l'étiquette au toucher). Piste si gênant : agrandir légèrement les rayons (`R_MIN`, `R_STEP` dans `config.js`).

## Modèle de données visé — décisions validées

### Hiérarchie et vocabulaire
- **Projet › Tâche › Sous-tâche** : le type découle de la profondeur, pas d'un champ stocké. Un « Objet » sans enfant est une feuille.
- Attribut propre aux Projets : **domaine** (Maison, Administratif, Loisirs, Famille, Autre).

### Attributs
- **Catégorie, importance** : 4 niveaux.
- **Urgence** : 4 niveaux, avec un mode par tâche : **Auto** (calculée depuis l'échéance, proposé par défaut quand une échéance existe) ou **Manuelle**.
  - Seuils du mode Auto : plus de 30 j (ou pas d'échéance) → 1 ; 7 à 30 j → 2 ; 2 à 7 j → 3 ; moins de 48 h ou en retard → 4. Le retard reste signalé à part.
  - Sans échéance, la valeur est saisie (1 par défaut).
  - **Héritage** : urgence effective d'un parent = `max(urgence propre, urgence effective des enfants)`. On ne stocke que le mode et l'urgence propre manuelle ; l'urgence effective est calculée à la volée. Les enfants terminés (taux 100 %) sont exclus du calcul ; une tâche terminée n'affiche plus d'urgence.
  - **Affichage** : une seule pastille (urgence effective) avec un chiffre ou symbole en plus de la couleur ; un « ↑ » quand elle est héritée d'un enfant ; le détail (propre / héritée) dans la fiche.
  - **Matrice** : l'axe horizontal utilise l'urgence effective ; glisser une bulle à urgence héritée est bloqué horizontalement (message explicatif) ; glisser une bulle en mode Auto la bascule en Manuel.
  - Piste ultérieure (hors V004) : une tâche dont dépend une tâche urgente pourrait hériter de son urgence.
- **Complexité** : 4 niveaux. Saisie sur les feuilles ; pour un parent, calculée : `max( moyenne(enfants), max(enfants) − 1 )`, arrondie. (Le doublon « difficulté » est reporté : il désignera plus tard les compétences de l'utilisateur 🟢 je sais faire / 🟡 me documenter / 🔴 apprendre.)
- **Durée** : 2 valeurs, libellés **Court / Long** (validés), saisie sur les feuilles ; un parent est « Long » dès qu'un enfant l'est (OU logique).
- **Taux d'exécution** : saisi sur les feuilles (0 à 4 = 0 à 100 %). Pour un parent : moyenne simple des enfants, arrondie en 5 niveaux — 0 seulement si tous les enfants sont à 0, 4 seulement si tous sont à 4, sinon borné à 1-3.
- **Statut** : déduit du taux (0 → À faire ; 1 à 3 → En cours ; 4 → Fait).
- **Bloqué** : indicateur manuel indépendant (🔒) qui fige la saisie du taux sur une feuille ; sur un parent, le taux reste calculé et « Bloqué » s'affiche en surcouche. À distinguer de « en attente » (dépendance non terminée, automatique).
- **« Autre »** : plus un statut mais une étiquette de texte libre optionnelle (ex. « Reporté »).
- **Dépendances** : plusieurs, et entre niveaux / branches différents. Garde-fous : pas de cycle (`wouldCreateCycle` conservé), pas de dépendance à son propre parent ou à ses propres enfants ; nettoyage des dépendances orphelines à la suppression.
- Autres : date de début, échéance, note. **Retard** calculé (échéance, date du jour, taux).

### Conversion des données existantes (5 → 4 niveaux)
Règle fixe appliquée à la migration : 1→1, 2→2, 3→3, 4→3, 5→4. Anciennes tâches → Projets, anciennes sous-tâches → Tâches. Sauvegarde JSON préalable obligatoire ; export version 2.0 avec migration douce à l'import.

### Encodage visuel proposé
| Attribut | Canal |
|---|---|
| Domaine | Couleur de fond |
| Complexité | Épaisseur de bordure (écarts nets, ex. 1 / 2 / 3 / 5 px) |
| Avancement | Barre de progression + valeur |
| Urgence | Pastille colorée + durée avant échéance (si connue) |
| Dépendance | Flèche en pointillés |
| Catégorie | Icône en coin (validé) |

Points à surveiller : contraste bordure / fond pastel ; pastille d'urgence lisible sans la couleur seule (daltonisme).

## Exigences d'ergonomie

- **Feuille de saisie** : les niveaux (urgence, importance, complexité, taux…) ne doivent plus se régler avec des curseurs pleine largeur, qui se modifient involontairement pendant le défilement vertical. Prévu en V004b : sélecteurs à boutons (4 niveaux tapables) ne couvrant pas toute la largeur, ou à défaut `touch-action: pan-y` et marge de défilement.

## Décisions restant à prendre

Aucune : toutes les décisions de modélisation sont validées.

## Phases proposées

1. ~~V003 — Correctif matrice~~ (validée)
2. ~~V004a — Modèle de données~~ (validée) ; ~~V004b — Interface~~ (validée)
3. ~~V005 — Vue Arbre (sans flèches)~~ (validée) : cartes pastel par domaine, traits hiérarchiques, accordéon, attributs encodés (complexité = épaisseur de bordure, urgence, progression, catégorie)
4. ~~V006 — Flèches de dépendance~~ (validée) ; **V007 — Ergonomie de l'Arbre** (livrée, à valider)
5. **V008 — Filtres** puis **vues prédéfinies éditables**
6. **V009 — Refonte ergonomique du formulaire** de création / modification / suppression d'un élément : périmètre à cadrer avec l'utilisateur au lancement (organisation des champs, longueur du formulaire sur smartphone, saisie plus rapide, confirmation de suppression…)
7. Évaluer si la vue Arbre peut remplacer la matrice

## Autres pistes (à valider)

- Polices embarquées en local pour usage hors ligne
- Calendrier / échéances, progression par catégorie
- Attribut « difficulté » (compétences de l'utilisateur)

## Historique

| Version | Date (Paris) | Résumé |
|---|---|---|
| V01 | — | Application monofichier initiale |
| V002 | 2026-10-12 | Découpage css/js, ARCHITECTURE.md, roadmap, ToDo |
| (docs) | 2026-10-13 | V002 validée ; anomalie bulles ; chantier refonte planifié |
| V003 | 2026-10-16 | Correctif libellés de la matrice ; décisions de modélisation validées |
| (docs) | 2026-10-17 | Décisions urgence, durée, catégorie ; V004 scindée en a/b ; exigence ergonomique |
| V004a | 2026-10-17 | Modèle de données v2, migration automatique, export 2.0, calculs des parents ; V003 validée |
| V004b | 2026-10-18 | Interface complète du modèle v2 (feuille à boutons, urgence Auto / Manuelle, pastilles, barres de progression, icône de catégorie) ; V004a validée |
| V005 | 2026-10-18 | Vue Arbre (sans flèches) ; V004b validée ; V008 (refonte du formulaire) ajoutée |
| V006 | 2026-10-18 | Flèches de dépendance dans l'Arbre ; V005 validée ; point « zoom » reporté |
| V007 | 2026-10-19 | Ergonomie de l'Arbre (triangles, points d'attache des flèches, largeur des rectangles, barres grises) ; V006 validée ; filtres → V008, formulaire → V009 |
