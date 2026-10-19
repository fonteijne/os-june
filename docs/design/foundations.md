# Design foundations

The theming model, design tokens, and type system that everything in Clovy's UI
builds on. Companion docs: [components.md](components.md) (the shared UI
primitives), [conventions.md](conventions.md) (naming and interaction rules),
and [taste.md](taste.md) (the sensibility behind the rules).

Live values render in the styleguide: run `pnpm dev`, then open
`http://localhost:1421/styleguide.html` (foundations sections: `color`, `type`,
`spacing`, `radius`, `elevation`, `motion`, `controls`; component and pattern
sections are listed in [components.md](components.md)). Prefer reading a
token's live swatch there over eyeballing a hex.

## Theming

The Bonzai fork uses one fixed blue accent, `--brand`: `#365fd9` in light
and `#8aa4f2` in dark. Both `--brand` and `--brand-wash` are registered custom
properties, but only `--brand` appears in the root transition declaration, so
`--brand-wash` does not animate on a theme change. Surface neutrals follow the
bundled iO export's monochrome values; text and foreground tokens stay neutral
for legibility.

The Bonzai renderer has no user-selectable accent preset; Theme, Text size, and
Date format controls remain. Palette values are CSS tokens defined in
`src/styles/tokens.css`; `index.html` applies theme and pins legacy brand keys
before first paint, and secondary renderer token blocks are fixed in their own
stylesheets. The `--brand-tint` and `--brand-line` tokens follow the fixed accent;
`--warm-*` retains its orange warning/recording role. Blue applies to the renderer
character and identity-led primary actions, including non-recording HUD actions.
Controls that start, stop, keep, or otherwise change a recording and warning
indicators use the orange semantic role; other status colors remain semantic,
and the HUD status/attention graphic mark remains lime. Path-drawn logo/wordmark
artwork, packaged icons, and the live Dock/Cmd-Tab icon remain unchanged. Light and dark are separate
`data-theme` cascades that override colors and shadows. Bonzai Agent names the
fork's renderer app/assistant presentation; Clovy API and OS Accounts remain the
service identities and owners.

## Tokens

All tokens live in `src/styles/tokens.css`. Reach for a token before hand-coding
a value (see [spec/design-tokens](../../spec/design-tokens.md)).

- **Type** (`--font-*`, `--fs-*`, `--fw-medium`): the type system, below.
- **Spacing** (`--sp-px` to `--sp-12`, 2px to 40px): all gaps, padding, and
  margins. Layout widths (`--content-max`, `--chat-max`, sidebar dimensions)
  are their own named tokens.
- **Radius** (`--r-xs` to `--r-2xl`, `--r-pill`, `--r-window`): corner rounding;
  `--r-window` matches the native macOS window curve for inset surfaces.
- **Shadow** (`--shadow-sm/md/lg`, `--shadow-inset`): elevation. Shadows never
  carry rings; call sites compose a border or `--shadow-inset` separately (see
  [conventions.md](conventions.md)).
- **Motion** (`--ease-*`, `--t-fast/med/slow`): easing curves and durations.
- **Control sizes** (`--control-xs` to `--control-xl`, 22px to 36px):
  interactive control heights. Do not hand-roll min/max heights on buttons,
  inputs, or selects (see [spec/control-sizes](../../spec/control-sizes.md)).
- **Bonzai accent** (`--brand`, `--primary`, `--brand-bright`): the fixed blue
  pair for accent-bearing controls, selection, progress, focus, and renderer
  character surfaces. Light uses `#365fd9`; dark uses `#8aa4f2` with dark ink.
  Status colors remain semantic. Static mark/wordmark artwork remains in its
  original Clovy colors; the HUD status/attention graphic mark remains lime.
- **Solid-action foregrounds**: fixed dark solids use `--on-solid`; warning and
  destructive solids use the theme-adaptive `--destructive-foreground`. The
  theme-adaptive identity-led primary action uses its own
  `--primary-action-foreground` token.
- **Primary actions** (`--primary-action-background*`,
  `--primary-action-border`, `--primary-action-foreground`): on this Bonzai
  fork, renderer identity-led actions use the blue accent pair. Controls that
  start, stop, keep, or otherwise change a recording instead use `--record` and
  `--record-hover`. Native icons and path-drawn logo artwork keep their existing
  colors.

## Type system

### Scale

Font sizes come only from the `--fs-*` scale (see
[spec/type-scale](../../spec/type-scale.md)):

