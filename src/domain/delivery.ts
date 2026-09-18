import type { Actor, Role, State } from "./model";
import type { Entity } from "./ontology";

/** Synthetic delivery facts, separate from business KPI snapshots in V0.3. */
export const deliveryCases: Record<
  string,
  {
    stage: string;
    done: number;
    total: number;
    basis: string;
    participants: string;
    quality: string;
    riskType: string;
    risk: string;
    next: string;
  }
> = {
  P09: {
    stage: "需求确认",
    done: 3,
    total: 10,
    basis: "需求准备清单已确认项",
    participants: "国际业务部、产品经理、项目经理、研发工程师",
    quality: "未进入测试，不判定质量通过",
    riskType: "范围 / 阶段风险",
    risk: "海外样本国家与语言口径尚未签收，内容本地化可能反复返工；不是已发现的软件缺陷。",
    next: "产品经理确认国家、语言与验收样本，项目经理再批准实施计划",
  },
  P05: {
    stage: "开发",
    done: 7,
    total: 12,
    basis: "已验收的工作包 / 基线工作包",
    participants: "采购供应链、质量部门、项目经理、研发工程师、测试工程师",
    quality: "接口契约待复核，尚无完整测试结论",
    riskType: "资源 / 进度风险",
    risk: "批次接口联调窗口只有两天，供应商字段样本未齐，可能影响后续验证；78% 映射覆盖率是业务指标，不是代码完成度。",
    next: "确认批次映射验收与两人日联调资源，先修复空批次处理",
  },
  P03: {
    stage: "测试",
    done: 9,
    total: 12,
    basis: "已验收的工作包 / 基线工作包",
    participants: "数字经营部、营销部门、项目经理、研发工程师、测试工程师",
    quality: "发布阻断：仍有 1 个 P1、1 个 P2 待复测",
    riskType: "质量风险",
    risk: "同一配额被并发审批时可能重复生效；P1 修复待复测，不能因用例通过率提高就放行发布。",
    next: "研发提交并发审批证据，测试独立复测；项目经理审核后再评估发布门禁",
  },
  P02: {
    stage: "运维改进",
    done: 4,
    total: 8,
    basis: "本轮运行问题修复包已验收项",
    participants: "数字经营部、信息中心、项目经理、研发工程师、测试工程师",
    quality: "运行质量缺陷：评论回写漏单；业务结果待复核",
    riskType: "运行 / 质量风险",
    risk: "23 条事件仅形成 21 条待办；处置分派率可信度受影响。必须先修复回写一致性，再复核消费者问题是否按时处置。",
    next: "在评论待办漏单 Issue 内逐步实施；保留 Review 阻断，人工审核后验证并转测试",
  },
};

