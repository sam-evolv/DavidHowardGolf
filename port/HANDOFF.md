# DAVID HOWARD GOLF | Production Handoff for Claude Code

Mission: port `davidhowardgolf-v15.html` to a Next.js site on Vercel at `davidhowardgolf.com`, pixel-faithful or better, live before Wednesday 9 July 2026. The 154th Open starts 16 July. Press traffic is already flowing.

## 0. Ground rules (put these in CLAUDE.md at repo root)

```
- The design contract is davidhowardgolf-v15.html. Transplant it, do not redesign it.
- Palette is locked: ink #0C0E0D, bone #EDE8DC, violet #8C52D9 family. No new colours.
- Never use em dashes anywhere, in code comments or copy.
- Do not edit site copy. Every fact is verified against press coverage. Copy changes only via Sam.
- Every change ships with: exact commands, validation steps, rollback plan.
- Quality bar is Apple/Stripe/Linear. If a shortcut is visible, it is wrong.
- Stability over refactors. If it matches v15 and passes the gates, ship it.
```

## 1. What you are handed

```
dhg-assets/
  davidhowardgolf-v15.html    the design contract, self-contained, open it in a browser
  og.png                      1200x630 share card, goes to /public/og.png verbatim
  images/                     15 production-named JPEGs, already art-directed
    hero-swing.jpg            hero background
    qualifying-board.jpg      qualifying section, beside scorecard
    compare-then-pitchandputt.jpg / compare-now-dunes.jpg   then/now slider
    ch3-first-tee.jpg         story chapter 03
    family-crew.jpg / family-home.jpg                        The Home Team section
    gallery-range / gallery-medal / gallery-reading / gallery-ropes /
    gallery-oldcourse / gallery-swilcan / gallery-18th / gallery-pinflag
```

Alt text and captions for every image are already written inside v15. Copy them verbatim.

## 2. Stack and porting strategy

- Next.js (App Router) + TypeScript, deployed on Vercel. No Tailwind for this project: the prototype is a complete hand-tuned CSS system, and fidelity beats framework. Transplant the `<style>` block into `app/globals.css` almost verbatim.
- Fonts via `next/font` (zero layout shift, self-hosted):
  - `next/font/google`: Playfair Display (italic 500), IBM Plex Mono (400, 500).
  - `next/font/local`: Clash Display (500/600/700) and Satoshi (400/500/700). Download the font files from Fontshare (free licence) into `app/fonts/`. Expose as CSS variables and map them to `--font-display`, `--font-body`, `--font-serif`, `--font-mono` in globals.css. Delete the Fontshare/Google `<link>` tags.
- Images via `next/image` with the exact CSS treatment preserved (grayscale filter, hover/in-view colour reveal). Hero: `priority` + `fill` + `sizes="100vw"`. Gallery/sections: `sizes="(max-width: 720px) 78vw, (max-width: 1100px) 50vw, 33vw"` or per-slot equivalents.
- Copy: extract all section text into `content/site.ts` (typed constants) so copy edits during Open week are one-file changes. Components import from it. Diff of rendered text vs v15 must be zero.

## 3. Component map

```
app/layout.tsx        fonts, metadata, JSON-LD script, skip link, <SymbolDefs/> (DH mark symbol)
app/page.tsx          composes sections in v15 order
app/globals.css       transplanted CSS (tokens, sections, reduced-motion block)
app/icon.svg          the DH mark favicon (extract the data-URI SVG from v15 head, inline hexes)
components/
  Preloader.tsx        'use client'  001-to-154 counter, self-inking mark, sessionStorage skip
  Nav.tsx              'use client'  hide-on-scroll behaviour
  Hero.tsx             server shell; children below
  WindField.tsx        'use client'  the canvas engine, verbatim port of the JS
  WindChip.tsx         'use client'  open-meteo fetch (lat 53.617, lon -3.033), silent fallback
  SoundToggle.tsx      'use client'  Web Audio brown-noise engine, verbatim port
  Marquee.tsx          static, CSS-only (two instances, props for content and direction)
  Countdown.tsx        'use client'  target 2026-07-16T06:35:00+01:00, digit roll, next-up strip
  Qualifying.tsx       scorecard + board photo; CountUp + stamp slam as small client pieces
  Story.tsx            chapters, Compare slider ('use client'), pull quote
  HomeTeam.tsx         family section
  Gallery.tsx          film strip / 4-up grid; colour-on-centre IO for touch ('use client')
  Stats.tsx            counters ('use client' for count-up)
  Road.tsx             JourneyMap.tsx ('use client' for the draw) + timeline wire
  CF.tsx               purple block, donate CTA
  Partner.tsx
  PressKit.tsx         'use client' for the copy buttons; bios from content/site.ts
  Footer.tsx
lib/reveal.ts          shared IntersectionObserver reveal hook
```

JourneyMap: copy the two `<path class="land">` d-attributes and the route path from v15 exactly. That geometry is real Natural Earth 10m coastline data, projected. Do not regenerate or simplify it.

## 4. Metadata, SEO, share

- Use the Next Metadata API in `app/layout.tsx`: title, description, `metadataBase: new URL('https://davidhowardgolf.com')`, openGraph (image `/og.png`, 1200x630), twitter `summary_large_image`. Copy strings from the v15 head.
- JSON-LD: copy the `@graph` (Person + SportsEvent) from v15 into a `<script type="application/ld+json">` in layout.
- Add `app/sitemap.ts` and `app/robots.ts` (single URL site, trivial).
- Canonical: metadataBase handles it. og.png must return 200 before launch.