| Token | Size | Role |
|---|---|---|
| `--fs-2xs` | 10px | Micro labels, dense badges |
| `--fs-xs` | 11px | Labels, badges, metadata |
| `--fs-sm` | 12px | Descriptions, support copy |
| `--fs-md` | 13px | Body (the root default) |
| `--fs-lg` | 14px | Row titles, markdown headings |
| `--fs-xl` | 16px | View and dialog titles |
| `--fs-2xl` | 20px | Larger headings |
| `--fs-display` | 30px | Display and marketing moments |

### Heading mapping

The as-rendered hierarchy. "Renders 400" means the underlying face is Regular
even where an older declaration says 500, because the family has only two faces
(below).

| Element | Class | Size | Weight |
|---|---|---|---|
| View / page title | `.agent-rail-header h1`, `.agent-detail-header h2` | `--fs-xl` | `--fw-medium` |
| Dialog title | `.dialog-title` | `--fs-xl` | 400 |
| Empty-state title | `.empty-state-title` (serif) | `--fs-xl` | 400 |
| Settings group heading | `.settings-group-heading` (h2, muted) | `--fs-md` | 400 |
| Settings row title | `.settings-row-title` (h3) | `--fs-lg` | 400 |
| Markdown heading | `.agent-markdown h2` / `h3` | `--fs-lg` | `--fw-medium` |
| Body | root default | `--fs-md` | 400 |
| Description / support | in `--muted-foreground` | `--fs-md` or `--fs-sm` | 400 |
| Micro label / badge | | `--fs-xs` or `--fs-2xs` | 400 |
| Display / marketing | welcome, sign-in | `--fs-display` | 400 |

### Two-weight system

The Bonzai fork uses the local Manrope variable font with `font-synthesis: none`.
The renderer contract remains two values: regular 400 for body copy and
`var(--fw-medium)` (600) sparingly for headings, row titles, and structural
emphasis. Upstream Clovy keeps this same contract with ABC Diatype. Never write
raw 500 / 600 / 700 / bold (see [spec/font-weights](../../spec/font-weights.md)).

### Family roles

- **Sans** `--font-sans` (Manrope on the Bonzai fork, ABC Diatype upstream)
  is the primary voice for nearly all UI. Locally bundle Manrope with its
  license; upstream Clovy retains ABC Diatype.
- **Serif** `--font-serif` (Martina Plantijn, faces 300 to 400) is limited to
  headings and display moments, e.g. empty-state titles.
- **Mono** `--font-mono` (Berkeley Mono, 400 only) only where it earns it: code
  and technical identifiers.

See [spec/font-families](../../spec/font-families.md).

### No all caps

No ALL CAPS anywhere, especially eyebrows, pre-headers, and metadata. There is
no `text-transform: uppercase` in the app today and the rule keeps it that way
(see [spec/no-all-caps](../../spec/no-all-caps.md) and
[spec/sentence-case](../../spec/sentence-case.md)).

### No tabular numerals

UI numbers use the typeface's proportional figures. See
[spec/no-tabular-numerals](../../spec/no-tabular-numerals.md) for the rule and
its narrow live-ticking exception.

## Known deviations

Pass-2 worklist seeds. These are documented, not yet resolved, and Andrew
decides the target in-browser:

- **Note-preview headings** (resolved 2026-07-06): the raw 15px h1/h2 moved
  to `--fs-lg`, matching agent markdown headings. Still open: the one
  remaining 15px in app.css is the `+`/`-` tool-disclosure glyph (around
  2225), a decorative mono glyph that needs a size decision, not a heading.
- **Raw control heights**: scattered raw min/max-heights on controls that should
  move to the `--control-*` tokens.
- **Toggle wrapper names** (resolved 2026-07-06): an audit found every real
  on/off switch already uses the `Switch` component; classes like
  `.mcp-server-toggle` are layout wrappers or disclosure buttons, not bespoke
  toggles. Optional: rename the two wrapper classes to `-toggle-wrap` so the
  names stop implying otherwise (deferred behind in-flight settings work).
- **Bespoke input classes** (`dialog-input`, `settings-secret-input`,
  `mcp-add-input`, ...) pending a shared field treatment.
- **Hand-rolled menus and popovers** (sidebar identity menu, context menus,
  composer `@` / slash menus) pending a shared positioning helper.
- **Solid-action foregrounds** (updated 2026-10-17): fixed dark solids use
  `--on-solid`, destructive solids use the theme-specific
  `--destructive-foreground`, and theme-adaptive identity-led primary actions
  use `--primary-action-foreground`. Still open: the sidebar recording
  indicator's bespoke always-dark pill uses raw oklch values and needs a
  dark-surface token family decision.
