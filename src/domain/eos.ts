import type { Actor, State } from "./model";

export const EOS_STEPS = [
  {
    agent: "归因 Agent",
    title: "核实问题与冻结验收",
    detail:
      "以重复订单事件为反例，锁定异常提醒的幂等边界。仅生成方案，不修改代码或业务目标。",
    output: "归因方案 · 按订单与事件标识去重；保留重试能力",
  },
  {
    agent: "研发 Agent",
    title: "生成第一轮 Impl",
    detail: "按冻结验收实现最小变更，生成模拟代码差异、单元测试与回滚说明。",
    output: "Impl r1 · 提醒处理器、去重索引与测试草案",
  },
  {
    agent: "Review Agent",
    title: "独立审查 · 退回修复",
    detail:
      "反例发现：网络重试可能再次通知。违反冻结验收“同一事件不重复提醒”；回流研发，不放宽标准。",
    output: "Review R1 · P1：并发重试缺少原子幂等保护",
  },
  {
    agent: "研发 Agent",
    title: "修复并提交第二轮 Impl",
    detail: "补充原子去重与并发重试用例，保留原目标与验收；不触碰发布权限。",
    output: "Impl r2 · 原子幂等修复、并发测试与回滚方案",
  },
  {
    agent: "Review Agent",
    title: "再次独立审查",
    detail:
      "按原验收重建反例，检查重复通知、失败重试、权限与原有订单行为。模拟审查通过。",
    output: "Review R2 · 原验收通过，无新增 P0/P1",
  },
  {
    agent: "验证 Agent",
    title: "验证真实行为路径（模拟）",
    detail:
      "核对模拟合并版本与部署版本一致，分别以业务用户和无权限账号验证提醒、重试与权限隔离。无真实仓库、环境或 CI 被调用。",
    output: "验证记录 · pass（模拟）；环境失败不得计作产品通过",
  },
  {
    agent: "企业大脑",
    title: "汇总证据 · 等待人工确认",
    detail:
      "归因、Impl、Review、验证形成交付包。尚未合并真实代码或发布，也不代表业务目标已经达成。",
    output: "实施交付包 · 待研发/负责人核对，再走原发布与业务验收流程",
  },
] as const;
export const EOS_ACCEPTANCE =
  "同一订单事件不重复提醒；发送失败可重试；无权限用户不能查看订单；保留原订单处理行为。";
export interface EosRun {
  id: string;
  issueId: string;
  step: number;
  status: "running" | "stopped" | "completed";
  started: string;
  updated: string;
  acceptance: string;
}
export type EosCommand = {
  type: "eos";
  action: "start" | "tick" | "stop";
  issueId: string;
};
export function eosIssue(s: State, id: string) {
  return id === "ISS-024"
    ? s.demands.find((d) => d.id === "REQ-024" && d.projectId === "PRJ-001")
    : undefined;
}
export function applyEos(s: State, actor: Actor, c: EosCommand, at: string) {
  if (!eosIssue(s, c.issueId))
    throw new Error("Issue 不存在或不在当前演示授权范围。");
  const runs = (s.eosRuns ||= []);
  const run = runs.find((r) => r.issueId === c.issueId);
  if (c.action === "start") {
    if (actor !== "研发")
      throw new Error("仅研发角色可发起本次 EOS 实施演示。");
    if (run?.status === "running") return;
    if (run?.status === "stopped") {
      run.status = "running";
      run.updated = at;
    } else {
      if (run) throw new Error("本次实施已完成，请先核对交付包；不重复派发。");
      runs.push({
        id: `EOS-${s.version + 1}`,
        issueId: c.issueId,
        step: 0,
        status: "running",
        started: at,
        updated: at,
        acceptance: EOS_ACCEPTANCE,
      });
    }
  } else {
    if (!run || run.status !== "running")
      throw new Error("当前没有运行中的实施。");
    if (c.action === "stop") {
      if (actor !== "研发") throw new Error("仅研发可停止实施演示。");
      run.status = "stopped";
    } else {
      if (actor !== "EOS Agents")
        throw new Error("仅 EOS Agents 可推进执行回执。");
      run.step = Math.min(run.step + 1, EOS_STEPS.length - 1);
      if (run.step === EOS_STEPS.length - 1) run.status = "completed";
    }
    run.updated = at;
  }
  const active = runs.find((r) => r.issueId === c.issueId)!;
  s.events.push({
    id: `EVT-${s.events.length + 1}`,
    at,
    actor,
    object: c.issueId,
    title: `EOS 实施演示 · ${c.action === "stop" ? "已停止" : EOS_STEPS[active.step].title}`,
    detail: "本地模拟；不修改真实代码、冻结标准、需求验收或发布门禁。",
  });
}