export interface MeetingRecord {
  id: string;
  project: string;
  title: string;
  time: string;
  participants: string;
  progress: string;
  viewpoints: string[];
  decisions: string;
  actions: string[];
}
export const meetings: MeetingRecord[] = [
  {
    id: "MT01",
    project: "P02",
    title: "评论漏单归因与修复评审",
    time: "2026-09-18 09:30–10:15",
    participants:
      "项目经理、信息中心系统负责人、研发工程师、测试工程师、业务Owner",
    progress:
      "运行改进包完成 4/8 项；23 条回写事件仅生成 21 条待办，分派率 73% 尚待复核。",
    viewpoints: [
      "业务Owner：先补查消费者待办，不接受仅以技术单测通过说明问题已解决。",
      "研发工程师：先核对后台任务是否真正调用幂等处理，并建立服务端期望回执与读回校验。",
      "测试工程师：冻结重复回写、失败重试、权限隔离验收；保留初版失败证据，独立重建反例。",
      "项目经理：人工审核决定是否进入验证；生产发布和业务验收独立授权。",
    ],
    decisions:
      "保留原范围与验收；建议先核实漏单再修复，行动须人工确认后才分派。",
    actions: [
      "补齐 23 条事件与待办对照表｜研发工程师｜09-19 18:00",
      "审核消费者补查结果与责任范围｜项目经理｜09-20 12:00",
    ],
  },
  {
    id: "MT02",
    project: "P03",
    title: "渠道配额测试收敛与发布门禁会",
    time: "2026-09-18 14:00–14:45",
    participants: "营销Owner、项目经理、测试工程师、研发工程师",
    progress:
      "工作包完成 9/12；缺陷由 6 项降至 2 项，仍有并发审批 P1 未复测，不满足发布条件。",
    viewpoints: [
      "测试工程师：通过率 93.3% 不代表质量收敛；重点看剩余严重缺陷、重开率及关键流程覆盖。",
      "研发工程师：并发审批修复已提交候选版，需使用两个独立账号重放，而非只检查接口返回成功。",
      "营销Owner：异常配额说明要能解释决策依据；人工确认不能被自动推荐绕过。",
      "项目经理：维持发布阻断，不把窗口紧张当作豁免 P1 的理由。",
    ],
    decisions:
      "批准补充并发与权限反例的建议待人工分派；修复复测通过前不提请生产发布。",
    actions: [
      "补齐并发审批与权限隔离回归证据｜研发工程师｜09-19 16:00",
      "独立复测 P1 与重开缺陷｜测试工程师｜09-20 16:00",
    ],
  },
  {
    id: "MT03",
    project: "P05",
    title: "原料批次接口联调计划会",
    time: "2026-09-17 15:00–15:40",
    participants: "采购负责人、质量负责人、项目经理、研发工程师",
    progress:
      "工作包完成 7/12；开发中的批次映射覆盖率 78%，接口样本与联调资源是当前约束。",
    viewpoints: [
      "采购负责人：补齐供应商批次与生产批次的双向对照，空批次不能静默跳过。",
      "质量负责人：必须区分数据完整性与产品质量结论，缺字段只能判待补证。",
      "研发工程师：建议两人日联调，冻结空批次拒绝、重复导入幂等、跨供应商隔离三个验收条件。",
      "项目经理：先确认资源与截止日，再加入工程执行队列。",
    ],
    decisions:
      "建议开展批次映射边界修复；资源和验收待人工批准，不自动调整基线。",
    actions: [
      "提交批次边界样本与接口契约｜研发工程师｜09-19 18:00",
      "批准联调资源与实施计划｜项目经理｜09-19 10:00",
    ],
  },
  {
    id: "MT04",
    project: "P09",
    title: "海外洞察需求与样本口径澄清会",
    time: "2026-09-16 10:00–11:00",
    participants: "国际业务负责人、产品经理、项目经理、研发工程师",
    progress: "准备清单完成 3/10；国家、语言与引用授权待签收，暂不进入开发。",
    viewpoints: [
      "国际业务负责人：首批只覆盖泰国与越南；未经许可不得把原始用户资料进入内容生成。",
      "产品经理：每条洞察保留国家、语言、样本来源和授权状态，缺项禁止通过。",
      "研发工程师：先实现样本字段校验，不在本轮加入自动投放或自动发布。",
      "项目经理：验收冻结后再确认一名研发、两人日计划；需求不清不能标为软件质量缺陷。",
    ],
    decisions: "收敛为海外洞察样本校验需求，等待需求确认与计划审核。",
    actions: [
      "确认国家语言样本与验收边界｜项目经理｜09-19 12:00",
      "完成授权字段校验方案｜研发工程师｜09-21 18:00",
    ],
  },
  {
    id: "MT05",
    project: "P02",
    title: "评论问题运行复盘与补查会",
    time: "2026-09-16 16:00–16:30",
    participants: "业务Owner、项目经理、系统负责人",
    progress: "识别 2 条缺失待办，启动补查；尚未定位最终根因。",
    viewpoints: [
      "业务Owner：先确认是否有消费者问题超期，补查与技术修复并行。",
      "系统负责人：保留原始日志，不删除重复事件掩盖问题。",
      "项目经理：分派率重新核实前，不宣告目标达成。",
    ],
    decisions: "登记运行风险并安排后续归因评审，缺陷不自动关闭。",
    actions: ["核对缺失事件的业务处置回执｜项目经理｜09-18 12:00"],
  },
];

