import { DEFAULT_TABS, visibleEntities } from "./ontology";
import { nextAction, type Role, type State } from "./model";
import type { BrainContext } from "./experience";
import type { Personal } from "./personal";
import { CATALOG_DATE } from "./catalog";
import { narrativeText } from "./narrative";

export const PERIODS = ["周报", "月报", "季报", "年度总结"] as const;
export type Period = (typeof PERIODS)[number];
export interface ReportView {
  period: Period | "自定义Topic";
  topicId?: string;
}
export interface Topic {
  id: string;
  title: string;
  summary: string;
  objectIds: string[];
}
export interface ReportDraft {
  notes: string[];
  confirmedAt?: string;
  version?: number;
  snapshot?: string;
}
export interface FocusAssignment {
  id: string;
  period: Period;
  recipients: Role[];
  content: string;
  at: string;
  issuer: Role;
}
export const TEAM: Role[] = [
  "PMO",
  "项目经理",
  "业务Owner",
  "产品经理",
  "研发",
];
export type ReportAction =
  | { kind: "confirm"; key: string; title: string }
  | { kind: "focus"; period: Period; recipients: Role[]; content: string };
export function periodLabel(period: ReportView["period"], date = new Date()) {
  const year = date.getFullYear(),
    month = date.getMonth() + 1;
  if (period === "年度总结") return `${year}年`;
  if (period === "季报") return `${year}年Q${Math.ceil(month / 3)}`;
  if (period === "月报") return `${year}年${month}月`;
  const monday = new Date(
    year,
    month - 1,
    date.getDate() - ((date.getDay() + 6) % 7),
  );
  return `${monday.getFullYear()}/${monday.getMonth() + 1}/${monday.getDate()} 当周`;
}
export function topicsFor(s: State, role: Role, p: Personal): Topic[] {
  const visible = visibleEntities(s, role);
  if (s.catalogVersion === "v03") {
    const seeds = [
      {
        id: "v03-comment-loop",
        title: "高风险评论处置闭环",
        summary:
          "从 73% 待复核，到漏单核实、修复门禁与消费者问题验证；不把分派当解决。",
        objectIds: ["S02", "P02", "X02", "D01", "R01", "C01", "REL01"],
      },
      {
        id: "v03-supply-evidence",
        title: "供应商回执与预警可信度",
        summary:
          "跟踪 2 条缺原因回执、55% 预警率与采购 Owner 核验，补证后再评价。",
        objectIds: ["P06", "X08", "V01", "R02", "F04"],
      },
      {
        id: "v03-eos-quality",
        title: "AI 交付与独立审核",
        summary:
          "D01 → I01 → M01 → REL01；实现、审核、发布和业务观察分别留证。",
        objectIds: ["P12", "X02", "D01", "I01", "M01", "REL01"],
      },
      {
        id: "v03-overseas",
        title: "品牌出海准备与立项",
        summary:
          "P09 市场验证先于 P10 试单，X10 尚待建设；当前不填虚假完成率。",
        objectIds: ["S04", "P09", "P10", "X10"],
      },
    ];
    return [...seeds, ...(p.topics || [])]
      .map((t) => ({
        ...t,
        title: narrativeText(t.title, visible),
        summary: narrativeText(t.summary, visible),
        objectIds: t.objectIds.filter((id) => visible.some((e) => e.id === id)),
      }))
      .filter((t) => t.objectIds.length);
  }
  const first = visible.find((e) => e.id === "PRJ-001");
  const seeds: Topic[] = first
    ? [
        {
          id: "order-goal",
          title: "订单协同目标达成",
          summary: "持续跟踪响应时长、接口依赖与业务验收证据。",
          objectIds: [first.id],
        },
        {
          id: "delivery-risk",
          title: "交付风险复盘",
          summary: "汇总重点项目风险、责任人及下一步。",
          objectIds: visible.filter((e) => e.kind === "项目").map((e) => e.id),
        },
      ]
    : [];
  return [...seeds, ...(p.topics || [])].map((t) => ({
    ...t,
    objectIds: t.objectIds.filter((id) => visible.some((e) => e.id === id)),
  }));
}
export function reportingItems(
  s: State,
  role: Role,
  p: Personal,
  topicId?: string,
) {
  const all = visibleEntities(s, role);
  const ids = (
    topicId
      ? topicsFor(s, role, p).find((t) => t.id === topicId)?.objectIds || []
      : p.follows
  ).filter((id) => all.some((e) => e.id === id));
  if (ids.length || topicId) return all.filter((e) => ids.includes(e.id));
  return all.filter((e) => DEFAULT_TABS[role].includes(e.kind));
}
export function reportContext(
  role: Role,
  view: ReportView,
  p: Personal,
  s: State,
): BrainContext {
  const topic = topicsFor(s, role, p).find((t) => t.id === view.topicId);
  const label = topic
    ? topic.title
    : `${periodLabel(view.period)} · ${view.period}`;
  return {
    key: `${role}:report:${view.topicId || view.period}:${view.topicId ? "ongoing" : periodLabel(view.period)}`,
    title: label,
    route: "home",
    report: view,
    followedIds: reportingItems(s, role, p, view.topicId).map((e) => e.id),
  };
}
export function reportText(
  s: State,
  role: Role,
  p: Personal,
  ctx: BrainContext,
) {
  const rows = reportingItems(s, role, p, ctx.report?.topicId);
  const focus = (s.reportFocus || []).filter(
    (f) => f.recipients.includes(role) && f.period === ctx.report?.period,
  );
  return narrativeText(
    [
      `${ctx.title} · 演示快照 v${s.version}`,
      "当前快照汇总，不代表已接入该周期的历史趋势。",
      ...(s.catalogVersion === "v03"
        ? [periodSummary(s, role, p, ctx.report || { period: "周报" })]
        : []),
      ...rows.map(
        (e) =>
          `${e.title}（${e.id}）\n目标：${e.goal}\n当前：${e.actual}；差距：${e.gap}\n风险：${e.risk}\n下一步：${e.next}`,
      ),
      ...focus.map((f) => `上级关注：${f.content}`),
      ...(p.reportDrafts?.[ctx.key]?.notes || []).map((n) => `补充关注：${n}`),
    ].join("\n\n"),
    visibleEntities(s, role),
  );
}
export function reportReply(
  s: State,
  role: Role,
  p: Personal,
  ctx: BrainContext,
  question: string,
): { answer: string; action?: ReportAction; note?: string } {
  if (/下发|布置/.test(question)) {
    if (role !== "管理层")
      return {
        answer:
          "当前演示组织关系中，只有管理层可以向所属团队下发汇报关注点。你可以补充自己的汇报，不会向其他人派发。",
      };
    const recipients = TEAM.filter((r) => question.includes(r));
    const period =
      PERIODS.find((v) => question.includes(v)) ||
      (ctx.report?.period === "自定义Topic" ? "周报" : ctx.report?.period) ||
      "周报";
    return {
      answer:
        "已整理下发草稿，请核对接收人、周期与关注内容。确认后写入演示团队成员的汇报，不发送外部消息。",
      action: {
        kind: "focus",
        period,
        recipients: recipients.length ? recipients : TEAM,
        content: question.trim(),
      },
    };
  }
  if (/确认|定稿/.test(question))
    return {
      answer:
        "请核对当前汇总后确认。确认只保存本次汇报快照，不替代业务审批，也不会将未验证目标写成已达成。",
      action: { kind: "confirm", key: ctx.key, title: ctx.title },
    };
  if (/调整|补充|重点|关注|改为|增加|删除/.test(question))
    return {
      answer: `已将你的调整记录为本期汇报的补充关注，原始业务事实不变：\n${question}\n\n可点击顶部标题查看更新后的汇报，再输入“确认本期汇报”核对定稿。`,
      note: question.trim(),
    };
  return {
    answer: `${reportText(s, role, p, ctx)}\n\n建议先核实目标差距与风险证据，再确定下一步。可输入“补充关注：…”或“确认本期汇报”。本轮为演示规则回复。`,
  };
}
export interface InboxItem {
  id: string;
  kind: string;
  title: string;
  summary: string;
  objectId: string;
  route?: import("./model").Route;
  body?: string;
}
export function inboxItems(s: State, role: Role): InboxItem[] {
  if (s.catalogVersion === "v03") {
    const visible = visibleEntities(s, role);
    const rows: (InboxItem & { roles?: Role[] })[] = [
      {
        id: "v03-decision-capacity",
        kind: "待处理",
        title: "P02 核实与 P03 上线：技术容量待协调",
        summary:
          "PMO 提请 · 同一技术负责人承担日志核实与发布门禁，需确认优先级。",
        objectId: "O03",
        roles: ["管理层", "PMO"],
        body: "方案 A 先完成 P02 的 C01 核实并人工补查；方案 B 优先 P03 门禁但需明确漏单临时控制。O02 负责优先级，O03 负责容量。当前只有方案，P03 原基线未修改。",
      },
      {
        id: "v03-sample-check",
        kind: "待处理",
        title: "9/19 日志核对：还需范围对照",
        summary: "C01 · E04 需提交根因、影响条数及是否缺陷；E03 接收交付。",
        objectId: "C01",
        roles: ["项目经理", "研发", "产品经理", "PMO", "系统负责人"],
        body: "F01 有 23 条事件、21 条待办，3 次回写 ID 重复；当前不能只凭相关性认定根因。E03 提供 F02 范围，E04 补日志对照。上传材料不等于交付被接收。",
      },
      {
        id: "v03-scope-clarify",
        kind: "待处理",
        title: "跨平台评论聚合：请补业务样例",
        summary:
          "D02 待澄清 · 目标平台、公开评论授权、验收与期望效果尚未确认。",
        objectId: "D02",
        roles: ["业务Owner", "产品经理", "项目经理"],
        body: "原范围 F02 仅含单平台。D02 是新增能力，不是 D01 的修复范围，不纳入 REL01。E05 补样例后由 E12 澄清，再交 PMO 评估资源。",
      },
      {
        id: "v03-review",
        kind: "待处理",
        title: "候选实现 r1：独立审核待核对",
        summary: "M01 · 重复回写、失败重试、权限隔离和并发反例均需验证。",
        objectId: "I01",
        roles: ["研发", "产品经理", "测试", "系统负责人"],
        body: "I01 当前待实现，M01 为候选 r1，尚未通过独立审核。EOS 演示可呈现 r1 退回、r2 修复的回路；不能把预设脚本当已发生结果。",
      },
      {
        id: "v03-shared-scope",
        kind: "被分享",
        title: "已批准范围与评论样本摘要",
        summary: "E03 分享 · 单平台原范围；73% 分派率在漏单期间待复核。",
        objectId: "F02",
        body: "F02 定义单平台、单品牌既有范围；F01 仅展示获授权的脱敏摘要。需要先核实样本再判断 D01 缺陷；D02 跨平台能力另走需求澄清，不扩大资料权限。",
      },
      {
        id: "v03-report-B01",
        kind: "团队报告",
        title: "9 月项目周报草稿：两处事实待确认",
        summary: "B01 · P02 指标口径与 C01 核实结论尚待 E03 / E04 签收。",
        objectId: "B01",
        body: "本期草稿：P02 当前 73%（待复核），R01 待核实，C01 待完成，REL01 拟定。先补 F01 / F02 核对，PMO 汇总后负责人确认；不写‘运行正常’。",
      },
      {
        id: "v03-procurement",
        kind: "被分享",
        title: "采购协同回执：2 条变更原因缺失",
        summary: "F04 · 待补原因与新日期，尚不能给供应商定性为延期。",
        objectId: "P06",
        roles: ["管理层", "PMO"],
        body: "大集采与供应商协同（P06）预警率 55%，目标 80%。R02 待补证，V01 只补自己工作包。采购 Owner 校验后再判断是数据、流程还是交付问题。",
      },
    ];
    return rows
      .filter(
        (i) =>
          (!i.roles || i.roles.includes(role)) &&
          visible.some((e) => e.id === i.objectId),
      )
      .map((i) => ({
        ...i,
        title: narrativeText(i.title, visible),
        summary: narrativeText(i.summary, visible),
        body: i.body ? narrativeText(i.body, visible) : undefined,
      }));
  }
  const n = nextAction(s);
  if (!visibleEntities(s, role).some((e) => e.id === "PRJ-001")) return [];
  return [
    ...(n.role === role
      ? [
          {
            id: `action-${s.version}-${n.title}`,
            kind: "待处理",
            title: n.title,
            summary: n.reason,
            objectId: "PRJ-001",
            route: n.route,
          },
        ]
      : []),
    {
      id: "shared-interface",
      kind: "被分享",
      title: "接口口径确认记录",
      summary: "项目经理分享 · 需要核对接口字段、异常处理与责任边界。",
      objectId: "PRJ-001",
    },
    {
      id: `team-report-${s.version}`,
      kind: "团队报告",
      title: "项目进展与阻塞简报",
      summary: `PMO 汇总 · 当前响应 ${s.actual} 小时，目标 ≤${s.goal} 小时。`,
      objectId: "PRJ-001",
    },
  ];
}

