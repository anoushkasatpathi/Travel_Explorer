# Changelog

## v2.0.0

Built on top of v1 (the "Travel Around The World" template build).
**Unchanged:** the Home page (`src/screens/HomeScreen.js`, everything in `src/home/`), the splash screen (`src/splash/`), the top navigation (`src/navigation/TopNav.js`) and the hero flight animation (`src/hero/HeroOverlay.js`). These files are byte-for-byte identical to v1.

### Added
| File | What it does |
|------|--------------|
| `firestore.rules` | Firestore security rules: `users/{uid}/**` is private to its owner. `buddyPosts` can be read by anyone and changed only by the owner, and any signed-in user may add or remove only their own uid in `interested`. Includes field validation. |
| `CHANGELOG.md` | This file. |
| `src/services/firebase.js` | Initialises Firebase (App, Auth, Firestore) from `EXPO_PUBLIC_FIREBASE_*`. Exposes `firebaseEnabled = false` when keys are missing, so the app stays local-only. |
| `src/services/firebaseAuth.native.js` | Android/iOS auth with AsyncStorage persistence (stay signed in). |
| `src/services/firebaseAuth.web.js` | Web auth (browser persistence). |
| `src/services/cloudSync.js` | Per-user Firestore documents (`users/{uid}/data/wishlist`, `…/tripPlans`), per-user offline cache keys, merge helpers and the first-sign-in migration of local and guest data. |
| `src/context/AuthContext.js` | Email/password sign up, sign in, password reset and sign out, plus an anonymous guest fallback (a guest is *linked* when they create an account, so data is kept). Friendly error messages and a migration timeout so a slow network never blocks the app. |
| `src/hooks/useSyncedState.js` | AsyncStorage cache plus a realtime `onSnapshot` sync hook with last-write-wins on `updatedAt`, offline queueing and status reporting. |
| `src/components/SyncBadge.js` | Small pill showing where data lives: on this device, Connecting, Saving, Synced, Offline, or Sync blocked. |
| `src/components/FilterPills.js` | Filter pills with a spring-animated sliding highlight (Buddies). |
| `src/components/ExpandingFab.js` | Floating "Post a trip" button whose circle expands to fill the screen and reveals the form, then reverses on close. |
| `src/motion/motion.js` | Shared motion language: cinematic easings and durations (600–900 ms), `FadeSlideIn`, stagger helper, and support for the OS "Reduce motion" setting. |
| `src/motion/ProgressRing.js` | Animated SVG ring that fills up (planner completion, match scores). |
| `src/stage/stageStyles.js` | Per-destination tint colour (behind the frame) and horizon line (for the depth title), plus title fitting. |
| `src/stage/HeroSlide.js` | Full-bleed photo with a giant condensed title placed *behind* the scenery (feathered foreground layer). Includes the "See details" pill and the shrink-to-top-left transition. |
| `src/stage/HeroDeck.js` | Destinations hero view: a vertical wipe between slides, background tint cross-fade, a right-edge progress line, swipe, mouse-wheel and arrow-key navigation, and an in-place "See details" expand. |
| `src/stage/StageDetails.js` | Staggered reveal after "See details": description and meta fade in on the left, and cards slide in from the right. |
| `src/stage/CardCarousel.js` | Overlapping rounded image cards. The front card slides left as the next glides in, with a progress underline beneath. |

### Changed
| File | Change |
|------|--------|
| `.env.example` | Added `EXPO_PUBLIC_EXCHANGERATE_API_KEY` and all six `EXPO_PUBLIC_FIREBASE_*` variables. |
| `package.json`, `package-lock.json` | Added `firebase` and `@expo-google-fonts/bebas-neue`. |
| `App.js` | Wraps the app in `AuthProvider`, waits for the buddy feed as well, and adds a 9-second safety timeout for the splash. No visual change. |
| `src/fonts.js` | Registers **Bebas Neue** (`fonts.display`), the bold condensed face for the giant titles. Existing fonts are untouched. |
| `src/navigation/AppNavigator.js` | Adds a shared, subtle fade-and-slide transition between tabs. Routes are unchanged. |
| `src/hero/HeroContext.js` | The flight now lands on the new full-bleed Details stage (`detailsStageHeight()`) instead of the old 320 px header. The flight animation itself is unchanged. |
| `src/context/WishlistContext.js` | Now uses `useSyncedState('wishlist')`: device cache plus per-user Firestore sync. Same API as before, plus `syncStatus`. |
| `src/context/TripPlanContext.js` | Now uses `useSyncedState('tripPlans')` for notes and 3-day checklists. Same API as before, plus `syncStatus`. |
| `src/context/BuddyContext.js` | Posts come from Firestore (`buddyPosts`) via a realtime `onSnapshot`. Add, delete and "I'm in!" (`arrayUnion`/`arrayRemove`) write to Firestore. Sample posts appear only when offline, unconfigured or empty. `profileName` comes from the Firebase account. |
| `src/components/ProfileSheet.js` | The Sign In sheet now does real Firebase Auth (sign in, create account, forgot password, continue as guest, edit name, sign out, sync status). It falls back to the old local name when Firebase isn't configured. The nav button that opens it is unchanged. |
| `src/hooks/useExchangeRates.js` | Uses the authenticated v6 endpoint (`https://v6.exchangerate-api.com/v6/<KEY>/latest/USD`), then falls back to the keyless endpoint, Frankfurter/ECB, and saved or estimated rates. Keeps the 6-hour cache and exposes `backupNote`. |
| `src/components/CurrencyConverter.js` | Shows a small "Using backup rates" note when the keyed API isn't the source. |
| `src/screens/DestinationsScreen.js` | New Hero view (default, remembered) built on `HeroDeck`, with a floating minimal nav, a glass filter panel and a Hero/Grid toggle. The grid view, search and filters are kept. |
| `src/screens/DetailsScreen.js` | Top is now the full-bleed stage: the giant title shrinks to the top-left, the photo dims, the description fades in and attraction cards slide in. Weather, local info, currency and buddies sections are kept below. |
| `src/screens/WishlistScreen.js` | My Trips is now stacked hero cards: vertical swipe to browse, sideways swipe to remove (spring), a planner progress ring, a quick-jump strip and a sync badge. |
| `src/components/TripPlannerSheet.js` | Now a draggable bottom sheet (springs up; drag down to dismiss). Content is unchanged. |
| `src/screens/BuddyScreen.js` | Staggered card entrances, sliding filter pills, an expanding floating "Post a trip" button, a sync badge and a banner reflecting live, empty, offline or error states. |
| `src/components/BuddyCard.js` | Animated "I'm in!": colour morph, icon spin, ripple burst and an interest-count bump. |
| `src/components/PostTripSheet.js` | Exposes `PostTripForm` (embedded in the expanding button) and posts asynchronously with loading and error states. |
| `src/screens/MatcherScreen.js` | Packages / Trip Matcher is now a 5-step animated flow (direction-aware slides, filling stepper), with a live "top matches" preview, score rings and results that glide into their new order. The train slider is kept. |
| `README.md` | v2 summary, Firebase setup guide (project, Auth, Firestore, rules, keys), ExchangeRate-API key steps, and updated features, structure and how-it-works notes. |

### Removed
| File | Why |
|------|-----|
| `src/components/AttractionGallery.js` | Replaced on Details by the stage card carousel (`src/stage/CardCarousel.js`). The full-screen `GalleryViewer` is still used. |
