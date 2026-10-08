# Hooks 10/10 Plan (TEMPORARY)

`@beautinique/frontend-hooks` ke saare hooks ko 10/10 tak le jaane ka plan.

> **Ye file temporary hai.** Jaise hi neeche ka scoreboard poora 10/10 ho jaye aur Section 6 ke saare checkbox bhar jayein, **ye file delete karni hai** (aur memory me `hooks-10-plan` ka pointer bhi). Isko commit mat karna.

**Status:** Planning. Abhi koi code nahi chhua gaya. Section 2 ke decisions pe jawab milne ke baad Phase 1 se shuru.

---

## 1. Scoreboard

Scores meri taraf se hain (code padh kar, tests ginkar, browser me verify karke). 10/10 ka matlab **"koi known gap nahi bacha + Section 3 ke saare evidence gates pass"** hai. Ye saabit nahi kar sakta ki koi unknown bug nahi hai; isliye har hook ke liye gates (tests, mutation, real browser) rakhe hain.

| Hook | Abhi | Target | Bade gaps | Phase |
| --- | --- | --- | --- | --- |
| `useDebounce` | 9 | 10 | `flush`, `isPending` nahi | 5 |
| `useIsSmallScreen` | 9 | 10 | har snapshot par naya `matchMedia`; server value fixed `false` | 5 |
| `usePathParams` | 9 | 10 | `pathParams` ke types loose | 5 |
| `useQueryParams` | 8.5 | 10 | global pending slot, `useBlocker`/redirect par stale pending, package ki do copies, hash drop | 2 |
| `useOutsideClick` | 8.5 | 10 | portal, detached target, shadow DOM, keyboard focus-out | 4 |
| `useQueryParamInput` | 9 | 10 | blocked navigation, `flush`/`isPending`, URL ka leading space | 3 |
| Test suite (sab ke liye) | 8.5 | 10 | real-timer tests CPU load me flaky | 1 |

---

## 2. Decisions jo aapse chahiye

Ye naye features/API hain. "Nahi chahiye" bhi theek jawab hai: tab wo item 10/10 ke hisaab me out-of-scope maana jayega aur scoreboard me uski jagah "N/A" likhunga.

**Default:** aapne "sab kuch karna, useBlocker dhyan me rakh ke" bola hai, to jahan meri recommendation "Haan" hai wahi default maanunga aur kaam shuru karunga. D3, D6 aur D8 ke liye kaam ke beech me aapse poochunga.

| # | Sawal | Meri recommendation |
| --- | --- | --- |
| D1 | `useDebounce` me `flush()` aur `isPending()` (aur `useQueryParamInput` me Enter par turant bhejne ke liye `flush`) chahiye? | Haan: chhota hai, ref-based hai, re-render nahi karta |
| D2 | `useQueryParams` navigate karte waqt `hash` bhi rakhe? (abhi hash drop hota hai) | Haan, current hash rakho; `state` abhi bhi drop |
| D3 | `useOutsideClick` me `ignore` option (refs ki list) chahiye, portal-wale popups ke liye? Pehle Phase 4.1 me check hoga ki apps me ye bug asal me hota hai ya nahi | Pehle check, phir decide |
| D4 | `useOutsideClick` keyboard focus bahar jaane par bhi callback de? (`focusin`) | Option ke roop me, default off |
| D5 | `useIsSmallScreen` me server-side value ka option (`{ serverValue }`)? | Haan, chhota hai. Poora `useMediaQuery` abhi nahi |
| D6 | Version: naye options aaye to `1.1.0` (minor) ya aapki convention me `1.0.x`? | Aap batao, republish aap hi karte ho |
| D7 | `useQueryParams` router ki asli state padhe (`UNSAFE_DataRouterContext` se `router.state`) taaki `useBlocker`/redirect/interrupt sahi pakde jayein? Ye `UNSAFE_` API hai (react-router-dom ke apne internals bhi isi par chalte hain), isliye data router na mile to purani 2s-expiry wala fallback rakhunga (Section 4A dekho) | Haan (hybrid), kyunki bina iske blocked/committed ka farq React ke render lag ki wajah se pakda nahi ja sakta |
| D8 | Blocked update ke baad `useQueryParamInput` ka box kya dikhaye: user ka likha text (recommended) ya URL ki purani value par wapas? | Text rakho, URL se mismatch tab tak jab tak user dobara bheje ya URL badle |

