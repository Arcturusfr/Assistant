<!--
  roadmap-et-avancement.md — Version V004a — 2026-10-17 15:45 (heure de Paris)
  Modifs : V003 validée ; V004a (modèle de données v2, migration, export 2.0) livrée ;
           périmètre de V004b précisé ; limites connues de V004a.
-->
# Assistant — Roadmap et avancement

## Où on en est (V004a)

- [x] V01 : application monofichier (matrice, kanban, liste, sous-tâches, dépendances, export/import JSON)
- [x] V002 : découpage en modules `css/` (6 fichiers) et `js/` (10 fichiers), scripts classiques ; validée sur ZFold 8 Ultra
- [x] `ARCHITECTURE.md` créé
- [x] V003 : correctif des libellés de la matrice — validé sur smartphone
- [x] V004a : nouveau modèle de données v2 (4 niveaux, Projet › Tâche › Sous-tâche, taux d'exécution, urgence propre / effective), migration automatique, export 2.0, calculs des parents (`js/schema.js`, `js/calc.js`) ; vues adaptées au strict nécessaire — **à valider sur smartphone**
- [ ] V004b : interface complète du nouveau modèle (voir « Périmètre de V004b »)

## Limites connues de V004a (interface provisoire)

- Pas encore de champ pour saisir : **durée Court / Long**, **taux d'exécution** (le statut de la feuille le règle de façon grossière : À faire = 0, En cours = 2, Fait = 4), **domaine** du projet, **étiquette libre**, **date de début**, **mode d'urgence Auto / Manuelle**. Le moteur est prêt et testé ; l'interface vient en V004b.
- Les curseurs de la feuille sont toujours des curseurs (sur 4 niveaux) : le remplacement par des boutons est prévu en V004b.
- Migration : « En cours » devient taux 2 (50 %), tous les Projets ont le domaine « Autre », toutes les urgences sont en mode Manuel.
- Rayons des bulles recalés sur 4 niveaux (`R_STEP` 11 → 15 dans `config.js`) : à juger sur smartphone.
- Constat existant (pas nouveau) : sur une bulle de complexité 1, la poignée de redimensionnement recouvre le centre ; pour la déplacer, la saisir par son bord haut-gauche. À traiter en V004b.

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

1. ~~V003 — Correctif matrice~~ (livrée, à valider)
2. ~~**V004a — Modèle de données**~~ (livrée, à valider) : migration 5→4 niveaux (1→1, 2→2, 3→3, 4→3, 5→4), vocabulaire Projet/Tâche/Sous-tâche, calculs (complexité, durée, taux, statut, urgence effective), export 2.0 avec migration douce
   **V004b — Interface** : voir « Périmètre de V004b »

## Périmètre de V004b

- Feuille : boutons à 4 niveaux (urgence, importance, complexité, taux d'exécution) ne couvrant pas toute la largeur ; durée Court / Long ; interrupteur Bloqué ; étiquette libre ; date de début ; domaine (projets) ; catégorie.
- Urgence : bascule Auto / Manuelle, valeur proposée depuis l'échéance, détail propre / héritée dans la fiche.
- Pastille d'urgence (couleur + chiffre, « ↑ » si héritée) et barre de progression sur les cartes ; catégorie en icône dans un coin.
- Libellés Projet / Tâche / Sous-tâche partout ; poignée de redimensionnement des petites bulles.
3. **V005 — Vue Arbre (sans flèches)** : rectangles pastel par domaine, traits hiérarchiques, accordéon, attributs encodés
4. **V006 — Flèches de dépendance** (avec regroupement quand une branche est repliée)
5. **V007 — Filtres** puis **vues prédéfinies éditables**
6. Évaluer si la vue Arbre peut remplacer la matrice

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
