# CampusFlow: design notes

Working document for the UI refresh on branch `design/ui-refresh`. It records the
audit, references, design brief and outcome. Business logic, API calls, socket
events and query keys are unchanged. Only presentation and UI-only flows changed.

---

## 1. Understanding

**Product.** CampusFlow is real-time ride-hailing inside one campus (Bengaluru,
₹ fares, two-wheelers like "Honda Activa", fixed campus pickup points).

**Users.**
- **Passengers:** students who need to get across campus now. Often on a phone,
  often walking.
- **Drivers:** student or staff drivers who toggle availability between classes and
  move a ride through its lifecycle. They glance at the screen and tap it one-handed.
- Admins appear in the PRD, but there's no admin UI yet.

**The three flows that matter**
1. *Passenger books and tracks a ride:* choose pickup and destination, request,
   watch the status move (searching → assigned → on the way → arrived → in ride →
   done), cancel if needed.
2. *Driver works a shift:* go online, receive an assignment, accept or decline,
   then arrive, start and complete the ride.
3. *Getting in:* register as passenger or driver (with vehicle), or log in.

Notifications and Profile support these flows. They aren't destinations in their own right.

**Stack.** Next 16 (App Router, all pages client components), React 19, Tailwind v4
(CSS-first `@theme`), shadcn "base-nova" components on `@base-ui/react`, TanStack
Query, Socket.IO, Leaflet/OSM map.

### UX problems found (before)

Hierarchy and layout
- Every screen is the same stack of white `rounded-xl` cards with a heading
  ("Dashboard", "Driver Dashboard"). Nothing tells the user what to do *now*.
- The passenger's primary action ("Request Ride") shares visual weight with the
  card chrome. The map is a decorative block beside the form, not the stage.
- The driver's lifecycle actions sit at the bottom of a card under the map on
  mobile. That's the most important button on the screen, in the hardest place to reach.
- The landing page is the textbook template: centred headline with one coloured word
  ("reimagined."), two buttons, three identical icon cards, and a dark footer.

Content and honesty
- Driver "Today's Summary" shows hard-coded `₹0.00` / `0`. That's fake data
  presented as real.
- The copy leaks implementation details ("BullMQ-powered engine",
  "PATCH /auth/profile — not yet implemented on the backend"), uses marketing
  filler ("reimagined", "seamless"), and the landing page's "Driver Login" goes to
  the same login as everyone else.
- Status colours come from the raw Tailwind palette (amber-100, blue-100,
  indigo-100, emerald-100). Five hues encode one linear lifecycle, so none of
  them means anything.

States and feedback
- Loading is a centred spinner everywhere (no skeletons), so layout jumps on load.
- There's no success feedback: requesting, cancelling, going online, saving the
  vehicle and marking all read happen silently.
- Destructive actions (cancel ride, decline ride, log out) fire on the first tap
  with no confirmation.
- The disabled "Cannot Cancel" button explains nothing.
- Profile errors show raw API messages. The vehicle form fields have no `id`/`for`
  pairing.

Accessibility
- The mark-as-read icon button has only a `title`, so it has no accessible name.
- The focus ring is `ring/50` on near-white (`oklch .87`), which is almost invisible.
- Login and Register use the shadcn Tabs component as a radio choice, which is the
  wrong semantics for a form field.
- The ⭐ emoji serves as a rating icon, and there's no `prefers-reduced-motion`
  handling (pulse, spin).
- `bg-slate-50` on `<body>` fights the token system, so dark mode can't work.

---

## 2. References (studied Oct 2026)