---

## 3. 10/10 ke evidence gates (har hook ke liye)

Ek hook tabhi 10/10 jab ye sab sach ho:

1. **Gaps band:** uske row ke saare gaps fix ho gaye (ya D-decision me "nahi chahiye").
2. **Mutation:** uske source par mutation run, har non-equivalent mutant pakda gaya. Equivalent mutants code comment me explain.
3. **Deterministic tests:** `npm test` lagataar 10 baar pass, background CPU load ke saath. Koi `setTimeout`-based timing assumption nahi.
4. **Real browser:** current version par kam se kam ek app me asli clicks/typing se verify (Section 5 ki matrix).
5. **Static:** tsc, eslint (react-hooks rules ke saath), prettier, build clean.
6. **Docs:** README aur JSDoc behaviour se match karte hain, naye options documented.
7. **Koi render-phase `setState` nahi** (jo pattern `useQueryParamInput` me asli bug laya tha).
8. **`useBlocker` safe:** Section 4A ki matrix ke relevant tests pass (navigation karne/padhne wale hooks `useQueryParams`, `useQueryParamInput`, `usePathParams` ke liye poori matrix, baaki ke liye smoke), aur real browser me temporary blocker ke saath bhi verify.

---

## 4. Kaam karne ka tareeka (rules)

- Package me kuch bhi badalne se pehle: hook ko **app me temporary copy** banao, real browser me test karo, tab package me update (aapki standing instruction; memory: `hooks-package-workflow`).
- Har fix **test pehle** (failing), phir fix, phir mutation.
- Main `republish` nahi chalaunga aur commit nahi karunga. Aap republish karoge, phir main apps migrate karke browser me dobara verify karunga. Commit messages main draft karunga.
- Jis cheez ko "verified" kahunga, uske liye asli user-facing action karunga (memory: `verification-standard`).
- Naya bug mile to is file ke Section 7 (log) me likhunga.
- **Koi bhi hook kabhi `useBlocker` register nahi karega** (router sirf ek blocker support karta hai, aakhri register hone wala jeetta hai, to hamara hook app ka blocker tod dega). Hum sirf test code me blocker lagayenge.

---

## 4A. `useBlocker`: kya hota hai aur har hook par asar

Ye sab react-router 7.18.4 ke source (`chunk-GR4NQCSD.js`, `navigate` / `shouldBlockNavigation` / `updateBlocker`) se confirm kiya hai, andaze se nahi.

**React Router ka asli behaviour**
1. Blocked `navigate()` **turant resolve** ho jaata hai. Koi loader nahi chalta, **koi commit nahi**, `router.state.navigation.state` `idle` hi rehta hai. Sirf `blocker.state` `blocked` hota hai, aur `blocker.location` me target.
2. `blocker.proceed()` wahi `navigate(to, opts)` **dobara** chalata hai (wahi `to`, yaani block ke waqt ki search). Ye navigation hamare hook se nahi guzarta, to hamare pending store me iski entry nahi hogi.
3. `blocker.reset()` blocker ko idle kar deta hai. Kuch commit nahi hota.
4. Back/Forward (POP) bhi block ho sakte hain: router URL ko wapas restore karta hai.
5. Ek hi blocker chalta hai: aakhri `useBlocker` jeetta hai. Naya blocked navigation purane `blocked` ko replace karta hai.
6. Blocker ka function `({ currentLocation, nextLocation, historyAction })` leta hai. Sahi config sirf pathname badalne par block karta hai, par `useBlocker(isDirty)` jaisa boolean sab kuch block kar deta hai, **search param updates bhi**. Hooks ko dono ke saath theek chalna hai.

**Har hook par asar**