export function periodSummary(
  s: State,
  role: Role,
  p: Personal,
  view: ReportView,
): string {
  const rows = reportingItems(s, role, p, view.topicId);
  const projects = rows.filter((e) => e.kind === "项目");
  const headings: Record<ReportView["period"], string> = {
    周报: "本周先核实阻塞与承诺",
    月报: "本月核对目标差距与费用预测",
    季报: "本季检查战略贡献与项目组合",
    年度总结: "年度视角区分已交付、已验证和未启动",
    自定义Topic: "围绕主题持续追踪证据与结果",
  };
  const priority = rows.filter((e) => e.attention).slice(0, 3);
  return `${headings[view.period]}。\n${projects.length ? `当前范围：${projects.length} 个项目；${projects.filter((e) => e.status === "已结束").length} 个已结束、${projects.filter((e) => e.status === "进行中").length} 个进行中、${projects.filter((e) => e.status === "准备立项").length} 个准备立项。已结束不等于收益已经验证。` : `当前汇总 ${rows.length} 项职责或关注事项，${rows.filter((e) => e.attention).length} 项需推进或补证。`}\n${priority.map((e) => `${e.title}（${e.id}）：${e.actual}；${e.gap}。`).join("\n")}\n数据截至 ${CATALOG_DATE}，仅该日虚拟快照；月/季/年度视角不虚构历史趋势与增长。`;
}
