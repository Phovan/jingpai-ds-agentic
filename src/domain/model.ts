import { applyEos } from "./eos";
import { applyDelivery } from "./delivery";
import { applyCreation } from "./entity-creation";
import {
  applyOperation,
  getOperations,
  type Operations,
  type OpsCommand,
} from "./operations";
export const ROLES = [
  "管理层",
  "PMO",
  "项目经理",
  "业务Owner",
  "产品经理",
  "研发",
  "系统管理员",
  "项目成员",
  "系统负责人",
  "测试",
  "运维",
] as const;
export type Role = (typeof ROLES)[number];
// Login choices are intentionally narrower than workflow responsibility roles.
export const LOGIN_ROLES: readonly Role[] = [
  "管理层",
  "PMO",
  "项目经理",
  "业务Owner",
  "产品经理",
  "研发",
  "系统管理员",
];
export type Actor = Role | "PMO Agents" | "EOS Agents";
export const STAGES = [
  "待受理",
  "待澄清",
  "待排期",
  "待开发",
  "开发中",
  "待测试",
  "待发布",
  "已上线待业务验证",
  "已关闭",
] as const;
export type Stage = (typeof STAGES)[number];
export type Route =
  | "home"
  | "projects"
  | "demands"
  | "engineering"
  | "reports"
  | "agents"
  | "knowledge"
  | "operations";
export const PROFILES: Record<
  Role,
  {
    name: string;
    initials: string;
    description: string;
    goal: string;
    home: Route;
    scope: string;
  }