| Hook | Blocker ke saath kya ho sakta hai | Kya karna hai |
| --- | --- | --- |
| `useQueryParams` | Blocked update ke baad `pending` 2s tak atka rehta hai, agla `setParams` ek aise URL par build hota hai jo bana hi nahi. `proceed()` ke waqt pending me entry nahi hoti. | Section 4B (design) + Phase 2 |
| `useQueryParamInput` | Blocked send ki entry `inFlight` me rehti hai. `proceed()` par committed URL us entry se match karega (theek, echo), par `reset()` par entry stale rehti hai. Box URL se aage chala jaata hai. | Phase 3.1 + D8 |
| `usePathParams` | Block ke dauran `location` badalti nahi, to behaviour same. Back/Forward block hone par router URL restore karta hai. | Regression test (B4) |
| `useDebounce` | Blocked navigation ka isse lena-dena nahi, par pending timer dialog khule rehte hue fire ho sakta hai, aur unmount par cancel hona chahiye. | Smoke test (B7) |
| `useOutsideClick` | Confirm dialog ke andar ke clicks popup ke "bahar" ginte hain (sahi). | Smoke test (B8) |
| `useIsSmallScreen` | Koi asar nahi. | Kuch nahi |

**Blocker test matrix** (sirf `createMemoryRouter` me ho sakta hai, kyunki blocker data router chahta hai). Ek test-only helper `BlockerGate` banega (config: `shouldBlock` function, aur buttons jo `proceed`/`reset` karein), package me export nahi hoga.

| # | Scenario | Jo hona chahiye |
| --- | --- | --- |
| B1 | `useBlocker(true)` (sab block), `setParams` -> block -> `reset()` | URL same, `queryParams` same, pending saaf, agla `setParams` committed URL par build |
| B2 | Wahi, `proceed()` | URL blocked target par commit, hooks us par settle, box (input hook) URL ko follow kare |
| B3 | Block ke baad dusra `setParams`, phir `proceed()` | Aakhri blocked target hi commit ho, koi purana update wapas na aaye |
| B4 | Back/Forward block (POP) jab box me pending typed text ho | URL restore ho, box blocked target ko follow na kare, `reset()` ke baad theek, `proceed()` ke baad URL follow |
| B5 | Sahi config: sirf pathname badalne par block | Search-param updates bina rukawat chalein (regression guard) |
| B6 | `clearParams()` aur `removeParams` blocked | Pending saaf, koi duplicate history entry nahi |
| B7 | Blocked state me `useDebounce` fire / unmount | Koi crash nahi, cancel kaam kare |
| B8 | Blocker dialog ke andar click (`useOutsideClick`) | Popup band ho (bahar ka click) |
| B9 | Loader/middleware **redirect** (jaise `authenticate` -> `/auth`) | Pending saaf, input box follow na kare jab URL us route par hi na ho |
| B10 | StrictMode me B1 aur B2 | Same result |

---

## 4B. `useQueryParams` ke pending ka design (Phase 2 yahi tay karega)

**Dikkat:** `navigate()` ka promise commit hone ke **turant baad** resolve hota hai, par React us commit ko kuch ms baad render karta hai (is session me 100ms tak lag dekha). Isliye promise settle hote waqt `committedSearchRef` (jo React render par update hota hai) se ye tay nahi kiya ja sakta ki navigation commit hui ya block. Agar settle par pending jaldi clear kiya to purana "lost update" race wapas aa jayega.

| Option | Kaise | Kamzori |
| --- | --- | --- |
| A: sirf token + promise | Pending ko token do, promise settle par clear | Upar wali dikkat: commit aur block ka farq pata nahi |
| **B: router ki asli state (hybrid, recommended)** | `UNSAFE_DataRouterContext` se `router`. `currentSearch()` = jab hamari navigation in-flight ho to uska pending search, nahi to `router.state.location.search` (render lag nahi). Navigate ka promise settle hote hi pending clear (token match par). Declarative router (BrowserRouter/MemoryRouter without data) par purani 2s expiry | `UNSAFE_` API (par React Router ke apne internals bhi yahi use karte hain). Fallback hai |

**B ka refined design (blocker-aware `currentSearch()`, router state se, priority order):**
1. hamara local pending (sync gap: same-tick updates, aur declarative routers); navigate promise settle par token-match clear;
2. koi blocker jiski state `blocked`/`proceeding` ho aur `location.pathname` same ho: uski `location.search` (proceed() wahi last blocked target navigate karta hai, to naya update usi par build ho);
3. `router.state.navigation.location` (koi aur code same pathname par navigate kar raha ho);
4. `router.state.location.search` (committed, render lag nahi).

