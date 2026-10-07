# Le 578e siège

Un site qui rend accessibles les votes de l'Assemblée nationale. Chaque semaine, tu tranches 3 vrais votes avant les députés, puis tu découvres le verdict ; tes réponses dessinent ton hémicycle : groupe le plus proche, jumeau parmi les 577 députés, précision.

## Architecture
1. Un pipeline de nuit (GitHub Actions) récupère l'open data de l'Assemblée nationale.
2. Python + DuckDB normalisent les données et appliquent les contrôles ; un échec ne publie rien.
3. Le pipeline exporte des JSON statiques, déployés sur Cloudflare Pages.
4. Les calculs personnels se font dans le navigateur ; les réponses restent en localStorage.
5. Supabase ne sert que pour les comptes facultatifs, suivis, alertes, signalements et agrégats consentis.

Voir [CLAUDE.md](CLAUDE.md) pour les règles complètes et [docs/decisions.md](docs/decisions.md).

## Tests
```bash
uv sync
uv run pytest
uv run ruff check .
```

## Licences
- Code : [MIT](LICENSE).
- Données de l'Assemblée nationale : [Licence ouverte](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).