export const bugs = [
  {
    id: "BUG01",
    title: "并发配额审批重复生效",
    severity: "P1",
    status: "修复待复测",
    owner: "研发工程师",
    version: "配额候选版 rc3",
    retest: "两个审批账号并发提交；必须只产生一次生效记录",
    issue: "I03",
  },
  {
    id: "BUG02",
    title: "异常配额说明缺少来源",
    severity: "P2",
    status: "重开待复测",
    owner: "研发工程师",
    version: "配额候选版 rc3",
    retest: "重新打开历史申请，来源与人工确认意见均须保留",
    issue: "I04",
  },
  {
    id: "BUG03",
    title: "受限账号看到其他区域配额",
    severity: "P1",
    status: "已关闭",
    owner: "测试工程师",
    version: "配额候选版 rc2",
    retest: "09-17 独立账号越权反例通过，保留请求日志",
    issue: "I05",
  },
  {
    id: "BUG04",
    title: "配额小数舍入不一致",
    severity: "P2",
    status: "已关闭",
    owner: "测试工程师",
    version: "配额候选版 rc2",
    retest: "边界值 0.005 / 99.995 复测通过",
    issue: "I06",
  },
  {
    id: "BUG05",
    title: "确认意见空白仍能提交",
    severity: "P2",
    status: "已关闭",
    owner: "测试工程师",
    version: "配额候选版 rc2",
    retest: "空白、空格与超长意见反例通过",
    issue: "I07",
  },
  {
    id: "BUG06",
    title: "审批列表刷新丢失筛选",
    severity: "P3",
    status: "已关闭",
    owner: "测试工程师",
    version: "配额候选版 rc2",
    retest: "刷新与浏览器返回路径复测通过",
    issue: "I08",
  },
];
export const qualitySnapshots = [
  {
    date: "09-16",
    opened: 6,
    closed: 0,
    reopened: 0,
    remaining: 6,
    p1: 2,
    passed: 24,
    total: 30,
  },
  {
    date: "09-17",
    opened: 0,
    closed: 5,
    reopened: 0,
    remaining: 1,
    p1: 1,
    passed: 28,
    total: 30,
  },
  {
    date: "09-18",
    opened: 0,
    closed: 0,
    reopened: 1,
    remaining: 2,
    p1: 1,
    passed: 28,
    total: 30,
  },
];

export interface DeliveryAction {
  id: string;
  project: string;
  title: string;
  original: string;
  proposal: string;
  owner: Role;
  due: string;
  deliverable: string;
  status: "待审核" | "已退回" | "已分派" | "处理中" | "待验收" | "已完成";
  evidence: string;
  history: { at: string; actor: Actor; action: string; detail: string }[];
}
const actionSeeds: DeliveryAction[] = [
  [
    "ACT01",
    "P02",
    "核实评论漏单并补齐回执",
    "对照 23 条事件与待办，标记缺失、重复和超期项，保留原始日志。",
    "事件—待办对照表、消费者补查说明、失败重试日志",
  ],
  [
    "ACT02",
    "P03",
    "补齐配额并发审批复测证据",
    "重建并发审批与历史说明丢失反例；P1 未关闭前保持发布阻断。",
    "并发审批录像、请求日志、候选版本与独立复测报告",
  ],
  [
    "ACT03",
    "P05",
    "完成批次映射边界联调",
    "核对空批次、重复导入与供应商隔离；先提交契约样本再调整实现。",
    "接口契约、异常批次样本、联调回执",
  ],
  [
    "ACT04",
    "P09",
    "确认海外样本与验收范围",
    "确认泰国与越南样本国家、语言、授权字段；不纳入自动投放。",
    "签收后的需求范围、样本清单与验收用例",
  ],
].map(([id, project, title, original, deliverable]) => ({
  id,
  project,
  title,
  original,
  proposal: original,
  owner: id === "ACT04" ? "项目经理" : "研发",
  due: "2026-09-21",
  deliverable,
  status: "待审核",
  evidence: "",
  history: [],
}));

