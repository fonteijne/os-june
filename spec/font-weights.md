# Font weights

**Rule.** Use only the default weight 400 and `var(--fw-medium)`. Never write a
raw `font-weight: 500`, `600`, `700`, or `bold`.

**Why.** The local Manrope variable font supports a wider range, but the Bonzai
renderer keeps a two-weight contract for consistency: regular 400 and medium
600. The same rule remains in force for upstream Clovy. Writing raw 600 hides
the `--fw-medium` token, so medium intent is no longer greppable.

**How to apply.** Leave body copy at the inherited 400. Reach for
`var(--fw-medium)` only for headings, row titles, and structural emphasis (see
the heading mapping in
[docs/design/foundations.md](../docs/design/foundations.md)). Serif text never
goes above 400.

**Exceptions.** None.
