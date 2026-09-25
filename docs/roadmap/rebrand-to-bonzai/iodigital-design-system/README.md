iO is where design, marketing and technology come together. The interface should feel like the agency sounds: confident, calm and uncluttered. **Whitespace is the premium signal** — when in doubt, add a spacing step rather than a line, a colour or a shadow.

## Content fundamentals

- **Voice:** direct, optimistic, plain-spoken. Short declarative lines that land on an outcome: “Where design, marketing and technology move business forward.”
- **We / you:** iO speaks as *we* and addresses the client as *you*. “Let’s create some impact together.”
- **Casing:** sentence case for every heading, button and nav item. Capitals only in the `eyebrow` style.
- **Rhythm of three:** the brand likes triads — “One plan. One team. One partner.” Use them for value props, not for every list.
- **CTAs:** verb first, conversational: “Start the conversation”, “Dive into our insights”. Never “Click here” or “Submit”.
- **No emoji**, no exclamation marks, no filler stats. Numbers are real and carry a unit (“2,000+ experts”, “12 campuses”).

## Visual foundations

### Colour
- The palette is **monochrome first**: `surface`, `surface-alt`, `ink`, `ink-muted`, `line`. Most screens use nothing else.
- `accent` (iO blue) is the only hue. Use it for the primary button, links, the focus ring and one highlight per view — never as a section background.
- Contrast moments come from **inversion**, not colour: a `surface-inverse` band with `ink-inverse` text for the hero, a statement or the closing CTA. It flips per theme, so dark mode keeps the moment.
- Separate sections by alternating `surface` and `surface-alt`, not by borders.
- `success` and `danger` always come with a word or icon; `danger` is orange so it never relies on red/green alone.

### Light and dark
- Both themes are first-class. Dark is near-black `#0a0a0a`, not pure black, with `ink` softened to `#f4f4f2`.
- In dark, `accent` lightens to `#8aa4f2` and `on-accent` becomes dark: always use the `on-accent` token on accent fills, never literal white.

### Typography
- One family, **Instrument Sans** (Google Fonts), in weights 400, 500 and 600. Headlines are tight (negative tracking, leading ≈1.0–1.15); body is open (leading ≈1.65).
- Scale: `display-xl` → `display-lg` → `h1` → `h2` → `h3` → `lead` → `body` → `small`, with `label` for controls and `eyebrow` for kickers.
- Let headlines be big and short. One `display-xl` per page. Keep text columns to 60–68ch even inside a wide container.
- `stat` is for numbers only, paired with a `body` line in `ink-muted`.

### Space — the premium layer
- Base unit 8px; the scale runs `space-1` (4px) to `space-11` (176px). The top end is what makes it feel premium — use it.
- **Sections:** `space-10` (128px) top and bottom on desktop, `space-9` (96px) on mobile. Hero and closing CTA: `space-11`.
- **Inside a section:** eyebrow → heading `space-3`; heading → lead/body `space-5`; section header → content `space-8`; block → block `space-9`.
- **Page frame:** content max `container` (1360px), side padding `gutter` (48px; 24px under 768px).
- **Cards:** padding `space-7` (48px) on desktop, `space-6` on mobile; grid gap `space-6`.
- **Controls:** buttons `space-4` × `space-6`; never cram a button against copy — at least `space-6` above it.
- Prefer one idea per viewport-height. If a section feels busy, remove an element before shrinking the spacing.

### Shape, borders, shadows
- Buttons and chips are pills (`radius-pill`); cards and media `radius-md`; inset feature panels `radius-lg`; inputs `radius-sm`.
- Borders are hairlines in `line`, used for list rows and card outlines on `surface`. On `surface-alt`, cards need no border.
- The system is flat. `shadow-float` is for menus and dialogs only.

### Motion and states
- Transitions `duration-base` with `ease-out`, on colour, background and transform only.
- Hover: accent fills go to `accent-hover`; cards lift the arrow 4px right and the title underlines; secondary buttons invert to an `ink` fill.
- Focus: a 2px solid `focus` ring with a 3px offset on every interactive element, both themes.
- Disabled: 40% opacity, no pointer events.

### Imagery
- Full-bleed or `radius-md` photography of real people and real work; no stock-style gradients or abstract 3D blobs.
- Images never carry text; captions sit below in `small`, `ink-muted`.

## Iconography
- Thin, 1.5px-stroke line icons at 20/24px, in `ink` or `accent`. The arrow (→) is the signature icon on links and cards.
- **Flag:** iO’s own icon set could not be retrieved; use a neutral outline set (e.g. Lucide) until the real set is added. No emoji.

## Logo
- The iO wordmark is not included yet: it could not be downloaded here. Until it is added under `assets/Logos/`, set “iO” in `h3` weight 600 in `ink` — never redraw the mark.
