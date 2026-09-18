export interface AnswerLayout {
  title: string;
  lead: string;
  cards: { label: string; text: string }[];
  full: string;
}
export function answerLayout(answer: string): AnswerLayout {
  const blocks = answer
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const heading = blocks[0]?.startsWith("围绕 ")
    ? blocks.shift()!.slice(3)
    : "大脑建议";
  const content = blocks.filter(
    (b) => !b.startsWith("依据：") && !b.startsWith("关联："),
  );
  const first = content[0] || answer;
  const compact = (text: string, limit = 150) =>
    text.length <= limit
      ? text
      : (text.match(/^[\s\S]{1,150}[。；]/)?.[0] || text.slice(0, limit)) + "…";
  const lead = compact(first.replace(/^(事实|当前|结论)[：:]\s*/, ""), 160);
  const labels = ["事实与范围", "影响与判断", "下一步", "确认边界"];
  const body = content.length > 1 ? content.slice(1, 5) : [];
  const cards = body.map((text, i) => {
    const match = text.match(
      /^(影响|事实|下一步|建议下一步|建议|判断|验证|核实输出|当前|查看说明|确认边界)[：:]/,
    );
    return {
      label: match?.[1] || labels[i],
      text: compact(
        text.replace(
          /^(影响|事实|下一步|建议下一步|建议|判断|验证|当前|查看说明|确认边界)[：:]\s*/,
          "",
        ),
      ),
    };
  });
  return { title: heading, lead, cards, full: answer };
}
