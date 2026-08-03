# David Howard Golf

Official site for David Howard, Cork amateur golfer, Cystic Fibrosis Ireland
ambassador, and qualifier for the 154th Open Championship at Royal Birkdale.

- `index.html` is the complete production site, self-contained, zero build step.
- `og.png` is the social share card.
- `port/` is an archived pre-Open migration snapshot retained for design reference.
  It is not a maintained or deployable copy source; begin any future migration from
  the authoritative production `index.html`.

Deploy: import this repo in Vercel, framework Other, no build command,
output directory `./`.

## Evergreen production mode

The reversible Open-week Live Desk has been removed from the production build. `index.html` is now the complete evergreen site; `live.js`, `live.json`, and `week.json` are intentionally absent.

The validation utilities and historical Live Desk contract tests remain in the repository so the event module can be restored safely for a future verified event. Repository-level module tests skip only when those event files are absent. If the module is restored, the tests activate automatically and require canonical source URLs, verification timestamps, and stale-data handling.

Run the production verification gate before deploying:

```bash
python3 -m unittest discover -s tests -v
```
