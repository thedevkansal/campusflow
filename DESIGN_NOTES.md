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
| [Citymapper](https://citymapper.com) | **The product is the hero.** The first thing on the page is a "Start / End" stacked input pair with a swap control, not a pitch. CampusFlow's landing leads with the actual route picker, using real campus stops. |
| [Transit](https://transitapp.com) | **Line colour as wayfinding.** Routes are thick coloured strokes with station dots, so one glance says where you are on a line. CampusFlow draws the ride lifecycle as a transit line with stops. |
| [Cal.com](https://cal.com) | **Asymmetric split hero:** a left-aligned, heavy headline beside the live booking widget, plus segmented duration chips (15m / 30m / 45m). Borrowed for campus-stop chips and the landing split. |
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

See §5 (filled in after implementation).
