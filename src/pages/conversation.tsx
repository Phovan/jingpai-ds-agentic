import { addConversationMaterials } from "../domain/material-files";
import { reportText } from "../domain/briefing";
import type { BrainContext } from "../domain/experience";
import { fileDrop } from "../components/file-attachment";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ArrowUpRight, FilePlus2, Paperclip } from "lucide-react";
import { PROFILES, type Role, type State, type Route } from "../domain/model";
import { workItems } from "../domain/workbench";
import type { PersonalController } from "../domain/personal";
import { BrainMark } from "../components/ui";
import { contextItems } from "../domain/experience";

export function Conversation({
  state,
  role,
  personal,
  threadId,
  onThread,
  navigate,
  onMaterials,
  contextHeader,
  origin,
  onFiles,
  onContextAsk,
  onExecution,
  landing,
  onReportAction,
  activeContext,
}: {
  state: State;
  role: Role;
  personal: PersonalController;
  threadId: string | null;
  onThread: (id: string) => void;
  navigate: (r: Route) => void;
  onMaterials: (tab: "input" | "output") => void;
  contextHeader?: ReactNode;
  origin?: ReactNode;
  onFiles: (files: File[]) => void;
  onContextAsk: (question: string, threadId: string | null) => void;
  onExecution: (issueId: string) => void;
  landing?: ReactNode;
  activeContext?: BrainContext;
  onReportAction: (messageId: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const thread = personal.data.threads.find((t) => t.id === threadId);
  const scope = thread?.context || activeContext;
  const items = scope
    ? contextItems(state, role, scope)
    : workItems(state, role);
  useEffect(() => {
    if (thread?.messages.length) end.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);
  function ask(q: string) {
    if (!q.trim()) return;
    onContextAsk(q, threadId);
    setQuestion("");
  }
  function output() {
    const id = thread?.id || crypto.randomUUID();
    const now = new Date().toISOString();
    personal.update((p) =>
      addConversationMaterials(
        p,
        [
          {
            id: crypto.randomUUID(),
            title: scope?.report
              ? scope.title + " · 汇总草稿"
              : role + " · 目标与行动摘要",
            text: scope?.report
              ? reportText(state, role, p, scope)
              : `角色目标：${PROFILES[role].goal}\n\n${items.map((i) => `${i.id} ${i.title}\n目标：${i.goal}\n当前：${i.actual}；差距：${i.gap}\n下一步：${i.next}`).join("\n\n")}\n\n全部为演示数据，不是正式报告。`,
            kind: "output",
            threadId: id,
            created: now,
            version: state.version,
          },
        ],
        id,
        scope,
      ),
    );
    onThread(id);
    onMaterials("output");
  }
  return (
    <div
      className={
        "conversation-page " +
        (!threadId && activeContext?.landing ? "homepage-conversation" : "")
      }
    >
      {contextHeader}
      <div className="conversation-stream">
        {origin}
        {!thread?.messages.length ? (
          origin ? null : (
            landing
          )
        ) : (
          <>
            <h1 className="thread-title">{thread.title}</h1>
            {thread.messages.map((m) => (
              <div className="conversation-turn" key={m.id}>
                <div className="user-message">{m.question}</div>
                <div className="navi-message">
                  <BrainMark />
                  <div>
                    <p className="answer-copy">{m.answer}</p>
                    {m.reportAction && (
                      <div className="report-action-card">
                        <strong>
                          {m.reportAction.kind === "focus"
                            ? `下发关注点 · ${m.actionDone ? "已确认" : "待确认"}`
                            : `汇报快照 · ${m.actionDone ? "已确认" : "待确认"}`}
                        </strong>
                        {m.reportAction.kind === "focus" ? (
                          <>
                            <p>
                              {m.reportAction.period} · 接收：
                              {m.reportAction.recipients.join("、")}
                            </p>
                            <p>{m.reportAction.content}</p>
                            <p className="muted">
                              仅限演示组织下属团队；不会发送飞书或企微消息。
                            </p>
                          </>
                        ) : (
                          <p>{m.reportAction.title} · 保存当前汇总及对话补充</p>
                        )}
                        {m.actionDone ? (
                          <span className="done">已确认保存</span>
                        ) : (
                          <button
                            className="primary"
                            onClick={() => onReportAction(m.id)}
                          >
                            {m.reportAction.kind === "focus"
                              ? "确认下发"
                              : "确认保存汇报"}
                          </button>
                        )}
                      </div>
                    )}
                    {m.eosIssueId && (
                      <div className="eos-message-card">
                        <strong>
                          EOS 实施 ·{" "}
                          {state.eosRuns?.find(
                            (r) => r.issueId === m.eosIssueId,
                          )?.status === "completed"
                            ? "待人工确认"
                            : state.eosRuns?.find(
                                  (r) => r.issueId === m.eosIssueId,
                                )?.status === "stopped"
                              ? "已停止"
                              : "执行中"}
                        </strong>
                        <p>归因 → 研发 → Review → 验证 · 本地模拟</p>
                        <button onClick={() => onExecution(m.eosIssueId!)}>
                          执行详情 →
                        </button>
                      </div>
                    )}
                    <small>
                      依据：
                      {thread.context?.objectId ||
                        (thread.context
                          ? `${role}跟进对象清单`
                          : "G-01 · REQ-024 · TASK-024")}{" "}
                      · 演示快照 v{m.version}
                    </small>
                    {!m.eosIssueId && m.version !== state.version && (
                      <p className="warning-text">
                        对象已更新，重新提问可查看最新事实。
                      </p>
                    )}
                    <button
                      className="text-button"
                      onClick={() => navigate(thread.context?.route || "home")}
                    >
                      返回
                      {thread.context?.report
                        ? "汇报"
                        : thread.context?.landing
                          ? "首页"
                          : thread.context?.objectId
                            ? "详情"
                            : "工作台"}
                      核对 <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={end} />
      </div>
      <div className="conversation-composer-wrap">
        <form
          className="conversation-composer"
          {...fileDrop(onFiles)}
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <textarea
            aria-label="向企业大脑提问"
            rows={2}
            maxLength={3000}
            value={question}
            placeholder="和企业大脑一起推进，或把文件材料拖到这里…"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                ask(question);
              }
            }}
          />
          <div className="composer-controls">
            <div>
              <button
                type="button"
                className="text-button"
                onClick={() => onMaterials("input")}
              >
                <Paperclip size={16} />
                材料
              </button>
              <button type="button" className="text-button" onClick={output}>
                <FilePlus2 size={16} />
                生成追踪摘要
              </button>
            </div>
            <button
              className="primary icon-button"
              aria-label="发送问题"
              disabled={!question.trim()}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </form>
        <p className="composer-note">
          {thread?.context ? `上下文：${thread.context.title} · ` : ""}
          可拖入文件 · 演示规则引擎 · 关键决策由人确认
        </p>
      </div>
    </div>
  );
}