export interface DeliveryPlan {
  demand: string;
  project: string;
  system: string;
  issue: string;
  title: string;
  acceptance: string;
  status: "待确认" | "待计划" | "已入队";
  resource: string;
  due: string;
  confirmedBy?: Actor;
  plannedBy?: Actor;
}
export const planSeeds: DeliveryPlan[] = [
  {
    demand: "D01",
    project: "P02",
    system: "X02",
    issue: "I01",
    title: "评论待办漏单修复",
    acceptance:
      "重复回写不漏单；23 条样本回放无遗漏；失败重试后待办一致；受限评论权限隔离；保留并发与乱序反例。",
    status: "已入队",
    resource: "研发工程师 2 人日、独立测试 1 人日",
    due: "2026-09-21",
    confirmedBy: "业务Owner",
    plannedBy: "项目经理",
  },
  {
    demand: "D-DEMO-BATCH",
    project: "P05",
    system: "X07",
    issue: "I-BATCH",
    title: "批次映射边界校验",
    acceptance:
      "空批次拒绝且提示原因；重复导入只产生一条映射；跨供应商记录不可见；异常可追溯到原始样本。",
    status: "待确认",
    resource: "研发工程师 2 人日、测试工程师 1 人日",
    due: "2026-09-22",
  },
  {
    demand: "D-DEMO-SAMPLE",
    project: "P09",
    system: "X10",
    issue: "I-SAMPLE",
    title: "海外洞察样本授权校验",
    acceptance:
      "国家、语言、来源和授权状态必须齐全；无授权样本不得进入总结；泰国与越南各 10 条反例可复现。",
    status: "待确认",
    resource: "研发工程师 2 人日、产品经理半日签收",
    due: "2026-09-23",
  },
  {
    demand: "D05",
    project: "P03",
    system: "X04",
    issue: "I03",
    title: "并发配额审批重复生效修复",
    acceptance:
      "两个审批账号并发提交同一申请，只产生一次配额生效及审计记录；失败重试不重复扣减；越权请求拒绝；保留历史审批意见和精确读回证据。",
    status: "已入队",
    resource: "研发工程师 1 人日、独立测试 1 人日（演示预设）",
    due: "2026-09-21",
    confirmedBy: "产品经理",
    plannedBy: "项目经理",
  },
];
export const actionsFor = (s: State) =>
  actionSeeds.map(
    (a) => s.deliveryActions?.find((x) => x.id === a.id) || structuredClone(a),
  );
export const plansFor = (s: State) =>
  planSeeds.map(
    (p) =>
      s.deliveryPlans?.find((x) => x.demand === p.demand) || structuredClone(p),
  );
export const canReviewDelivery = (actor: Actor) =>
  ["管理层", "项目经理", "PMO"].includes(actor);
