# Normalisation : les 11 tables

Généré par `uv run python -m pipeline.normalize` (base `data/site.duckdb`, non versionnée). Mesures : `data/mesures/normalisation.json`. Règles : docstring de `pipeline/normalize.py` et docs/decisions.md.

## Partition et totaux

**8559 scrutins sur 8560** passent la partition (une case par député en exercice, aucun votant hors mandat) et les totaux (décompte égal au décompte publié).

| N° | Raison |
|---|---|
| 1 | totaux : non-votants 21 au lieu de 10 |

## Tables

| Table | Lignes |
|---|---|
| `depute` | 649 |
| `mandat` | 678 |
| `groupe` | 14 |
| `appartenance` | 1400 |
| `scrutin` | 8560 |
| `vote` | 4931986 |
| `position_groupe` | 102720 |
| `dossier` | 3235 |
| `etape` | 27473 |
| `vote_prevu` | 48 |
| `contenu` | 0 |

## Contenu

- Cases par position : absent 3647153 · contre 626264 · pour 562804 · abstention 72232 · non_votant 23533.
- Cases sans groupe : 0.
- Votes dissidents : 20375, de 626 députés.
- Mises au point (gardées à côté du vote officiel) : 2594.
- Scrutins rattachés à un dossier : 8546 sur 8560.
- Votes solennels annoncés à venir : 5.

## Comparaison avec la ventilation publiée

- **Position des groupes.** Elle est calculée à la majorité simple des voix nominatives (pour, contre, abstention), et vaut « aucune » en cas d'égalité ou si personne n'a voté. La « position majoritaire » publiée n'est pas fiable : pour le même décompte, elle contredit parfois la majorité (2 pour et 17 contre publiés « pour », scrutin 3008), et elle vaut presque toujours « pour » quand personne n'a voté. Répartition : accord 88317 · aucune voix exprimée 9239 · désaccord 3092 · égalité 1926.
- **Effectifs des groupes** (nos membres − membres publiés, cas les plus fréquents) : +0 : 101222 · -1 : 525 · +1 : 514 · -3 : 105 · -7 : 57 · -2 : 57 · +15 : 40 · +14 : 17 · -8 : 16 · +18 : 16. Les écarts viennent de la ventilation publiée. Elle compte un nouveau député avec quelques jours de retard (entré en fonction le 25 mai 2026 en remplacement d'un député décédé, absent de l'effectif publié le 26), garde des groupes dissous (votes de novembre 2025 classés sous un groupe dissous en septembre) et range parfois les votes sous « PO0 ». Nos effectifs suivent les mandats de député et de groupe.
