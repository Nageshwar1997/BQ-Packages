# Shared Frontend Packages Plan

4 apps (`BQ-Client`, `BQ-Admin`, `BQ-Seller`, `BQ-Master`) me bahut sa frontend code copy hai. Is plan me shared packages ka **order** aur **har package me kya jayega** hai. Try-on package inke baad banega ([TRYON-PACKAGE-PLAN.md](./TRYON-PACKAGE-PLAN.md)).

**Status:** Package 1 (`frontend-styles`) bana aur BQ-Client me pilot ho chuka (verified, publish baaki). Baaki packages planning me.

## Duplication ka asli data (4 apps ka diff)

`src/components`, `hooks`, `styles`, `utils`, `stores`, `classes`, `index.css` scan kiye (tests chhod ke):

| Result                       | Files  |
| ---------------------------- | ------ |
| Identical in all 4 apps      | **73** |
| Sab me hain par content alag | 15     |
| Sirf 2-3 apps me             | 2      |
| Sirf ek app me               | 71     |

Jo 73 identical hain wahi packages ki base list hain. Jo 15 alag hain wo app-specific hain (neeche "App me hi rahega").

---

## Order

```
1. frontend-styles   (CSS, kisi pe depend nahi)
        |
2. frontend-hooks    (hooks + zustand stores; React/zustand/react-router peer)
        |
3. frontend-ui       (components + unke constants; styles + hooks pe depend)
        |
4. frontend-tryon-core
        |
5. frontend-tryon-react   (ui + hooks + styles pe depend)
```

**Kyun ye order:** upar wala package neeche walon ka dependency hai. CSS tokens ke bina components ki styling toot'ti hai, aur hooks/stores ke bina `Toaster`, `Theme` jaise components compile nahi hote. Try-on sabse last, kyunki wo `Button`, `Divider`, `GradientText`, `ScrollableGradientContainer`, `useDebounce` use karta hai, jo ab ui/hooks se aayenge.

---

## 1. `@beautinique/frontend-styles`

Sab 4 apps me identical, koi coupling nahi.

- `index.css` (entry: tailwind import, `@plugin '@tailwindcss/typography'`, aur neeche ke files ka import order)
- `styles/variables.css` (theme tokens: `primary`, `primary-invert`, `tertiary`, ...)
- `styles/fonts.css` + Metropolis `woff2` files (5, ~100KB, 4 apps me identical) - **package ke andar** `src/fonts/metropolis/`
- `styles/global.css`
- `styles/component.css`
- `styles/animations.css`
- `styles/utility.css`
- Component CSS jo components ke saath aate hain: `teddy.css`, `colorInput.css`, `quillInput.css`

**Dhyan:** Tailwind v4 me host ko `@source` me JS wale packages ka path dena padega (warna classes purge ho jayengi). README me likha hai.

**Shape:** CSS-only package, `src/` seedha publish hota hai (`dist/` nahi, kyunki compile karne ko kuch nahi). `build`/`typecheck` dono `check.mjs` chalate hain: `exports`, `@import` aur `url()` ke relative paths (fonts) maujood hain ya nahi. Publish ka `build` step isi se galat path pakadta hai.

**Fonts:** package me hi. `fonts.css` relative `url()` use karta hai, Vite hashed file bana deta hai aur `index.html` ka preload `href` (`/node_modules/@beautinique/frontend-styles/src/fonts/metropolis/...`) khud usi hashed file pe rewrite hota hai. Apps ko `public/fonts` rakhne ki zaroorat nahi.

**Local dev gotcha:** plain `file:` dependency symlink hoti hai - Vite dev font files ko 403 deta hai aur Tailwind IntelliSense `tailwindcss` resolve nahi kar pata. Dev me `npm install --install-links file:...` (copy) use karo. Publish ke baad ye issue nahi rehta.

**Done jab:** 4 apps me `index.css` ek `@import '@beautinique/frontend-styles'` ban jaye aur UI pehle jaisa dikhe.

**Pilot result (BQ-Client):** package ke saath build ka compiled CSS purane build se **byte-identical** nikla. App-level override verified: `:root` variable override, naya `@theme` token (naya utility ban gaya), existing token (`--breakpoint-xl`) override, app-only `@utility`. Dev server me asli page styled dikha. Apps apna CSS `app.css` me likhte hain, jo package ke **baad** import hota hai, isliye wahi jeetta hai.

**Fonts pilot (BQ-Client):** `public/fonts` hata ke fonts package se. Prod build: 5 hashed `woff2`, CSS urls aur 3 preload tags usi hashed files pe. Dev (copy install): fonts 200 aur `loaded`, koi 403 nahi. Tailwind IntelliSense asli BQ-Client pe 25572 suggestions, purane setup jitne.

**Baaki:** `npm run republish` (user), phir BQ-Client me `file:` ki jagah npm version, aur BQ-Admin/Seller/Master me same migration (unke `public/fonts` bhi hatenge, `index.html` ke preload `href` badlenge).

---

## 2. `@beautinique/frontend-hooks`

Peer deps: `react`, `zustand`, `react-router-dom`.

**Hooks (clean, identical):**

- `useDebounce` (naye `{ trigger, cancel }` shape ke saath) - **package me ban gaya** (named export, 8 tests, publish baaki)
- `useIsSmallScreen` - **package me ban gaya** (named export, 7 tests)
- `useOutsideClick` - **package me ban gaya** (named export, 9 tests; `enabled` ka default ab `true`)
- `useScrollable`
- `usePathParams`, `useQueryParams` (react-router peer) - **package me ban gaye** (named export, 5 + 16 tests; `useQueryParams` ke liye `@beautinique/shared-utils` dependency)

