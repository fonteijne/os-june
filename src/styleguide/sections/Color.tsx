import { resolveToken } from "../tokens-catalog";

// Color tokens grouped by role. The palette is fixed for Bonzai; theme selection
// changes the light/dark values.
const COLOR_GROUPS: { label: string; names: string[] }[] = [
  {
    label: "Background and surface",
    names: [
      "--background",
      "--sidebar",
      "--card",
      "--popover",
      "--secondary",
      "--muted",
      "--accent",
      "--neutral-hover",
      "--surface-subtle",
    ],
  },
  {
    label: "Text",
    names: [
      "--foreground",
      "--card-foreground",
      "--popover-foreground",
      "--on-accent",
      "--muted-foreground",
      "--body-copy",
      "--spinner-neutral",
    ],
  },
  {
    label: "Accent state",
    names: [
      "--brand",
      "--brand-hover",
      "--brand-soft",
      "--brand-bright",
      "--brand-wash",
      "--primary",
      "--primary-foreground",
      "--accent-hover",
      "--focus-color",
    ],
  },
  {
    label: "Primary actions",
    names: [
      "--primary-action-background",
      "--primary-action-background-hover",
      "--primary-action-border",
      "--primary-action-foreground",
    ],
  },
  {
    label: "Border and ring",
    names: [
      "--border",
      "--border-subtle",
      "--detail-bar-border",
      "--input",
      "--ring",
      "--ring-focus",
      "--focus-ring",
    ],
  },
  {
    label: "Brand and derived tints",
    names: [
      "--brand-tint",
      "--brand-tint-strong",
      "--brand-line",
      "--brand-line-strong",
      "--warm-soft",
      "--warm-strong",
      "--hero-wash",
      "--selection",
      "--selection-foreground",
    ],
  },
  {
    label: "Status",
    names: [
      "--destructive",
      "--destructive-soft",
      "--success",
      "--record",
      "--record-hover",
      "--recording-pulse-peak",
    ],
  },
];

function Swatch({ name }: { name: string }) {
  return (
    <div>
      <div className="sg-swatch-block" style={{ background: `var(${name})` }} />
      <div className="sg-token-meta">
        <span className="sg-token-name">{name}</span>
        <span className="sg-token-value">{resolveToken(name)}</span>
      </div>
    </div>
  );
}

export function Color() {
  return (
    <div className="sg-section">
      <h1 className="sg-section-heading">Color</h1>
      <p className="sg-section-intro">
        Every surface, text, and edge color is a theme-aware token. Bonzai colors are fixed within
        each theme, while neutral surfaces and text preserve the reference's quiet hierarchy.
      </p>
      {COLOR_GROUPS.map((group) => (
        <div key={group.label}>
          <h2 className="sg-subheading">{group.label}</h2>
          <div className="sg-grid">
            {group.names.map((name) => (
              <Swatch key={name} name={name} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
