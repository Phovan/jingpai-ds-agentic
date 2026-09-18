import type { ReactNode } from "react";
import type { Entity } from "../domain/ontology";
import { narrativeText } from "../domain/narrative";

/** Escaped React text only. References are resolved against this role's visible catalogue. */
export function EntityText({
  text,
  entities,
  onSelect,
}: {
  text: string;
  entities: Entity[];
  onSelect: (id: string) => void;
}) {
  text = narrativeText(text, entities);
  const terms = new Map<string, Entity>();
  for (const e of entities) {
    terms.set(e.id, e);
    if (e.title.length >= 3) terms.set(e.title, e);
  }
  const escaped = [...terms.keys()]
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return <>{text}</>;
  const regex = new RegExp(escaped.join("|"), "g");
  const parts: ReactNode[] = [];
  let end = 0;
  for (const m of text.matchAll(regex)) {
    const index = m.index!;
    const e = terms.get(m[0])!;
    if (
      m[0] === e.id &&
      (/[A-Za-z0-9]/.test(text[index - 1] || "") ||
        /[A-Za-z0-9]/.test(text[index + m[0].length] || ""))
    )
      continue;
    parts.push(text.slice(end, index));
    parts.push(
      <button
        className="entity-inline-link"
        key={index}
        title={`${e.kind} · ${e.title} · 查看详情`}
        onClick={() => onSelect(e.id)}
      >
        {m[0]}
      </button>,
    );
    end = index + m[0].length;
  }
  parts.push(text.slice(end));
  return <>{parts}</>;
}

export function SourceContent({
  text,
  entities,
  onSelect,
}: {
  text: string;
  entities: Entity[];
  onSelect: (id: string) => void;
}) {
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className="source-content">
      {blocks.map((block, index) => {
        const rows = block.split("\n");
        if (rows[0].startsWith("|")) {
          const parsed = rows
            .filter((r) => r.startsWith("|") && !/^\|[\s:|-]+$/.test(r))
            .map((r) =>
              r
                .slice(1, -1)
                .split("|")
                .map((t) => t.trim().replace(/\*\*|`/g, "")),
            );
          return (
            <div className="dossier-table-wrap" key={index}>
              <table>
                <thead>
                  <tr>
                    {parsed[0]?.map((c, i) => (
                      <th key={i}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(1).map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j}>
                          <EntityText
                            text={c}
                            entities={entities}
                            onSelect={onSelect}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={index}>
            <EntityText
              text={block.replace(/\*\*|`/g, "").replace(/^- /gm, "• ")}
              entities={entities}
              onSelect={onSelect}
            />
          </p>
        );
      })}
    </div>
  );
}
