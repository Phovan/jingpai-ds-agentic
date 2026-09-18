import type { Actor, Role, State } from "./model";

export const OPS_TABS = [
  "战略与项目",
  "工作承诺",
  "风险闭环",
  "系统健康",
  "版本与审核",
  "周期报告",
  "经验复用",
  "资料核实",
] as const;
export type OpsTab = (typeof OPS_TABS)[number];
export interface Project {
  id: string;
  title: string;
  domain: string;
  goal: string;
  target: number;
  baseline: number;
  actual: number | null;
  unit: string;
  direction: "≤" | "≥";
  deadline: string;
  system: string;
  supplier: string;
  scope: string;
  status: string;
  confirmations: Role[];
  evidence: string[];
  history: string[];
  strategy: string;
  reassess: string;
}
export interface Commitment {
  id: string;
  project: string;
  title: string;
  owner: Role;
  due: string;
  criteria: string;
  dependency: string;
  status: string;
  evidence: string[];
}
export interface Risk {
  id: string;
  project: string;
  system: string;
  title: string;
  owner: Role;
  due: string;
  criteria: string;
  impact: string;
  status: string;
  evidence: string[];
}
export interface SystemObject {
  id: string;
  title: string;
  owner: Role;
  supplier: string;
  goal: number;
  actual: number | null;
  evidence: string;
  status: string;
}
export interface Implementation {
  id: string;
  evidence: string;
  review: string;
  result: "待审核" | "通过" | "退回";
  reason: string;
}
export interface Release {
  id: string;
  title: string;
  system: string;
  demands: string[];
  date: string;
  originalDate: string;
  scope: string;
  status: string;
  impact: string;
  confirmations: Role[];
  readiness: string[];
  impls: Implementation[];
  history: string[];
  pending?: {
    date: string;
    scope: string;
    reason: string;
    confirmations: Role[];
  };
}
export interface PeriodReport {
  id: string;
  scene: "PMO" | "EOS";
  period: string;
  snapshot: string;
  sourceVersion: number;
  required: Role[];
  responses: Partial<Record<Role, string>>;
  checks: Role[];
  status: string;
  history: string[];
}
export interface Lesson {
  id: string;
  title: string;
  source: string;
  conditions: string;
  evidence: string;
  status: string;
  approvals: Role[];
  version: number;
  uses: { project: string; owner: Role; result: string }[];
}
export interface Source {
  id: string;
  title: string;
  text: string;
  source: string;
  version: number;
  object: string;
  owner: Role;
  visibility: "个人" | "项目";
  status: string;
  history: string[];
}
export interface Operations {
  projects: Project[];
  commitments: Commitment[];
  risks: Risk[];
  systems: SystemObject[];
  releases: Release[];
  reports: PeriodReport[];
  lessons: Lesson[];
  sources: Source[];
  strategies: { id: string; title: string; goal: string; projects: string[] }[];
}
export const OPS_ACTIONS = [
  "project-create",
  "project-edit",
  "project-confirm",
  "project-decide",
  "project-result",
  "project-handover",
  "decision-demand",
  "commit-create",
  "commit-submit",
  "commit-check",
  "risk-create",
  "risk-verify",
  "risk-escalate",
  "risk-treat",
  "risk-close",
  "system-check",
  "release-create",
  "release-ready",
  "change-propose",
  "change-confirm",
  "impl-submit",
  "impl-review",
  "release-authorize",
  "release-publish",
  "release-rollback",
  "release-result",
  "report-create",
  "report-respond",
  "report-check",
  "report-return",
  "report-finalize",
  "lesson-create",
  "lesson-verify",
  "lesson-adopt",
  "lesson-result",
  "lesson-retire",
  "source-add",
  "source-confirm",
  "source-revoke",
  "demand-note",
] as const;
export type OpsAction = (typeof OPS_ACTIONS)[number];
export type OpsCommand = {
  type: "ops";
  action: OpsAction;
  id?: string;
  values: Record<string, string>;
};
export function seedOperations(): Operations {
  const examples = [
    ["PRJ-001", "订单协同优化", "服务", "异常响应", 2, 3.5, "小时", "≤"],
    ["PRJ-002", "质量追溯试点", "研发", "追溯耗时", 30, 45, "分钟", "≤"],
    ["PRJ-003", "周报协同试点", "运营", "汇总耗时", 1, 0.8, "小时", "≤"],
    ["PRJ-004", "数据口径治理", "未分类", "指标口径完整率", 95, null, "%", "≥"],
    ["PRJ-005", "产品需求标准化", "产品", "验收条件完整率", 95, 80, "%", "≥"],
    ["PRJ-006", "营销效果归因", "营销", "效果可追溯率", 90, 72, "%", "≥"],
    ["PRJ-007", "采购需求协同", "采购", "需求响应", 2, null, "天", "≤"],
  ] as const;
  return {
    projects: examples.map(
      ([id, title, domain, goal, target, actual, unit, direction]) => ({
        id,
        title,
        domain,
        goal,
        target,
        baseline: actual ?? 0,
        actual,
        unit,
        direction,
        deadline: "2026-09-30",
        system: id === "PRJ-002" ? "SYS-02" : "SYS-01",
        supplier: "演示实施供应商",
        scope: "试点范围；指标和数据均为演示设定",
        status: "进行中",
        confirmations: ["业务Owner", "系统负责人", "PMO"],
        evidence: [],
        history: [],
        strategy: "STR-DEMO",
        reassess: "",
      }),
    ),
    strategies: [
      {
        id: "STR-DEMO",
        title: "演示战略 · 提升业务协同与交付效率",
        goal: "项目业务结果经Owner验证；非劲牌已确认战略",
        projects: ["PRJ-001", "PRJ-002", "PRJ-003"],
      },
    ],
    commitments: [
      {
        id: "ACT-001",
        project: "PRJ-001",
        title: "确认异常订单接口口径",
        owner: "项目成员",
        due: "2026-09-22",
        criteria: "业务样例、字段口径和责任人均已确认",
        dependency: "系统负责人提供接口契约",
        status: "待完成",
        evidence: [],
      },
    ],
    risks: [
      {
        id: "RSK-001",
        project: "PRJ-001",
        system: "SYS-01",
        title: "接口口径未确认",
        owner: "系统负责人",
        due: "2026-09-22",
        criteria: "双方确认接口契约且关键样例验证通过",
        impact: "影响异常提醒需求与试点交付；待核实",
        status: "待核实",
        evidence: [],
      },
    ],
    systems: [
      {
        id: "SYS-01",
        title: "订单平台",
        owner: "系统负责人",
        supplier: "演示实施供应商",
        goal: 99.9,
        actual: 99.5,
        evidence: "演示监控样本：近7日",
        status: "需关注",
      },
      {
        id: "SYS-02",
        title: "质量追溯系统",
        owner: "系统负责人",
        supplier: "演示设备供应商",
        goal: 99.9,
        actual: null,
        evidence: "待补运行样本",
        status: "待核实",
      },
    ],
    releases: [],
    reports: [],
    lessons: [],
    sources: [],
  };
}
export const getOperations = (s: State) => s.operations ?? seedOperations();
export function projectGap(p: Project, s?: State) {
  const actual = p.id === "PRJ-001" && s ? s.actual : p.actual;
  if (actual === null) return "待采集";
  const delta = p.direction === "≤" ? actual - p.target : p.target - actual;
  return delta > 0
    ? `差 ${Number(delta.toFixed(2))} ${p.unit}`
    : "本次样本达标";
}
const need = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};
export function applyOperation(
  s: State,
  actor: Actor,
  c: OpsCommand,
  at: string,
) {
  const o = (s.operations ??= seedOperations()),
    v = c.values,
    id = c.id;
  const allow = (...roles: Actor[]) =>
    need(roles.includes(actor), "当前角色没有此动作权限，请切换对应责任角色。");
  const staff = () =>
    need(
      !["系统管理员", "PMO Agents", "EOS Agents"].includes(actor),
      "该动作由业务责任人确认。",
    );
  const text = (key: string, min = 4) => {
    const x = (v[key] || "").trim();
    need(x.length >= min, `请补充${key}，至少${min}个字。`);
    return x;
  };
  const date = (key: string) => {
    const x = v[key] || "";
    need(
      /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(Date.parse(x)),
      "请填写有效日期",
    );
    return x;
  };
  const number = (key: string) => {
    need(v[key]?.trim(), "请填写数值");
    const n = Number(v[key]);
    need(Number.isFinite(n) && n >= 0, "数值必须为非负有限数");
    return n;
  };
  const get = <T extends { id: string }>(rows: T[], key = id) => {
    const item = rows.find((x) => x.id === key);
    need(item, "关联对象不存在");
    return item!;
  };
  const role = (key: string): Role => {
    const x = v[key];
    need(
      [
        "管理层",
        "PMO",
        "项目经理",
        "项目成员",
        "系统负责人",
        "业务Owner",
        "产品经理",
        "研发",
        "测试",
        "运维",
      ].includes(x),
      "请选择业务责任角色",
    );
    return x as Role;
  };
  const record = (
    title: string,
    object = id || "企业工作空间",
    detail = v.evidence || v.reason || v.title || "已保存",
  ) =>
    s.events.push({
      id: `EVT-${s.events.length + 1}`,
      at,
      actor,
      object,
      title,
      detail,
    });
  const key = (prefix: string, rows: { id: string }[]) =>
    `${prefix}-${String(rows.length + 1).padStart(3, "0")}`;
  switch (c.action) {
    case "project-create": {
      allow("PMO", "项目经理");
      const title = text("title");
      need(
        !o.projects.some((p) => p.title === title),
        "已有同名项目，请继续原项目，避免重复立项。",
      );
      const p: Project = {
        id: key("PRJ", o.projects),
        title,
        domain: v.domain || "未分类",
        goal: text("goal"),
        target: number("target"),
        baseline: number("baseline"),
        actual: null,
        unit: text("unit", 1),
        direction: v.direction === "≥" ? "≥" : "≤",
        deadline: date("deadline"),
        system: get(o.systems, v.system).id,
        supplier: text("supplier", 2),
        scope: text("scope"),
        status: "草稿",
        confirmations: [],
        evidence: [],
        history: ["大脑规则草拟：目标与范围待责任人确认"],
        strategy: "STR-DEMO",
        reassess: "",
      };
      o.projects.push(p);
      record("大脑辅助建项草稿", p.id, title);
      break;
    }
    case "project-edit": {
      allow("PMO", "项目经理");
      const p = get(o.projects);
      need(
        ["草稿", "退回", "暂缓"].includes(p.status),
        "已批准基线不能直接覆盖，请走变更流程",
      );
      p.scope = text("scope");
      p.deadline = date("deadline");
      p.confirmations = [];
      p.status = "草稿";
      p.history.push(`修订草稿：${p.scope}`);
      record("修订项目草稿");
      break;
    }
    case "project-confirm": {
      allow("业务Owner", "系统负责人", "PMO");
      const p = get(o.projects);
      need(["草稿", "待批准"].includes(p.status), "项目不在立项确认阶段");
      const e = text("evidence");
      if (!p.confirmations.includes(actor as Role))
        p.confirmations.push(actor as Role);
      p.evidence.push(`${actor}：${e}`);
      if (
        ["业务Owner", "系统负责人", "PMO"].every((r) =>
          p.confirmations.includes(r as Role),
        )
      )
        p.status = "待批准";
      record("项目专业确认");
      break;
    }
    case "project-decide": {
      allow("管理层");
      const p = get(o.projects);
      need(["草稿", "待批准"].includes(p.status), "项目不在待决阶段");
      const e = text("evidence");
      need(["批准", "退回", "暂缓"].includes(v.decision), "请选择决定");
      if (v.decision === "批准")
        need(p.status === "待批准", "缺少业务、技术或PMO确认");
      p.status = v.decision === "批准" ? "进行中" : v.decision;
      p.history.push(
        `${at} ${v.decision}：${e}；原目标 ${p.direction}${p.target}${p.unit}；原承诺 ${p.deadline}`,
      );
      if (p.status === "进行中") {
        o.strategies[0].projects.push(p.id);
        o.commitments.push({
          id: key("ACT", o.commitments),
          project: p.id,
          title: "启动项目并确认第一阶段交付",
          owner: "项目经理",
          due: p.deadline,
          criteria: p.scope,
          dependency: "已批准项目基线",
          status: "待完成",
          evidence: [],
        });
      }
      record("管理层确认项目决定");
      break;
    }
    case "project-result": {
      allow("业务Owner");
      const p = get(o.projects);
      need(
        ["进行中", "整改中", "部分验收"].includes(p.status),
        "当前项目不能验收",
      );
      const e = text("evidence"),
        actual = number("actual");
      need(["确认", "部分验收", "退回"].includes(v.decision), "请选择验收决定");
      const pass =
        p.direction === "≤" ? actual <= p.target : actual >= p.target;
      need(
        v.decision !== "确认" || pass,
        "仍有目标差距，选择部分验收或退回，不可判定达标",
      );
      p.actual = actual;
      p.evidence.push(`${actor}：${e}；实测 ${actual}${p.unit}`);
      p.status =
        v.decision === "确认"
          ? "待移交"
          : v.decision === "退回"
            ? "整改中"
            : "部分验收";
      if (p.id === "PRJ-001") s.actual = actual;
      if (p.status !== "待移交")
        o.commitments.push({
          id: key("ACT", o.commitments),
          project: p.id,
          title: "整改并复评业务结果",
          owner: "项目经理",
          due: date("due"),
          criteria: p.goal,
          dependency: e,
          status: "待完成",
          evidence: [],
        });
      record("业务结果验收");
      break;
    }
    case "project-handover": {
      allow("系统负责人");
      const p = get(o.projects);
      need(p.status === "待移交", "须先通过业务验收");
      p.evidence.push(text("evidence"));
      p.reassess = date("due");
      p.status = "已移交";
      record("移交运行并安排收益复评");
      break;
    }
    case "decision-demand": {
      allow("管理层");
      const p = get(o.projects, v.project);
      need(!["草稿", "退回", "暂缓"].includes(p.status), "请先批准项目");
      const title = text("title");
      need(
        !s.demands.some((d) => d.title === title && d.projectId === p.id),
        "已有同名需求，请沿用原需求",
      );
      const did = `REQ-${String(Math.max(...s.demands.map((d) => Number(d.id.split("-")[1]))) + 1).padStart(3, "0")}`;
      s.demands.push({
        id: did,
        title,
        problem: `战略 ${p.strategy} → 项目 ${p.id}；管理决议：${text("evidence")}；来源会话：${v.conversation || "战略/项目讨论"}`,
        stage: "待受理",
        baseline: "",
        baselineConfirmed: false,
        requested: date("due"),
        committed: "",
        forecast: "",
        owner: "业务Owner",
        evidence: ["决议已批准；需求验收基线尚待Owner确认"],
        projectId: p.id,
      });
      record("战略决议转需求卡", did);
      break;
    }
    case "commit-create": {
      allow("PMO", "项目经理", "管理层", "系统负责人");
      const p = get(o.projects, v.project);
      need(
        !["草稿", "退回", "暂缓"].includes(p.status),
        "项目未批准，不可承诺资源",
      );
      o.commitments.push({
        id: key("ACT", o.commitments),
        project: p.id,
        title: text("title"),
        owner: role("owner"),
        due: date("due"),
        criteria: text("criteria"),
        dependency: v.dependency || "无",
        status: "待完成",
        evidence: [],
      });
      record("分派工作承诺", o.commitments.at(-1)!.id);
      break;
    }
    case "commit-submit": {
      const a = get(o.commitments);
      allow(a.owner);
      need(["待完成", "受阻", "退回"].includes(a.status), "承诺已提交或接受");
      const e = text("evidence");
      a.status = v.decision === "受阻" ? "受阻" : "待验收";
      a.evidence.push(`${actor}：${e}`);
      if (a.status === "受阻")
        o.risks.push({
          id: key("RSK", o.risks),
          project: a.project,
          system: get(o.projects, a.project).system,
          title: a.title + "受阻",
          owner: a.owner,
          due: a.due,
          criteria: a.criteria,
          impact: e,
          status: "待核实",
          evidence: [e],
        });
      record("提交承诺回执");
      break;
    }
    case "commit-check": {
      allow("项目经理", "PMO");
      const a = get(o.commitments);
      need(a.status === "待验收", "先提交工作结果");
      a.status = v.decision === "接受" ? "已接受" : "退回";
      a.evidence.push(`${actor}：${text("evidence")}`);
      record("核验工作交付");
      break;
    }
    case "risk-create": {
      staff();
      const p = get(o.projects, v.project),
        title = text("title");
      need(
        !o.risks.some(
          (r) =>
            r.project === p.id && r.title === title && r.status !== "已关闭",
        ),
        "已有同一风险信号，请补充原记录",
      );
      o.risks.push({
        id: key("RSK", o.risks),
        project: p.id,
        system: p.system,
        title,
        owner: role("owner"),
        due: date("due"),
        criteria: text("criteria"),
        impact: text("impact"),
        status: "待核实",
        evidence: [],
      });
      record("发现待核实风险", o.risks.at(-1)!.id);
      break;
    }
    case "risk-verify": {
      allow("PMO", "项目经理", "系统负责人");
      const r = get(o.risks);
      need(r.status === "待核实", "风险已核实");
      r.status = v.decision === "误报" ? "误报" : "处理中";
      r.evidence.push(`${actor}：${text("evidence")}`);
      record("核实风险影响");
      break;
    }
    case "risk-escalate": {
      allow("PMO", "项目经理", "系统负责人");
      const r = get(o.risks);
      need(r.status === "处理中", "仅处理中风险可升级");
      r.status = "待管理决定";
      r.evidence.push(text("evidence"));
      record("升级风险请求决策");
      break;
    }
    case "risk-treat": {
      const r = get(o.risks);
      allow(r.status === "待管理决定" ? "管理层" : r.owner);
      need(["处理中", "待管理决定"].includes(r.status), "先完成风险核实");
      r.evidence.push(`${actor}：${text("evidence")}`);
      r.status = r.status === "待管理决定" ? "处理中" : "待验证";
      record("风险处置回执");
      break;
    }
    case "risk-close": {
      allow("PMO", "项目经理");
      const r = get(o.risks);
      need(r.status === "待验证", "须先提供处置结果");
      r.status = v.decision === "关闭" ? "已关闭" : "处理中";
      r.evidence.push(`${actor}对照关闭标准：${text("evidence")}`);
      record("风险验证结论");
      break;
    }
    case "system-check": {
      allow("系统负责人", "运维");
      const sys = get(o.systems),
        actual = number("actual");
      need(actual <= 100, "可用率不可超过100%");
      sys.actual = actual;
      sys.evidence = text("evidence");
      sys.status = actual >= sys.goal ? "正常" : "需关注";
      record("更新系统运行证据");
      break;
    }
    case "release-create": {
      allow("项目经理", "系统负责人");
      const ds = (v.demands || "").split(",").filter(Boolean);
      need(ds.length, "至少关联一项需求");
      ds.forEach((d) => {
        const demand = get(s.demands, d);
        need(
          demand.baselineConfirmed && demand.committed,
          "所有需求须确认基线和排期",
        );
        need(
          !o.releases.some(
            (r) =>
              r.demands.includes(d) && !["已回退", "已验证"].includes(r.status),
          ),
          "需求已在进行中版本，请走版本变更",
        );
      });
      const release: Release = {
        id: key("REL", o.releases),
        title: text("title"),
        system: get(o.systems, v.system).id,
        demands: ds,
        date: date("due"),
        originalDate: date("due"),
        scope: text("scope"),
        status: "待就绪",
        impact: text("impact"),
        confirmations: [],
        readiness: [],
        impls: [],
        history: [],
      };
      o.releases.push(release);
      record("EOS编排版本与Issue（模拟）", release.id);
      break;
    }
    case "release-ready": {
      allow("研发", "测试", "运维", "系统负责人");
      const r = get(o.releases);
      need(["待就绪", "受阻"].includes(r.status), "当前不是就绪检查阶段");
      const e = text("evidence");
      if (v.decision === "缺项") {
        r.status = "受阻";
        r.readiness = r.readiness.filter((x) => x !== actor);
      } else {
        if (!r.readiness.includes(actor)) r.readiness.push(actor);
        r.status = ["研发", "测试", "运维", "系统负责人"].every((x) =>
          r.readiness.includes(x),
        )
          ? "就绪"
          : "待就绪";
      }
      r.history.push(`${actor}就绪检查：${e}`);
      record("Issue就绪检查");
      break;
    }
    case "change-propose": {
      allow("项目经理", "产品经理", "系统负责人");
      const r = get(o.releases);
      need(
        !["已发布", "已验证", "已回退"].includes(r.status) && !r.pending,
        "当前不能发起变更",
      );
      r.pending = {
        date: date("due"),
        scope: text("scope"),
        reason: text("evidence"),
        confirmations: [],
      };
      record("起草版本变更：尚未生效");
      break;
    }
    case "change-confirm": {
      allow("业务Owner", "系统负责人", "管理层");
      const r = get(o.releases);
      need(r.pending, "没有待确认变更");
      const e = text("evidence");
      if (v.decision === "退回") {
        r.history.push(`退回变更：${e}`);
        delete r.pending;
      } else {
        if (!r.pending!.confirmations.includes(actor as Role))
          r.pending!.confirmations.push(actor as Role);
        if (
          ["业务Owner", "系统负责人", "管理层"].every((x) =>
            r.pending!.confirmations.includes(x as Role),
          )
        ) {
          r.history.push(
            `变更前：${r.date} / ${r.scope}；变更依据：${r.pending!.reason}`,
          );
          r.date = r.pending!.date;
          r.scope = r.pending!.scope;
          r.status = "待就绪";
          r.readiness = [];
          r.confirmations = [];
          r.impls.forEach((i) => {
            i.result = "退回";
            i.reason = "基线变化，待重新实现与验证";
          });
          r.demands.forEach((d) => {
            const demand = get(s.demands, d);
            demand.forecast = r.date;
            demand.stage = "待开发";
            demand.evidence.push(
              `版本变更 ${r.id}：原承诺 ${demand.committed} 保留；预测 ${r.date}`,
            );
          });
          delete r.pending;
        }
      }
      record("版本变更授权确认");
      break;
    }
    case "impl-submit": {
      allow("研发");
      const r = get(o.releases);
      need(
        !r.pending && ["就绪", "返工"].includes(r.status),
        "须完成就绪检查；待决变更不可开工",
      );
      need(r.impls.length < 5, "已到5轮重试上限，请新建风险并由系统负责人处理");
      r.impls.push({
        id: `${r.id}-Impl-${r.impls.length + 1}`,
        evidence: text("evidence"),
        review: "",
        result: "待审核",
        reason: "",
      });
      r.status = "待独立审核";
      r.demands.forEach((d) => (get(s.demands, d).stage = "待测试"));
      record("EOS实现候选提交（模拟）");
      break;
    }
    case "impl-review": {
      allow("测试");
      const r = get(o.releases),
        impl = r.impls.at(-1);
      need(!r.pending && r.status === "待独立审核" && impl, "当前无可审核实现");
      impl!.review = text("evidence");
      impl!.result = v.decision === "通过" ? "通过" : "退回";
      impl!.reason = v.reason || "实现缺陷";
      r.status =
        impl!.result === "通过"
          ? "待发布授权"
          : impl!.reason === "环境问题"
            ? "受阻"
            : impl!.reason === "规则问题"
              ? "待规则澄清"
              : "返工";
      if (r.status === "受阻") r.readiness = [];
      r.demands.forEach(
        (d) =>
          (get(s.demands, d).stage =
            impl!.result === "通过" ? "待发布" : "开发中"),
      );
      r.history.push(`独立测试 ${impl!.id}：${impl!.result}，${impl!.review}`);
      record("独立审核记录（模拟证据）");
      break;
    }
    case "release-authorize": {
      allow("系统负责人", "业务Owner");
      const r = get(o.releases);
      need(
        !r.pending &&
          r.status === "待发布授权" &&
          r.impls.at(-1)?.result === "通过",
        "尚未通过独立审核",
      );
      r.history.push(`${actor}发布门禁：${text("evidence")}`);
      if (!r.confirmations.includes(actor as Role))
        r.confirmations.push(actor as Role);
      if (
        ["系统负责人", "业务Owner"].every((x) =>
          r.confirmations.includes(x as Role),
        )
      )
        r.status = "待发布";
      record("发布门禁确认");
      break;
    }
    case "release-publish": {
      allow("运维");
      const r = get(o.releases);
      need(!r.pending && r.status === "待发布", "先完成发布门禁");
      const e = text("evidence");
      r.status = v.decision === "失败" ? "发布失败" : "已发布";
      r.history.push(`${at} 模拟预览发布：${r.status}；${e}`);
      if (r.status === "已发布")
        r.demands.forEach((d) => {
          get(s.demands, d).stage = "已上线待业务验证";
          get(s.demands, d).evidence.push(`${r.id}模拟预览发布：${e}`);
        });
      record("模拟发布回执");
      break;
    }
    case "release-rollback": {
      allow("运维");
      const r = get(o.releases);
      need(["已发布", "发布失败"].includes(r.status), "当前没有需回退的发布");
      r.status = "已回退";
      r.history.push(`回退至上一稳定版本（模拟）：${text("evidence")}`);
      r.demands.forEach((d) => {
        get(s.demands, d).stage = "待开发";
        get(s.demands, d).evidence.push(`${r.id}已回退，业务验证不可提前通过`);
      });
      record("模拟回退回执");
      break;
    }
    case "release-result": {
      allow("业务Owner");
      const r = get(o.releases);
      need(r.status === "已发布", "尚未发布，不可确认业务结果");
      const e = text("evidence");
      r.history.push(`业务验证：${e}`);
      const pass = v.decision === "通过";
      r.status = pass ? "已验证" : "待就绪";
      if (!pass) {
        r.readiness = [];
        r.confirmations = [];
      }
      r.demands.forEach((d) => {
        get(s.demands, d).stage = pass ? "已关闭" : "待开发";
        get(s.demands, d).evidence.push(
          `${r.id}业务${pass ? "验证通过" : "验证退回"}：${e}`,
        );
      });
      record("版本业务验证；项目指标需另行核实");
      break;
    }
    case "report-create": {
      allow("PMO", "项目经理", "系统负责人");
      need(
        ["PMO", "EOS"].includes(v.scene) &&
          ["周报", "月报", "季报"].includes(v.period),
        "请选择场景与周期",
      );
      const scene = v.scene as "PMO" | "EOS";
      need(
        !o.reports.some((r) => r.scene === scene && r.status !== "已确认"),
        "该场景仍有未完成报告，请先处理",
      );
      const required: Role[] =
        scene === "PMO"
          ? ["项目经理", "项目成员", "系统负责人", "业务Owner"]
          : [
              "项目经理",
              "系统负责人",
              "产品经理",
              "研发",
              "测试",
              "运维",
              "业务Owner",
            ];
      o.reports.push({
        id: key("RPT", o.reports),
        scene,
        period: v.period,
        snapshot: `截止 ${at}，事实v${s.version}\n${o.projects.map((p) => `${p.id} ${p.title}：${p.status}；${projectGap(p, s)}`).join("\n")}\n风险未关闭 ${o.risks.filter((r) => !["已关闭", "误报"].includes(r.status)).length}；版本 ${o.releases.map((r) => r.id + ":" + r.status).join("、") || "暂无"}\n上期待办：${o.commitments.map((a) => `${a.id} ${a.title}：${a.status}`).join("；")}\n${v.period === "周报" ? "重点：交付、阻塞和下周承诺" : v.period === "月报" ? "重点：里程碑、容量与质量趋势；不足样本待补充" : "重点：业务贡献、收益复评与能力改进"}`,
        sourceVersion: s.version,
        required,
        responses: {},
        checks: [],
        status: "待员工确认",
        history: [],
      });
      record(`${scene} Agents生成${v.period}（模拟）`, o.reports.at(-1)!.id);
      break;
    }
    case "report-respond": {
      const r = get(o.reports);
      need(
        r.required.includes(actor as Role) && r.status === "待员工确认",
        "当前没有本人的待确认事项",
      );
      r.responses[actor as Role] = text("evidence");
      if (r.required.every((x) => r.responses[x])) r.status = "待专业核对";
      record("员工确认报告事项");
      break;
    }
    case "report-check": {
      const r = get(o.reports);
      allow("项目经理", r.scene === "PMO" ? "PMO" : "系统负责人");
      need(r.status === "待专业核对", "须先收齐相关员工回执");
      r.history.push(`${actor}核对：${text("evidence")}`);
      if (!r.checks.includes(actor as Role)) r.checks.push(actor as Role);
      if (
        ["项目经理", r.scene === "PMO" ? "PMO" : "系统负责人"].every((x) =>
          r.checks.includes(x as Role),
        )
      )
        r.status = "待管理确认";
      record("报告专业核对");
      break;
    }
    case "report-return": {
      allow("PMO", "项目经理", "系统负责人", "管理层");
      const r = get(o.reports);
      need(r.status !== "已确认", "已确认报告不可静默修改，请生成下一周期");
      r.history.push(`退回补证：${text("evidence")}`);
      r.status = "待员工确认";
      r.responses = {};
      r.checks = [];
      record("报告退回补证");
      break;
    }
    case "report-finalize": {
      allow("管理层");
      const r = get(o.reports);
      need(r.status === "待管理确认", "报告尚未核对完成");
      r.status = "已确认";
      r.history.push(`管理确认：${text("evidence")}`);
      o.commitments.push({
        id: key("ACT", o.commitments),
        project: get(o.projects, v.project).id,
        title: text("title"),
        owner: role("owner"),
        due: date("due"),
        criteria: `落实 ${r.id} 管理要求并提交结果`,
        dependency: r.id,
        status: "待完成",
        evidence: [],
      });
      record("报告确认并生成跨期待办");
      break;
    }
    case "lesson-create": {
      staff();
      o.lessons.push({
        id: key("EXP", o.lessons),
        title: text("title"),
        source: text("source"),
        conditions: text("conditions"),
        evidence: text("evidence"),
        status: "候选",
        approvals: [],
        version: 1,
        uses: [],
      });
      record("新增亮点/经验候选", o.lessons.at(-1)!.id);
      break;
    }
    case "lesson-verify": {
      allow("业务Owner", "系统负责人", "PMO");
      const l = get(o.lessons);
      need(["候选", "待补证据"].includes(l.status), "经验不在核实阶段");
      l.evidence += `\n${actor}：${text("evidence")}`;
      if (v.decision === "不采纳") l.status = "不采纳";
      else if (v.decision === "补证") l.status = "待补证据";
      else {
        if (!l.approvals.includes(actor as Role))
          l.approvals.push(actor as Role);
        if (
          ["业务Owner", "系统负责人", "PMO"].every((x) =>
            l.approvals.includes(x as Role),
          )
        )
          l.status = "有效";
      }
      record("核实经验有效性");
      break;
    }
    case "lesson-adopt": {
      staff();
      const l = get(o.lessons);
      need(l.status === "有效", "未核实或失效经验不能推荐采用");
      const p = get(o.projects, v.project);
      need(
        !l.uses.some((u) => u.project === p.id),
        "本项目已采用，请补充复评结果",
      );
      l.uses.push({ project: p.id, owner: actor as Role, result: "待复评" });
      o.commitments.push({
        id: key("ACT", o.commitments),
        project: p.id,
        title: `应用经验：${l.title}`,
        owner: actor as Role,
        due: date("due"),
        criteria: l.conditions,
        dependency: l.id,
        status: "待完成",
        evidence: [],
      });
      record("复用经验并生成行动");
      break;
    }
    case "lesson-result": {
      allow("项目经理", "系统负责人");
      const l = get(o.lessons),
        u = l.uses.find((x) => x.project === v.project);
      need(u, "该项目尚未采用");
      u!.result = text("evidence");
      l.version++;
      if (v.decision === "失效") l.status = "失效";
      record("经验复用效果复评");
      break;
    }
    case "lesson-retire": {
      allow("PMO", "系统负责人");
      const l = get(o.lessons);
      l.status = "失效";
      l.evidence += `\n失效：${text("evidence")}`;
      l.version++;
      record("经验失效并停止推荐");
      break;
    }
    case "source-add": {
      staff();
      const title = text("title", 2),
        content = text("text");
      need(content.length <= 50000, "演示只接收5万字以内文本");
      const object = v.object || "PRJ-001";
      need(
        o.projects.some((p) => p.id === object) ||
          o.systems.some((p) => p.id === object),
        "请选择已存在项目或系统",
      );
      const old = o.sources.find(
        (x) => x.title === title && x.owner === actor && x.source === v.source,
      );
      if (old) {
        need(old.text !== content, "同一来源和内容已存在，不重复入库");
        old.history.push(`v${old.version}：${old.text}`);
        old.text = content;
        old.version++;
        old.status = "待核实";
      } else
        o.sources.push({
          id: key("DOC", o.sources),
          title,
          text: content,
          source: v.source || "直接上传",
          version: 1,
          object,
          owner: actor as Role,
          visibility: v.visibility === "个人" ? "个人" : "项目",
          status: "待核实",
          history: [],
        });
      record("资料候选入库；不覆盖业务基线", old?.id || o.sources.at(-1)!.id);
      break;
    }
    case "source-confirm": {
      allow("PMO", "系统负责人");
      const doc = get(o.sources);
      need(
        doc.visibility === "项目" || doc.owner === actor,
        "无权核实个人资料",
      );
      need(doc.status === "待核实", "当前资料无需核实");
      doc.status = v.decision === "冲突" ? "事实冲突" : "已核实";
      doc.history.push(`v${doc.version} ${actor}核实：${text("evidence")}`);
      record("核实资料归属与来源");
      break;
    }
    case "source-revoke": {
      const doc = get(o.sources);
      allow(doc.owner);
      doc.status = "已撤回";
      record("内容所有者撤回共享");
      break;
    }
    case "demand-note": {
      staff();
      const d = get(s.demands);
      const e = text("evidence");
      d.evidence.push(`${actor}澄清/边界补充：${e}`);
      record("需求澄清留痕；不改冻结基线");
      break;
    }
  }
}
