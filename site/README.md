# Le 578e siège · le site

Site statique (Astro). Les données viennent du pipeline (`export/site/*.json`, produits par
`uv run python -m pipeline.export_site`) ; le build échoue si elles manquent.

```
npm ci          # installer
npm run dev     # aperçu local sur http://localhost:4321
npm run build   # site statique dans dist/
npm test        # tests de la géométrie de l'hémicycle
```

En production, le pipeline de nuit (`.github/workflows/nuit.yml`) construit le site et l'envoie
à Cloudflare Pages, seulement si les contrôles ont réussi (docs/deploiement-cloudflare.md).
