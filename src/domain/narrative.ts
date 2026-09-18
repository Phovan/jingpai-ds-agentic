import type { Entity } from "./ontology";
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Presentation only: identifiers and relationships in stored records remain unchanged. */
export function narrativeText(
  text: string,
  visible: Pick<Entity, "id" | "title">[],
): string {
  let result = text;
  const byId = new Map(visible.map((e) => [e.id, e.title]));
  result = result.replace(
    /\b(REL|[SPXDERLOCVFIBM])(\d{2})[-—–](?:\1)?(\d{2})\b/g,
    (full, p, a, b) => {
      if (+b < +a || +b - +a > 24) return full;
      const ids = Array.from(
        { length: +b - +a + 1 },
        (_, i) => p + String(+a + i).padStart(2, "0"),
      );
      return ids.every((id) => byId.has(id)) ? ids.join("、") : full;
    },
  );
  for (const e of visible) {
    if (!result.includes(e.id)) continue;
    const id = escape(e.id),
      title = escape(e.title);
    result = result.replace(
      new RegExp(title + "\\s*[（(]\\s*" + id + "\\s*[）)]", "g"),
      e.title,
    );
    result = result.replace(
      new RegExp(
        "(?<![A-Za-z0-9_-])" + id + "(?![A-Za-z0-9_-])\\s*" + title,
        "g",
      ),
      e.title,
    );
  }
  const ids = [...byId.keys()].sort((a, b) => b.length - a.length);
  if (ids.length)
    result = result.replace(
      new RegExp(
        "(?<![A-Za-z0-9_-])(" +
          ids.map(escape).join("|") +
          ")(?![A-Za-z0-9_-])",
        "g",
      ),
      (id) => byId.get(id)!,
    );
  return result;
}
