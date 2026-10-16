<!--
  roadmap-et-avancement.md — Version V003 — 2026-10-16 22:10 (heure de Paris)
  Modifs : décisions de modélisation validées (complexité, durée, taux d'exécution, statut,
           dépendances, niveaux, encodage visuel) ; V003 (correctif libellés matrice) livrée.
-->
# Assistant — Roadmap et avancement

## Où on en est (V003)

- [x] V01 : application monofichier (matrice, kanban, liste, sous-tâches, dépendances, export/import JSON)
- [x] V002 : découpage en modules `css/` (6 fichiers) et `js/` (10 fichiers), scripts classiques ; validée sur ZFold 8 Ultra
- [x] `ARCHITECTURE.md` créé
- [x] V003 : correctif des libellés de la matrice (`js/matrix.js`, `css/matrix.css`, badge dans `index.html`) — **à valider sur smartphone**
- [ ] V004 : nouveau modèle de données (voir ci-dessous)

## Anomalies connues

- [x] ~~Matrice : libellés des bulles illisibles~~ → corrigé en V003 : police calculée en pixels écran (10 à 14 px), découpage en lignes adapté à la bulle, libellé masqué si la bulle est trop petite, **étiquette flottante avec le titre complet** au toucher / survol / glisser, infobulle au survol.
  - Limite connue : sur écran étroit (≈ 360 px), les bulles de complexité 1-2 n'ont pas de libellé (voir l'étiquette au toucher). Piste si gênant : agrandir légèrement les rayons (`R_MIN`, `R_STEP` dans `config.js`).

## Modèle de données visé — décisions validées

### Hiérarchie et vocabulaire
- **Projet › Tâche › Sous-tâche** : le type découle de la profondeur, pas d'un champ stocké. Un « Objet » sans enfant est une feuille.
- Attribut propre aux Projets : **domaine** (Maison, Administratif, Loisirs, Famille, Autre).

### Attributs
- **Catégorie, importance, urgence** : 4 niveaux.
- **Complexité** : 4 niveaux. Saisie sur les feuilles ; pour un parent, calculée : `max( moyenne(enfants), max(enfants) − 1 )`, arrondie. (Le doublon « difficulté » est reporté : il désignera plus tard les compétences de l'utilisateur 🟢 je sais faire / 🟡 me documenter / 🔴 apprendre.)
- **Durée** : 2 valeurs, libellés proposés **Court / Long**, saisie sur les feuilles ; un parent est « Long » dès qu'un enfant l'est (OU logique).
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
| Catégorie | Icône en coin (à confirmer) |

Points à surveiller : contraste bordure / fond pastel ; urgence saisie (1-4) ou déduite de l'échéance (à trancher en V004).

## Décisions restant à prendre

- [ ] Urgence : saisie sur 4 niveaux, ou déduite de l'échéance, ou les deux ?
- [ ] Libellés définitifs de la durée (Court / Long ou autre)
- [ ] Canal visuel de la catégorie (icône en coin ?)

## Phases proposées

1. ~~V003 — Correctif matrice~~ (livrée, à valider)
2. **V004 — Nouveau modèle de données** : migration, vocabulaire Projet/Tâche/Sous-tâche, export 2.0, adaptation de la feuille, du kanban, de la liste et de la matrice
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
