# Font families

**Rule.** Sans (`--font-sans`, Manrope on the Bonzai fork and ABC Diatype
upstream) is the voice for nearly all UI. Serif (`--font-serif`, Martina
Plantijn) is for headings and display moments only. Mono (`--font-mono`,
Berkeley Mono) is only for code and technical identifiers.

**Why.** The sans face carries the product voice. Letting serif or mono leak
into body copy dilutes that voice and makes the surface read as inconsistent
rather than intentional. The Bonzai fork uses locally bundled Manrope under SIL
OFL 1.1; upstream Clovy continues to use ABC Diatype.

**How to apply.** Default to `--font-sans`. Reach for `--font-serif` only on a
heading or display element where the moment earns it; reach for `--font-mono`
only where the content is literally code or a technical identifier the user is
meant to read as such.

**Exceptions.** The existing serif empty-state titles
(`.empty-state-title`) are canon, not a violation, as is the Home thread's
serif daily greeting (a display moment). Chat bodies stay sans, including the
Bonzai Agent Home conversation.
