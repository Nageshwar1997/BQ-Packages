# Try-on Package Plan

BQ-Client ke try-on feature ko `BQ-Packages` me ek (ya do) package me convert karne ka plan.

**Pehle padho:** shared packages ka order [SHARED-FRONTEND-PACKAGES-PLAN.md](./SHARED-FRONTEND-PACKAGES-PLAN.md) me hai (styles -> hooks -> ui -> tryon). Ye plan unke baad ka hai.

**Status:** Planning. Koi code abhi nahi chhua gaya. Open decisions (neeche) pe jawab milne ke baad Phase 1 se shuru hoga.

---

## 1. Abhi kya hai (BQ-Client me)

| Layer | Path | Files | Lines |
| --- | --- | --- | --- |
| Engines (MediaPipe, live/upload) | `src/classes/tryon/` | 29 | 2250 |
| React UI | `src/components/layout/tryons/` | 21 | 1852 |
| Constants | `src/constants/tryon-constants/` | 6 | 1927 |
| Rendering utils | `src/utils/tryon-utils/` | 6 | 3828 |
| Types | `src/types/tryon-types/` | 6 | 465 |
| Hooks | `useTryOnFlow`, `useTryOnUpload`, `useDebouncedDetectionStatus` | 3 | 410 |
| Page (app me hi rahega) | `src/pages/tryons/index.tsx` | 1 | 86 |

Saath me: 13 test files (vitest), 5 docs (`docs/tryons/*.md`), static assets.

**Assets (`public/`):**
- `models/tryon/` - 3 files, ~12 MB (`face_landmarker.task`, `hair_segmenter.tflite`, `hand_landmarker.task`)
- `images/tryon/` - ~60 `.webp`, ~4.6 MB
- Code me absolute URL se load hote hain (`/models/tryon/...`, `/images/tryon/...`, 55 jagah)
- MediaPipe wasm CDN (jsdelivr) se aata hai

**npm dependencies:** `react`, `@mediapipe/tasks-vision` (1.0.1), `@iconify/react`, `@beautinique/frontend-constants`, `@beautinique/frontend-types`, `@beautinique/shared-utils`.

### App se coupling (package me todni padegi)

Sirf 8 app modules:

| App module | Kaun use karta hai |
| --- | --- |
| `components/ui/GradientText` | BottomSheet, Instructions, Sidebar |
| `components/layout/containers/ScrollableGradientContainer` | ModelList, PatternSwatches, ShadeSwatches |
| `components/ui/Button` | BottomButtons, Instructions |
| `components/ui/Divider` | Sidebar |
| `components/layout/modals/ModalWrapper` | `tryons/index.tsx` |
| `components/ui/inputs/children` | `tryons/index.tsx` |
| `hooks/useDebounce` | `useDebouncedDetectionStatus` |
| `components/layout/static-page` | `pages/tryons` (page app me hi rahega) |

Package ka akela consumer: `pages/product/ProductDetails/index.tsx`.
`Products.tsx`, `input.constants.ts` (`PRODUCT_TRYON_INPUT_MAP_DATA`) aur `api.type.ts` sirf try-on ka *data/type* use karte hain, UI nahi.

**Styling:** components host ke Tailwind theme tokens use karte hain (`border-primary`, `text-primary`, `bg-primary-invert`, `text-tertiary`, `bg-secondary-invert`).

---

## 2. Open decisions

| # | Sawal | Recommendation | Options |
| --- | --- | --- | --- |
| 1 | Package shape | Do packages: `tryon-core` + `tryon-react` | (a) core + react, (b) ek hi package, (c) pehle sirf core |
| 2 | Models/images ka kya | Package me nahi, host URL deta hai (`modelsBaseUrl` / `imagesBaseUrl`) | (a) host URL, (b) package ke saath ship (16 MB), (c) CDN |
| 3 | Naam | `@beautinique/frontend-tryon-core`, `@beautinique/frontend-tryon-react` | - |
| 4 | UI primitives (Button, Divider, ...) | Package ke apne minimal versions, `ModalWrapper` host wrap kare | Props/slots se host inject kare |

---

## 3. Phases

### Phase 1 - Scaffold (`BQ-Packages`)
- `packages/frontend/tryon-core` (aur agar decision 1(a) ho to `tryon-react`) banana, `frontend-constants` ke template jaisa: `tsup`, `tsconfig`, `eslint`, `package.json`.
- `npm run create` interactive hai, wo user chalayega. Files hand se bhi bana sakte hain.
- Development ke dauran BQ-Client me `file:` ya `npm link` se link, publish se pehle test ke liye.

### Phase 2 - Core move (framework-free)
- Move: `classes/tryon`, `utils/tryon-utils`, `constants/tryon-constants`, `types/tryon-types` + 13 tests.
- Assets configurable: `configureTryOn({ modelsBaseUrl, imagesBaseUrl, wasmBaseUrl })`. Defaults purane paths. 55 hardcoded paths ek helper ke through.
- `@mediapipe/tasks-vision` ko `peerDependency` banana. App ka vite sourcemap-fix plugin app me hi rahega (README me likhna).
- **Check:** package `build`, `typecheck`, `lint`, `vitest` (13 tests) pass.

### Phase 3 - React layer
- 21 components + 3 hooks.
- 8 app modules ki coupling todna (section 1 ki table):
  - `useDebounce` -> package me chhota internal copy
  - `Button`, `GradientText`, `Divider`, `ScrollableGradientContainer` -> package ke minimal versions
  - `ModalWrapper`, `static-page` -> package me nahi, host wrap karega
- Tailwind: host ko package ki files apne `@source` me deni hongi. README me instruction.

### Phase 4 - BQ-Client integration
- Moved code delete, imports package se.
- App me rahega: `pages/tryons`, `ProductDetails` (consumer), `Products.tsx`, `PRODUCT_TRYON_INPUT_MAP_DATA`, API types.
- `TTryOnSelection` pehle se `@beautinique/frontend-types` me hai (source: `packages/shared/types`, wahi se re-export). Package me types `frontend-types` se hi lena, `shared-types` direct nahi. `types/tryon-types` ka duplicate check.
- **Check:** BQ-Client `tsc`, `eslint`, `vitest`, `vite build`.

### Phase 5 - Real verification
- Browser me product ka try-on kholna, **image upload mode** me asli try-on chalake result dekhna.
- Live camera mode: agar yahan camera nahi mila to saaf likhna ki test nahi hua.
- Pehle (BQ-Client me) aur baad (package se) same tests aur same output compare.

### Phase 6 - Publish
- `npm run republish` interactive CLI user chalayega.
- Uske baad BQ-Client `file:` link hata ke npm version pe.
- BQ-Admin / BQ-Seller / BQ-Master me abhi use nahi, jab tak zarurat na ho.

---

## 4. Risks

- Tailwind class scanning package ke andar se na milna (classes purge ho jayein).
- MediaPipe ka `optimizeDeps.exclude` host vite config me chahiye.
- wasm CDN version aur `@mediapipe/tasks-vision` version ka mismatch.
- 16 MB assets ko npm me bhejna (isiliye decision 2).
- `tsup` abhi non-React packages ke liye set hai, React + JSX build config naya banega.
- Package ka version bump / republish ke baad BQ-Client me install karna na bhoolna.
