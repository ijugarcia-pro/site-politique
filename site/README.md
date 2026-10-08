# Le 578e siège · le site

Site statique (Astro). Les données viennent du pipeline (`export/site/*.json`, produits par
`uv run python -m pipeline.export_site`) ; le build échoue si elles manquent.

```
npm ci          # installer
npm run dev     # aperçu local sur http://localhost:4321
npm run build   # site statique dans dist/
npm test        # tests des calculs (hémicycle, votes, accord, code postal)
```

En production, le pipeline de nuit (`.github/workflows/nuit.yml`) construit le site et l'envoie
à Cloudflare Pages, seulement si les contrôles ont réussi (docs/deploiement-cloudflare.md).

Pages : accueil (`/`), Mon hémicycle (`/hemicycle/`), Explorer (`/explorer/`), une page par vote
(`/votes/{numéro}/`), les députés (`/deputes/` et `/deputes/{uid}/`), l'état des données
(`/etat/`). Le navigateur lit aussi `/donnees/deputes.json`, `/donnees/cp/{xx}.json` et
`/donnees/contours/{dep}.json` pour la recherche par code postal. Les réponses du visiteur et
son député restent dans son navigateur (`src/lib/navigateur.ts`).