export type DeliveryCommand = {
  type: "delivery";
  id: string;
  action:
    | "approve"
    | "reject"
    | "resubmit"
    | "start"
    | "submit"
    | "accept"
    | "return"
    | "confirm-demand"
    | "queue";
  proposal?: string;
  owner?: Role;
  due?: string;
  deliverable?: string;
  evidence?: string;
  reason?: string;
  resource?: string;
};
export function applyDelivery(
  s: State,
  actor: Actor,
  c: DeliveryCommand,
  at: string,
) {
  if (s.catalogVersion !== "v03") throw new Error("请使用 V0.3 演示数据。");
  if (c.action === "confirm-demand" || c.action === "queue") {
    const plan = plansFor(s).find((p) => p.demand === c.id);
    if (!plan) throw new Error("需求计划不可用。");
    if (c.action === "confirm-demand") {
      if (!["管理层", "产品经理", "业务Owner"].includes(actor))
        throw new Error("请由需求负责人或管理层确认验收。");
      if (actor === "业务Owner" && plan.project !== "P02")
        throw new Error("不在当前业务Owner负责范围。");
      if (plan.status !== "待确认")
        throw new Error("该需求已确认，请勿重复提交。");
      plan.status = "待计划";
      plan.confirmedBy = actor;
    } else {
      if (!["项目经理", "PMO"].includes(actor))
        throw new Error("请由项目经理或 PMO 确认计划。");
      if (plan.status !== "待计划")
        throw new Error("先确认需求与冻结验收，再加入队列。");
      if (!c.resource?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(c.due || ""))
        throw new Error("请填写资源与计划日期。");
      plan.resource = c.resource.trim();
      plan.due = c.due!;
      plan.plannedBy = actor;
      plan.status = "已入队";
    }
    s.deliveryPlans = [
      ...(s.deliveryPlans || []).filter((p) => p.demand !== plan.demand),
      plan,
    ];
  } else {
    const item = actionsFor(s).find((a) => a.id === c.id);
    if (!item) throw new Error("行动不存在。");
    const reviewer = canReviewDelivery(actor),
      owner = item.owner === actor;
    if (
      ["approve", "reject", "accept", "return"].includes(c.action) &&
      !reviewer
    )
      throw new Error("仅管理层、项目经理或 PMO 可审核。");
    if (
      ["start", "submit", "resubmit"].includes(c.action) &&
      !owner &&
      !reviewer
    )
      throw new Error("仅责任人或审核人可处理该行动。");
    if (["approve", "reject"].includes(c.action) && item.status !== "待审核")
      throw new Error("请先提交审核，不能重复决定。");
    if (["accept", "return"].includes(c.action) && item.status !== "待验收")
      throw new Error("尚无待验收证据。");
    if (["reject", "return"].includes(c.action) && !c.reason?.trim())
      throw new Error("请填写退回原因。");
    if (c.action === "approve") {
      if (
        !c.proposal?.trim() ||
        !c.deliverable?.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(c.due || "") ||
        !["研发", "项目经理"].includes(c.owner || "")
      )
        throw new Error("请确认建议、责任人、日期与交付物。");
      Object.assign(item, {
        proposal: c.proposal.trim(),
        owner: c.owner,
        due: c.due,
        deliverable: c.deliverable.trim(),
        status: "已分派",
      });
    } else if (c.action === "reject") item.status = "已退回";
    else if (c.action === "resubmit") {
      if (item.status !== "已退回" || !c.proposal?.trim())
        throw new Error("请修订已退回的建议后重提。");
      item.proposal = c.proposal.trim();
      item.status = "待审核";
    } else if (c.action === "start") {
      if (!owner || item.status !== "已分派")
        throw new Error("仅责任人可领取已分派行动。");
      item.status = "处理中";
    } else if (c.action === "submit") {
      if (!owner || item.status !== "处理中" || !c.evidence?.trim())
        throw new Error("请由责任人领取后提交实际演示证据。");
      item.evidence = c.evidence.trim();
      item.status = "待验收";
    } else if (c.action === "accept") item.status = "已完成";
    else if (c.action === "return") item.status = "处理中";
    item.history.push({
      at,
      actor,
      action: c.action,
      detail:
        c.reason ||
        c.evidence ||
        `${item.proposal}｜责任：${item.owner}｜截止：${item.due}｜交付：${item.deliverable}`,
    });
    s.deliveryActions = [
      ...(s.deliveryActions || []).filter((a) => a.id !== item.id),
      item,
    ];
  }
  s.events.push({
    id: `EVT-${s.events.length + 1}`,
    at,
    actor,
    object: c.id,
    title: `交付协作 · ${c.action}`,
    detail:
      c.reason || "本地模拟；保留人工决定，不改变业务目标或生产发布授权。",
  });
}

