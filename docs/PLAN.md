# WhaleTracker plan

Goal: a Puget Sound whale and orca tracker with the latest public and scientific
sightings, on the web first and then as an Android app with proximity alerts and
simple movement prediction.

## Data sources

All three were checked from a real browser on 2026-11-16: each answers with CORS
enabled and no API key.

| Source | What it is | Freshness | Key? | Terms |
| --- | --- | --- | --- | --- |
| [Acartia](https://acartia.io) `/api/v1/sightings/current` | Data cooperative fed by Orca Network, Whale Alert, Orcasound, Ocean Wise, Conserve.io/Spotter | Near real time, last 7 days only | No (other endpoints need an approved account token) | Open access, Creative Commons; attribute |
| [iNaturalist](https://api.inaturalist.org/v1/docs/) observations, taxon 152871 (Cetacea) | Community photo observations, research grade flagged | Real time, any range | No | Per-observation license; link back; keep to ~1 req/s |
| [OBIS](https://api.obis.org) occurrences, AphiaID 2688 (Cetacea) | Scientific datasets incl. Happywhale, OBIS-SEAMAP | Lags weeks to months | No | CC0 / CC-BY(-NC) per dataset |

Not used, and why:
- **Orca Network** and **Whale Alert** publish into Acartia, so we get them there rather than scraping their sites.
- **Happywhale** individual-ID data arrives through OBIS; its own API isn't public.
- **Acartia history** (beyond 7 days) needs a registered, admin-approved token. Worth requesting so we can archive sightings ourselves.

Individual whales and pods aren't structured fields in any source. We parse them
from free text (`J pod`, `Js and Ks`, `J35`, `T65A`, `T137s`) and infer the ecotype
(Southern Resident vs Bigg's). This works well on Orca Network reports, which
usually name the animals.

## Phase 1: web MVP (this PR)

- Vite + React + TypeScript, Leaflet map on OpenStreetMap tiles.
- Firebase Auth (Google and email/password); per-user prefs in Firestore `users/{uid}`
  (followed whales, saved filters, alert radius for later).
- Sources are fetched straight from the browser, normalised into one `Sighting`
  shape, de-duplicated across sources.
- Filters: recency (24 h to 5 years), species, orca ecotype, pod or individual,
  source, verified only, sort order.
- Timeline: histogram scrubber, play button, cumulative or moving-window view.
- Tracks: sightings of the same group are chained when the animals could have
  swum between them (<= 15 km/h, <= 6 h gap).
- Prediction: weighted average velocity over the last legs of a track, projected
  1–3 h ahead with a confidence score; hidden when the animals are milling or the
  track is stale.

## Phase 2: own the data (decided: GitHub Actions)

Browser-side fetching can't keep history beyond Acartia's 7 days, can't send push
notifications, and makes every visitor download OBIS pages. Next step is a
scheduled ingester that writes normalised sightings into Firestore every ~10 min.

Options:
1. **Cloud Functions (scheduled)** – needs the Blaze (pay as you go) plan. At this
   volume it should stay inside the free tier, but a card must be on file.
2. **GitHub Actions cron** – free, writes to Firestore with a service-account key
   stored as a repo secret. 5-minute minimum interval and best-effort timing.

Push notifications (FCM) need a server either way; with option 2 the same job sends them.

## Phase 3: Android app

- Wrap the web app with **Capacitor** (reuses this codebase, builds an APK).
- Plugins: `@capacitor/geolocation`, `@capacitor/push-notifications` (FCM),
  background location only if the user opts in.
- Proximity alerts: the user's alert radius and last known location (coarse, opt in)
  are stored in Firestore; the ingester checks each new sighting and its predicted
  path against them and sends an FCM message ("Orcas 6 km NW of you, heading S").
- Needs: an Android app registered in the Firebase project (`google-services.json`),
  and a signing key for release APKs.

## Later ideas

- Hydrophone detections (Orcasound) as a separate layer.
- Water-aware prediction (keep projected paths off land; follow channels).
- Let signed-in users submit sightings, forwarded to Acartia with a contributor token.