Isse: blocked + reset -> committed par build (B1); blocked + proceed -> blocked target commit (B2); same-tick compositions blocker ke saath bhi (B3); redirect aur interrupt ke baad galat pending nahi (B8/B9).

Spike: pehle failing tests (Phase 2.1), phir ye design, phir decide (D7).

---

## 5. Phases

### Phase 1: Test suite ko deterministic banana (sab hooks ke liye)

Abhi 3 parallel suites chalane par 3 alag real-timer tests intermittently fail hue (`useQueryParams.dataRouter` ka "follows the real URL again once a navigation commits (Back)", aur `useQueryParamInput.dataRouter` ke do).

- [x] 1.1 Real-timer tests ki list banao (`grep setTimeout` in `*.test.tsx`).
- [x] 1.2 `createMemoryRouter` ke loaders me `setTimeout(NAV_MS)` ki jagah **hath se resolve hone wala deferred** lagao: test khud tay kare ki navigation kab commit ho. Ordering exact, timing zero.
- [x] 1.3 `useQueryParamInput.concurrent.test.tsx` real scheduler pe hi rahega (uska kaam hi wahi hai), par uski assertions timing-independent invariants hain; sirf timeouts generous rakho.
- [x] 1.4 Seeded fuzz tests (naya dependency nahi): `buildSearch`/`parseParams` (round-trip, untouched keys ka order aur multi-values, idempotence) aur `useQueryParams` ke multi-component updates.
- [x] 1.5 **Gate:** `npm test` 10 baar lagataar, ek core busy ke saath, aur 3 parallel suites 5 baar: 0 failures.

### Phase 2: `useQueryParams` (sabse bada gap)

- [x] 2.0 **Test helper:** `BlockerGate` (Section 4A) aur ek `deferred` loader helper (Phase 1.2 ke saath) banao. **Done:** `BlockerGate`, `navigation-gate`, `query-params-harness` (`block`, `onLoad` redirect).
- [x] 2.1 **Pehle failing tests (B1, B3, B6, B9):** blocked aur redirected navigation ke baad `pending` 2s tak atka rehta hai aur agla `setParams` ek aise URL par build hota hai jo bana hi nahi. Ye pehle fail dikhna chahiye. **Done:** `useQueryParams.blocker.test.tsx` (B1-B6, B8, B8b, B9a/b); B1, B6, B8, B9b aur B4 pehle red the (fix ke baad green).
- [x] 2.2 **Spike + fix (Section 4B, D7):** hybrid B banao: data router me `currentSearch()` = in-flight pending ya `router.state.location.search`; navigate promise settle par token-match pending clear; declarative router par 2s expiry. Phir B1-B10 sab. **Done (D7 = haan, hybrid):** `router-search.ts`; blocker location sirf tab jab wo hamara apna last-started update ho (B4 ne dikhaya ki warna Back-target par build hota tha).
- [x] 2.3 **Badal gaya:** public `setParams/removeParams/clearParams` ka return type `void` hi rahega. Promise return karne par apps ke `onClick: () => setParams(...)` jaise handlers par `@typescript-eslint/no-misused-promises` aa jata (breaking lint). Phase 3 ko navigation ka natija chahiye, uske liye internal (index.ts se export nahi) channel banega.
- [x] 2.4 **Package ki do copies:** pending slot `globalThis[Symbol.for('@beautinique/frontend-hooks:pending-search')]` par rakho. Test: `vi.resetModules()` ke baad do baar import, dono same slot dekhein. Ek page par ek hi router maana jayega, README me likho. **Done:** pending ab `globalThis[Symbol.for(...)]` slot par, tokens ke saath; unit test (do module copies).
- [x] 2.5 D2 ke jawab ke hisaab se `hash` rakhna + test. **Done (D2 = haan):** hash ab bachta hai (router state se fresh); `state` abhi bhi nahi. Tests: MemoryRouter + data router + "router React se aage" (B13, B13b).
- [ ] 2.6 Browser (4 apps): status select + search ek saath, slow navigation (route middleware se ~200ms), Back/Forward; Client me login modal replace-on-close. **Blocker ke saath:** apps me abhi `useBlocker` kahin nahi hai (grep se confirm), to ek temporary `BlockerGate` kisi page par lagakar (verify ke baad hata dena) B1, B2, B4 asli Back button aur asli clicks se chalana, `useBlocker(true)` aur sahi pathname-only config dono ke saath. **Admin (local build) me hua, baaki apps republish ke baad:** B1, B2, B3 (asli status select), B4, B5 asli browser me `TempBlockerGate` ke saath: sab pass. Temp gate hata diya.
- [x] 2.7 **Mutation:** `useQueryParams.ts`, `pending-search.ts`, `query-string.ts` ki mutation lists likho aur chalao; survivors ko kill ya "equivalent" likho. **Done:** `useQueryParams.ts` 9/10 (+U4 test ke baad 10/10), `router-search.ts` 5/7 (+R4, R7 tests ke baad 7/7; R2 equivalent), `pending-search.ts` 6/6, `query-string.ts` 4/4 (+1 equivalent), hash 3/3.
- [x] 2.8 README: pending ka naya behaviour, ek-router-per-page, hash. **Done:** README ka `useQueryParams` section.

