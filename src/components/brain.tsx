import { useState } from "react";
import { Send, ArrowUpRight } from "lucide-react";
import {
  brainAnswer,
  nextAction,
  type State,
  type Route,
} from "../domain/model";
import { BrainMark, Modal } from "./ui";
export function Brain({
  state,
  onClose,
  navigate,
}: {
  state: State;
  onClose: () => void;
  navigate: (r: Route) => void;
}) {
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<
    { q: string; a: string; version: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setLoading(true);
    const snapshot = structuredClone(state);
    await new Promise((r) => setTimeout(r, 420));
    setMessages((m) => [
      ...m,
      {
        q: question,
        a: brainAnswer(snapshot, question),
        version: snapshot.version,
      },
    ]);
    setQ("");
    setLoading(false);
  }
  return (
    <Modal title="与企业大脑一起推进" onClose={onClose}>
      <div className="brain-context">
        <BrainMark />
        <div>
          <strong>订单协同优化 / REQ-024</strong>
          <p>共享事实 v{state.version} · 可解释规则演示，未连接大模型</p>
        </div>
      </div>
      <div className="chat-body" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <h3>先看证据，再决定下一步。</h3>
            <p>
              已带入目标、需求、决定与执行回执。问答只读，不会静默改变业务对象。
            </p>
            {[
              "目标差距是什么？",
              "为什么有风险？",
              "下一步谁处理？",
              "需求交付到哪里？",
            ].map((t) => (
              <button key={t} onClick={() => void ask(t)}>
                {t}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i}>
              <div className="question">{m.q}</div>
              <div className="answer">
                <BrainMark />
                <div>
                  <p>{m.a}</p>
                  <small>
                    依据：G-01 · REQ-024 · TASK-024 · 快照 v{m.version}
                  </small>
                  {m.version !== state.version && (
                    <p className="warning-text">
                      对象已更新，可重新提问获取最新事实。
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && <p className="muted">正在核对当前对象与回执…</p>}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <input
          aria-label="向大脑提问"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="问目标、原因、责任或交付状态…"
        />
        <button
          className="primary icon-button"
          aria-label="发送问题"
          disabled={loading || !q.trim()}
        >
          <Send size={18} />
        </button>
      </form>
      <button
        className="text-button"
        onClick={() => {
          navigate(nextAction(state).route);
          onClose();
        }}
      >
        去处理：{nextAction(state).title}
        <ArrowUpRight size={16} />
      </button>
    </Modal>
  );
}