> = {
  项目成员: {
    name: "项目成员演示账号",
    initials: "员",
    description: "接承诺、交结果、报阻塞",
    goal: "完成本人承诺并提供可核验结果",
    home: "operations",
    scope: "本人承诺与参与项目",
  },
  系统负责人: {
    name: "系统负责人演示账号",
    initials: "系",
    description: "看健康、解依赖、守门禁",
    goal: "让系统稳定支撑项目业务目标",
    home: "operations",
    scope: "系统健康与工程约束",
  },
  测试: {
    name: "测试演示账号",
    initials: "测",
    description: "补边界、独立审核、验使用",
    goal: "按原验收标准发现实现与验证缺口",
    home: "operations",
    scope: "验证与独立审核",
  },
  运维: {
    name: "运维演示账号",
    initials: "运",
    description: "验环境、发布观察、必要回退",
    goal: "在授权内安全发布并稳定运行",
    home: "operations",
    scope: "环境、发布与运行",
  },
  系统管理员: {
    name: "系统管理员演示账号",
    initials: "管",
    description: "连接资料、管理范围、检查同步",
    goal: "让授权资料持续、可追溯地进入企业大脑",
    home: "home",
    scope: "企业连接与知识接入",
  },
  管理层: {
    name: "管理层演示账号",
    initials: "管",
    description: "看目标、做取舍、追结果",
    goal: "让重点项目真正贡献业务目标",
    home: "home",
    scope: "数字化项目组合",
  },
  PMO: {
    name: "PMO演示账号",
    initials: "P",
    description: "看护项目、发现问题、推动闭环",
    goal: "让项目偏差及时发现、有人负责",
    home: "home",
    scope: "数字化项目组合",
  },
  项目经理: {
    name: "项目经理演示账号",
    initials: "项",
    description: "管承诺、解阻塞、交付结果",
    goal: "兑现订单协同项目的交付承诺",
    home: "projects",
    scope: "订单协同优化",
  },
  业务Owner: {
    name: "业务Owner演示账号",
    initials: "业",
    description: "提诉求、跟进度、验证价值",
    goal: "把订单异常响应缩短至 2 小时内",
    home: "demands",
    scope: "本人需求及关联项目",
  },
  产品经理: {
    name: "产品经理演示账号",
    initials: "产",
    description: "澄清需求、对齐范围与验收",
    goal: "让业务问题转化为可验证的需求",
    home: "demands",
    scope: "订单协同需求",
  },
  研发: {
    name: "研发展示账号",
    initials: "研",
    description: "实现、审查、验证、回写证据",
    goal: "按冻结基线完成可验证的实现",
    home: "engineering",
    scope: "订单平台获授权工作包",
  },
};
export interface Demand {
  id: string;
  title: string;
  problem: string;
  stage: Stage;
  baseline: string;
  baselineConfirmed: boolean;
  requested: string;
  committed: string;
  forecast: string;
  owner: Role;
  evidence: string[];
  projectId: string;
}
export interface AuditEvent {
  id: string;
  at: string;
  actor: Actor;
  object: string;
  title: string;
  detail: string;
}
export interface Report {
  id: string;
  snapshot: string;
  sourceVersion: number;
  confirmations: Role[];
  supplements: Partial<Record<Role, string>>;
  reconciled: boolean;
  finalized: boolean;
  created: string;
}
export type ConnectionSource = "飞书" | "企微" | "Obsidian";
export interface Connection {
  source: ConnectionSource;
  scope: string;
  owner: string;
  interval: string;
  status: "待同步" | "已同步" | "已暂停" | "已撤权" | "同步失败";
  count: number;
  revision: number;
  lastSuccess: string;
  failureNext: boolean;
  history: { at: string; result: string }[];
}
export interface State {
  deliveryActions?: import("./delivery").DeliveryAction[];
  deliveryPlans?: import("./delivery").DeliveryPlan[];
  createdEntities?: import("./entity-creation").CreatedEntity[];
  catalogVersion?: "v03";
  reportFocus?: import("./briefing").FocusAssignment[];
  eosRuns?: import("./eos").EosRun[];
  eosHistory?: import("./eos").EosRun[];
  eosTestTasks?: import("./eos").EosTestTask[];
  operations?: Operations;
  connections?: Connection[];
  schema: 1;
  version: number;
  decision: "pending" | "approved" | "deferred" | "returned";
  plan: "assist" | "delay" | null;
  coordination: boolean;
  delayAccepted: boolean;
  actual: number;
  goal: number;
  task:
    | "idle"
    | "running"
    | "blocked"
    | "ready"
    | "released"
    | "verified"
    | "stopped";
  taskStep: number;
  run: number;
  environmentEvidence: string;
  faultNext: boolean;
  dispatchFailed: boolean;
  demands: Demand[];
  events: AuditEvent[];
  report: Report | null;
  reportHistory: Report[];
  knowledgeVerified: boolean;
}
export type Command =
  | import("./delivery").DeliveryCommand
  | import("./entity-creation").CreateCommand
  | {
      type: "report-focus";
      id: string;
      period: import("./briefing").Period;
      recipients: Role[];
      content: string;
    }
  | import("./eos").EosCommand
  | OpsCommand
  | {
      type: "demand-advance";
      id: string;
      action: "start" | "submit" | "release" | "accept" | "reject";
      evidence: string;
    }
  | { type: "demand-review"; id: string }
  | {
      type: "connection-configure";
      source: ConnectionSource;
      scope: string;
      owner: string;
      interval: string;
    }
  | {
      type:
        | "connection-sync"
        | "connection-pause"
        | "connection-revoke"
        | "connection-fail";
      source: ConnectionSource;
    }
  | { type: "decide"; plan: "assist" | "delay"; reason: string }
  | { type: "defer"; reason: string }
  | { type: "accept-delay"; evidence: string }
  | { type: "coordinate"; evidence: string }
  | { type: "start" }
  | { type: "tick" }
  | { type: "stop" }
  | { type: "retry-dispatch" }
  | { type: "fault" }
  | { type: "environment"; evidence: string }
  | { type: "release"; evidence: string }
  | { type: "accept"; actual: number; evidence: string }
  | { type: "reject"; evidence: string }
  | {
      type: "create-demand";
      title: string;
      problem: string;
      requested: string;
      projectId?: string;
    }
  | { type: "baseline"; id: string; text: string }
  | { type: "confirm-baseline"; id: string }
  | { type: "schedule"; id: string; date: string }
  | { type: "report-generate" }
  | { type: "report-confirm"; evidence: string }
  | { type: "report-reconcile" }
  | { type: "report-finalize" }
  | { type: "knowledge-verify" };