### Phase 3: `useQueryParamInput`

- [x] 3.1 **Blocked/aborted/redirected navigation (B1-B4, B9, B10):** ek subtlety hai: blocked send ki entry `inFlight` me **rehni chahiye**, kyunki `proceed()` baad me wahi target commit karta hai aur use echo maanna hai (warna box purane text par chala jayega). Par `reset()` / redirect / interrupt par wo entry stale hai aur hatani hai. Is farq ke liye router ka blocker state chahiye (D7 ka `router.state.blockers` + `subscribe`), ya phir simple niyam: stale entry tab saaf ho jab koi bhi unmatched URL change aaye. Pehle failing tests, phir dono ko spike karke chunna. Box me user ka text rehta hai (D8). **Done:** internal `useQueryParamsEngine` (public `useQueryParams` uska wrapper) update ka natija deta hai (`sent`, `search`, `outcome: committed|held|lost`); input hook `lost` entry turant hatata hai, `held` entry tab tak rakhta hai jab tak blocker hold kare, `router.subscribe` se `reset()` par turant hatata hai (commit se pehle). Tests `useQueryParamInput.blocker.test.tsx` (B1, B2, B3, B4, B4b, B8, B9, sensible blocker).
- [x] 3.2 D1 haan ho to `flush()` (timer cancel + turant bhejo) aur `isPending()` (ref-getter). Tests + README. **Done (D1 = haan):** `useDebounce` me `flush()`/`isPending()`, input hook me bhi.
- [x] 3.3 URL me leading space (`?search=%20lip`): box me `trimStart()` dikhao, comparison raw value par. Test. **Done:** URL ka leading space box me nahi dikhta.
- [x] 3.4 `clear()` ki `valueRef.current = ''` wali line equivalent mutant hai: ya to comment me invariant likho ya hatao; mutation dobara. **Done:** comment me invariant likha.
- [ ] 3.5 **Stress Seller aur Master me bhi** (Admin me ho chuka): published build, slow-nav middleware, `delay: 50` temporary, 3 regimes. **Admin (local build):** 41 runs (4 navigation regimes, ~11 sends/run, sensible blocker page par), 0 failures. Seller/Master republish ke baad.
- [x] 3.6 README me limits likho: sirf string values, ek router per page. **Done:** README.

### Phase 4: `useOutsideClick`

- [ ] 4.1 **Pehle investigate:** apps me `createPortal` ya portaled popups dhundo jo `useOutsideClick` wale element ke andar logically hain (Select, HierarchySelect, colorInput, navbar popups). Agar bug asal me ho raha hai to D3 "haan".
- [ ] 4.2 `element.contains(event.target)` ki jagah `event.composedPath().includes(element)`: ye shadow DOM aur **detached target** (click par element DOM se hat jata hai, jaise list item remove hone wala dropdown) dono sahi handle karta hai. Pehle failing tests.
- [ ] 4.3 D3 haan ho to `ignore: RefObject[]` option. D4 haan ho to `focusin` option (default off).
- [ ] 4.4 Tests: touch/pen, stopPropagation, `enabled` toggle, unmount.
- [ ] 4.5 Browser (Client): Select, HierarchySelect, colorInput, dropdown asli clicks se; portal case agar mila.

### Phase 5: Chhote hooks

