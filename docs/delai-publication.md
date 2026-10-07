# Délai de publication des scrutins

Généré le 2026-10-07T11:32:42+00:00 par `uv run python -m scripts.mesurer_delai_publication`. Données : `data/mesures/delai_publication/`.

## Méthode

- Toutes les heures, on lit la date de modification de l'archive des scrutins sur le serveur d'origine. Un paramètre anti-cache est nécessaire, car le serveur garde les fichiers 4 h en cache.
- Un scrutin est daté de la première version de l'archive qui le contient. On retient la date de modification de cette version, pas l'heure de l'observation, si bien que le rythme du relevé ne fausse pas la mesure.
- L'heure du vote n'est pas publiée. Le délai est encadré entre la fin prévue de la séance (borne basse, négative si l'archive a été régénérée pendant la séance) et son début (borne haute). Ces heures viennent de l'agenda.
- Limites : si l'archive est régénérée deux fois entre deux relevés, ou si un relevé échoue, les scrutins sont datés de la version suivante, et le délai est alors surestimé. Les écarts entre versions ci-dessous permettent de repérer ces trous.

## Suivi

- Début du suivi : 2026-10-07T11:31:14+00:00. La référence, c'est-à-dire l'archive du 2026-10-07T10:26:12+00:00, contenait les scrutins 1 à 8560. Ils ne sont pas mesurés.
- Versions observées après la référence : 0

## Délais

Aucun scrutin mesuré pour l'instant.

## Versions observées

| Modifiée le (UTC) | Observée le (UTC) | Scrutins | Dernier numéro | Nouveaux |
|---|---|---|---|---|
| 2026-10-07T10:26:12+00:00 | 2026-10-07T11:31:14+00:00 | 8560 | 8560 | référence |