export function deliveryEntities(s: State, base: Entity[]): Entity[] {
  const create = (
    id: string,
    kind: Entity["kind"],
    title: string,
    project: string,
    overrides: Partial<Entity>,
  ): Entity => ({
    ...base.find((e) => e.id === project)!,
    delivery: undefined,
    id,
    kind,
    title,
    project,
    domain: "交付协作",
    status: "待确认",
    actual: "待确认",
    goal: "按冻结范围提供证据",
    gap: "人工验证前不认定完成",
    risk: "未经审核不执行",
    summary: "本地合成演示记录",
    progress: "待审核",
    next: "核对事实并确认责任",
    links: [project],
    ...overrides,
  });
  const items = actionsFor(s).map((a) =>
    create(a.id, "承诺", a.title, a.project, {
      status: a.status,
      actual: a.status,
      summary: a.proposal,
      goal: a.deliverable,
      next: `${a.owner} · ${a.due} · ${a.status === "待审核" ? "等待人工修订或确认" : a.status === "待验收" ? "等待审核人核验证据" : a.status}`,
      risk: a.history.at(-1)?.detail || "AI 建议尚未获得执行授权",
      attention: a.status !== "已完成",
      links: [
        a.project,
        ...meetings.filter((m) => m.project === a.project).map((m) => m.id),
      ],
    }),
  );
  for (const p of plansFor(s)) {
    if (!base.some((e) => e.id === p.demand))
      items.push(
        create(p.demand, "需求", p.title, p.project, {
          system: p.system,
          summary: p.acceptance,
          goal: p.acceptance,
          status: p.status,
          actual: p.status,
          next: `${p.status === "待确认" ? "管理层确认需求" : p.status === "待计划" ? "项目经理确认资源计划" : "研发从相关 Issue 开始 EOS 实施"}`,
          links: [
            p.project,
            p.system,
            ...(p.status === "已入队" ? [p.issue] : []),
          ],
        }),
      );
    if (p.status === "已入队" && !base.some((e) => e.id === p.issue)) {
      const run = s.eosRuns?.find((r) => r.issueId === p.issue);
      items.push(
        create(p.issue, "Issue", p.title + "实施", p.project, {
          system: p.system,
          status: run
            ? run.humanReview === "pending"
              ? "待人工审核"
              : run.status === "completed"
                ? "实施包就绪 · 未发布"
                : "执行中 · 按阶段推进"
            : "已入队 · 待研发领取",
          actual: run ? `${run.step + 1}/7 阶段` : "前置验收与资源已确认",
          summary: p.acceptance,
          goal: p.acceptance,
          next: "研发在会话输入“开始EOS实施”；独立复审后交人工审核",
          links: [p.demand, p.project, p.system, "E14", "E13"],
        }),
      );
    }
  }
  for (const run of s.eosRuns || []) {
    if (run.issueId === "ISS-024") continue;
    const p = plansFor(s).find((p) => p.issue === run.issueId);
    if (!p) continue;
    const revision = run.revision || 2;
    if (run.issueId !== "I01" && run.step >= 1)
      items.push(
        create(`IMPL-${run.issueId}-r1`, "Impl", `${p.title} · r1`, p.project, {
          status: run.step >= 2 ? "独立审查退回 · 证据保留" : "待独立审查",
          summary:
            run.issueId === "I03"
              ? "初版先查状态再写入，两个审批请求均能读到待审批；保留重复生效反例，须补事务内原子状态迁移。"
              : "初版校验函数尚缺实际导入入口接线证明；保留绕过校验反例，不降低验收。",
          goal: run.acceptance,
          links: [run.issueId, p.demand, p.system],
        }),
      );
    if ((run.issueId !== "I01" || revision > 2) && run.step >= 3)
      items.push(
        create(
          `IMPL-${run.id}`,
          "Impl",
          `${p.title} · r${revision}`,
          p.project,
          {
            status:
              run.humanReview === "approved"
                ? "人工审核通过 · 未发布"
                : "候选实现 · 待审核",
            actual: run.humanReview || "待独立复审",
            summary:
              run.reviewHistory?.at(-1)?.reason ||
              "按冻结验收执行，保留模拟差异、失败与复验记录",
            goal: run.acceptance,
            links: [run.issueId, p.demand, p.system],
          },
        ),
      );
  }
  for (const old of s.eosHistory || [])
    if (old.humanReview === "rejected") {
      const p = plansFor(s).find((p) => p.issue === old.issueId);
      if (p && !(old.issueId === "I01" && (old.revision || 2) === 2))
        items.push(
          create(
            `IMPL-${old.id}`,
            "Impl",
            `${p.title} · r${old.revision || 2} 退回档案`,
            p.project,
            {
              status: "人工退回 · 证据保留",
              summary: old.reviewHistory?.at(-1)?.reason || "已退回",
              goal: old.acceptance,
              links: [p.issue, p.demand, p.system],
            },
          ),
        );
    }
  return items;
}