| Reference | What's worth borrowing |
|---|---|
| [Citymapper](https://citymapper.com) | **The product is the hero.** The first thing on the page is a "Start / End" stacked input pair with a swap control, not a pitch. CampusFlow's landing leads with the real ride sheet, and the passenger home *is* a stacked From/To picker with a swap button. |
| [Transit](https://transitapp.com) | **Line colour as wayfinding.** Routes are thick coloured strokes with station dots, so one glance says where you are on a line. CampusFlow draws the ride lifecycle as a transit line with stops. |
| [Cal.com](https://cal.com) | **Asymmetric split hero:** a left-aligned, heavy headline beside the live booking widget, so the product explains itself before any copy does. Borrowed for the landing split (headline left, live ride sheet right). |
| [Uber Base design system](https://base.uber.com/6d2425e9f/p/294ab4-base-design-system) | **Black-and-white restraint, with line geometry as the only illustration.** No mascots, gradients or blobs. Network lines and nodes carry the visual identity. |
| [Linear](https://linear.app/now) | **Achromatic UI with colour reserved for meaning.** The accent appears only on the primary action and active state. Filters are plain text tabs, and the type is small and dense. |
| [Mercury](https://mercury.com) | **The action lives in the hero** (an inline input plus CTA), so nothing extra stands between landing and starting. The colour palette is very restrained. |

Supporting principle from transit wayfinding standards
([SEPTA](https://planning.septa.org/initiatives/wayfinding-master-plan/wayfinding-tools),
[NACTO](https://nacto.org/publication/transit-street-design-guide/transit-system-strategies/network-strategies/system-wayfinding-brand)):
one colour means one thing everywhere, and system-level messages are set in the darkest ink.

Borrowed principles only. No layouts, logos or assets are copied.

---

## 3. Design brief

**Direction in one sentence:** *Campus wayfinding signage. Cool aluminium-white
surfaces, deep route-ink, and one marigold "auto-rickshaw" signal colour. The ride
reads as a line on a transit map.*

Why this fits the brief: CampusFlow's world is roads, stops and moving vehicles in
Bengaluru, where the yellow auto-rickshaw is the default mental model of "a
ride". Signage is the vernacular of telling someone where to go, fast and legibly,
which is also the UX job of every screen here.

### Typography
- **Display: Overpass** (Google Fonts, variable 100–900). It's a libre interpretation
  of *Highway Gothic*, the US road-sign face, so the headings literally speak
  road signage. It's used heavy (800) with tight tracking for headings and stop
  names, and bold for numbers (fare, ETA, plate) with `tabular-nums`.
- **Text: Atkinson Hyperlegible Next** (Braille Institute, variable 200–800). Its
  letterforms are built to be distinguishable at a glance (I/l/1, O/0), which suits
  people reading while walking or driving. It covers body, labels and form text.
- Scale (1.25, major third, rem): 0.75 · 0.875 · 1 · 1.25 · 1.5625 · 1.953 ·
  2.441 · 3.052 · 3.815. Body is 1rem/1.55. Display line-height is 0.95–1.05 at
  ≥2.4rem. Measure is ≤ 68ch. Labels use sentence case, with no tracked caps eyebrows.

### Colour (tokens in `src/app/globals.css`)

| Token | Light | Dark | Role |
|---|---|---|---|
| `paper` | `#F3F4F0` | `#0E141B` | page background (cool aluminium, not cream) |
| `surface` | `#FFFFFF` | `#151D26` | sheets, inputs |
| `sunken` | `#E9EBE5` | `#0A0F15` | wells, skeletons, map placeholder |
| `ink` | `#17222F` | `#E8EBE6` | text and route ink (14.5:1 on paper) |
| `ink-muted` | `#566171` | `#9AA4B1` | secondary text (5.7:1 / 7.3:1) |
| `rule` | `#D8DBD3` | `#26313D` | hairlines |
| `rule-control` | `#7C857A` | `#5C6875` | input and control borders (≥3:1, WCAG 1.4.11) |
| `signal` | `#FFC21A` | `#FFC21A` | **the one accent:** primary action fill, live state, route progress. Always carries ink text (9.9:1) |
| `success` | `#1D7A4C` | `#4CC38A` | online, completed |
| `danger` | `#B3261E` | `#F2706A` | cancel, errors |
| `caution-ink` | `#8A5A00` | `#FFD25E` | warning text on signal-tint |

Rules: the signal colour is never decoration. It marks "the thing to do" or "the
thing that's live". Every status in the lifecycle uses ink plus a position on the
line, not a different hue.

### Spacing, radius, elevation
- Spacing scale (4px base): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius follows hierarchy rather than one value everywhere: controls 6px, sheets
  12px, number plate 4px, status pills and stop dots fully round.
- Elevation: flat by default (1px rules). There's exactly one shadow, `--shadow-sheet`,
  for things floating above the map or page (ride sheet, menus, toasts, dialogs).
- Primary buttons are physical "keys": a 2px darker-marigold bottom edge that
  collapses on press (`translateY(1px)`).

### Motion
- Durations: 120ms (hover, press), 200ms (expand, toast in), 320ms (route line draw).
- Easing: `cubic-bezier(.2,.8,.2,1)` for enter, `cubic-bezier(.4,0,1,1)` for exit.
- One orchestrated moment: **the route line draws itself** when the ride's
  status advances (and once on the landing hero). The only ambient motion is a
  slow pulse on the "live" dot (searching, online).
- `prefers-reduced-motion`: all transitions are reduced to opacity and the pulse is removed.

### Signature details
1. **The route line.** Pickup → destination and the ride lifecycle render as a thick
   ink line with stop dots, and the signal colour fills the completed segment. The
   same component appears on landing, the passenger sheet and the driver sheet.
2. **The number plate.** Vehicle numbers render as a small Indian-style white
   plate (bordered, Overpass bold, tabular), so the passenger can match it to the
   real vehicle at a glance.

### Layout concept
```
Passenger (≥1024px)                    Passenger (<768px)
┌──────────────────────────────────┐   ┌──────────────┐
│ top bar                          │   │ top bar      │
├───────────┬──────────────────────┤   ├──────────────┤
│ SHEET     │                      │   │ map (40vh)   │
│ From  ●   │       MAP            │   ├──────────────┤
│   │  ⇅    │   (full bleed)       │   │ SHEET        │
│ To    ●   │                      │   │ From / To    │
│ [Request] │                      │   │ [Request]    │
└───────────┴──────────────────────┘   └──────────────┘
```
- The driver layout mirrors it: availability switch at the top of the sheet,
  ride below, and a **thumb-zone primary action** pinned to the bottom of the sheet
  on mobile.
- The landing page is a left-aligned asymmetric split: a heavy Overpass headline and
  one sentence on the left, a working-looking route picker on the right, then "how
  a ride runs" as one horizontal transit line (the content is a genuine sequence,
  so the stops are numbered).
- Auth uses a split screen: an ink "stop board" panel listing real campus stops on the
  left, and the form on the right. On mobile only the form shows.

### Plan review against the brief (anti-default check)
- *First instinct:* indigo primary on white cards, which is the existing look and the
  generic SaaS-card kit. **Changed** to a signage palette with one marigold signal
  tied to the subject (autos), and sheets over a map instead of a card grid.
- *Second instinct:* cream paper with a serif display. That's tell #1. **Rejected**:
  paper is cool grey-green aluminium, and the display face is a road-sign grotesk.
- *Template hero:* **replaced** by the product itself (the route picker).
- *Eyebrow labels and mono data labels:* **avoided**. Plates and fares use
  Overpass tabular figures, not monospace, and there are no ALL-CAPS labels.
- *Numbered 01/02/03:* used only for the lifecycle line, which really is a sequence.

---

## 4. Outcome

Screenshots are in [`assets/redesign/`](assets/redesign/): landing, login and
register, captured headless at 390×844 (mobile, @2x) and 1440×900 (desktop).
`-dark` files use the OS dark scheme. The "before" shots are the existing
`assets/*.png`. The signed-in screens (Ride, Drive, Notifications, Profile) were
reviewed live against a local backend during the redesign. Committed captures of
them are still to do, because they need the local Postgres/Redis stack running.

### What changed, screen by screen

| Screen | Before | After |
|---|---|---|
| **Ride (passenger home)** | A "Dashboard" card with two selects beside a decorative map; status shown in five unrelated Tailwind hues; ⭐ emoji; instant cancel. | Map-first layout (sheet beside a full-height map; map on top on mobile). The From/To picker is drawn on the route line with a swap button, and the map previews the chosen route before you book. The active ride shows a status headline, the lifecycle as a transit line, a driver card with **number plate**, fare/distance as plain figures, and **confirm-before-cancel**. It also explains why cancel isn't available instead of showing a dead "Cannot Cancel" button. New: if a ride ends while you watch (no driver found, driver cancelled, completed) you get a notice saying what happened, instead of silently dropping back to the form. |
| **Drive** | Fixed-width sidebar with fake "Today's summary" (₹0.00 / 0), with the lifecycle button below the map on mobile. | An availability card (live dot, one toggle, real plate/model/rating) that collapses to an "On a ride" strip during a ride. One primary next-step button per status, **pinned to the bottom of the screen on mobile** (thumb zone). Decline asks for confirmation, and every step confirms with a toast whose wording matches the button. The map is hidden on mobile until there's a route. Fixed: after a ride the card said "offline" while the backend had already set the driver back ONLINE. |
| **Landing** | Centred headline with one coloured word, two buttons, three icon cards, dark footer. | Left-aligned display headline built from real stops ("Main Gate to Library, without the walk."), one primary CTA, and the actual ride sheet as the hero visual (its route line draws once on load). "How a ride runs" is one transit line, and Riding/Driving are plain definition lists. |
| **Log in / Sign up** | Centred card on grey. | Split screen with an ink "stop board" listing the campus stops. Ride/Drive are accessible radio tiles (previously Tabs). Password has show/hide, fields have hints, and drivers see a **live number-plate preview** as they type. |
| **Notifications** | Tinted cards, coloured icons, unnamed icon button. | Grouped Today/Earlier. Unread rows get a marigold bar and an ink icon. Each mark-read button has a name ("Mark "…" as read"). Loading uses a skeleton list, and the empty state links to the next action. |
| **Profile** | Gradient banner, three icon stat tiles, developer note about `PATCH /auth/profile`. | Identity header, then rating and rides as figures on a rule, account details as a definition list, and the vehicle as a plate with status pills. The edit form has labelled fields and a save toast, and the error state has a retry button. The developer copy is removed. |
| **Global** | Inter everywhere, indigo primary, near-invisible focus ring, no dark mode, no toasts or dialogs. | Overpass + Atkinson Hyperlegible Next, paper/ink/signal tokens with dark mode, one 2px focus ring, a skip link, a toast system, a confirm dialog, skeletons, `prefers-reduced-motion`, and muted map tiles with route-styled pins (no more external marker images from unpkg). |

### Critique pass (against §3 and the anti-slop list)
Fixed during review:
- The plate squeezed the driver's name on mobile, so it moved to the vehicle line.
- Lifecycle dots showed through the sticky driver action bar (z-index).
- During a ride, the driver's availability card said "You're offline" (misleading),
  so it now collapses to "On a ride".
- The auth form was vertically centred on phones, leaving a large empty band, so it's
  now top-aligned below `lg`.
- The landing sequence line overshot its last stop, so it now uses per-stop connectors.
- "Step 1…4" labels above the sequence were redundant chrome and were removed.
- Removed backdrop blur on the header (rule: no random blur).
- Role radios had no accessible name, so they now use `aria-labelledby`/`aria-describedby`.

Checked and kept:
- One accent only. Marigold appears on the primary action, the current stop, live
  dots, unread markers and the destination. Status never uses hue alone.
- No gradients, blobs, glass, emoji icons or icon-card grids. A single shadow is used
  only for floating surfaces.
- Copy is sentence case, verbs match their toasts, and there's no "seamless" or "reimagined".
- No horizontal overflow at 360px, 390px or 1440px (checked with `scrollWidth`).

### Verification
- `next build`: passes. `tsc --noEmit`: clean.
- `eslint`: 19 errors, all in logic carried over unchanged (`no-explicit-any` in
  query/mutation handlers, plus the original `setState`-in-effect calls in
  `auth-context`, `socket-context` and the driver online sync). None come from the new UI code.
- The flows were exercised end to end against the real backend: register/login, request
  ride → assigned → accepted → at pickup → in progress → completed (driver side
  through the UI, live socket updates on the passenger side), no-driver-found,
  going online and offline, and marking notifications read.

### Follow-ups (not done here)
- **Ride history / earnings.** The PRD lists them, and drivers have nothing to look
  back on. This needs an API (`GET /rides?mine`), so it's out of scope for a UI-only pass.
- **Passenger rating after a ride.** `ratings` endpoints exist, but there's no UI yet. The
  completed-ride notice is the natural place for it.
- **Live driver position on the driver's own map.** The driver map shows only the route.
- **Profile editing for name and email** is waiting on `PATCH /auth/profile`.
- **Fare estimate before booking.** It's only known after the ride is created. A
  `POST /rides/estimate` would let the picker show it up front.
- **Theme toggle.** Dark mode follows the OS. A manual override would need a stored preference.
- Typing the `any`s in the data hooks would clear the remaining lint errors.
