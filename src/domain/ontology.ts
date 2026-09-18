import { EOS_ACCEPTANCE, EOS_STEPS } from "./eos";
import { catalogEntities } from "./catalog";
import { nextAction, type Role, type State } from "./model";
import { getOperations, projectGap } from "./operations";
import { operationItems, type WorkItem } from "./workbench";
import { projectDomain } from "./project-domains";

export const ENTITY_TYPES = [
  "会议",
  "Issue",
  "Impl",
  "战略",
  "项目",
  "系统",
  "需求",
  "风险",
  "承诺",
  "版本",
  "员工",
  "报告",
  "经验",
  "资料",
  "组织",
  "里程碑",
  "供应商",
  "亮点",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
export interface Entity extends Omit<WorkItem, "kind" | "domain"> {
  domain: string;
  kind: EntityType;
  risk: string;
  summary: string;
  progress: string;
  links: string[];
  project?: string;
  system?: string;
  delivery?: (typeof import("./delivery").deliveryCases)[string];
}
export const DEFAULT_TABS: Record<Role, EntityType[]> = {
  管理层: ["战略", "项目", "系统"],
  PMO: ["项目", "会议"],
  项目经理: ["项目"],
  业务Owner: ["需求"],
  产品经理: ["系统", "需求"],
  研发: ["需求", "Issue", "系统"],
  系统管理员: [],
  项目成员: ["项目", "承诺"],
  系统负责人: ["系统"],
  测试: ["需求", "版本"],
  运维: ["系统", "版本"],
};
export function configuredTabs(role: Role, saved?: string[]): EntityType[] {
  if (role === "系统管理员") return [];
  const valid = saved?.filter((x): x is EntityType =>
    ENTITY_TYPES.includes(x as EntityType),
  );
  return valid?.length ? [...new Set(valid)] : DEFAULT_TABS[role];
}

/** Demo read scope, independent of display preferences. Not a production authorization service. */
export function visibleEntities(s: State, role: Role): Entity[] {
  if (role === "系统管理员") return [];
  if (s.catalogVersion === "v03") return catalogEntities(s, role);
  const o = getOperations(s);
  const portfolio = ["管理层", "PMO", "系统负责人"].includes(role);
  // Other demo identities are assigned to the order-collaboration project only.
  const createdProjects = new Set(
    s.events.filter((e) => e.title === "大脑辅助建项草稿").map((e) => e.object),
  );
  const projectIds = new Set(
    o.projects
      .filter(
        (p) => portfolio || p.id === "PRJ-001" || createdProjects.has(p.id),
      )
      .map((p) => p.id),
  );
  const projects = o.projects.filter((p) => projectIds.has(p.id));
  const systemIds = new Set(projects.map((p) => p.system));
  const next = nextAction(s);
  const rows: Entity[] = [];
  const push = (v: Partial<Entity> & Pick<Entity, "id" | "title" | "kind">) =>
    rows.push({
      domain: "未分类",
      goal: "待确认",
      actual: "待采集",
      gap: "待判断",
      status: "待确认",
      attention: false,
      next: "补齐依据并确认下一步",
      route: "home",
      risk: "暂无已登记风险，仍需持续核实",
      summary: "",
      progress: "暂无量化进度，不以目标达成率替代交付进度",
      links: [],
      ...v,
    });
  for (const p of projects) {
    const demands = s.demands.filter((d) => d.projectId === p.id);
    const risks = o.risks.filter(
      (r) => r.project === p.id && r.status !== "已关闭",
    );
    const done = demands.filter((d) => d.stage === "已关闭").length;
    push({
      id: p.id,
      title: p.title,
      kind: "项目",
      domain: p.domain as Entity["domain"],
      goal: `${p.goal} ${p.direction}${p.target}${p.unit}`,
      actual: `${p.id === "PRJ-001" ? s.actual : (p.actual ?? "待采集")}${p.actual === null ? "" : p.unit}`,
      gap: projectGap(p, s),
      status: p.status,
      attention: risks.length > 0 || !projectGap(p, s).includes("达标"),
      risk:
        risks.map((r) => r.title).join("；") ||
        (p.actual === null
          ? "缺少实际值，无法判断目标偏差"
          : "暂无已登记风险，待持续核实"),
      next:
        p.id === "PRJ-001"
          ? `${next.role} · ${next.title}`
          : p.reassess || "项目经理 · 核对目标与交付证据",
      summary: p.scope,
      progress: demands.length
        ? `${done} / ${demands.length} 项需求已验收`
        : "尚未拆解需求",
      system: p.system,
      links: [
        p.system,
        p.strategy,
        ...demands.map((d) => d.id),
        ...o.risks.filter((r) => r.project === p.id).map((r) => r.id),
        ...o.commitments.filter((c) => c.project === p.id).map((c) => c.id),
      ],
    });
  }
  for (const st of o.strategies) {
    const linked = projects.filter(
      (p) => p.strategy === st.id || st.projects.includes(p.id),
    );
    if (!linked.length) continue;
    push({
      id: st.id,
      title: st.title,
      kind: "战略",
      goal: st.goal,
      summary: "演示战略关联，用于确认交互；不是客户已确认的战略。",
      actual: `${linked.length} 个可见项目支撑`,
      gap: "需按项目验证业务贡献",
      status: "持续跟踪",
      risk: `${rows.filter((r) => r.kind === "项目" && linked.some((p) => p.id === r.id) && r.attention).length} 个关联项目需关注`,
      attention: true,
      next: "管理层 · 核对贡献与方向，形成改善需求",
      links: linked.map((p) => p.id),
    });
  }
  for (const sys of o.systems.filter((x) => systemIds.has(x.id)))
    push({
      id: sys.id,
      title: sys.title,
      kind: "系统",
      goal: `可用性 ≥${sys.goal}%`,
      actual: sys.actual === null ? "待采集" : `${sys.actual}%`,
      gap:
        sys.actual === null
          ? "待判断"
          : `差 ${Math.max(0, sys.goal - sys.actual).toFixed(1)} 个百分点`,
      status: sys.status,
      attention: sys.actual === null || sys.actual < sys.goal,
      summary: `责任角色：${sys.owner}；${sys.evidence || "运行证据待补充"}`,
      risk:
        o.risks
          .filter(
            (r) =>
              r.system === sys.id &&
              projectIds.has(r.project) &&
              r.status !== "已关闭",
          )
          .map((r) => r.title)
          .join("；") || "运行状态需持续验证",
      next: `${sys.owner} · 核实运行指标与版本依赖`,
      links: projects.filter((p) => p.system === sys.id).map((p) => p.id),
    });
  for (const d of s.demands.filter((d) => projectIds.has(d.projectId))) {
    const p = projects.find((p) => p.id === d.projectId);
    const release = o.releases.find((r) => r.demands.includes(d.id));
    push({
      id: d.id,
      title: d.title,
      kind: "需求",
      project: d.projectId,
      system: p?.system,
      goal:
        d.id === "REQ-024"
          ? `异常响应 ≤${s.goal}小时`
          : d.baseline || "待确认业务目标与验收标准",
      actual: d.stage,
      gap: d.baselineConfirmed ? "按验收条件验证业务效果" : "验收基线待确认",
      status: d.stage,
      attention: !d.baselineConfirmed || d.stage !== "已关闭",
      summary: `${d.problem} 期望：${d.requested || "待定"}；承诺：${d.committed || "待定"}；预测：${d.forecast || "待评估"}。`,
      progress: `当前阶段：${d.stage}`,
      risk: !d.baselineConfirmed
        ? "验收基线未确认"
        : o.risks
            .filter((r) => r.project === d.projectId && r.status !== "已关闭")
            .map((r) => r.title)
            .join("；") || "关注依赖与承诺日期",
      next:
        d.id === "REQ-024"
          ? `${next.role} · ${next.title}`
          : `${d.owner} · 确认需求与验收证据`,
      links: [
        d.projectId,
        p?.system || "",
        release?.id || "",
        ...o.risks.filter((r) => r.project === d.projectId).map((r) => r.id),
      ],
    });
  }
  for (const i of operationItems(s, role)) {
    if (["项目", "系统", "需求"].includes(i.kind)) continue;
    if (rows.some((r) => r.id === i.id)) continue;
    const risk = o.risks.find((x) => x.id === i.id),
      commit = o.commitments.find((x) => x.id === i.id),
      rel = o.releases.find((x) => x.id === i.id),
      source = o.sources.find((x) => x.id === i.id);
    const project = risk?.project || commit?.project;
    if (project && !projectIds.has(project)) continue;
    if (
      rel &&
      (!systemIds.has(rel.system) ||
        rel.demands.some((id) => !rows.some((r) => r.id === id)))
    )
      continue;
    if (
      source &&
      (source.status === "已撤回" ||
        (source.visibility === "个人" && source.owner !== role) ||
        !rows.some((r) => r.id === source.object))
    )
      continue;
    // Portfolio reports and reusable lessons may include cross-project text.
    if (["报告", "经验"].includes(i.kind) && !portfolio) continue;
    push({
      ...i,
      kind: i.kind,
      project,
      system: risk?.system || rel?.system,
      summary: i.goal,
      risk: i.attention ? i.gap : "暂无待处理风险",
      links: [
        project || "",
        risk?.system || rel?.system || "",
        source?.object || "",
        ...(rel?.demands || []),
      ],
    });
  }
  if (
    ["研发", "产品经理", "测试", "系统负责人"].includes(role) &&
    rows.some((r) => r.id === "REQ-024")
  ) {
    const run = s.eosRuns?.find((r) => r.issueId === "ISS-024");
    const status = !run
      ? "待实施"
      : run.status === "stopped"
        ? "已停止"
        : run.status === "completed"
          ? "待人工确认"
          : EOS_STEPS[run.step].title;
    push({
      id: "ISS-024",
      title: "订单异常提醒 · 幂等与失败重试",
      kind: "Issue",
      domain: "研发",
      project: "PRJ-001",
      system: "SYS-01",
      goal: EOS_ACCEPTANCE,
      actual: status,
      gap:
        run?.status === "completed"
          ? "模拟验证通过，待人工核对；未发布"
          : "待形成独立审查与验证证据",
      status,
      attention: true,
      summary:
        "由 REQ-024 拆解的工程工作项。范围：提醒处理器、幂等保护与重试；不修改订单业务规则。采用演示验收快照，不代替业务需求确认。",
      progress: run
        ? `${run.step + 1} / ${EOS_STEPS.length} 个执行阶段`
        : "尚未开始",
      risk: "重复事件可能触发重复通知；并发重试与权限隔离需独立验证。",
      next:
        run?.status === "completed"
          ? "研发 · 核对交付包后走发布门禁"
          : "研发 · 对话输入“开始EOS实施”启动模拟",
      links: ["REQ-024", "SYS-01", "IMPL-024"],
    });
    push({
      id: "IMPL-024",
      title: "异常提醒处理器 · 实现包",
      kind: "Impl",
      domain: "研发",
      project: "PRJ-001",
      goal: EOS_ACCEPTANCE,
      actual:
        !run || run.step < 1
          ? "尚未生成代码"
          : run.step < 3
            ? "r1 · 待审查/修复"
            : "r2 · 幂等修复",
      gap:
        run?.status === "completed"
          ? "待人工核对与发布授权"
          : "独立 Review 与行为验证尚未完成",
      status,
      attention: true,
      summary:
        "实现包关联 Issue、方案、代码差异、测试、Review 与回滚说明。当前仅为本地模拟产物，不对应真实仓库 MR。",
      progress: run ? EOS_STEPS[run.step].title : "待 EOS Agent 执行",
      risk: "不能用研发自测代替独立 Review；不能把环境失败写成产品通过。",
      next: "从关联 Issue 查看执行详情与各阶段产物",
      links: ["ISS-024"],
    });
  }
  const people: Role[] = [
    "项目经理",
    "业务Owner",
    "产品经理",
    "研发",
    "项目成员",
    "系统负责人",
    "测试",
    "运维",
  ];
  for (const who of people)
    push({
      id: `EMP-${who}`,
      title: `${who}（演示责任角色）`,
      kind: "员工",
      goal: "完成职责范围内的交付与验收",
      status: "参与中",
      summary: "按角色模拟责任关系，尚未连接真实员工目录。",
      next: "核对本人承诺与跨角色依赖",
      links: projectIds.has("PRJ-001") ? ["PRJ-001"] : [],
    });
  // Materialize both directions, then remove any link outside this role's visible set.
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows)
    r.links = [...new Set(r.links.filter((id) => ids.has(id) && id !== r.id))];
  for (const r of rows)
    for (const id of [...r.links]) {
      const target = rows.find((x) => x.id === id)!;
      if (!target.links.includes(r.id)) target.links.push(r.id);
    }
  return rows.map((row) => ({ ...row, domain: projectDomain(row.domain) }));
}
