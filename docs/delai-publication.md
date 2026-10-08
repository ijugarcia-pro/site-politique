# Délai de publication des scrutins

Généré le 2026-10-08T16:41:38+00:00 par `uv run python -m scripts.mesurer_delai_publication`. Données : `data/mesures/delai_publication/`.

## Méthode

- Toutes les heures, on lit la date de modification de l'archive des scrutins sur le serveur d'origine. Un paramètre anti-cache est nécessaire, car le serveur garde les fichiers 4 h en cache.
- Un scrutin est daté de la première version de l'archive qui le contient. On retient la date de modification de cette version, pas l'heure de l'observation, si bien que le rythme du relevé ne fausse pas la mesure.
- L'heure du vote n'est pas publiée. Le délai est encadré entre la fin prévue de la séance (borne basse, négative si l'archive a été régénérée pendant la séance) et son début (borne haute). Ces heures viennent de l'agenda.
- Limites : si l'archive est régénérée deux fois entre deux relevés, ou si un relevé échoue, les scrutins sont datés de la version suivante, et le délai est alors surestimé. Les écarts entre versions ci-dessous permettent de repérer ces trous.

## Suivi

- Début du suivi : 2026-10-07T11:31:14+00:00. La référence, c'est-à-dire l'archive du 2026-10-07T10:26:12+00:00, contenait les scrutins 1 à 8560. Ils ne sont pas mesurés.
- Versions observées après la référence : 4
- Écart entre deux versions : min 6,0 h · médiane 6,0 h · 90 % ≤ 6,0 h · max 6,0 h
- Heure (UTC) des versions : 04 h : 1 · 10 h : 1 · 16 h : 1 · 22 h : 1

## Délais

**Tous les scrutins** : 49 scrutins

- Depuis la fin prévue de la séance (borne basse) : —
- Depuis le début de la séance (borne haute) : min 2,9 h · médiane 4,4 h · 90 % ≤ 10,4 h · max 10,4 h
- Publiés au plus tard le lendemain du vote à 8 h : 49 sur 49

Aucun scrutin solennel mesuré pour l'instant.

## Versions observées

| Modifiée le (UTC) | Observée le (UTC) | Scrutins | Dernier numéro | Nouveaux |
|---|---|---|---|---|
| 2026-10-07T10:26:12+00:00 | 2026-10-07T11:31:14+00:00 | 8560 | 8560 | référence |
| 2026-10-07T16:26:57+00:00 | 2026-10-07T21:23:27+00:00 | 8577 | 8577 | 17 |
| 2026-10-07T22:26:57+00:00 | 2026-10-08T02:04:49+00:00 | 8608 | 8608 | 31 |
| 2026-10-08T04:26:06+00:00 | 2026-10-08T09:10:02+00:00 | 8608 | 8608 | 0 |
| 2026-10-08T10:26:39+00:00 | 2026-10-08T16:38:20+00:00 | 8609 | 8609 | 1 |
