import { DEFAULT_TABS, visibleEntities } from "./ontology";
import { nextAction, type Role, type State } from "./model";
import type { BrainContext } from "./experience";
import type { Personal } from "./personal";

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
  const ids = topicId
    ? topicsFor(s, role, p).find((t) => t.id === topicId)?.objectIds || []
    : p.follows;
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
  return [
    `${ctx.title} · 演示快照 v${s.version}`,
    "当前快照汇总，不代表已接入该周期的历史趋势。",
    ...rows.map(
      (e) =>
        `${e.title}（${e.id}）\n目标：${e.goal}\n当前：${e.actual}；差距：${e.gap}\n风险：${e.risk}\n下一步：${e.next}`,
    ),
    ...focus.map((f) => `上级关注：${f.content}`),
    ...(p.reportDrafts?.[ctx.key]?.notes || []).map((n) => `补充关注：${n}`),
  ].join("\n\n");
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
export function inboxItems(s: State, role: Role) {
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
