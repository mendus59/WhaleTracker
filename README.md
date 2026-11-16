# WhaleTracker

**Live site:** https://mendus59.github.io/WhaleTracker/  
**Android app:** https://github.com/mendus59/WhaleTracker/releases/latest/download/WhaleTracker.apk

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

## Hosting

Every push to `main` builds and deploys to GitHub Pages (`.github/workflows/pages.yml`).
Repo Settings → Pages → Source must be **GitHub Actions**.

## Android app

The web app is wrapped with [Capacitor](https://capacitorjs.com) (`android/`).
`.github/workflows/android.yml` builds a signed APK on every change to `main` and
publishes a GitHub Release `vX.Y.N` (X.Y from `package.json`, N = build number) with:

- `WhaleTracker-vX.Y.N.apk`: the versioned file
- `WhaleTracker.apk`: same build, fixed name, so this link always serves the newest:
  `https://github.com/mendus59/WhaleTracker/releases/latest/download/WhaleTracker.apk`

Pull requests build a debug-signed APK as a workflow artifact, without releasing.
Releases need four repo secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Keep the keystore backed up: every
version must be signed with the same key to install as an update.

To bump the major/minor version, change `version` in `package.json`.
Local build: `npm run android:sync`, then open `android/` in Android Studio.

Google sign-in isn't offered in the app yet (Google blocks its popup inside
app WebViews); email sign-in works.

## Firebase setup (one time)

1. Firebase console → Authentication → Sign-in method: enable **Google** and **Email/Password**.
   Authentication → Settings → Authorized domains: add `mendus59.github.io`.
2. Firebase console → Firestore Database → create a database (production mode).
3. Deploy rules and hosting:
   ```bash
   npm i -g firebase-tools && firebase login
   npm run build && firebase deploy --only hosting,firestore:rules
   ```
   The site is then at https://whaletracker-c5440.web.app (add that domain to Auth → Settings → Authorized domains if it isn't there).

## Sightings archive (GitHub Actions)

`.github/workflows/ingest.yml` runs `scripts/ingest.ts`, which collects sightings
from every source and saves them to Firestore `sightings/`. The web app reads that
archive (so history goes past Acartia's 7-day window) and tops it up with live
Acartia reports. Without the archive it falls back to fetching each source live.

- Every 10 minutes: Acartia + iNaturalist, last 2 days.
- Daily: OBIS + iNaturalist, last 120 days.
- Manual (Actions → Ingest sightings → Run workflow): any range; the default 1825 days is a 5-year backfill.

One-time setup:

1. Firebase console → Project settings → Service accounts → **Generate new private key**.
2. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**,
   name `FIREBASE_SERVICE_ACCOUNT`, value = the whole JSON file. Then delete the downloaded file.
3. Run the workflow once by hand for the backfill.

Until the secret exists, scheduled runs skip with a notice. GitHub pauses scheduled
workflows after 60 days without commits; re-enable from the Actions tab if that happens.

Try it locally without writing: `npx tsx scripts/ingest.ts --dry-run --days 7`.

## Data and etiquette

Sightings stay the property of their sources; each record links back to the
original, and source licences are listed in the app. Please keep your distance:
Washington law requires 1,000 yards from Southern Resident orcas.
