export function QuestionSuggestions({
  value,
  questions,
  onPick,
}: {
  value: string;
  questions: string[];
  onPick: (q: string) => void;
}) {
  if (!value.trimStart().startsWith("/")) return null;
  const query = value.trim().slice(1).trim();
  const matches = questions.filter(
    (q) => !query || q.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className="slash-suggestions"
      role="region"
      aria-label="当前语境示例问题"
    >
      <small>当前语境 · 点击即提问</small>
      {matches.map((q) => (
        <button
          type="button"
          key={q}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(q)}
        >
          {q}
          <span>↗</span>
        </button>
      ))}
      {!matches.length && <p>没有匹配的示例；删除 / 后可以直接提问。</p>}
    </div>
  );
}