- [x] 5.1 `useDebounce`: D1 haan ho to `flush` + `isPending()`; `maxWait` nahi banayenge (YAGNI, README me likho). Tests + mutation dobara. **Done:** flush + isPending (tests); mutation neeche Section 7 me.
- [ ] 5.2 `useIsSmallScreen`: `MediaQueryList` har query ke liye ek baar (`useMemo`), snapshot me naya object nahi. D5 haan ho to `{ serverValue }`. Tests (SSR dono value ke saath).
- [ ] 5.3 `usePathParams`: generic keys, jaise `usePathParams<'categoryL1' | 'slug'>()`, default `string` (non-breaking). Type test (`expectTypeOf`).
- [ ] 5.4 `usePathParams` ke liye B4 (blocked Back/Forward) aur B1/B2 me location/paths ka behaviour test; `useDebounce` ke liye B7 aur `useOutsideClick` ke liye B8 smoke tests; `useIsSmallScreen` ke liye kuch nahi (state nahi).
- [ ] 5.5 `usePathParams` JSDoc me `location` aur flat spread dono kyun hain, ye likho.

### Phase 6: Final sweep

- [ ] 6.1 Root par `build`, `typecheck`, `lint`, `format:check` (hooks path), `test`: sab clean.
- [ ] 6.2 Mutation: har hook ke liye final run, results Section 7 me.
- [ ] 6.3 `npm pack --dry-run`: koi test file nahi, size theek.
- [ ] 6.4 Aap republish karo (D6 ke hisaab se version).
- [ ] 6.5 Main 4 apps me bump + migrate (agar API badli) aur Section 8 ki browser matrix **published build par** chalaunga.
- [ ] 6.6 Scoreboard dobara bharo. Sab 10 to Section 9.

---

## 6. Gates ka tracker (hook x gate)

`[ ]` baaki, `[x]` pass. Har gate Section 3 ke number se.

| Hook | G1 gaps | G2 mutation | G3 deterministic | G4 browser | G5 static | G6 docs | G7 no render-state | G8 useBlocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `useDebounce` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [x] | [ ] |
| `useIsSmallScreen` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [x] | [x] (N/A, state nahi) |
| `usePathParams` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [x] | [ ] |
| `useQueryParams` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [x] | [ ] |
| `useOutsideClick` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [x] | [ ] |
| `useQueryParamInput` | [ ] | [x] (29/30, 1 equivalent) | [ ] | [x] (1.0.5) | [x] | [ ] | [x] | [ ] |

(G7 un hooks ka source padh kar tick kiya hai: koi bhi render ke dauran state set nahi karta.)

---

## 7. Log (jaise jaise kaam ho, yahan likhna)

- **Phase 1 done.** `src/test-utils/` (navigation-gate, BlockerGate, query-params-harness; build se excluded). Real-timer loaders ki jagah `gate.hold()/release()`; fragile tests (echo-while-typing, URL-change-while-waiting) ab timing-free (changeable debounce / fake timers). Gate: `npm test` 6x busy core + 12 parallel runs: 0 failures (pehle 3 alag tests flaky).
- **Phase 1.4 ne `buildSearch` me 2 asli bug pakde** (seeded fuzz, kisi example test ne nahi pakde the): (1) integer-jaisi keys (`?b=1&10=x`) object order ki wajah se aage aa jaati thi, position nahi bachti thi; (2) `?c=a&c=` (last value blank) me untouched key poori hat jaati thi, uski non-blank value `a` samet. Fix: object update me URL ka apna order, aur untouched ka faisla original values se. `removeParams` ab object mode se. Updater form me returned object ka order chalta hai (JS integer keys aage rakhta hai), docs me likha. 400 seeds x 8 properties + 40 seeds x 14-step two-component update sequences (model: `buildSearch` ek ke baad ek).
- **Design insight (Phase 2):** same-tick `removeParams(['search']); setParams({status})` ko blocker ke saath bhi compose hona hai, to `currentSearch()` ko blocked/proceeding blocker ki `location.search` par build karna chahiye (proceed() wahi last blocked target navigate karta hai) aur reset() ke baad committed par. Sirf "promise settle par pending clear" kaafi nahi: wo blocked sequence ko todta.

