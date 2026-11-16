# WhaleTracker

Live map of whale and orca sightings around Puget Sound, from public reports
(Orca Network, Whale Alert and partners via [Acartia](https://acartia.io)),
[iNaturalist](https://www.inaturalist.org) and scientific datasets in
[OBIS](https://obis.org).

- Filter by time range, species, orca ecotype, pod or individual (J pod, J35, T65A…), source.
- Scrub or play a timeline, in cumulative or moving-window mode.
- See linked tracks and a simple 3-hour movement prediction for groups on the move.
- Sign in (Google or email) to follow whales and keep your filters.

See [docs/PLAN.md](docs/PLAN.md) for data sources, architecture and the Android roadmap.

## Develop

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests (parsers, normalisers, tracks, prediction)
npm run build   # type-check + production build into dist/
```

Firebase web config lives in `.env` (public client identifiers, safe to commit).
Put local overrides in `.env.local`.

## Firebase setup (one time)

1. Firebase console → Authentication → Sign-in method: enable **Google** and **Email/Password**.
2. Firebase console → Firestore Database → create a database (production mode).
3. Deploy rules and hosting:
   ```bash
   npm i -g firebase-tools && firebase login
   npm run build && firebase deploy --only hosting,firestore:rules
   ```
   The site is then at https://whaletracker-c5440.web.app (add that domain to Auth → Settings → Authorized domains if it isn't there).

## Data and etiquette

Sightings stay the property of their sources; each record links back to the
original, and source licences are listed in the app. Please keep your distance:
Washington law requires 1,000 yards from Southern Resident orcas.
