# Design taste

The sensibility behind the rules. [foundations.md](foundations.md),
[components.md](components.md), and [conventions.md](conventions.md) say what
to do; this file says why the system leans the way it does, so the same taste
can be carried to other projects even where the tokens differ.

## Quiet is the default

The interface should read sharp, not loud. Restraint is the house move: when
in doubt, use the quieter option and let structure come from spacing and
hierarchy rather than decoration. A surface earns emphasis; it does not get it
for free.

## Type

- **The default weight is the voice.** Body, labels, nav, and most chrome sit
  at regular weight. Medium is punctuation, not prose: headings, row titles,
  structural emphasis, and little else. If a screen feels flat, fix the
  hierarchy or spacing before reaching for weight.
- **Never all caps.** Not in eyebrows, not in pre-headers, not in metadata.
  Sentence case everywhere; capitals are for proper nouns and acronyms.
- **Proportional numerals.** Tabular figures read like a spreadsheet; the only
  place they belong is a live-ticking value whose digits would jitter the
  layout, and even then inside a fixed-width container.
- **Sans is the voice of the product.** Serif appears at display moments
  (view titles, empty states, welcome) where a touch of warmth earns its
  place. Mono is for code and technical identifiers only; it spreads if you
  let it.
- **No typographic dashes in copy.** Hyphens or "to".

## Color

- **Color is spent, not sprayed.** The Bonzai renderer uses one fixed blue
  accent through the token pipeline. Hovers, generic rows, nav, and menus stay
  neutral; the accent appears on controls that already carry it. The character
  and renderer HUD identity-led primary actions use the approved Bonzai blue
  palette. Controls that start, stop, keep, or otherwise change a recording and
  warning indicators use the orange semantic role. The HUD status/attention
  graphic mark stays lime; other statuses remain semantic. Native icons and
  static wordmark art stay unchanged.
- **Neutrals stay neutral.** Surfaces follow the monochrome-first export. Text
  never takes the accent wash.
- **Blue is used with restraint.** One fixed accent replaces only the five
  selectable color presets; Theme, Text size, and Date format controls remain.
  Do not tint generic surfaces to make the interface feel themed.
- **Semantic colors stay distinct.** Success, orange recording/warning, and
  lime HUD attention remain distinct from blue actions, with text or icons where
  applicable and contrast verified on their actual surfaces.

## Motion and feedback

- **Hover changes the background only.** Borders are static chrome; animating
  them reads as nervous.
- **Elevation is composed, not baked.** Shadows are pure elevation; the
  hairline ring is a separate layer added at the call site. One ambient shadow
  per popover composite; stacking shadows muddies the edge.
- **Fast and eased.** Transitions run on the token durations and curves;
  nothing bounces for its own sake.

## How we tune

Visual weight (shadows, borders, rings, tints, weights) converges through
small iterations: change one dial per round, name the dial, and judge it in
the running app against the reference. A change that moves three dials at
once cannot be judged at all. Zero-visual-change refactors (renaming a value
to the token that already renders it) land freely; anything that changes
pixels ships small enough to eyeball.
