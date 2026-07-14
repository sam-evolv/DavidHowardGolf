# David Howard Golf

Official site for David Howard, Cork amateur golfer, Cystic Fibrosis Ireland
ambassador, and qualifier for the 154th Open Championship at Royal Birkdale.

- `index.html` is the complete production site, self-contained, zero build step.
- `og.png` is the social share card.
- `port/` holds the Next.js migration kit: HANDOFF.md, the lean source with
  external image paths, and the production-named image set.

Deploy: import this repo in Vercel, framework Other, no build command,
output directory `./`.

## Championship-week live operations

`live.json` is the only score source the public page will treat as canonical. Do not rely on a generic third-party leaderboard as a fallback.

1. Before publishing a score, verify it against the official Open leaderboard.
2. Update `live.json` with `active`, `state`, score fields, source URL and the three ISO timestamps. Add the newest item first to `updates`.
3. Update the matching day in `week.json`, set its `status` and refresh `updatedAt`.
4. Run the deployment gate locally:
   ```bash
   python3 -m unittest discover -s tests -v
   node --check live.js
   ```
5. Only then commit and deploy. During play, do this once per verified score change or at least once each minute. The page polls live data every 15 seconds while visible and every 60 seconds in the background.

The public card shows the source verification time and switches to a transparent "Latest verified score" state after two minutes without a fresh source update. It should never claim a score is live if its source is stale.

### The reversible Open Week Live Desk

The Championship experience is a data-controlled bolt-on: `live.js` injects it at runtime and `index.html` remains the evergreen David Howard Golf site.

- Set `week.json.enabled` to `true` during Open week and choose `lifecycle` as `pre_event`, `live`, or `complete`.
- Use `next`, `context`, `updates` and `days` in `week.json` for schedule, team diary and context. Team diary entries are distinct from official scoring.
- Set `week.json.enabled` to `false` after the Open. The script removes the Live Desk, score strip and polling, then restores the original evergreen countdown area. No site redesign or code removal is needed.

The live score may also include `whatItMeans`, an optional verified `scorecard`, and up to three structured `insights` (`label`, `value`, optional `detail`) for useful context such as cut-line position or the next decisive stretch. Never populate any of these from unverified commentary.

### Recommended automation

Use an approved Open data source in a server-side worker running every minute. The worker should validate David’s identity, write only on state change, preserve an append-only update history, and alert a private operator if the source fails or becomes stale. Do not scrape or use an undocumented endpoint in production without permission from the provider.