export const REPORT_ROLES: Role[] = [
  "项目经理",
  "业务Owner",
  "产品经理",
  "研发",
];
export function seed(): State {
  return {
    schema: 1,
    version: 0,
    decision: "pending",
    plan: null,
    coordination: false,
    delayAccepted: false,
    actual: 3.5,
    goal: 2,
    task: "idle",
    taskStep: 0,
    run: 1,
    environmentEvidence: "",
    faultNext: false,
    dispatchFailed: false,
    knowledgeVerified: false,
    reportHistory: [],
    demands: [
      {
        id: "REQ-024",
        title: "订单异常提醒",
        problem:
          "异常订单依赖人工追问，响应均值 3.5 小时，希望主动提醒责任人。",
        stage: "待开发",
        baseline:
          "异常订单触发提醒；按组织权限隔离；重复事件去重；业务响应均值 ≤2 小时。",
        baselineConfirmed: true,
        requested: "2026-09-25",
        committed: "2026-09-25",
        forecast: "2026-09-27",
        owner: "业务Owner",
        evidence: [
          "EV-01：演示样本 20 单，异常响应均值 3.5 小时",
          "EV-02：接口依赖未确认，交付预测延后 2 天",
        ],
        projectId: "PRJ-001",
      },
      {
        id: "REQ-025",
        title: "订单异常分级规则",
        problem: "相同通知优先级难以区分紧急订单，需要业务明确分级规则。",
        stage: "待澄清",
        baseline: "",
        baselineConfirmed: false,
        requested: "2026-09-30",
        committed: "",
        forecast: "",
        owner: "业务Owner",
        evidence: [],
        projectId: "PRJ-001",
      },
    ],
    events: [
      {
        id: "EVT-001",
        at: "2026-09-17T01:00:00.000Z",
        actor: "PMO Agents",
        object: "PRJ-001",
        title: "发现目标偏差，草拟两种应对方案",
        detail:
          "实际 3.5h / 目标 ≤2h；预测延期为演示规则推断，未写成已发生事实。",
      },
    ],
    report: null,
  };
}
const guard = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message);
};
const required = (v: string) =>
  guard(v.trim().length >= 4, "请补充至少 4 个字的依据或回执。");
