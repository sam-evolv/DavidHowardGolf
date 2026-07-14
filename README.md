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

### Recommended automation

Use an approved Open data source in a server-side worker running every minute. The worker should validate David’s identity, write only on state change, preserve an append-only update history, and alert a private operator if the source fails or becomes stale. Do not scrape or use an undocumented endpoint in production without permission from the provider.
