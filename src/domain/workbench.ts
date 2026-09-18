import {
  nextAction,
  taskLabel,
  type Role,
  type Route,
  type State,
} from "./model";
import { getOperations, projectGap } from "./operations";
import { PROJECT_DOMAINS, projectDomain } from "./project-domains";

export const DOMAINS = [...PROJECT_DOMAINS, "未分类"] as const;
// Legacy seeds remain readable; public views use the current taxonomy.
export type Domain =
  | (typeof DOMAINS)[number]
  | "研发"
  | "产品"
  | "营销"
  | "服务"
  | "采购"
  | "运营";
export interface WorkItem {
  id: string;
  title: string;
  domain: Domain;
  kind:
    | "Issue"
    | "Impl"
    | "战略"
    | "员工"
    | "项目"
    | "系统"
    | "需求"
    | "承诺"
    | "风险"
    | "版本"
    | "报告"
    | "经验"
    | "资料";
  goal: string;
  actual: string;
  gap: string;
  status: string;
  attention: boolean;
  next: string;
  route: Route;
  readonly?: boolean;
}
export const TOOLS: { route: Route; title: string; description: string }[] = [
  {
    route: "projects",
    title: "项目与目标",
    description: "资源、承诺与业务结果",
  },
  { route: "demands", title: "需求", description: "从提出到业务验证" },
  {
    route: "engineering",
    title: "系统与版本",
    description: "实现、审查与验证",
  },
  { route: "reports", title: "报告", description: "多人确认与管理核对" },
  { route: "knowledge", title: "经验库", description: "核实经验与适用条件" },
  { route: "agents", title: "执行中心", description: "PMO / EOS 执行回执" },
];
export function workItems(s: State, role: Role): WorkItem[] {
  return legacyWorkItems(s, role).map((item) => ({
    ...item,
    domain: projectDomain(item.domain) as Domain,
  }));
}
function legacyWorkItems(s: State, role: Role): WorkItem[] {
  if (role === "系统管理员") return [];
  const n = nextAction(s);
  const gap =
    s.actual > s.goal
      ? `超出 ${(s.actual - s.goal).toFixed(1)}h`
      : "本次样本达标";
  const projects: WorkItem[] = [
    {
      id: "PRJ-001",
      title: "订单协同优化",
      domain: "服务",
      kind: "项目",
      goal: `异常响应 ≤${s.goal}h`,
      actual: `${s.actual}h`,
      gap,
      status: s.task === "verified" ? "已验证" : "待推进",
      attention: s.actual > s.goal,
      next: `${n.role} · ${n.title}`,
      route: "projects",
    },
    {
      id: "PRJ-002",
      title: "质量追溯试点",
      domain: "研发",
      kind: "项目",
      goal: "追溯耗时 ≤30min",
      actual: "45min",
      gap: "超出 15min",
      status: "偏离",
      attention: true,
      next: "业务核实口径与阻塞",
      route: "projects",
      readonly: true,
    },
    {
      id: "PRJ-003",
      title: "周报协同试点",
      domain: "集团治理",
      kind: "项目",
      goal: "汇总耗时 ≤1h",
      actual: "0.8h",
      gap: "本次样本达标",
      status: "正常",
      attention: false,
      next: "PMO · 持续观察收益",
      route: "projects",
      readonly: true,
    },
    {
      id: "PRJ-004",
      title: "数据口径治理",
      domain: "未分类",
      kind: "项目",
      goal: "指标口径待确认",
      actual: "未采集",
      gap: "基线缺失",
      status: "待核实",
      attention: true,
      next: "PMO · 确认领域与基线",
      route: "projects",
      readonly: true,
    },
    {
      id: "PRJ-005",
      title: "产品需求标准化",
      domain: "产品",
      kind: "项目",
      goal: "验收条件完整率 ≥95%",
      actual: "82%",
      gap: "差 13 个百分点",
      status: "待推进",
      attention: true,
      next: "产品 · 补充例外验收条件",
      route: "projects",
      readonly: true,
    },
    {
      id: "PRJ-006",
      title: "营销活动复盘",
      domain: "营销",
      kind: "项目",
      goal: "复盘周期 ≤3 天",
      actual: "5 天",
      gap: "超出 2 天",
      status: "偏离",
      attention: true,
      next: "营销 · 补齐效果归因",
      route: "projects",
      readonly: true,
    },
    {
      id: "PRJ-007",
      title: "采购需求协同",
      domain: "采购",
      kind: "项目",
      goal: "需求响应 ≤2 天",
      actual: "未采集",
      gap: "缺少可比数据",
      status: "待核实",
      attention: true,
      next: "采购 · 建立响应基线",
      route: "projects",
      readonly: true,
    },
  ];
  const system: WorkItem = {
    id: "SYS-01",
    title: "订单平台",
    domain: "研发",
    kind: "系统",
    goal: "按冻结基线完成验证并交付",
    actual: taskLabel(s.task),
    gap:
      s.task === "verified"
        ? "本次业务验证已通过"
        : s.task === "released"
          ? "尚缺业务结果验证"
          : "实现、验证与交付尚未闭环",
    status: taskLabel(s.task),
    attention: s.task !== "verified",
    next: `${n.role} · ${n.title}`,
    route: "engineering",
  };
  const demands: WorkItem[] = s.demands.map((d) => ({
    id: d.id,
    title: d.title,
    domain: "产品",
    kind: "需求",
    goal:
      d.id === "REQ-024"
        ? `异常响应 ≤${s.goal}h`
        : "范围、验收条件与交付承诺明确",
    actual: d.id === "REQ-024" ? `${s.actual}h · ${d.stage}` : d.stage,
    gap:
      d.id === "REQ-024"
        ? gap
        : d.stage === "已关闭"
          ? "业务Owner已确认解决"
          : !d.baselineConfirmed
            ? "验收基线未确认"
            : !d.committed
              ? "交付日期未确认"
              : "待工程落地；业务效果待验证",
    status: d.stage,
    attention: d.stage !== "已关闭",
    next:
      d.id === "REQ-024"
        ? `${n.role} · ${n.title}`
        : !d.baselineConfirmed
          ? "产品与 Owner · 对齐验收条件"
          : !d.committed
            ? "项目经理 · 确认容量与排期"
            : "研发 · 待开发队列",
    route: "demands",
  }));
  const o = getOperations(s);
  const liveProjects: WorkItem[] = o.projects.map((p) =>
    p.id === "PRJ-001"
      ? projects[0]
      : {
          id: p.id,
          title: p.title,
          domain: p.domain as Domain,
          kind: "项目",
          goal: `${p.goal} ${p.direction}${p.target}${p.unit}`,
          actual: p.actual === null ? "未采集" : `${p.actual}${p.unit}`,
          gap: projectGap(p, s),
          status: p.status,
          attention: projectGap(p, s) !== "本次样本达标",
          next: `项目经理 · ${p.status} · ${p.deadline}`,
          route: "operations",
        },
  );
  const systems: WorkItem[] = o.systems.map((x) => ({
    id: x.id,
    title: x.title,
    domain: "研发",
    kind: "系统",
    goal: `可用率 ≥${x.goal}%`,
    actual: x.actual === null ? "待核实" : `${x.actual}%`,
    gap:
      x.actual === null
        ? "缺运行证据"
        : x.actual < x.goal
          ? `差 ${(x.goal - x.actual).toFixed(2)}%`
          : "本次样本达标",
    status: x.status,
    attention: x.status !== "正常",
    next: `系统负责人 · ${x.evidence}`,
    route: "operations",
  }));
  if (role === "项目成员")
    return operationItems(s, role).filter((i) => i.kind === "承诺");
  if (role === "测试")
    return [
      ...operationItems(s, role).filter((i) => i.kind === "版本"),
      ...demands,
    ];
  if (role === "管理层" || role === "PMO")
    return [...liveProjects, system, ...demands];
  if (role === "系统负责人" || role === "运维") return [...systems, ...demands];
  if (role === "项目经理") return [...liveProjects, system, ...demands];
  if (role === "研发") return [system, ...demands];
  return demands;
}
export function operationItems(s: State, role: Role): WorkItem[] {
  if (role === "系统管理员") return [];
  const o = getOperations(s),
    item = (
      id: string,
      title: string,
      kind: WorkItem["kind"],
      goal: string,
      actual: string,
      next: string,
    ): WorkItem => ({
      id,
      title,
      kind,
      domain: "运营",
      goal,
      actual,
      gap: actual,
      status: actual,
      attention: ![
        "已接受",
        "已关闭",
        "已验证",
        "已确认",
        "有效",
        "正常",
        "已核实",
        "已移交",
      ].includes(actual),
      next,
      route: "operations",
    });
  return [
    ...o.projects.map((p) =>
      item(
        p.id,
        p.title,
        "项目",
        `${p.goal} ${p.direction}${p.target}${p.unit}`,
        `${p.status} · ${projectGap(p, s)}`,
        `项目经理 · ${p.deadline}`,
      ),
    ),
    ...o.systems.map((x) =>
      item(
        x.id,
        x.title,
        "系统",
        `可用率 ≥${x.goal}%`,
        `${x.actual ?? "待核实"}%`,
        x.owner,
      ),
    ),
    ...o.commitments
      .filter((a) => role !== "项目成员" || a.owner === role)
      .map((a) =>
        item(
          a.id,
          a.title,
          "承诺",
          a.criteria,
          a.status,
          `${a.owner} · ${a.due}`,
        ),
      ),
    ...o.risks.map((r) =>
      item(
        r.id,
        r.title,
        "风险",
        r.criteria,
        r.status,
        `${r.owner} · ${r.due}`,
      ),
    ),
    ...o.releases.map((r) =>
      item(
        r.id,
        r.title,
        "版本",
        r.scope,
        r.status,
        r.pending
          ? "管理层、Owner、系统负责人确认变更"
          : r.status === "待独立审核"
            ? "测试 · 独立审核"
            : r.status === "待发布"
              ? "运维 · 发布"
              : r.status === "已发布"
                ? "业务Owner · 验证"
                : "版本详情查看下一责任",
      ),
    ),
    ...o.reports.map((r) =>
      item(
        r.id,
        `${r.scene} ${r.period}`,
        "报告",
        "本人确认、专业核对、管理确认",
        r.status,
        r.required.filter((x) => !r.responses[x]).join("、") || "管理确认",
      ),
    ),
    ...o.lessons.map((l) =>
      item(
        l.id,
        l.title,
        "经验",
        l.conditions,
        l.status,
        `已复用 ${l.uses.length} 项目`,
      ),
    ),
    ...o.sources
      .filter(
        (d) =>
          d.status !== "已撤回" &&
          (d.owner === role || d.visibility === "项目"),
      )
      .map((d) =>
        item(
          d.id,
          d.title,
          "资料",
          d.object,
          d.status,
          `v${d.version} · ${d.owner}`,
        ),
      ),
  ];
}
export interface WorkFilter {
  query: string;
  domain: string;
  kind: string;
  attention: boolean;
}
export function filterItems(items: WorkItem[], f: WorkFilter) {
  const q = f.query.trim().toLowerCase();
  return items.filter(
    (i) =>
      (f.domain === "全部" ||
        projectDomain(i.domain) === projectDomain(f.domain)) &&
      (f.kind === "全部" || i.kind === f.kind) &&
      (!f.attention || i.attention) &&
      `${i.id} ${i.title} ${i.goal} ${i.next}`.toLowerCase().includes(q),
  );
}