- **Phase 2 + 3 + 5.1 done (package me, unpublished).** `useQueryParams`: pending ab token ke saath `globalThis` slot par; data router me asli state `router.state` se (blocker -> in-flight navigation -> committed), hash bachta hai, `buildSearch` ke 2 bug fix (upar). `useQueryParamInput`: engine ka `done`/`navigationStateOf`, `flush()`/`isPending()`, URL ka leading space. `useDebounce`: `flush()`/`isPending()`. Tests 316 + 3 concurrent; fuzz 400 seeds x 8 properties + 40 seeds x 14 steps; blocker matrix B1-B13.
- **Teen asli bug jo sirf naye tests/harness ne pakde** (kisi purane test ne nahi):
  1. `navigate()` ka promise commit se pehle resolve ho sakta hai (`router.revalidate()` navigation ko dobara start kar deta hai). "Promise settle = navigation khatam" galat assumption thi; ab router state dekhte hain (`committed | held | coming | lost`).
  2. Bhaari page par React router ki **purani states ko bhi ek ek karke late render karta hai** (backlog, ~1s). Jo update router me ek baar commit dikh gaya wo tab tak echo hai jab tak React use render na kar le; sirf kabhi-commit-na-hone-wala (lost / held+reset) prune hota hai. Isko `useQueryParamInput.concurrent.test.tsx` ne pakda (3/3 seeds fail), phir deterministic echo test bhi jodha.
  3. Test harness ki race: `useBlocker` apna blocker **do renders ke baad** register karta hai, load me test pehle navigate kar deta tha (B1/B2/B6 5s timeout par fail). `BlockerGate` me `onReady` aur harness `settled()` ab uska intezaar karta hai.
- **Mutation (is hisse ke liye):** `useQueryParamInput.ts` 25 + 13 + 4 mutants, `useDebounce.ts` 9, `router-search.ts` 5 more. Equivalent/defensive survivors (likhe hue): `useQueryParamInput`: `valueRef` ki initial value (I16), no-op sends (J-series ke baad B1b se kill), "forget at settle" (J6, router update baad me prune kar deta hai), `!sent.done` guard (J8: data router me navigation state navigate() ke andar hi sync set hota hai, to defensive), `isStillComingRef` (J11); `router-search`: K2/K3 (sirf prune ko delay karte hain); `useDebounce`: D1 (`flush` bina pending ke `run()` bhi kuch nahi karta).
- **Gates:** package `npm test` 6x busy core + 12 parallel suites (4 rounds x 3): 0 failures; typecheck/lint/prettier/build clean; `npm pack`: 46 files, test files nahi.
- **Baaki:** Phase 4 (`useOutsideClick`), Phase 5.2-5.5 (`useIsSmallScreen`, `usePathParams` typing + blocker smoke tests), Phase 6 (final sweep, republish, baaki apps ka browser run). Admin ka temporary `TempBlockerGate`/delay/local install sab hata diya gaya (git status khali).

---

## 8. Browser matrix (published build par, real clicks/typing)

| App | Kya check hoga |
| --- | --- |
| Admin, Seller, Master | **Temporary `BlockerGate`** (verify ke baad hata dena): `useBlocker(true)` aur pathname-only config, B1/B2/B4 asli Back button aur clicks se. Phir Products/Categories search (keystrokes, trailing/leading space, Back/Forward, status select stale guard, Clear), `useIsSmallScreen` (viewport 435 vs 1280), status select ka `useOutsideClick` (bahar click se band), stress (slow-nav) |
| Client | Login modal (`?login`), replace-on-close aur Back, Select/HierarchySelect/colorInput/dropdown (`useOutsideClick`), sidebar (`useIsSmallScreen`, `usePathParams`), try-on/become-seller ka `useDebounce` |

---

## 9. 10/10 hone par (delete steps)

- [ ] Section 1 ka scoreboard poora 10 (ya "N/A" jahan D-decision "nahi").
- [ ] Section 6 ke saare gates `[x]`.
- [ ] **Ye file delete karo:** `BQ-Packages/HOOKS-10-OUT-OF-10-PLAN.md` (agar commit ho gayi ho to delete ka commit).
- [ ] Memory se `hooks-10-plan` ka pointer hatao (`MEMORY.md` ki line + file).
