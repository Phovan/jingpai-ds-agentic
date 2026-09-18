import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  FileText,
  Plus,
} from "lucide-react";
import { visibleEntities, DEFAULT_TABS } from "../domain/ontology";
import {
  PERIODS,
  inboxItems,
  periodLabel,
  reportContext,
  reportingItems,
  topicsFor,
  periodSummary,
  type ReportView,
} from "../domain/briefing";
import type { Role, Route, State } from "../domain/model";
import type { PersonalController } from "../domain/personal";
import { Modal } from "../components/ui";
import "./brain-home.css";
import { EntityText } from "../components/entity-text";
import { narrativeText } from "../domain/narrative";

interface HubProps {
  state: State;
  role: Role;
  personal: PersonalController;
  onEntity: (id: string) => void;
  onReport: (view: ReportView) => void;
  navigate: (route: Route) => void;
}
export function BrainHome({
  state,
  role,
  personal,
  onEntity,
  onReport,
  navigate,
}: HubProps) {
  const [filter, setFilter] = useState("全部");
  const [reading, setReading] = useState<string | null>(null);
  const all = visibleEntities(state, role);
  const important = all
    .filter(
      (e) =>
        e.attention &&
        (DEFAULT_TABS[role].includes(e.kind) ||
          personal.data.follows.includes(e.id)),
    )
    .sort((a, b) => {
      const order = ["管理层", "PMO", "项目经理"].includes(role)
        ? ["P02", "P03", "P06", "P12", "X02", "D01"]
        : ["X02", "D01", "D02", "P02", "P12"];
      return (
        (order.includes(a.id) ? order.indexOf(a.id) : 99) -
        (order.includes(b.id) ? order.indexOf(b.id) : 99)
      );
    });
  const inbox = inboxItems(state, role);
  const unread = (id: string) => !personal.data.readInbox?.includes(id);
  const selected = inbox.find((i) => i.id === reading);
  return (
    <div className="brain-home">
      <header className="home-heading">
        <div>
          <p className="eyebrow">我的首页 · {role}</p>
          <h1>把今天的重点，推进一步。</h1>
        </div>
        <button className="text-button" onClick={() => navigate("home")}>
          去工作台 <ArrowUpRight size={16} />
        </button>
      </header>
      <section className="home-panel">
        <header>
          <h2>
            关键事项 <span>{important.length}</span>
          </h2>
          <small>风险与行动</small>
        </header>
        {important.length ? (
          important.slice(0, 2).map((e) => (
            <div className="home-item" key={e.id}>
              <span className="home-priority">需关注</span>
              <div className="home-item-body">
                <button
                  className="business-link"
                  onClick={() => onEntity(e.id)}
                >
                  {e.title}
                </button>
                <p>{e.risk.split("。")[0]}。</p>
                <small>
                  目标：{e.goal} · 当前：{e.actual} · {e.gap}
                </small>
                <p className="home-next">下一步：{e.next}</p>
              </div>
              <button className="text-button" onClick={() => onEntity(e.id)}>
                查看 <ChevronRight size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="muted">
            当前范围没有已识别的重点事项；不代表所有业务目标已达成。
          </p>
        )}
        {important.length > 2 && (
          <button
            className="text-button home-more"
            onClick={() => navigate("home")}
          >
            到工作台查看全部 {important.length} 项 →
          </button>
        )}
      </section>
      <section className="home-panel">
        <header>
          <h2>
            即时信息 <span>{inbox.filter((i) => unread(i.id)).length}</span>
          </h2>
          <div className="home-filters">
            {["全部", "未读", "待处理"].map((f) => (
              <button
                key={f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </header>
        {inbox
          .filter(
            (i) =>
              filter === "全部" ||
              (filter === "未读" ? unread(i.id) : i.kind === "待处理"),
          )
          .map((i) => (
            <div className="home-item inbox-item" key={i.id}>
              <span className={"home-type " + (unread(i.id) ? "unread" : "")}>
                {i.kind}
              </span>
              <div className="home-item-body">
                <button
                  className="inbox-title"
                  onClick={() =>
                    i.route ? navigate(i.route) : setReading(i.id)
                  }
                >
                  {i.title}
                </button>
                <p>{i.summary}</p>
                <button
                  className="business-link small"
                  onClick={() => onEntity(i.objectId)}
                >
                  {all.find((e) => e.id === i.objectId)?.title || i.objectId} ↗
                </button>
              </div>
              <button
                className="text-button"
                onClick={() => (i.route ? navigate(i.route) : setReading(i.id))}
              >
                {i.route
                  ? "处理"
                  : i.kind === "待处理"
                    ? "核对"
                    : unread(i.id)
                      ? "阅读"
                      : "已读"}{" "}
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        {!inbox.some(
          (i) =>
            filter === "全部" ||
            (filter === "未读" ? unread(i.id) : i.kind === "待处理"),
        ) && (
          <p className="muted">
            当前没有{filter === "全部" ? "即时" : filter}信息。
          </p>
        )}
      </section>
      <section className="home-panel">
        <header>
          <h2>周期汇报</h2>
          <small>汇总 · 确认</small>
        </header>
        <div className="period-shortcuts">
          {PERIODS.map((period, i) => (
            <button key={period} onClick={() => onReport({ period })}>
              <CalendarDays size={20} />
              <strong>{period}</strong>
              <small>
                {
                  [
                    "漏单核实、门禁与承诺",
                    "目标差距、费用与预测",
                    "项目组合与战略贡献",
                    "交付、验证与能力复盘",
                  ][i]
                }
              </small>
              <ChevronRight size={16} />
            </button>
          ))}
          <button onClick={() => onReport({ period: "自定义Topic" })}>
            <FileText size={20} />
            <strong>自定义Topic</strong>
            <small>
              {topicsFor(state, role, personal.data).length} 个持续追踪主题 ·
              新建与查看
            </small>
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
      {selected && (
        <Modal title={selected.title} onClose={() => setReading(null)}>
          <span className="home-type">{selected.kind} · 演示材料</span>
          <p>{selected.summary}</p>
          <p>
            <EntityText
              text={selected.body || selected.summary}
              entities={all}
              onSelect={(id) => {
                setReading(null);
                onEntity(id);
              }}
            />
          </p>
          <button
            className="business-link"
            onClick={() => {
              setReading(null);
              onEntity(selected.objectId);
            }}
          >
            查看
            {all.find((e) => e.id === selected.objectId)?.title ||
              selected.objectId}
            详情 →
          </button>
          <div className="home-modal-actions">
            <button
              className="primary"
              onClick={() => {
                personal.update((p) => ({
                  ...p,
                  readInbox: [
                    ...new Set([...(p.readInbox || []), selected.id]),
                  ],
                }));
                setReading(null);
              }}
            >
              标记已读
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ReportHub({
  state,
  role,
  personal,
  onEntity,
  onReport,
  navigate,
  view,
  onAsk,
  onHome,
}: HubProps & {
  view: ReportView;
  onAsk: (q: string) => void;
  onHome: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [showFocus, setShowFocus] = useState(false);
  const [focusText, setFocusText] = useState("");
  const [recipient, setRecipient] = useState("所属团队");
  const ctx = reportContext(role, view, personal.data, state);
  const topics = topicsFor(state, role, personal.data);
  const topic = topics.find((t) => t.id === view.topicId);
  const items = reportingItems(state, role, personal.data, view.topicId);
  const draft = personal.data.reportDrafts?.[ctx.key];
  const focus = (state.reportFocus || []).filter(
    (f) =>
      (f.recipients.includes(role) || f.issuer === role) &&
      f.period === view.period,
  );
  return (
    <div className="report-hub">
      <header className="home-heading">
        <div>
          <button className="text-button" onClick={onHome}>
            ← 首页
          </button>
          <h1>周期汇报</h1>
        </div>
        <button className="text-button" onClick={() => navigate("home")}>
          去工作台 <ArrowUpRight size={16} />
        </button>
      </header>
      <nav className="report-tabs" aria-label="汇报周期">
        {[...PERIODS, "自定义Topic" as const].map((period) => (
          <button
            key={period}
            className={view.period === period ? "active" : ""}
            onClick={() => onReport({ period })}
          >
            {period}
          </button>
        ))}
      </nav>
      {view.period === "自定义Topic" && !topic ? (
        <>
          <div className="report-section-heading">
            <p className="muted">围绕一个主题持续汇总、追问，保留独立会话。</p>
            <button onClick={() => setCreating(true)}>
              <Plus size={16} /> 新建 Topic
            </button>
          </div>
          <div className="topic-grid">
            {topics.map((t) => (
              <button
                className="topic-card"
                key={t.id}
                onClick={() =>
                  onReport({ period: "自定义Topic", topicId: t.id })
                }
              >
                <FileText size={20} />
                <h2>{t.title}</h2>
                <p>{t.summary}</p>
                <small>{t.objectIds.length} 个关联对象 · 查看总结 →</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {topic && (
            <button
              className="text-button"
              onClick={() => onReport({ period: "自定义Topic" })}
            >
              ← 全部 Topic
            </button>
          )}
          <section className="home-panel report-summary">
            <header>
              <div>
                <p className="eyebrow">
                  {topic ? "持续追踪 Topic" : periodLabel(view.period)}
                </p>
                <h2>{topic?.title || `${role} · ${view.period}`}</h2>
              </div>
              <span
                className={
                  "report-status " + (draft?.confirmedAt ? "confirmed" : "")
                }
              >
                {draft?.confirmedAt
                  ? `已确认 · v${draft.version}`
                  : "待确认草稿"}
              </span>
            </header>
            <p className="report-lead">
              {items.length} 项
              {topic
                ? "主题关联事项"
                : personal.data.follows.length
                  ? "关注事项"
                  : "职责范围事项"}
              ，其中 {items.filter((e) => e.attention).length}{" "}
              项需要推进或补证。
              {topic?.summary || "先核对目标差距与依据，再确定下一周期行动。"}
            </p>
            {state.catalogVersion === "v03" && (
              <div
                className="report-period-focus"
                style={{ whiteSpace: "pre-wrap" }}
              >
                <EntityText
                  text={periodSummary(state, role, personal.data, view)}
                  entities={visibleEntities(state, role)}
                  onSelect={onEntity}
                />
              </div>
            )}
            <p className="home-data-note">
              {personal.data.follows.length || topic
                ? "按当前关注范围汇总"
                : "尚未添加关注，暂按角色职责汇总"}{" "}
              · 当前演示快照 v{state.version}
              ；未接入历史周期数据，不推算历史增量。
            </p>
            <div className="report-rows">
              {items.map((e) => (
                <article key={e.id}>
                  <div>
                    <button
                      className="business-link"
                      onClick={() => onEntity(e.id)}
                    >
                      {e.title} ↗
                    </button>
                    <small>
                      {e.kind} · {e.id}
                    </small>
                  </div>
                  <div>
                    <strong>目标与达成</strong>
                    <p>{e.goal}</p>
                    <p className="muted">
                      当前 {e.actual} · {e.gap}
                    </p>
                  </div>
                  <div>
                    <strong>风险与下一步</strong>
                    <p>{e.risk}</p>
                    <p className="muted">{e.next}</p>
                  </div>
                </article>
              ))}
            </div>
            {!items.length && (
              <p className="muted">
                没有可见的关联事项；可先到工作台添加关注，或为 Topic
                选择关联对象。
              </p>
            )}
            {!!draft?.notes.length && (
              <div className="report-notes">
                <h3>对话补充与调整</h3>
                {draft.notes.map((n, i) => (
                  <p key={i}>
                    {narrativeText(n, visibleEntities(state, role))}
                  </p>
                ))}
              </div>
            )}
            {draft?.confirmedAt && (
              <details className="report-notes">
                <summary>
                  查看已确认快照 ·{" "}
                  {new Date(draft.confirmedAt).toLocaleString("zh-CN")}
                </summary>
                <pre>
                  {narrativeText(
                    draft.snapshot || "",
                    visibleEntities(state, role),
                  )}
                </pre>
                {draft.version !== state.version && (
                  <p className="warning-text">
                    业务事实已更新；上方是最新汇总，已确认快照保持原样，可重新核对后确认。
                  </p>
                )}
              </details>
            )}
            <div className="report-actions">
              <button onClick={() => onAsk("请分析这份汇报的目标差距与下一步")}>
                与大脑讨论
              </button>
              <button className="primary" onClick={() => onAsk("确认本期汇报")}>
                核对并确认
              </button>
              {role === "管理层" && view.period !== "自定义Topic" && (
                <button onClick={() => setShowFocus(true)}>
                  下发团队关注点
                </button>
              )}
            </div>
          </section>
          {!!focus.length && (
            <section className="home-panel">
              <h2>{role === "管理层" ? "已下发的团队关注点" : "上级关注点"}</h2>
              {focus.map((f) => (
                <div className="home-item" key={f.id}>
                  <div>
                    <strong>
                      {f.period} · {f.recipients.join("、")}
                    </strong>
                    <p>
                      {narrativeText(f.content, visibleEntities(state, role))}
                    </p>
                    <small>
                      {new Date(f.at).toLocaleDateString("zh-CN")} · 管理层下发
                      · 演示组织
                    </small>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
      {creating && (
        <Modal title="新建 Topic" onClose={() => setCreating(false)}>
          <label>
            主题
            <input
              value={title}
              maxLength={50}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            关注摘要
            <textarea
              value={summary}
              maxLength={300}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>关联事项（当前角色可见）</legend>
            {visibleEntities(state, role)
              .filter((e) => ["项目", "系统", "需求", "战略"].includes(e.kind))
              .map((e) => (
                <label className="topic-checkbox" key={e.id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(e.id)}
                    onChange={(v) =>
                      setSelectedIds(
                        v.target.checked
                          ? [...selectedIds, e.id]
                          : selectedIds.filter((id) => id !== e.id),
                      )
                    }
                  />
                  {e.title}
                </label>
              ))}
          </fieldset>
          {formError && <p role="alert">{formError}</p>}
          <button
            className="primary"
            onClick={() => {
              if (!title.trim() || !selectedIds.length) {
                setFormError("请填写主题并选择至少一个关联事项。");
                return;
              }
              const id = crypto.randomUUID();
              personal.update((p) => ({
                ...p,
                topics: [
                  ...(p.topics || []),
                  {
                    id,
                    title: title.trim(),
                    summary: summary.trim(),
                    objectIds: selectedIds,
                  },
                ],
              }));
              setCreating(false);
              onReport({ period: "自定义Topic", topicId: id });
            }}
          >
            创建并查看总结
          </button>
        </Modal>
      )}
      {showFocus && (
        <Modal
          title={`下发${view.period}关注点`}
          onClose={() => setShowFocus(false)}
        >
          <p className="muted">
            演示组织：管理层 → 所属团队。下一步进入会话核对，不立即下发。
          </p>
          <label>
            接收对象
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            >
              {[
                "所属团队",
                "PMO",
                "项目经理",
                "业务Owner",
                "产品经理",
                "研发",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            关注内容
            <textarea
              value={focusText}
              maxLength={2000}
              onChange={(e) => setFocusText(e.target.value)}
              placeholder="例如：重点汇报目标差距、接口阻塞与责任人，附结果证据"
            />
          </label>
          <button
            className="primary"
            disabled={!focusText.trim()}
            onClick={() => {
              setShowFocus(false);
              onAsk(
                `向${recipient}下发${view.period}关注点：${focusText.trim()}`,
              );
            }}
          >
            到会话核对
          </button>
        </Modal>
      )}
    </div>
  );
}
