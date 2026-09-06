import { useBonzaiActive, useBonzaiProjectKeyIndex } from "../../lib/bonzai";

// Which key a project bills to, on its card in the projects list (PRD
// section 9). Renders nothing on a build that does not route to Bonzai, and
// nothing until the index has answered, so a card never flashes the wrong
// claim about where its spend goes.

export function BonzaiKeyBadge({ folderId }: { folderId: string }) {
  const active = useBonzaiActive();
  const index = useBonzaiProjectKeyIndex(active);
  if (!active || !index) return null;
  return (
    <p className="folder-card-meta" data-bonzai-key={index.has(folderId) ? "own" : "global"}>
      {index.has(folderId) ? "Own Bonzai key" : "Global Bonzai key"}
    </p>
  );
}