export function transition(
  previous: State,
  actor: Actor,
  command: Command,
  expectedVersion = previous.version,
  at = new Date().toISOString(),
): State {
  guard(
    expectedVersion === previous.version,
    "对象已发生变化，请关闭面板，核对最新事实后重新提交。",
  );
  const s = structuredClone(previous);
  const linkedMain = s.operations?.releases.some(
    (r) => r.demands.includes("REQ-024") && r.status !== "已回退",
  );
  if (
    linkedMain &&
    [
      "start",
      "tick",
      "environment",
      "release",
      "accept",
      "reject",
      "coordinate",
      "accept-delay",
      "retry-dispatch",
    ].includes(command.type)
  )
    throw new Error(
      "主需求已编入版本，请在版本与审核中接续，不能绕过发布门禁。",
    );
  const demand = s.demands[0];
  const allow = (...roles: Actor[]) =>
    guard(
      roles.includes(actor),
      "当前角色没有此动作权限，请交给责任角色处理。",
    );
  const log = (
    title: string,
    detail: string,
    object = "REQ-024",
    by: Actor = actor,
  ) =>
    s.events.push({
      id: `EVT-${s.events.length + 1}`,
      at,
      actor: by,
      object,
      title,
      detail,
    });
  switch (command.type) {
    case "catalog-create":
      applyCreation(s, actor, command, at);
      break;
    case "report-focus": {
      allow("管理层");
      guard(
        ["周报", "月报", "季报", "年度总结"].includes(command.period),
        "请选择有效汇报周期。",
      );
      guard(
        command.recipients.length > 0 &&
          command.recipients.every((r) =>
            ["PMO", "项目经理", "业务Owner", "产品经理", "研发"].includes(r),
          ),
        "接收人必须在演示组织的所属团队范围内。",
      );
      guard(
        command.content.trim().length > 0 && command.content.length <= 3000,
        "请填写关注内容。",
      );
      guard(
        !(s.reportFocus || []).some((f) => f.id === command.id),
        "该关注点已下发，请勿重复提交。",
      );
      s.reportFocus = [
        ...(s.reportFocus || []),
        {
          id: command.id,
          period: command.period,
          recipients: [...new Set(command.recipients)],
          content: command.content.trim(),
          issuer: "管理层",
          at,
        },
      ];
      log(
        "下发汇报关注点",
        `${command.period} · ${command.recipients.join("、")} · ${command.content}`,
        command.id,
      );
      break;
    }
    case "eos":
      applyEos(s, actor, command, at);
      break;
    case "delivery":
      applyDelivery(s, actor, command, at);
      break;
    case "ops":
      applyOperation(s, actor, command, at);
      break;
    case "demand-advance": {
      guard(
        !s.operations?.releases.some(
          (r) => r.demands.includes(command.id) && r.status !== "已回退",
        ),
        "需求已编入版本，请从版本与审核接续。",
      );
      const d = s.demands.find((d) => d.id === command.id);
      guard(
        !!d && d.id !== "REQ-024",
        "此动作仅用于新增需求；主需求沿用原工程流程。",
      );
      required(command.evidence);
      const steps = {
        start: ["待开发", "开发中"],
        submit: ["开发中", "待测试"],
        release: ["待发布", "已上线待业务验证"],
        accept: ["已上线待业务验证", "已关闭"],
        reject: ["已上线待业务验证", "待开发"],
      } as const;
      allow(
        command.action === "accept" || command.action === "reject"
          ? "业务Owner"
          : "研发",
      );
      guard(
        d!.baselineConfirmed && !!d!.committed,
        "先完成业务基线与交付承诺。",
      );
      const [from, to] = steps[command.action];
      guard(d!.stage === from, "需求阶段已变化，请核对后重试。");
      d!.stage = to;
      d!.evidence.push(`${to}：${command.evidence.trim()}`);
      log(`需求进入${to}`, command.evidence, command.id);
      break;
    }
    case "demand-review": {
      guard(
        !s.operations?.releases.some(
          (r) => r.demands.includes(command.id) && r.status !== "已回退",
        ),
        "已关联版本须由独立测试审核。",
      );
      allow("EOS Agents");
      const d = s.demands.find((d) => d.id === command.id);
      guard(
        !!d && d.id !== "REQ-024" && d.stage === "待测试",
        "该需求未提交审核。",
      );
      d!.stage = "待发布";
      d!.evidence.push(
        "EOS Agents 模拟独立审核：已核对提交回执与冻结基线。未运行真实代码或测试。",
      );
      log(
        "EOS Agents 返回模拟审核回执",
        "进入待发布；仍需研发确认预览发布与业务Owner验证",
        command.id,
      );
      break;
    }
    case "connection-configure": {
      allow("系统管理员");
      guard(
        command.scope.trim().length >= 2 && command.owner.trim().length >= 2,
        "请明确共享范围和内容授权人。",
      );
      const old = s.connections?.find((c) => c.source === command.source);
      const connection: Connection = {
        source: command.source,
        scope: command.scope.trim(),
        owner: command.owner.trim(),
        interval: command.interval,
        status: "待同步",
        count: old?.count || 0,
        revision: old?.revision || 0,
        lastSuccess: old?.lastSuccess || "",
        failureNext: false,
        history: [
          { at, result: "保存演示授权范围；等待首次同步" },
          ...(old?.history || []),
        ],
      };
      s.connections = [
        connection,
        ...(s.connections || []).filter((c) => c.source !== command.source),
      ];
      log("保存连接范围（模拟）", command.scope, command.source);
      break;
    }
    case "connection-sync":
    case "connection-pause":
    case "connection-revoke":
    case "connection-fail": {
      allow("系统管理员");
      const c = s.connections?.find((c) => c.source === command.source);
      guard(!!c, "先配置来源与授权范围。");
      guard(c!.status !== "已撤权", "授权已撤回，请重新配置并确认范围。");
      let result = "";
      if (command.type === "connection-sync") {
        if (c!.failureNext) {
          c!.status = "同步失败";
          c!.failureNext = false;
          result = "模拟连接失败：保留上次结果，可重试";
        } else {
          c!.status = "已同步";
          c!.revision++;
          c!.count = 12;
          c!.lastSuccess = at;
          result = `模拟同步成功：12份资料，按来源ID去重；归属待核实。版本 ${c!.revision}`;
        }
      } else if (command.type === "connection-pause") {
        c!.status = "已暂停";
        result = "暂停定时同步；可手动恢复同步";
      } else if (command.type === "connection-revoke") {
        c!.status = "已撤权";
        result = "撤回共享范围，停止检索使用；历史日志保留";
      } else {
        c!.failureNext = true;
        result = "下次同步模拟失败，用于演示重试";
      }
      c!.history.unshift({ at, result });
      log(result, "仅本地模拟，不访问外部系统或真实知识库", command.source);
      break;
    }
    case "decide":
      allow("管理层");
      guard(
        s.decision === "pending" || s.decision === "deferred",
        "该决定已处理。",
      );
      required(command.reason);
      s.decision = "approved";
      s.plan = command.plan;
      log(
        "批准方案并生成协调行动",
        `${command.plan === "assist" ? "协调接口支持" : "保持资源，接受延期"}；${command.reason}`,
        "DEC-007",
      );
      break;
    case "defer":
      allow("管理层");
      guard(s.decision === "pending", "仅待决事项可以暂缓。");
      required(command.reason);
      s.decision = "deferred";
      log("暂缓决定，保留风险", command.reason, "DEC-007");
      break;
    case "accept-delay":
      allow("业务Owner");
      guard(
        s.decision === "approved" && s.plan === "delay" && !s.delayAccepted,
        "当前没有待确认的延期方案。",
      );
      required(command.evidence);
      s.delayAccepted = true;
      log("业务 Owner 接受日期调整", command.evidence, "DEC-007");
      break;
    case "coordinate":
      allow("项目经理");
      guard(
        s.decision === "approved" && !s.coordination,
        "请先完成管理层决定，或该安排已确认。",
      );
      guard(
        s.plan !== "delay" || s.delayAccepted,
        "延期方案须先由业务 Owner 确认影响。",
      );
      required(command.evidence);
      s.coordination = true;
      demand.forecast = s.plan === "assist" ? "2026-09-25" : "2026-09-27";
      if (s.plan === "delay") demand.committed = "2026-09-27";
      log("确认交付安排，回写需求与版本预测", command.evidence, "PRJ-001");
      log(
        "执行计划就绪，通知研发启动",
        "沿用 REQ-024 / Release-09.25 / Issue-048；业务目标实际值不变。",
        "Issue-048",
        "PMO Agents",
      );
      break;
    case "start":
      allow("研发");
      guard(
        s.coordination &&
          ["idle", "stopped"].includes(s.task) &&
          !s.dispatchFailed,
        "执行条件未满足：先确认安排，或处理派发失败。",
      );
      if (s.faultNext) {
        s.dispatchFailed = true;
        s.faultNext = false;
        log(
          "派发失败，尚未受理",
          "演示故障：执行通道不可用。重试使用同一任务标识。",
          "TASK-024",
          "EOS Agents",
        );
      } else {
        s.task = "running";
        s.taskStep = 0;
        log(
          "执行任务已受理",
          `TASK-024 / Impl-${s.run}；验收基线 v1；授权：预览环境，不含生产发布。`,
          "TASK-024",
          "EOS Agents",
        );
      }
      break;
    case "retry-dispatch":
      allow("研发");
      guard(s.dispatchFailed, "没有待重试的派发。");
      s.dispatchFailed = false;
      s.task = "running";
      s.taskStep = 0;
      log("同一任务重试受理成功", "未重复创建任务。", "TASK-024", "EOS Agents");
      break;
    case "tick":
      allow("EOS Agents");
      guard(s.task === "running", "任务未执行，不能推进。");
      s.taskStep++;
      if (s.taskStep === 1) {
        demand.stage = "开发中";
        log(
          "实现产物已生成",
          `Impl-${s.run} / build-demo-024；提醒逻辑与权限校验。`,
          "Issue-048",
        );
      } else if (s.taskStep === 2) {
        demand.stage = "待测试";
        log(
          "独立 Review 通过",
          "Reviewer Agent 与实现者分离；验收基线未被降低。",
          "Issue-048",
        );
      } else if (s.taskStep === 3 && !s.environmentEvidence) {
        s.task = "blocked";
        log(
          "现实验证阻塞，等待人工回执",
          "业务身份未授权。阻塞不视为通过，不继续发布。",
          "TASK-024",
        );
      } else {
        s.task = "ready";
        demand.stage = "待发布";
        log(
          "现实验证通过，待预览发布确认",
          `环境 preview / 身份 business-test / build-demo-024 / 正反用例通过；${s.environmentEvidence}`,
          "TASK-024",
        );
      }
      break;
    case "stop":
      allow("研发", "项目经理");
      guard(s.task === "running", "仅执行中的任务可以停止。");
      s.task = "stopped";
      log("执行已停止", "已生成的产物与失败记录保留。", "TASK-024");
      break;
    case "environment":
      allow("研发");
      guard(s.task === "blocked", "当前没有验证阻塞。");
      required(command.evidence);
      s.environmentEvidence = command.evidence;
      s.task = "running";
      log("补充演示环境回执，重新验证", command.evidence, "TASK-024");
      break;
    case "release":
      allow("项目经理");
      guard(s.task === "ready", "独立审核与现实验证通过后才能确认预览发布。");
      required(command.evidence);
      s.task = "released";
      demand.stage = "已上线待业务验证";
      demand.evidence.push(`预览发布回执：${command.evidence}`);
      log(
        "演示预览发布完成，待业务验证",
        "仅模拟环境，无生产影响；Owner 需核验原问题是否解决。",
        "Release-09.25",
        "EOS Agents",
      );
      break;
    case "accept":
      allow("业务Owner");
      guard(s.task === "released", "发布完成后才能进行业务验证。");
      required(command.evidence);
      guard(
        Number.isFinite(command.actual) &&
          command.actual > 0 &&
          command.actual <= s.goal,
        "结果未达到 ≤2 小时目标，请记录不通过并退回。",
      );
      s.actual = command.actual;
      s.task = "verified";
      demand.stage = "已关闭";
      demand.evidence.push(`业务验证：${command.actual}h；${command.evidence}`);
      log(
        "业务验证通过，需求关闭并回写目标",
        `实际 ${command.actual}h；${command.evidence}`,
        "G-01",
      );
      log(
        "生成经验候选，等待 PMO 核实",
        "仅记录本次演示结果，不能直接推广为通用规则。",
        "KN-001",
        "PMO Agents",
      );
      break;
    case "reject":
      allow("业务Owner");
      guard(s.task === "released", "当前不在业务验证阶段。");
      required(command.evidence);
      s.task = "idle";
      s.run++;
      s.taskStep = 0;
      s.environmentEvidence = "";
      demand.stage = "待开发";
      demand.evidence.push(`验证未通过：${command.evidence}`);
      log("业务验证未通过，退回原需求", command.evidence);
      break;
    case "create-demand":
      allow("业务Owner");
      guard(
        getOperations(s).projects.some(
          (p) =>
            p.id === (command.projectId || "PRJ-001") &&
            !["草稿", "退回", "暂缓"].includes(p.status),
        ),
        "请选择已批准项目",
      );
      required(command.title);
      required(command.problem);
      guard(
        /^\d{4}-\d{2}-\d{2}$/.test(command.requested) &&
          !Number.isNaN(Date.parse(command.requested)),
        "请选择有效的期望日期。",
      );
      guard(
        !s.demands.some((d) => d.title.trim() === command.title.trim()),
        "已有同名需求，请先核对原记录，避免重复提交。",
      );
      {
        const id = `REQ-${String(24 + s.demands.length).padStart(3, "0")}`;
        s.demands.push({
          id,
          title: command.title.trim(),
          problem: command.problem.trim(),
          requested: command.requested,
          stage: "待受理",
          baseline: "",
          baselineConfirmed: false,
          committed: "",
          forecast: "",
          owner: "业务Owner",
          evidence: [],
          projectId: command.projectId || "PRJ-001",
        });
        log(
          "新需求已受理，交产品经理澄清",
          "期望日期不是交付承诺。",
          id,
          "PMO Agents",
        );
      }
      break;
    case "baseline":
      allow("产品经理");
      {
        const d = s.demands.find((d) => d.id === command.id);
        guard(
          !!d && !d.baselineConfirmed,
          "需求不存在或基线已冻结，新增范围请新建关联需求。",
        );
        required(command.text);
        d!.baseline = command.text;
        d!.stage = "待澄清";
        log("起草验收基线，等待 Owner 确认", command.text, command.id);
      }
      break;
    case "confirm-baseline":
      allow("业务Owner");
      {
        const d = s.demands.find((d) => d.id === command.id);
        guard(
          !!d && !!d.baseline && !d.baselineConfirmed,
          "先由产品补充验收条件，或基线已确认。",
        );
        d!.baselineConfirmed = true;
        d!.stage = "待排期";
        log(
          "确认需求范围与验收基线",
          "交项目经理确认容量与交付承诺。",
          command.id,
        );
      }
      break;
    case "schedule":
      allow("项目经理");
      {
        const d = s.demands.find((d) => d.id === command.id);
        guard(!!d && d.stage === "待排期", "需求未完成基线确认，或已经排期。");
        guard(/^\d{4}-\d{2}-\d{2}$/.test(command.date), "请选择承诺日期。");
        d!.committed = command.date;
        d!.forecast = command.date;
        d!.stage = "待开发";
        log(
          "确认交付承诺",
          "进入待开发队列，研发可接续实现、审核、预览发布和业务验证。",
          command.id,
        );
      }
      break;
    case "report-generate":
      allow("PMO");
      guard(
        !s.report || s.report.finalized,
        "当前报告尚未确认，请先完成本轮。",
      );
      if (s.report) s.reportHistory.push(structuredClone(s.report));
      s.report = {
        id: `RPT-${s.version + 1}`,
        snapshot: `订单协同：异常响应 ${s.actual}h / 目标 ≤${s.goal}h；REQ-024 ${demand.stage}；承诺 ${demand.committed}；预测 ${demand.forecast}。执行状态：${taskLabel(s.task)}。`,
        sourceVersion: s.version,
        confirmations: [],
        supplements: {},
        reconciled: false,
        finalized: false,
        created: at,
      };
      log(
        "已按事实快照生成周报草稿",
        "等待四类责任角色确认，不自动代签。",
        s.report.id,
        "PMO Agents",
      );
      break;
    case "report-confirm":
      guard(
        ROLES.includes(actor as Role) && REPORT_ROLES.includes(actor as Role),
        "该角色应在核对或管理确认环节处理。",
      );
      guard(
        !!s.report && !s.report.reconciled && !s.report.finalized,
        "报告不存在或已进入后续确认。",
      );
      guard(!s.report!.confirmations.includes(actor as Role), "本人已经确认。");
      required(command.evidence);
      s.report!.confirmations.push(actor as Role);
      s.report!.supplements[actor as Role] = command.evidence;
      log("确认本人报告事实", command.evidence, s.report!.id);
      break;
    case "report-reconcile":
      allow("PMO");
      guard(
        !!s.report &&
          REPORT_ROLES.every((r) => s.report!.confirmations.includes(r)) &&
          !s.report.reconciled,
        "四类责任角色确认齐全后才能核对。",
      );
      s.report!.reconciled = true;
      log("PMO 核对完成，提交管理确认", "补充材料随快照保留。", s.report!.id);
      break;
    case "report-finalize":
      allow("管理层");
      guard(
        !!s.report && s.report.reconciled && !s.report.finalized,
        "请先由 PMO 核对，或报告已经确认。",
      );
      s.report!.finalized = true;
      log("管理确认，固化报告版本", "历史快照不随实时对象变化。", s.report!.id);
      break;
    case "knowledge-verify":
      allow("PMO");
      guard(
        s.task === "verified" && !s.knowledgeVerified,
        "业务验证后才能核实经验候选。",
      );
      s.knowledgeVerified = true;
      log(
        "经验已核实",
        "适用：订单提醒与同类权限校验；有效期 30 天；维护人 PMO；复用仍需重新验证。",
        "KN-001",
      );
      break;
    case "fault":
      allow("研发");
      guard(s.task === "idle" && !s.dispatchFailed, "请在执行前设置派发故障。");
      s.faultNext = !s.faultNext;
      break;
  }
  s.version++;
  return s;
}
export function taskLabel(t: State["task"]) {
  return {
    idle: "待启动",
    running: "执行中",
    blocked: "验证阻塞",
    ready: "待发布确认",
    released: "待业务验证",
    verified: "已验证",
    stopped: "已停止",
  }[t];
}
export function nextAction(s: State): {
  role: Role;
  title: string;
  route: Route;
  reason: string;
} {
  const r = [...(s.operations?.releases || [])]
    .reverse()
    .find((r) => r.demands.includes("REQ-024") && r.status !== "已回退");
  if (r) {
    let role: Role = "项目经理";
    if (r.pending)
      role =
        (["业务Owner", "系统负责人", "管理层"] as Role[]).find(
          (x) => !r.pending!.confirmations.includes(x),
        ) || "管理层";
    else if (["待就绪", "受阻"].includes(r.status))
      role =
        (["研发", "测试", "运维", "系统负责人"] as Role[]).find(
          (x) => !r.readiness.includes(x),
        ) || "系统负责人";
    else if (["就绪", "返工"].includes(r.status)) role = "研发";
    else if (r.status === "待独立审核") role = "测试";
    else if (r.status === "待发布授权")
      role = r.confirmations.includes("系统负责人")
        ? "业务Owner"
        : "系统负责人";
    else if (["待发布", "发布失败"].includes(r.status)) role = "运维";
    else if (["已发布", "已验证"].includes(r.status)) role = "业务Owner";
    return {
      role,
      title: r.pending
        ? "确认版本变更"
        : r.status === "已验证"
          ? "复评项目业务目标"
          : `接续版本：${r.status}`,
      route: "engineering",
      reason: `${r.id} · ${r.title}；${r.status === "已验证" ? "需求已验证，项目指标需单独核实" : "按原基线和发布门禁处理"}`,
    };
  }
  if (s.decision !== "approved")
    return {
      role: "管理层",
      title: "比较方案并决定",
      route: "projects",
      reason: "接口依赖导致交付预测延期 2 天",
    };
  if (s.plan === "delay" && !s.delayAccepted)
    return {
      role: "业务Owner",
      title: "确认延期的业务影响",
      route: "demands",
      reason: "管理层选择保持资源，业务 Owner 尚未接受日期调整",
    };
  if (!s.coordination)
    return {
      role: "项目经理",
      title: "确认资源与交付安排",
      route: "projects",
      reason: "决定已保存，资源可用性仍待确认",
    };
  if (s.dispatchFailed)
    return {
      role: "研发",
      title: "重试任务派发",
      route: "engineering",
      reason: "执行服务未受理，不能写作执行中",
    };
  if (["idle", "stopped"].includes(s.task))
    return {
      role: "研发",
      title: "启动 EOS 执行",
      route: "engineering",
      reason: "验收与安排已就绪，等待执行触发",
    };
  if (s.task === "running")
    return {
      role: "研发",
      title: "查看执行进展",
      route: "engineering",
      reason: "Agents 正在按冻结基线推进，可离开页面",
    };
  if (s.task === "blocked")
    return {
      role: "研发",
      title: "补充验证环境回执",
      route: "engineering",
      reason: "业务身份权限未核实，已主动停止向下推进",
    };
  if (s.task === "ready")
    return {
      role: "项目经理",
      title: "确认预览发布",
      route: "engineering",
      reason: "现实验证已通过，仍需确认影响与回退",
    };
  if (s.task === "released")
    return {
      role: "业务Owner",
      title: "验证业务结果",
      route: "demands",
      reason: "上线不等于目标达成，需业务样本与实测结果",
    };
  return {
    role: "PMO",
    title: "核实经验并生成报告",
    route: "knowledge",
    reason: "业务结果已验证，沉淀适用条件与证据",
  };
}
export function brainAnswer(s: State, q: string): string {
  const n = nextAction(s);
  const d = s.demands[0];
  if (/报告|周报/.test(q))
    return s.report
      ? `报告 ${s.report.id} 引用版本 v${s.report.sourceVersion} 的事实快照，已确认 ${s.report.confirmations.length}/4 人。${s.report.finalized ? "管理层已确认，历史内容已固化。" : "尚未完成所有确认，不作为正式报告。"}`
      : "当前尚未生成报告。请 PMO 在报告中心发起汇总；各角色确认后再提交管理层。";
  if (/谁|下一|怎么办|做什么/.test(q))
    return `下一步由「${n.role}」${n.title}。原因：${n.reason}。查询不会改变任何对象，需在对应页面确认动作。`;
  if (/证据|依据|原因|为什么/.test(q))
    return `结论：${n.reason}。事实：EV-01 记录异常响应基线 3.5h，当前已确认值 ${s.actual}h；REQ-024 当前「${d.stage}」。预测：${d.forecast}，并非已实现结果。待核实：${s.task === "verified" ? "跨周期收益与更大样本" : "业务效果尚未经 Owner 验证"}。全部为本地演示数据。`;
  if (/目标|差距|GAP|gap|项目/.test(q))
    return `订单协同目标 ≤${s.goal}h，已确认实际 ${s.actual}h，${s.actual > s.goal ? `超出 ${Number((s.actual - s.goal).toFixed(1))}h` : "本次样本达到目标，仍需持续观察"}。实现、Review 或发布完成都不会自动更新这个数值；只有业务 Owner 提交证据后才回写。上级战略待关联。`;
  if (/需求|交付|进度/.test(q))
    return `${d.id}「${d.title}」当前${d.stage}；期望 ${d.requested}，承诺 ${d.committed}，预测 ${d.forecast}。${n.role}需要${n.title}。同一 ID 在 PMO 和 EOS 中接续，不重复创建。`;
  return "本 Demo 使用可解释的规则演示，不连接真实大模型。可以问「目标差距是什么」「为什么受阻」「下一步谁处理」「需求交付到哪里」「周报确认情况」。超出演示范围的问题暂不作答，也不会据此执行动作。";
}