**Stores (zustand, identical, clean):**

- `theme.store`, `toast.store`, `action.store`

**Saath me:** `useAutoRetry` (sirf `action.store` pe depend karta hai).

**App me hi rahega (app ke API/envs se bandhe):** `useAutoRefreshAccessToken`, `useWakeUp`, `useProcessQuillContent`, `useAuthLogoutListener` (2 variants), `user.store`.

**Rollout:** ek-ek hook, is order me: `useDebounce` -> `useIsSmallScreen`, `useOutsideClick` (DOM, jsdom tests) -> `usePathParams`, `useQueryParams` (router peer) -> `useScrollable` -> `useAutoRetry` (store ke baad). Sab **named export**; apps me import lines badalni padengi (`import useDebounce from` se `import { useDebounce } from`).

**Tests:** `src/*.test.ts` (vitest + jsdom + testing-library), type-check/lint ke saath, par `dist` me nahi jate (`tsconfig.build.json` se declarations).

**Done jab:** 4 apps me ye hooks/stores package se aayein, local copies delete.

---

## 3. `@beautinique/frontend-ui`

Peer deps: `react`, `react-router-dom`, `@iconify/react`; depends on `frontend-hooks`; styles host se.

**ui/:** `Badge`, `Button`, `Divider`, `GradientText`, `LinearGradient`, `QuillContent`, `Resend`, `Stepper`, `Theme`, `Toaster`, `Tooltip`

**ui/inputs/:** `Checkbox`, `FileInput`, `HierarchySelect`, `Input`, `Radio`, `Select`, `Textarea`, `children/`, `colorInput/`

**layout/:** `ApiStatus`, `ScrollToTop`, `dropdown`, `skeletons/Skeleton`, `table`

**layout/containers/:** `BorderGradient`, `ScrollableGradientContainer`

**layout/carousels/:** `MediaCarousel`, `MediaCarouselWithModal`, `MediaCarouselWithParentMedia`

**layout/loaders/:** `LoadingPage`, `LoadingRings`, `LoadingScreen`, `LoadingText`, `WakeUpProgress`, `teddy/`

**layout/media/:** `VideoPlayer`

**layout/modals/:** `AuthModal`, `ConfirmModal`, `MediaModal`, `ModalWrapper`

**Constants jo components ke saath move honge** (abhi `common.constants` me hain, jo apps me alag hai):
`BEAUTY_FACTS`, `EMPTY_OBJECT`, `LOADING_RINGS_DATA`, `TOAST_TYPE`, `TOOLTIP_ANIMATION_DURATION`, `VIDEO_PLACEHOLDER`.

**Do cheezon pe design chahiye:**

- `WakeUpProgress` abhi `useWakeUp` ke type/constant pe depend karta hai. Package me props-driven banega (`phase`, `services`, `awakeServices` upar se aayenge).
- `quillInput` (depends on `QuillImgBlot` + `input.constants`) pehle version me nahi, `QuillImgBlot` ke saath baad me.

**Done jab:** 4 apps me ye components package se aayein, local copies delete, `tsc`/build clean.

---

## 4-5. Try-on (`tryon-core`, `tryon-react`)

Details [TRYON-PACKAGE-PLAN.md](./TRYON-PACKAGE-PLAN.md) me. Is plan ke baad us plan ka Phase 3 chhota ho jayega: `Button`, `Divider`, `GradientText`, `ScrollableGradientContainer`, `useDebounce` ke internal copies nahi banane, `frontend-ui` / `frontend-hooks` se import honge.

---

## App me hi rahega (package me nahi)

Ye 15 files 4 apps me alag content ke saath hain, app-specific hain:

- `classes/ApiRequest.ts`, `classes/apis/*` (Organization/Product/User API)
- `components/layout/footer`, `navbar`, `sidebar`, `forms/LoginForm`, `containers/BrandShowcasePanel`
- `components/ui/AuthBottomInstructions`, `Breadcrumb`
- `hooks/useAuthLogoutListener`
- `utils/api.util.ts`, `utils/common.util.ts` (2-2 variants; baad me reconcile kar sakte hain)
- `constants/*` (common, form, navbar, footer, routes, api): har app ka alag. `input.constants` 4 apps me same hai, wo ek aur candidate hai.

---

## Har package ke liye same rollout

1. `BQ-Packages` me package banana (existing `frontend-constants` template), `build`/`typecheck`/`lint` clean.
2. Pilot **BQ-Client** me: dev ke dauran `file:`/`npm link`, local copies hata ke package se import, `tsc`/`eslint`/`vitest`/`vite build`.
3. Browser me asli pages kholke check (sirf compile pass kaafi nahi).
4. User `npm run republish` chalayega (interactive, main nahi chala sakta).
5. BQ-Admin, BQ-Seller, BQ-Master me npm version install + local copies delete.

---

## Risks

- Har change ke liye version bump + republish + 4 apps me install, copy-paste se slow. Dev me `file:` link se kam hoga.
- `tsup` abhi non-React packages ke liye set hai. React + JSX + CSS build ka config naya banega.
- Tailwind class scanning, `@source` galat ho to styles gayab.
- Components jo kisi app ke store/envs/routes se bandhe hain unhe galti se package me daalna. Isiliye "COUPLED" files alag rakhi hain.
- Pehle package (`styles`) ko galat shape diya to baaki sab uske upar hain. Isiliye wahi pilot ke liye sabse pehle.
