import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CircleDot,
  Check,
  Filter,
  Target,
  GitBranch,
  Clock3,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  nextAction,
  taskLabel,
  PROFILES,
  REPORT_ROLES,
  STAGES,
  type Role,
  type Route,
  type State,
  type Command,
} from "../domain/model";
import {
  Panel,
  Badge,
  BrainMark,
  Stat,
  Empty,
  ActionLink,
  Modal,
} from "../components/ui";
import type { ActionKind } from "../components/action-dialog";
import { DemandDelivery } from "../components/demand-delivery";
import { getOperations } from "../domain/operations";
export interface WorkspaceProps {
  onEntity?: (id: string) => void;
  opsTab?: import("../domain/operations").OpsTab;
  opsId?: string;
  openOps?: (tab: import("../domain/operations").OpsTab, id?: string) => void;
  onOpsContext?: (
    tab: import("../domain/operations").OpsTab,
    id?: string,
    title?: string,
  ) => void;
  follow?: ReactNode;
  onDemandChange?: (id: string) => void;
  selectedDemand?: string;
  state: State;
  role: Role;
  navigate: (r: Route) => void;
  open: (kind: ActionKind, id?: string) => void;
  act: (command: Command) => void;
  brain: () => void;
}
export function Home(p: WorkspaceProps) {
  const { state: s, role, navigate, open, brain } = p;
  const n = nextAction(s);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">
            目标工作台 / {role === "PMO" ? "跨项目组合" : "管理视角"}
          </p>
          <h1>
            {role === "PMO"
              ? "让项目有人看护，让问题有人推进。"
              : "今天，先推动目标更近一步。"}
          </h1>
          <p className="subtitle">
            {PROFILES[role].goal} <span className="divider-dot">·</span> 2026 年
            9 月 17 日 · 演示基准日
          </p>
        </div>
        <Badge>数字化项目组合</Badge>
      </div>
      <section className="brief">
        <div className="brief-icon">
          <BrainMark />
        </div>
        <div>
          <div className="inline">
            <strong>大脑简报</strong>
            <Badge tone="brand">PMO Agents 主动发现</Badge>
          </div>
          <h2>
            {s.task === "verified"
              ? "订单协同已通过本次业务验证，接下来核实可复用经验。"
              : s.task === "blocked"
                ? "工程验证遇到权限阻塞，已停止发布，需要人工介入。"
                : s.coordination
                  ? "交付安排已确认，执行与业务验证仍需持续跟进。"
                  : "订单协同存在目标差距，建议今天确认接口支持方案。"}
          </h2>
          <p>
            {s.actual > s.goal
              ? `异常响应 ${s.actual}h，超出目标 ${(s.actual - s.goal).toFixed(1)}h。`
              : `实测 ${s.actual}h，达到 ≤2h 的本次样本目标。`}{" "}
            {n.reason}。建议交给{n.role}处理。
          </p>
          <div className="inline">
            <button className="primary" onClick={() => navigate(n.route)}>
              查看下一步 <ArrowRight size={16} />
            </button>
            <button className="text-button" onClick={brain}>
              查看判断依据 <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </section>
      <div className="stats">
        <Stat label="纳入看护的项目" value="04" note="范围：数字化项目组合" />
        <Stat
          label="需要干预"
          value={s.task === "verified" ? "01" : "02"}
          note="目标偏差，不等于进度延期"
          tone="warn-text"
        />
        <Stat
          label="待关键决定"
          value={s.decision === "approved" ? "00" : "01"}
          note={
            s.decision === "approved"
              ? "已生成行动，持续跟踪"
              : "DEC-007 · 接口支持方案"
          }
        />
        <Stat
          label="已确认目标结果"
          value={s.task === "verified" ? "02" : "01"}
          note="依据业务证据，不看任务完成率"
          tone="good-text"
        />
      </div>
      <div className="workspace-grid">
        <ProjectTable {...p} />
        <div className="stack">
          {role === "PMO" && (
            <Panel title="本轮事实核对" caption="PMO 专属工作队列">
              <div className="attention">
                <Badge tone="brand">报告与跨角色确认</Badge>
                <h3>
                  {s.report
                    ? `${s.report.confirmations.length}/4 个责任角色已确认`
                    : "从共享事实生成周报"}
                </h3>
                <p>
                  识别未回复与证据缺口，汇总后交管理层确认；不代替员工或业务
                  Owner 签字。
                </p>
                <button className="primary" onClick={() => navigate("reports")}>
                  进入报告确认队列 <ArrowRight size={16} />
                </button>
              </div>
            </Panel>
          )}
          <Panel title="待我处理" caption="有依据，有责任，有下一步">
            <div className="attention">
              <Badge tone={n.role === role ? "warn" : "neutral"}>
                {n.role === role ? "需要我处理" : `交给 ${n.role}`}
              </Badge>
              <h3>{n.title}</h3>
              <p>{n.reason}</p>
              <button
                onClick={() =>
                  s.decision !== "approved" && role === "管理层"
                    ? open("decision")
                    : navigate(n.route)
                }
              >
                查看事项 <ArrowRight size={16} />
              </button>
            </div>
          </Panel>
          <Panel title="Agents 正在做什么">
            <div className="agent-mini">
              <BrainMark />
              <div>
                <strong>PMO Agents</strong>
                <p>关注项目目标、依赖与证据变化</p>
              </div>
              <span className="online-dot" />
            </div>
            <div className="agent-mini">
              <GitBranch size={22} />
              <div>
                <strong>EOS Agents</strong>
                <p>{taskLabel(s.task)} · TASK-024</p>
              </div>
            </div>
            <ActionLink onClick={() => navigate("agents")}>
              查看执行回执
            </ActionLink>
          </Panel>
        </div>
      </div>
      <div
        className="brain-launch"
        onClick={brain}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") brain();
        }}
      >
        <BrainMark />
        <span>围绕目标追问：为什么有风险？下一步应该由谁处理？</span>
        <span className="key-hint">
          问大脑 <ArrowUpRight size={16} />
        </span>
      </div>
    </>
  );
}
function ProjectTable({ state: s, role, navigate }: WorkspaceProps) {
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<string | null>(null);
  const all = [
    {
      name: "订单协同优化",
      id: "PRJ-001",
      goal: "异常响应 ≤2h",
      actual: `${s.actual}h`,
      gap:
        s.actual > s.goal
          ? `超出 ${(s.actual - s.goal).toFixed(1)}h`
          : "本次达标",
      tone: s.task === "verified" ? "good" : "warn",
      status: s.task === "verified" ? "已验证" : "风险",
      owner: nextAction(s).role,
      next: nextAction(s).title,
    },
    {
      name: "质量追溯试点",
      id: "PRJ-002",
      goal: "追溯耗时 ≤30min",
      actual: "45min",
      gap: "超出 15min",
      tone: "bad",
      status: "偏离",
      owner: "待业务核实",
      next: "确认指标口径",
    },
    {
      name: "周报协同试点",
      id: "PRJ-003",
      goal: "汇总耗时 ≤1h",
      actual: "0.8h",
      gap: "本次达标",
      tone: "good",
      status: "正常",
      owner: "PMO",
      next: "持续观察收益",
    },
    {
      name: "数据口径治理",
      id: "PRJ-004",
      goal: "口径待确认",
      actual: "—",
      gap: "基线缺失",
      tone: "neutral",
      status: "待核实",
      owner: "PMO",
      next: "补充指标与基线",
    },
  ];
  const rows = all
    .filter((_, i) => ["管理层", "PMO"].includes(role) || i === 0)
    .filter((r) => filter === "all" || ["warn", "bad"].includes(r.tone));
  return (
    <Panel
      title="项目晴雨表"
      caption="业务目标与交付状态，分开看"
      className="project-panel"
      action={
        <label className="filter">
          <Filter size={14} />
          <select
            aria-label="项目状态筛选"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="risk">需要干预</option>
          </select>
        </label>
      }
    >
      <div className="project-table">
        <div className="project-head">
          <span>项目 / 目标</span>
          <span>实际 / GAP</span>
          <span>状态</span>
          <span>下一行动</span>
        </div>
        {rows.map((r) => (
          <div className="project-row" key={r.id}>
            <div>
              <button
                className="object-link"
                onClick={() =>
                  r.id === "PRJ-001" ? navigate("projects") : setDetail(r.id)
                }
              >
                {r.name}
              </button>
              <small>{r.goal}</small>
            </div>
            <div>
              <strong>{r.actual}</strong>
              <small className={r.tone === "good" ? "good-text" : ""}>
                {r.gap}
              </small>
            </div>
            <Badge tone={r.tone as "good" | "bad" | "warn" | "neutral"}>
              {r.status}
            </Badge>
            <div>
              <span>{r.next}</span>
              <small>{r.owner}</small>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <Empty
            title="当前筛选没有项目"
            body="可以切回全部状态查看已验证与待核实对象。"
          />
        )}
      </div>
      <footer className="panel-footer">
        <span>模拟组合数据 · 不同单位不求平均 · 上级战略待关联</span>
        <button className="text-button" onClick={() => navigate("projects")}>
          查看订单协同 <ArrowRight size={14} />
        </button>
      </footer>
      {detail && (
        <Modal
          title={all.find((r) => r.id === detail)!.name}
          onClose={() => setDetail(null)}
        >
          <div className="form-stack">
            <Badge>组合示例 · 只读对象</Badge>
            <h3>{all.find((r) => r.id === detail)!.goal}</h3>
            <p>
              实际：{all.find((r) => r.id === detail)!.actual} ·{" "}
              {all.find((r) => r.id === detail)!.gap}
            </p>
            <p>
              下一步：{all.find((r) => r.id === detail)!.next}。责任：
              {all.find((r) => r.id === detail)!.owner}。
            </p>
            <div className="notice">
              此对象用于呈现项目组合差异；完整人机协作演示请进入「订单协同优化」。这里不会显示其他项目的回答或伪造执行。
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  );
}
export function Projects(p: WorkspaceProps) {
  const s = p.state,
    d = s.demands[0];
  const [view, setView] = useState<"actions" | "evidence" | null>(null);
  const forecast = d.forecast
    ? `${d.forecast.slice(5, 7)}月${d.forecast.slice(8)}日`
    : "待评估";
  return (
    <div className="preview-project">
      <div className="preview-breadcrumb">
        <button className="text-button" onClick={() => p.navigate("home")}>
          ← 工作台
        </button>
        <span>/　服务　 /　 PRJ-001</span>
      </div>
      <div className="preview-project-heading">
        <div>
          <h1>订单协同优化</h1>
          <p>
            ● {s.task === "verified" ? "已验证" : "需关注"}
            　项目经理：项目经理（演示）　·　演示事实 v{s.version}
          </p>
        </div>
        {p.follow}
      </div>
      <section className="preview-project-metrics">
        <div>
          <small>项目目标</small>
          <strong>提升订单协同效率</strong>
          <span>以业务响应改善衡量成果</span>
        </div>
        <div>
          <small>目标 / 实际</small>
          <strong>
            ≤{s.goal}h / {s.actual}h
          </strong>
          <span>同口径 · 演示样本</span>
        </div>
        <div>
          <small>目标差距</small>
          <strong className={s.actual > s.goal ? "warn-text" : "good-text"}>
            {s.actual > s.goal
              ? `+${(s.actual - s.goal).toFixed(1)} 小时`
              : "本次达标"}
          </strong>
          <span>{s.actual > s.goal ? "尚未达到目标" : "已提交验证证据"}</span>
        </div>
        <div>
          <small>预计交付</small>
          <strong className="warn-text">{forecast}</strong>
          <span>
            {d.forecast > d.committed ? "晚于当前承诺" : "与当前承诺一致"}
          </span>
        </div>
      </section>
      <section className="preview-brain-judgment">
        <h2>
          大脑判断 /{" "}
          {s.coordination ? "跟进工程交付与业务验证" : "优先解决接口依赖"}
        </h2>
        <p>
          {s.coordination
            ? "交付安排已确认，工程完成后仍需由业务Owner核实响应时长是否改善。"
            : "接口支持尚未确认，交付预测晚于承诺；上线后仍需验证响应时长是否降至 2 小时以内。"}
        </p>
        <div>
          <span>
            依据：需求 {d.id}　 |　 当前承诺 {d.committed}　 |　 预测{" "}
            {d.forecast}
          </span>
          <button className="text-button" onClick={() => setView("evidence")}>
            查看证据 →
          </button>
          <button className="text-button" onClick={() => setView("actions")}>
            处理建议 →
          </button>
        </div>
      </section>
      <div className="preview-project-relations">
        <section>
          <h2>相关需求</h2>
          {s.demands
            .filter((d) => d.projectId === "PRJ-001")
            .map((d, i) => (
              <div className="preview-related-demand" key={d.id}>
                <button
                  className={i === 0 ? "text-button" : "preview-name"}
                  onClick={() => {
                    p.onDemandChange?.(d.id);
                    p.navigate("demands");
                  }}
                >
                  {d.id}　{d.title} <span>查看生命周期 →</span>
                </button>
                <p>
                  {d.stage}　·　
                  {d.baselineConfirmed ? "验收基线已确认" : "验收基线待确认"}　
                  /　 业务Owner
                </p>
              </div>
            ))}
        </section>
        <section>
          <h2>系统与责任</h2>
          <p>
            <span>系统</span>
            <button
              className="text-button"
              onClick={() => p.navigate("engineering")}
            >
              SYS-01 订单平台
            </button>
          </p>
          <p>
            <span>人员</span>项目经理 / 业务Owner / 系统负责人
          </p>
          <p>
            <span>风险</span>
            {s.coordination
              ? "待验证业务改善效果"
              : "接口依赖未确认 · 责任人：项目经理"}
          </p>
        </section>
      </div>
      {view && (
        <Modal
          wide
          title={view === "actions" ? "项目行动与交付" : "项目事实与证据"}
          onClose={() => setView(null)}
        >
          {view === "actions" ? (
            <ProjectActions {...p} />
          ) : (
            <div className="stack">
              <p>目标 G-01：异常响应 ≤{s.goal}h；上级战略待关联。</p>
              {d.evidence.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
              <p>以上为演示事实，不是实时客户资料。</p>
              <button
                onClick={() => {
                  setView(null);
                  p.navigate("agents");
                }}
              >
                查看执行与变化记录 →
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function ProjectActions(p: WorkspaceProps) {
  const { state: s, role, open, brain, navigate } = p;
  const n = nextAction(s);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">项目与目标 / PRJ-001</p>
          <h1>订单协同优化</h1>
          <p className="subtitle">
            从异常被发现，到责任人采取行动。关注交付，更关注业务结果。
          </p>
        </div>
        <Badge tone={s.task === "verified" ? "good" : "warn"}>
          {s.task === "verified" ? "本次已验证" : "持续看护中"}
        </Badge>
      </div>
      <div className="goal-banner">
        <Target size={26} />
        <div>
          <small>业务目标 G-01 · 上级战略待关联</small>
          <h2>订单异常响应 ≤2 小时</h2>
        </div>
        <div className="goal-value">
          <strong>
            {s.actual}
            <small> h</small>
          </strong>
          <span>
            {s.actual > s.goal
              ? `GAP +${(s.actual - s.goal).toFixed(1)}h`
              : "本次样本达标"}
          </span>
        </div>
        <button onClick={brain}>查看口径与依据</button>
      </div>
      <div className="tabs">
        <span className="active">目标与行动</span>
        <button onClick={() => navigate("demands")}>
          关联需求 <Badge>{s.demands.length}</Badge>
        </button>
        <button onClick={() => navigate("agents")}>证据与变化记录</button>
      </div>
      <div className="workspace-grid">
        <div className="stack">
          <Panel title="从目标到结果的共同路径">
            <div className="milestones">
              {["对齐验收", "批准方案", "确认安排", "工程验证", "业务结果"].map(
                (x, i) => {
                  const done = [
                    true,
                    s.decision === "approved",
                    s.coordination,
                    ["ready", "released", "verified"].includes(s.task),
                    s.task === "verified",
                  ][i];
                  return (
                    <div key={x} className={done ? "done" : ""}>
                      <span>{done ? <Check size={18} /> : i + 1}</span>
                      <strong>{x}</strong>
                      <small>{done ? "已完成" : "待推进"}</small>
                    </div>
                  );
                },
              )}
            </div>
          </Panel>
          <Panel
            title="DEC-007 · 接口支持方案"
            caption="把判断变成行动，不把建议当成结果"
          >
            <div className="decision-summary">
              <div>
                <Badge tone={s.decision === "approved" ? "good" : "warn"}>
                  {s.decision === "approved"
                    ? "已批准"
                    : s.decision === "deferred"
                      ? "已暂缓"
                      : "待决定"}
                </Badge>
                <h3>
                  {s.plan === null
                    ? "大脑建议：协调接口支持"
                    : s.plan === "assist"
                      ? "已选方案 A：协调接口支持"
                      : "已选方案 B：保持资源安排"}
                </h3>
                <p>
                  当前承诺 {s.demands[0].committed}，最新预测{" "}
                  {s.demands[0].forecast}
                  。接口依赖可能影响交付；资源投入可用性需由项目经理确认。
                </p>
              </div>
              <div className="inline">
                {role === "管理层" && s.decision !== "approved" && (
                  <>
                    <button
                      className="primary"
                      onClick={() => open("decision")}
                    >
                      比较并批准方案
                    </button>
                    {s.decision === "pending" && (
                      <button onClick={() => open("defer")}>暂缓</button>
                    )}
                  </>
                )}
                {role === "项目经理" &&
                  s.decision === "approved" &&
                  !s.coordination && (
                    <button
                      className="primary"
                      onClick={() => open("coordinate")}
                    >
                      确认资源与交付安排
                    </button>
                  )}
                {role !== "管理层" && s.decision !== "approved" && (
                  <span className="muted">
                    等待管理层确认，不代替授权人批准。
                  </span>
                )}
                {s.coordination && (
                  <button onClick={() => navigate("engineering")}>
                    查看关联工程执行 <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </Panel>
          <Panel title="关系与依赖">
            <div className="relation-line">
              <span>
                <Target />
                G-01 目标
              </span>
              <ArrowRight />
              <span>PRJ-001 项目</span>
              <ArrowRight />
              <button onClick={() => navigate("demands")}>REQ-024 需求</button>
            </div>
            <div className="relation-line">
              <span>
                <GitBranch />
                SYS-01 订单平台
              </span>
              <ArrowRight />
              <span>Release-09.25</span>
              <ArrowRight />
              <button onClick={() => navigate("engineering")}>Issue-048</button>
            </div>
            <p className="muted">
              组织：数字化与业务协同组（演示）· 供应商：本闭环暂不涉及
            </p>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="下一责任人">
            <div className="attention">
              <Badge tone="brand">{n.role}</Badge>
              <h3>{n.title}</h3>
              <p>{n.reason}</p>
              <ActionLink onClick={() => navigate(n.route)}>
                进入工作面
              </ActionLink>
            </div>
          </Panel>
          <Panel title="风险与证据">
            <div className="evidence-item">
              <CircleDot size={17} />
              <div>
                <strong>交付预测偏离</strong>
                <p>接口支持未确定；协调完成前，不改承诺。</p>
              </div>
            </div>
            <div className="evidence-item">
              <FileText size={17} />
              <div>
                <strong>业务效果需单独验证</strong>
                <p>EV-01 · 演示基线 20 单 / 3.5h</p>
              </div>
            </div>
            <ActionLink onClick={brain}>追问风险依据</ActionLink>
          </Panel>
        </div>
      </div>
    </>
  );
}
export function Demands(p: WorkspaceProps) {
  const { state: s, role, open, act, navigate, brain } = p;
  const [selected, setSelected] = useState(p.selectedDemand || "REQ-024");
  const [query, setQuery] = useState("");
  const d = s.demands.find((x) => x.id === selected) || s.demands[0];
  const linkedRelease = [...getOperations(s).releases]
    .reverse()
    .find((r) => r.demands.includes(d.id) && r.status !== "已回退");
  const current = STAGES.indexOf(d.stage);
  const n = nextAction(s);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">
            需求 / {role === "产品经理" ? "需求工作台" : "全生命周期"}
          </p>
          <h1>
            {role === "产品经理"
              ? "让需求清晰，让验收有据。"
              : "我的需求，不再靠追问。"}
          </h1>
          <p className="subtitle">
            同一个需求 ID，贯穿业务提出、产研落地与结果验证。
          </p>
        </div>
        {role === "业务Owner" && (
          <button className="primary" onClick={() => open("create")}>
            ＋ 提出需求
          </button>
        )}
      </div>
      <div className="demand-layout">
        <aside className="demand-list">
          <label className="search-box">
            <input
              aria-label="搜索需求"
              placeholder="搜索需求名称 / ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {s.demands
            .filter((x) => `${x.id} ${x.title}`.includes(query))
            .map((x) => (
              <button
                className={d.id === x.id ? "selected" : ""}
                key={x.id}
                onClick={() => {
                  setSelected(x.id);
                  p.onDemandChange?.(x.id);
                }}
              >
                <small>{x.id}</small>
                <strong>{x.title}</strong>
                <Badge tone={x.stage === "已关闭" ? "good" : "neutral"}>
                  {x.stage}
                </Badge>
              </button>
            ))}
          {!s.demands.some((x) => `${x.id} ${x.title}`.includes(query)) && (
            <p className="muted">没有匹配需求，请调整关键词。</p>
          )}
        </aside>
        <div className="stack">
          <Panel>
            <div className="demand-heading">
              <div>
                <p className="eyebrow">
                  {d.id} / {d.projectId} /{" "}
                  {getOperations(s).projects.find((p) => p.id === d.projectId)
                    ?.system || "待关联系统"}
                </p>
                <h2>{d.title}</h2>
                <p>{d.problem}</p>
              </div>
              <Badge tone={d.stage === "已关闭" ? "good" : "brand"}>
                {d.stage}
              </Badge>
            </div>
            {role === "业务Owner" &&
              d.id === "REQ-024" &&
              s.decision === "approved" &&
              s.plan === "delay" &&
              !s.delayAccepted && (
                <div className="notice">
                  <p>
                    方案 B 拟将承诺调整至
                    09/27，请先确认业务影响，项目经理才能回写日期。
                  </p>
                  <button
                    className="primary"
                    onClick={() => open("accept-delay")}
                  >
                    确认延期的业务影响
                  </button>
                </div>
              )}
            <div className="date-grid">
              <div>
                <small>业务期望</small>
                <strong>{d.requested}</strong>
              </div>
              <div>
                <small>已确认承诺</small>
                <strong>{d.committed || "待排期"}</strong>
              </div>
              <div>
                <small>最新预测</small>
                <strong>{d.forecast || "待评估"}</strong>
              </div>
            </div>
            <div className="lifecycle">
              {STAGES.map((x, i) => (
                <div
                  key={x}
                  className={
                    i < current ? "complete" : i === current ? "current" : ""
                  }
                >
                  <span>{i < current ? <Check size={14} /> : i + 1}</span>
                  <small>{x}</small>
                </div>
              ))}
            </div>
            <div className="notice">
              <strong>
                {d.id === "REQ-024"
                  ? `下一步：${n.role} · ${n.title}`
                  : d.stage === "待受理" || d.stage === "待澄清"
                    ? "产品起草验收条件 → Owner 确认范围"
                    : d.stage === "待排期"
                      ? "项目经理核实容量 → 确认承诺日期"
                      : `交付阶段：${d.stage}`}
              </strong>
              <p>
                {d.id === "REQ-024"
                  ? n.reason
                  : "按当前阶段接续研发实现、Agent 模拟审核、预览发布与业务验证；每步保留回执。"}
              </p>
            </div>
          </Panel>
          <div className="button-row">
            <button onClick={() => open("clarify", d.id)}>
              补充澄清与边界
            </button>
            {linkedRelease && (
              <button onClick={() => p.onEntity?.(linkedRelease.id)}>
                查看版本、Impl与验证 · {linkedRelease.status} →
              </button>
            )}
          </div>
          {d.id !== "REQ-024" && !linkedRelease && (
            <DemandDelivery key={d.id} demand={d} role={role} state={s} />
          )}
          <div className="two-column">
            <Panel
              title="验收基线"
              action={
                <Badge tone={d.baselineConfirmed ? "good" : "warn"}>
                  {d.baselineConfirmed ? "已冻结 v1" : "待确认"}
                </Badge>
              }
            >
              <p className="body-copy">
                {d.baseline ||
                  "尚未形成验收条件。先由产品经理澄清业务规则与边界。"}
              </p>
              {role === "产品经理" && !d.baselineConfirmed && (
                <button
                  className="primary"
                  onClick={() => open("baseline", d.id)}
                >
                  起草验收条件
                </button>
              )}
              {role === "业务Owner" && d.baseline && !d.baselineConfirmed && (
                <button
                  className="primary"
                  onClick={() => act({ type: "confirm-baseline", id: d.id })}
                >
                  确认范围与基线
                </button>
              )}
              {role === "项目经理" && d.stage === "待排期" && (
                <button
                  className="primary"
                  onClick={() => open("schedule", d.id)}
                >
                  确认排期
                </button>
              )}
              {role === "业务Owner" &&
                d.id === "REQ-024" &&
                !linkedRelease &&
                s.task === "released" && (
                  <button className="primary" onClick={() => open("accept")}>
                    验证业务结果
                  </button>
                )}
              {d.id === "REQ-024" && role !== "业务Owner" && (
                <ActionLink onClick={() => navigate("engineering")}>
                  查看关联版本与验证
                </ActionLink>
              )}
            </Panel>
            <Panel title="业务证据">
              <div className="evidence-list">
                {d.evidence.length ? (
                  d.evidence.map((e, i) => (
                    <div className="evidence-item" key={i}>
                      <FileText size={18} />
                      <p>{e}</p>
                    </div>
                  ))
                ) : (
                  <p className="muted">暂无证据，验收时需补充。</p>
                )}
              </div>
              <ActionLink onClick={brain}>让大脑解释当前差距</ActionLink>
            </Panel>
          </div>
          <Panel title="需求变化记录">
            <Timeline state={s} object={d.id} />
          </Panel>
        </div>
      </div>
    </>
  );
}
export function Engineering(p: WorkspaceProps) {
  const { state: s, role, open, act, navigate } = p;
  const linkedRelease = [...getOperations(s).releases]
    .reverse()
    .find((r) => r.demands.includes("REQ-024") && r.status !== "已回退");
  if (linkedRelease)
    return (
      <Panel title="工程执行已关联版本">
        <p>
          {linkedRelease.id} · {linkedRelease.title} · {linkedRelease.status}
        </p>
        <p>
          沿同一需求继续实现、独立审核、发布与业务验证，旧快捷流程已停用以避免绕过门禁。
        </p>
        <button
          className="primary"
          onClick={() => p.onEntity?.(linkedRelease.id)}
        >
          查看版本详情 →
        </button>
      </Panel>
    );
  const phases = [
    "归因与基线",
    "实现产物",
    "独立 Review",
    "现实验证",
    "预览发布",
    "业务验证",
  ];
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">系统与版本 / SYS-01 / Release-09.25</p>
          <h1>订单平台 · 工程执行</h1>
          <p className="subtitle">
            Issue-048 → Impl-{s.run} · 关联 REQ-024 · 业务目标：异常响应 ≤2h
          </p>
        </div>
        <Badge
          tone={
            s.task === "blocked"
              ? "warn"
              : s.task === "verified"
                ? "good"
                : "brand"
          }
        >
          {taskLabel(s.task)}
        </Badge>
      </div>
      <div className="engineering-flow">
        {phases.map((t, i) => (
          <div
            key={t}
            className={
              i === 0 ||
              (i === 1 && s.taskStep >= 1) ||
              (i === 2 && s.taskStep >= 2) ||
              (i === 3 && ["ready", "released", "verified"].includes(s.task)) ||
              (i === 4 && ["released", "verified"].includes(s.task)) ||
              (i === 5 && s.task === "verified")
                ? "done"
                : ""
            }
          >
            <span>{i + 1}</span>
            {t}
            {i < 5 && <ArrowRight size={16} />}
          </div>
        ))}
      </div>
      <div className="execution-layout">
        <aside className="execution-outline">
          <p className="eyebrow">本次执行</p>
          <h3>订单异常提醒</h3>
          <div className="outline-item active">
            <GitBranch size={17} />
            <span>
              Issue-048<small>冻结验收 v1</small>
            </span>
          </div>
          <div className="outline-item">
            <ShieldCheck size={17} />
            <span>
              Impl-{s.run}
              <small>build-demo-024</small>
            </span>
          </div>
          <div className="outline-item">
            <Clock3 size={17} />
            <span>
              停止条件<small>越权、环境失败、证据不足</small>
            </span>
          </div>
          <p className="muted">
            演示执行器，不运行真实代码、不连接仓库或生产系统。
          </p>
          <button className="text-button" onClick={() => navigate("demands")}>
            返回业务需求 <ArrowUpRight size={14} />
          </button>
        </aside>
        <Panel
          title="执行与验证回执"
          caption="EOS Agents · TASK-024 · 只在授权范围推进"
        >
          <div
            className={`execution-status ${s.task === "blocked" ? "blocked" : ""}`}
          >
            <BrainMark />
            <div>
              <h3>
                {s.dispatchFailed
                  ? "派发失败，任务尚未受理"
                  : nextAction(s).title}
              </h3>
              <p>
                {s.dispatchFailed
                  ? "重试会沿用 TASK-024，不创建重复任务。"
                  : nextAction(s).reason}
              </p>
            </div>
          </div>
          <div className="inline actions-wrap">
            {role === "研发" &&
              ["idle", "stopped"].includes(s.task) &&
              !s.dispatchFailed && (
                <button
                  className="primary"
                  disabled={!s.coordination}
                  onClick={() => act({ type: "start" })}
                >
                  启动 EOS 执行
                </button>
              )}
            {role === "研发" && s.dispatchFailed && (
              <button
                className="primary"
                onClick={() => act({ type: "retry-dispatch" })}
              >
                重试派发
              </button>
            )}
            {role === "研发" && s.task === "blocked" && (
              <button className="primary" onClick={() => open("environment")}>
                补充环境回执并重试
              </button>
            )}
            {["研发", "项目经理"].includes(role) && s.task === "running" && (
              <button onClick={() => act({ type: "stop" })}>停止执行</button>
            )}
            {role === "项目经理" && s.task === "ready" && (
              <button className="primary" onClick={() => open("release")}>
                确认预览发布
              </button>
            )}
            {s.task === "released" && (
              <button onClick={() => navigate("demands")}>
                查看 Owner 验证队列
              </button>
            )}
            {role === "研发" && s.task === "idle" && !s.dispatchFailed && (
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={s.faultNext}
                  onChange={() => act({ type: "fault" })}
                />
                演示一次派发失败
              </label>
            )}
          </div>
          {!s.coordination && (
            <p className="muted">启动前需管理层批准方案、项目经理确认安排。</p>
          )}
          <Timeline state={s} engineering />
          {s.task === "idle" && (
            <div className="empty small">
              <GitBranch />
              <p>执行受理后，产物与验证回执会出现在这里。</p>
            </div>
          )}
        </Panel>
        <aside className="stack">
          <Panel title="产物与证据">
            <dl className="facts">
              <dt>业务需求</dt>
              <dd>REQ-024</dd>
              <dt>验收基线</dt>
              <dd>v1 · Owner 已确认</dd>
              <dt>环境</dt>
              <dd>preview（演示）</dd>
              <dt>使用身份</dt>
              <dd>business-test</dd>
              <dt>独立 Review</dt>
              <dd>{s.taskStep >= 2 ? "已通过" : "尚未执行"}</dd>
              <dt>现实验证</dt>
              <dd>
                {["ready", "released", "verified"].includes(s.task)
                  ? "已通过"
                  : s.task === "blocked"
                    ? "阻塞，不计通过"
                    : "待执行"}
              </dd>
              <dt>业务目标</dt>
              <dd>{s.actual}h / ≤2h</dd>
            </dl>
          </Panel>
          <div className="subtle-note">
            <ShieldCheck />
            <p>实现不等于验证通过。验证通过不等于业务目标达成。</p>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Reports({ state: s, role, open, act }: WorkspaceProps) {
  const r = s.report;
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">报告 / 事实确认与承诺</p>
          <h1>让汇报回归事实，让时间留给行动。</h1>
          <p className="subtitle">
            Agents 汇总已有证据，员工确认，PMO 核对，管理层确认。
          </p>
        </div>
        {role === "PMO" && (!r || r.finalized) && (
          <button
            className="primary"
            onClick={() => act({ type: "report-generate" })}
          >
            生成本轮周报草稿
          </button>
        )}
      </div>
      {!r ? (
        <Panel>
          <Empty
            title="等待 PMO 发起本轮汇总"
            body="不需要重复写一遍进度。草稿将直接引用目标、需求、执行回执的事实快照。"
          />
        </Panel>
      ) : (
        <div className="workspace-grid">
          <Panel
            title="订单协同 · 周报确认稿"
            caption={`${r.id} · 来源快照 v${r.sourceVersion} · ${new Date(r.created).toLocaleString("zh-CN")}`}
            action={
              <Badge tone={r.finalized ? "good" : "warn"}>
                {r.finalized
                  ? "管理层已确认"
                  : r.reconciled
                    ? "待管理确认"
                    : "待责任人确认"}
              </Badge>
            }
          >
            <div className="report-body">
              <p className="eyebrow">目标与进展</p>
              <h3>{r.snapshot}</h3>
              <div className="notice">
                这是生成时的快照，不随实时对象静默变化。补充事项随个人确认记录保留。
              </div>
              <h3>各角色确认与补充</h3>
              {REPORT_ROLES.map((x) => (
                <div className="confirmation-row" key={x}>
                  <span className="avatar small-avatar">
                    {PROFILES[x].initials}
                  </span>
                  <div>
                    <strong>{x}</strong>
                    <p>{r.supplements[x] || "尚未回复，不视为同意。"}</p>
                  </div>
                  <Badge
                    tone={r.confirmations.includes(x) ? "good" : "neutral"}
                  >
                    {r.confirmations.includes(x) ? "已确认" : "待确认"}
                  </Badge>
                </div>
              ))}
              <div className="inline">
                {REPORT_ROLES.includes(role) &&
                  !r.confirmations.includes(role) &&
                  !r.reconciled && (
                    <button
                      className="primary"
                      onClick={() => open("report-confirm")}
                    >
                      确认本人事项并补充
                    </button>
                  )}
                {role === "PMO" && !r.reconciled && (
                  <button
                    className="primary"
                    disabled={r.confirmations.length !== 4}
                    onClick={() => act({ type: "report-reconcile" })}
                  >
                    核对并提交管理层
                  </button>
                )}
                {role === "管理层" && r.reconciled && !r.finalized && (
                  <button
                    className="primary"
                    onClick={() => act({ type: "report-finalize" })}
                  >
                    确认并固化报告版本
                  </button>
                )}
              </div>
            </div>
          </Panel>
          <Panel title="本轮确认进度">
            <div className="big-counter">
              {r.confirmations.length}
              <span>/ 4</span>
            </div>
            <p>责任角色已回复</p>
            <div className="progress-track">
              <span style={{ width: `${r.confirmations.length * 25}%` }} />
            </div>
            <p className="muted">人员确认不是业务验收，也不替代发布批准。</p>
            <h3>后续行动</h3>
            <p>
              {nextAction(s).role}：{nextAction(s).title}
            </p>
          </Panel>
        </div>
      )}
      {s.reportHistory.length > 0 && (
        <Panel
          title="已归档的确认报告"
          caption="保留原快照与各角色补充，不被新一轮覆盖"
        >
          {s.reportHistory.map((h) => (
            <details className="report-history" key={h.id}>
              <summary>
                {h.id} · 快照 v{h.sourceVersion} · 管理层已确认
              </summary>
              <p>{h.snapshot}</p>
              {Object.entries(h.supplements).map(([role, text]) => (
                <p key={role}>
                  <strong>{role}：</strong>
                  {text}
                </p>
              ))}
            </details>
          ))}
        </Panel>
      )}
    </>
  );
}
export function Agents({ state: s, navigate }: WorkspaceProps) {
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">执行中心 / 人机协作</p>
          <h1>看得见执行，也看得见边界。</h1>
          <p className="subtitle">
            Agents 不是登录账号，而是围绕目标承担任务的执行者。
          </p>
        </div>
        <a
          className="button"
          href="https://enlightai.datastory.com.cn/"
          target="_blank"
          rel="noreferrer"
        >
          打开 EnlightAI <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="two-column">
        <Panel
          title="PMO Agents"
          caption="发现问题 · 草拟方案 · 跟踪承诺 · 汇总事实"
        >
          <Badge tone="good">本地事件驱动</Badge>
          <p>
            自动跟踪对象变化，协调后通知执行，业务验证后提炼经验候选。重大资源决定仍交给管理层。
          </p>
          <div className="agent-footer">
            <span>权限：只读发现 / 草拟 / 已确认结果回写</span>
            <button onClick={() => navigate("projects")}>查看项目</button>
          </div>
        </Panel>
        <Panel
          title="EOS Agents"
          caption="实现 · 独立 Review · 现实验证 · 回写证据"
        >
          <Badge tone={s.task === "blocked" ? "warn" : "brand"}>
            {taskLabel(s.task)}
          </Badge>
          <p>
            任务
            TASK-024。环境证据不足即停止；不擅自降低验收、不调用生产环境。EnlightAI
            当前仅提供入口，未做接口联调。
          </p>
          <div className="agent-footer">
            <span>权限：模拟预览环境执行</span>
            <button onClick={() => navigate("engineering")}>查看执行</button>
          </div>
        </Panel>
      </div>
      <Panel
        title="对象变化与审计轨迹"
        caption="包括决定、执行、人工接管与结果验证"
      >
        <Timeline state={s} />
      </Panel>
    </>
  );
}
export function Knowledge({ state: s, role, act, navigate }: WorkspaceProps) {
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">经验库 / 经验证的组织记忆</p>
          <h1>把一次解决，变成下一次的依据。</h1>
          <p className="subtitle">
            候选不是亮点，经验也不是无条件可复用的规则。
          </p>
        </div>
      </div>
      {s.task !== "verified" ? (
        <Panel>
          <Empty
            title="尚无已验证经验"
            body="完成 REQ-024 的业务结果验证后，PMO Agents 会形成经验候选；由 PMO 核实适用边界。"
          >
            <button onClick={() => navigate("demands")}>
              查看业务验证进度
            </button>
          </Empty>
        </Panel>
      ) : (
        <Panel
          title="KN-001 · 订单异常提醒闭环"
          caption="来自 REQ-024 / G-01 / TASK-024"
          action={
            <Badge tone={s.knowledgeVerified ? "good" : "warn"}>
              {s.knowledgeVerified ? "已核实" : "候选 · 待 PMO 核实"}
            </Badge>
          }
        >
          <div className="two-column">
            <div>
              <h3>从 3.5h 到 {s.actual}h</h3>
              <p>
                先解决接口依赖，再通过独立审核与权限验证，最后由 Owner
                核验业务样本。改善来源是本次完整协作，不单独归功于 Agent。
              </p>
              <button onClick={() => navigate("demands")}>查看结果证据</button>
            </div>
            <dl className="facts">
              <dt>适用范围</dt>
              <dd>同类订单提醒 / 权限隔离场景</dd>
              <dt>版本条件</dt>
              <dd>SYS-01 / Release-09.25</dd>
              <dt>维护人</dt>
              <dd>PMO</dd>
              <dt>有效期</dt>
              <dd>核实后 30 天，复用需复评</dd>
              <dt>限制</dt>
              <dd>仅演示样本，非客户实绩</dd>
            </dl>
          </div>
          {role === "PMO" && !s.knowledgeVerified && (
            <button
              className="primary"
              onClick={() => act({ type: "knowledge-verify" })}
            >
              核实证据与适用条件
            </button>
          )}
        </Panel>
      )}
    </>
  );
}
export function Timeline({
  state,
  object,
  engineering = false,
}: {
  state: State;
  object?: string;
  engineering?: boolean;
}) {
  const events = state.events
    .filter((e) =>
      object
        ? object === "REQ-024"
          ? [
              "REQ-024",
              "PRJ-001",
              "G-01",
              "DEC-007",
              "TASK-024",
              "Issue-048",
              "Release-09.25",
            ].includes(e.object)
          : e.object === object
        : engineering
          ? ["TASK-024", "Issue-048", "Release-09.25"].includes(e.object)
          : true,
    )
    .slice()
    .reverse();
  return (
    <ol className="timeline">
      {events.length === 0 && <li className="muted">暂无该对象的变化记录。</li>}
      {events.map((e) => (
        <li key={e.id}>
          <span className="timeline-dot" />
          <div className="timeline-meta">
            <strong>{e.actor}</strong>
            <span>
              {new Date(e.at).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}{" "}
              · {e.object}
            </span>
          </div>
          <h3>{e.title}</h3>
          <p>{e.detail}</p>
        </li>
      ))}
    </ol>
  );
}