## 5. Build order (each phase ends deployed to a Vercel preview)

1. Skeleton: `npx create-next-app@latest davidhowardgolf --typescript --app --no-tailwind --eslint`, push to GitHub, connect Vercel. Validate: preview URL renders.
2. Fonts + globals.css transplant + tokens. Validate: type renders identically to v15 side by side, zero FOUT.
3. Static sections (server components) with images. Validate: full-page visual diff vs v15 at 390 / 768 / 1280 / 1536 widths.
4. Client behaviours: preloader, wind, sound, countdown, reveals, counters, stamp, marquees, journey draw, compare, copy buttons, nav hide, parallax, sky attribute, live wind. Validate: feature checklist below.
5. Metadata + og + icon + sitemap. Validate: opengraph.xyz preview, Rich Results test for JSON-LD.
6. QA gates (section 6), then domain cutover (section 7).

## 6. Acceptance gates (all must pass before the domain points at it)

Feature parity checklist, tested by hand:
- Preloader counts 001 to 154, mark inks itself, shows once per session, absent under reduced motion.
- Wind field runs at 60fps on an iPhone 12 or newer, pauses off-screen, pointer bends blades.
- Wind chip appears with live Birkdale data on the production domain; site is flawless when the API fails (test by blocking the request).
- Sound toggle: off by default, gusts audible, suspends on tab switch.
- Countdown correct in a non-Irish timezone (spoof TZ to America/New_York and verify).
- Scorecard counts up, QUALIFIED stamp slams once.
- Journey route: on mobile fully draws within ~1.6s of the map entering view; on desktop completes by 75% of the timeline scroll; waypoints light in order.
- Compare slider drags by touch, mouse, and arrow keys.
- Copy buttons work on the production domain (clipboard needs secure context, will not work on http).
- Photos: monochrome at rest, colour on hover (desktop) and on centring (touch).
- prefers-reduced-motion: no marquees, no canvas animation, route pre-drawn, everything readable.

Numbers:
- Lighthouse mobile: Performance >= 95, Accessibility = 100, Best Practices = 100, SEO = 100.
- CLS < 0.02, LCP < 2.5s on simulated 4G (hero image priority + next/font gets you there).
- axe DevTools: zero critical or serious issues.
- Run the Vercel Web Interface Guidelines audit (raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) against the final pages and fix every finding.

Device matrix, real hardware where possible: iPhone SE (320w), iPhone 15/16 (Safari), iPhone landscape, Pixel (Chrome), iPad portrait + landscape, 13" MacBook (short viewport, the hero must fit one screen), 27" display, Windows Chrome + Edge. Known iOS notes already handled in v15: svh units, safe-area insets, backdrop-filter prefixes. Keep them.

## 7. Domain, email, launch

1. Register `davidhowardgolf.com` today (Cloudflare Registrar or Namecheap). Also grab `.ie` if available.
2. Vercel: add domain to the project, follow DNS instructions, force HTTPS, www redirects to apex.
3. Email: cheapest clean route is the registrar's email forwarding or iCloud+ custom domain: create `partners@` and `press@` forwarding to David's (or Sam's) inbox. The mailto links in the code already use these addresses.
4. Two production placeholders to fill before cutover, both marked with comments in v15: the CF Ireland donate URL (swap for David's own fundraiser page when he has one) and confirmation of CF Ireland's exact ambassador purple (one token swap in globals.css if it differs from #8C52D9).
5. Launch order: promote the passing preview to production, point DNS, verify og card in WhatsApp and X, submit to Google Search Console with the sitemap.

Rollback: every deploy is immutable on Vercel. If production breaks: Vercel dashboard > Deployments > previous build > Promote to Production (or `vercel rollback`), then `git revert` the offending commit. Never fix forward under time pressure during Open week.

## 8. Phase 2, behind flags, do not block launch

Build after the site is live, each behind an env flag defaulting off:
- `NEXT_PUBLIC_LIVE_MODE`: countdown block swaps to a live strip (tee time, score, position) driven by `content/live.ts` that Sam edits from his phone via GitHub mobile. Prepare the component now, hidden.
- Messages for David wall: Supabase (Sam's stack) table + RLS, moderated via a simple approve flag. 
- Birdies for Birkdale pledge module: static pledge explainer + running total from `content/live.ts` first; payment/pledge automation later.
- Photo-shoot swap: when the professional shoot lands, replace hero-swing.jpg and add the commented hero `<video>` slot from v15.

## 9. Triage tree for likely port issues

1. Fonts look different: you loaded Fontshare via CSS link instead of next/font/local, or weights missing. Fix: self-host, match weights 500/600/700 (Clash) and 400/500/700 (Satoshi).
2. Hero overflows a laptop: the `min(13.5vw, 17svh)` clamp was lost in transplant. Restore it, and add a plain `vh` fallback line above each `svh` declaration for iOS 15.
3. Wind canvas janky on Android: dpr cap must stay at 2, blade count divisor 5200 on <720px. Both are in v15.
4. Images flash unstyled colour then grayscale: the filter must live on the `img` inside `.ph`, and `next/image` needs `style` or className pass-through: keep the exact selectors.
5. Journey route never draws: `getTotalLength()` called before hydration/layout. Run it in `useEffect` after mount, exactly like v15 runs it at end of body.
6. Marquee seam jumps: the two `.marquee-seq` children must be identical; translateX(-50%) depends on it.
7. Countdown off by an hour: someone "simplified" the target string. It must keep `+01:00`.

Everything else you need is in the v15 source. It is heavily commented, the two-voice colour rule and photo slots are documented inline. Treat it as the spec that happens to run.
