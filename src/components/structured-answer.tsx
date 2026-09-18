import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Message } from "../domain/personal";
import type { Entity } from "../domain/ontology";
import { EntityText } from "./entity-text";
import { answerLayout } from "../domain/answer-layout";
import { narrativeText } from "../domain/narrative";

export function StructuredAnswer({
  message,
  active,
  entities,
  onSelect,
  onPresented,
  children,
  waiting = false,
  waitingLabel = "Agent 正在执行，完成后呈现结果",
}: {
  message: Message;
  active: boolean;
  entities: Entity[];
  onSelect: (id: string) => void;
  onPresented: () => void;
  children: ReactNode;
  waiting?: boolean;
  waitingLabel?: string;
}) {
  const layout = answerLayout(narrativeText(message.answer, entities));
  const total =
    layout.lead.length + layout.cards.reduce((n, c) => n + c.text.length, 0);
  const recent =
    message.createdAt && Date.now() - Date.parse(message.createdAt) < 30000;
  const animate =
    !waiting &&
    active &&
    !message.presented &&
    !!recent &&
    !(
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  const [count, setCount] = useState(animate ? -2 : total),
    [done, setDone] = useState(!animate);
  const callback = useRef(onPresented);
  callback.current = onPresented;
  useEffect(() => {
    if (waiting) {
      setDone(false);
      setCount(-2);
      return;
    }
    if (!animate) {
      setCount(total);
      setDone(true);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const n =
        elapsed < 650
          ? elapsed < 300
            ? -2
            : -1
          : Math.min(total, Math.floor((elapsed - 650) / 55) * 24);
      setCount(n);
      if (n >= total) {
        clearInterval(timer);
        setDone(true);
        callback.current();
      }
    }, 55);
    return () => clearInterval(timer);
  }, [message.id, animate, total, waiting]);
  let remaining = Math.max(0, count - layout.lead.length);
  if (waiting)
    return (
      <section className="structured-answer eos-stage-pending" aria-busy="true">
        <header>
          <strong>EOS 阶段执行</strong>
          <span>本地模拟</span>
        </header>
        <p role="status">{waitingLabel}</p>
        <small>
          本阶段尚未产生完成回执；不会提前显示结果或自动启动下一阶段。
        </small>
      </section>
    );
  return (
    <>
      <section className="structured-answer" aria-busy={!done}>
        <header>
          <strong>{layout.title}</strong>
          <span>{done ? "依据当前记录" : "演示输出"}</span>
        </header>
        {!done && (
          <div className="answer-progress" role="status">
            <span className="thinking-dots">
              <i />
              <i />
              <i />
            </span>
            {count < 0
              ? count === -2
                ? "正在整理当前上下文"
                : "正在核对演示记录"
              : "正在生成建议"}
            <button
              onClick={() => {
                setCount(total);
                setDone(true);
                callback.current();
              }}
            >
              直接看结果
            </button>
          </div>
        )}
        {count >= 0 && (
          <p className="answer-lead">
            <EntityText
              text={layout.lead.slice(0, count)}
              entities={entities}
              onSelect={onSelect}
            />
            {!done && count < layout.lead.length && (
              <span className="typing-caret" />
            )}
          </p>
        )}
        <div className="answer-facts-grid">
          {layout.cards.map((card, index) => {
            const available = remaining;
            remaining -= card.text.length;
            return available > 0 ? (
              <article key={index}>
                <h4>{card.label}</h4>
                <p>
                  <EntityText
                    text={card.text.slice(0, available)}
                    entities={entities}
                    onSelect={onSelect}
                  />
                </p>
              </article>
            ) : null;
          })}
        </div>
        {done && (
          <details className="answer-evidence">
            <summary>查看完整分析与依据</summary>
            <div className="answer-full">
              <EntityText
                text={layout.full}
                entities={entities}
                onSelect={onSelect}
              />
            </div>
          </details>
        )}
      </section>
      {done && children}
    </>
  );
}
