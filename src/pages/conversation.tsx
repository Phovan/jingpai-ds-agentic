import { addConversationMaterials } from "../domain/material-files";
import { reportText } from "../domain/briefing";
import type { BrainContext } from "../domain/experience";
import { fileDrop } from "../components/file-attachment";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, FilePlus2, Paperclip } from "lucide-react";
import { PROFILES, type Role, type State, type Route } from "../domain/model";
import { workItems } from "../domain/workbench";
import type { PersonalController } from "../domain/personal";
import { BrainMark } from "../components/ui";
import { contextItems } from "../domain/experience";
import { visibleEntities } from "../domain/ontology";
import { exampleQuestions } from "../domain/catalog-dialogue";
import { StructuredAnswer } from "../components/structured-answer";
import { EntityDraftCard } from "../components/entity-draft-card";
import type { EntityDraft } from "../domain/entity-creation";
import { QuestionSuggestions } from "../components/question-suggestions";
import { narrativeText } from "../domain/narrative";
import { eosSteps } from "../domain/eos";

export function Conversation({
  state,
  role,
  personal,
  threadId,
  onThread,
  onMaterials,
  contextHeader,
  origin,
  onFiles,
  onContextAsk,
  onExecution,
  landing,
  onReportAction,
  activeContext,
  onEntity,
  onCreate,
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
  onEntity: (id: string) => void;
  onCreate: (draft: EntityDraft) => Promise<string>;
}) {
  const [question, setQuestion] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const thread = personal.data.threads.find((t) => t.id === threadId);
  const scope = thread?.context || activeContext;
  const entities = visibleEntities(state, role);
  const examples = exampleQuestions(
    state,
    role,
    scope,
    thread?.messages.at(-1),
  );
  const items = scope
    ? contextItems(state, role, scope)
    : workItems(state, role);
  useEffect(() => {
    followOutput.current = true;
    if (thread?.messages.length) end.current?.scrollIntoView({ block: "end" });
    const area = stream.current;
    const turn = Array.from(
      area?.querySelectorAll(".conversation-turn") || [],
    ).at(-1);
    if (!area || !turn) return;
    const observer = new ResizeObserver(() => {
      if (followOutput.current) area.scrollTop = area.scrollHeight;
    });
    observer.observe(turn);
    return () => observer.disconnect();
  }, [thread?.messages.length]);
  function ask(q: string) {
    if (!q.trim()) return;
    onContextAsk(q, threadId);
    setQuestion("");
  }
  function pendingRun(m: import("../domain/personal").Message) {
    if (!m.eosAdvance || m.eosStepIndex === undefined) return undefined;
    const run = [...(state.eosRuns || []), ...(state.eosHistory || [])].find(
      (r) => r.id === m.eosRunId,
    );
    return run && run.step < m.eosStepIndex ? run : undefined;
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
              : narrativeText(
                  `角色目标：${PROFILES[role].goal}\n\n${items.map((i) => `${i.title}\n目标：${i.goal}\n当前：${i.actual}；差距：${i.gap}\n下一步：${i.next}`).join("\n\n")}\n\n全部为演示数据，不是正式报告。`,
                  entities,
                ),
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
      <div
        className="conversation-stream"
        ref={stream}
        onWheel={(event) => {
          if (event.deltaY < 0) followOutput.current = false;
        }}
        onTouchStart={() => {
          followOutput.current = false;
        }}
        onPointerDown={(event) => {
          if (event.target === stream.current) followOutput.current = false;
        }}
        onKeyDown={(event) => {
          if (["ArrowUp", "PageUp", "Home"].includes(event.key))
            followOutput.current = false;
        }}
        onScroll={() => {
          const area = stream.current;
          if (
            area &&
            area.scrollHeight - area.clientHeight - area.scrollTop < 80
          )
            followOutput.current = true;
        }}
      >
        {origin}
        {!thread?.messages.length ? (
          origin ? null : (
            landing
          )
        ) : (
          <>
            <h1 className="thread-title">
              {narrativeText(thread.title, entities)}
            </h1>
            {thread.messages.map((m) => (
              <div className="conversation-turn" key={m.id}>
                <div className="user-message">
                  {narrativeText(m.question, entities)}
                </div>
                <div className="navi-message">
                  <BrainMark />
                  <div>
                    <StructuredAnswer
                      message={m}
                      waiting={!!pendingRun(m)}
                      waitingLabel={
                        pendingRun(m)?.status === "stopped"
                          ? "本阶段已停止，结果尚未完成；可在执行详情继续。"
                          : `${eosSteps(m.eosIssueId || "")[m.eosStepIndex || 0]?.agent} 正在执行，请稍候…`
                      }
                      active={m.id === thread.messages.at(-1)?.id}
                      entities={entities}
                      onSelect={onEntity}
                      onPresented={() =>
                        personal.update((p) => ({
                          ...p,
                          threads: p.threads.map((t) =>
                            t.id === thread.id
                              ? {
                                  ...t,
                                  messages: t.messages.map((x) =>
                                    x.id === m.id
                                      ? { ...x, presented: true }
                                      : x,
                                  ),
                                }
                              : t,
                          ),
                        }))
                      }
                    >
                      {m.entityDraft && (
                        <EntityDraftCard
                          draft={m.entityDraft}
                          role={role}
                          entities={entities}
                          onSelect={onEntity}
                          onChange={(draft) =>
                            personal.update((p) => ({
                              ...p,
                              threads: p.threads.map((t) =>
                                t.id === thread.id
                                  ? {
                                      ...t,
                                      messages: t.messages.map((x) =>
                                        x.id === m.id
                                          ? { ...x, entityDraft: draft }
                                          : x,
                                      ),
                                    }
                                  : t,
                              ),
                            }))
                          }
                          onConfirm={async (draft) => {
                            const createdId = await onCreate(draft);
                            personal.update((p) => ({
                              ...p,
                              threads: p.threads.map((t) =>
                                t.id === thread.id
                                  ? {
                                      ...t,
                                      messages: t.messages.map((x) =>
                                        x.id === m.id
                                          ? {
                                              ...x,
                                              entityDraft: {
                                                ...draft,
                                                createdId,
                                              },
                                            }
                                          : x,
                                      ),
                                    }
                                  : t,
                              ),
                            }));
                          }}
                        />
                      )}
                      {!!m.nextQuestions?.length && (
                        <div
                          className="next-questions"
                          aria-label="建议下一步问题"
                        >
                          <small>接着看</small>
                          {m.nextQuestions.map((q) => (
                            <button key={q} onClick={() => ask(q)}>
                              {narrativeText(q, entities)}
                              <span>↗</span>
                            </button>
                          ))}
                        </div>
                      )}
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
                              <p>
                                {narrativeText(
                                  m.reportAction.content,
                                  entities,
                                )}
                              </p>
                              <p className="muted">
                                仅限演示组织下属团队；不会发送飞书或企微消息。
                              </p>
                            </>
                          ) : (
                            <p>
                              {m.reportAction.title} · 保存当前汇总及对话补充
                            </p>
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
                                : state.eosRuns?.find(
                                      (r) => r.issueId === m.eosIssueId,
                                    )?.status === "waiting"
                                  ? "阶段完成 · 等待下一步"
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
                        {entities.find((e) => e.id === thread.context?.objectId)
                          ?.title ||
                          (thread.context
                            ? `${role}跟进对象清单`
                            : "G-01 · REQ-024 · TASK-024")}{" "}
                        · {m.dataset === "v03" ? "V0.3 数据 / " : ""}演示状态 v
                        {m.version}
                      </small>
                      {state.catalogVersion === "v03" &&
                        m.dataset !== "v03" && (
                          <p className="warning-text">
                            历史演示会话：旧编号与旧数值保留备查，未映射为 V0.3
                            对象事实。
                          </p>
                        )}
                      {!m.eosIssueId && m.version !== state.version && (
                        <p className="warning-text">
                          对象已更新，重新提问可查看最新事实。
                        </p>
                      )}
                    </StructuredAnswer>
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
          <QuestionSuggestions
            value={question}
            questions={examples.map((q) => narrativeText(q, entities))}
            onPick={ask}
          />
          <textarea
            aria-label="向企业大脑提问"
            rows={2}
            maxLength={3000}
            value={question}
            placeholder="和企业大脑一起推进；输入 / 查看示例问题，或把文件材料拖到这里…"
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
