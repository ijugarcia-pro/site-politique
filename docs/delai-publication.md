# Délai de publication des scrutins

Généré le 2026-10-15T10:06:37+00:00 par `uv run python -m scripts.mesurer_delai_publication`. Données : `data/mesures/delai_publication/`.

## Méthode

- Toutes les heures, on lit la date de modification de l'archive des scrutins sur le serveur d'origine. Un paramètre anti-cache est nécessaire, car le serveur garde les fichiers 4 h en cache.
- Un scrutin est daté de la première version de l'archive qui le contient. On retient la date de modification de cette version, pas l'heure de l'observation, si bien que le rythme du relevé ne fausse pas la mesure.
- L'heure du vote n'est pas publiée. Le délai est encadré entre la fin prévue de la séance (borne basse, négative si l'archive a été régénérée pendant la séance) et son début (borne haute). Ces heures viennent de l'agenda.
- Limites : si l'archive est régénérée deux fois entre deux relevés, ou si un relevé échoue, les scrutins sont datés de la version suivante, et le délai est alors surestimé. Les écarts entre versions ci-dessous permettent de repérer ces trous.

## Suivi

- Début du suivi : 2026-10-07T11:31:14+00:00. La référence, c'est-à-dire l'archive du 2026-10-07T10:26:12+00:00, contenait les scrutins 1 à 8560. Ils ne sont pas mesurés.
- Versions observées après la référence : 27
- Écart entre deux versions : min 6,0 h · médiane 6,0 h · 90 % ≤ 12,0 h · max 12,0 h
- Heure (UTC) des versions : 04 h : 8 · 10 h : 5 · 16 h : 7 · 22 h : 7

## Délais

**Tous les scrutins** : 172 scrutins

- Depuis la fin prévue de la séance (borne basse) : min 0,4 h · médiane 4,4 h · 90 % ≤ 10,0 h · max 10,0 h
- Depuis le début de la séance (borne haute) : min 2,4 h · médiane 3,4 h · 90 % ≤ 10,4 h · max 15,4 h
- Publiés au plus tard le lendemain du vote à 8 h : 172 sur 172
- Répartition depuis la fin prévue : moins de 1 h : 19 · 3 à 6 h : 25 · 6 à 12 h : 12

**Scrutins solennels** : 2 scrutins

- Depuis la fin prévue de la séance (borne basse) : min 4,0 h · médiane 4,0 h · 90 % ≤ 4,0 h · max 4,0 h
- Depuis le début de la séance (borne haute) : min 9,5 h · médiane 9,5 h · 90 % ≤ 9,5 h · max 9,5 h
- Publiés au plus tard le lendemain du vote à 8 h : 2 sur 2
- Répartition depuis la fin prévue : 3 à 6 h : 2

## Versions observées

| Modifiée le (UTC) | Observée le (UTC) | Scrutins | Dernier numéro | Nouveaux |
|---|---|---|---|---|
| 2026-10-07T10:26:12+00:00 | 2026-10-07T11:31:14+00:00 | 8560 | 8560 | référence |
| 2026-10-07T16:26:57+00:00 | 2026-10-07T21:23:27+00:00 | 8577 | 8577 | 17 |
| 2026-10-07T22:26:57+00:00 | 2026-10-08T02:04:49+00:00 | 8608 | 8608 | 31 |
| 2026-10-08T04:26:06+00:00 | 2026-10-08T09:10:02+00:00 | 8608 | 8608 | 0 |
| 2026-10-08T10:26:39+00:00 | 2026-10-08T16:38:20+00:00 | 8609 | 8609 | 1 |
| 2026-10-08T16:27:00+00:00 | 2026-10-08T22:13:01+00:00 | 8611 | 8611 | 2 |
| 2026-10-08T22:27:05+00:00 | 2026-10-09T02:18:27+00:00 | 8621 | 8621 | 10 |
| 2026-10-09T04:26:56+00:00 | 2026-10-09T09:18:57+00:00 | 8621 | 8621 | 0 |
| 2026-10-09T10:26:19+00:00 | 2026-10-09T16:23:14+00:00 | 8641 | 8641 | 20 |
| 2026-10-09T16:26:30+00:00 | 2026-10-09T21:05:32+00:00 | 8660 | 8660 | 19 |
| 2026-10-10T04:26:34+00:00 | 2026-10-10T07:18:09+00:00 | 8672 | 8672 | 12 |
| 2026-10-10T16:26:20+00:00 | 2026-10-10T22:41:57+00:00 | 8672 | 8672 | 0 |
| 2026-10-10T22:27:06+00:00 | 2026-10-11T01:59:56+00:00 | 8672 | 8672 | 0 |
| 2026-10-11T04:26:23+00:00 | 2026-10-11T09:05:20+00:00 | 8672 | 8672 | 0 |
| 2026-10-11T10:26:35+00:00 | 2026-10-11T15:49:22+00:00 | 8672 | 8672 | 0 |
| 2026-10-11T22:26:56+00:00 | 2026-10-11T23:45:30+00:00 | 8672 | 8672 | 0 |
| 2026-10-12T04:27:07+00:00 | 2026-10-12T07:29:12+00:00 | 8672 | 8672 | 0 |
| 2026-10-12T16:26:46+00:00 | 2026-10-12T18:03:07+00:00 | 8681 | 8681 | 9 |
| 2026-10-12T22:26:50+00:00 | 2026-10-13T00:51:44+00:00 | 8696 | 8696 | 15 |
| 2026-10-13T04:26:15+00:00 | 2026-10-13T07:50:15+00:00 | 8696 | 8696 | 0 |
| 2026-10-13T10:26:34+00:00 | 2026-10-13T16:08:26+00:00 | 8696 | 8696 | 0 |
| 2026-10-13T16:27:19+00:00 | 2026-10-13T21:21:39+00:00 | 8704 | 8704 | 8 |
| 2026-10-13T22:27:08+00:00 | 2026-10-14T00:26:15+00:00 | 8707 | 8707 | 3 |
| 2026-10-14T04:26:21+00:00 | 2026-10-14T06:15:43+00:00 | 8707 | 8707 | 0 |
| 2026-10-14T10:26:26+00:00 | 2026-10-14T12:08:08+00:00 | 8707 | 8707 | 0 |
| 2026-10-14T16:26:18+00:00 | 2026-10-14T20:51:12+00:00 | 8708 | 8708 | 1 |
| 2026-10-14T22:26:19+00:00 | 2026-10-14T23:58:46+00:00 | 8732 | 8732 | 24 |
| 2026-10-15T04:26:11+00:00 | 2026-10-15T10:06:36+00:00 | 8732 | 8732 | 0 |
