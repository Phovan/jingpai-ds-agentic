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
export const CATALOG_EOS_ACCEPTANCE =
  "同一评论事件重复回写不漏单；23 条样本回放无遗漏；失败重试后待办一致；受限评论权限隔离；补充并发与乱序反例。原验收不可降低。";
export function eosSteps(issueId: string) {
  if (issueId !== "I01") return EOS_STEPS;
  return EOS_STEPS.map((step, index) => ({
    ...step,
    ...[
      {
        detail:
          "引用 F01 / F02 核实 X02 的 23 条事件、21 条待办和重复回写。冻结 D01 验收；缺证或无法复现应退回核实。本演示用预设反例继续，不代表真实根因已确认。",
        output: "归因候选 · 评论回写幂等与待办一致性；并发样例待验证",
      },
      {
        detail:
          "研发 Agent 提交 M01 r1 最小修复候选：评论处理、幂等存储与失败重试。模拟单测 14/14，但尚未证明后台任务接线和证据回执可信，须独立审核。",
        output: "M01 r1 · 候选差异与回放用例（模拟）",
      },
      {
        detail:
          "独立审查发现两项 P1 阻断：幂等 helper 未接入实际后台任务；候选版本和摘要由调用方自报，缺少服务端预期值与精确读回校验。保留失败证据并退回修复。",
        output: "Review r1 · 两项 P1 阻断；保留初版和失败记录（模拟）",
      },
      {
        detail:
          "研发 Agent 创建 M02 r2，补后台任务接线、服务端预期回执和精确读回，加入 SQL 参数数量反例。模拟回归 21/21；M01 r1 及阻断证据保留，仍须独立复验。",
        output: "M02 r2 · 接线与回执修复、参数反例及回退草案（模拟）",
      },
      {
        detail:
          "独立复审绑定 demo-r2 候选，重验任务接线、回执读回与 SQL 参数边界，并按原标准核对重复回写、失败重试和权限。模拟 P0=0、P1=0；历史阻断不删除。",
        output: "Review r2 · 模拟通过；未授权生产发布",
      },
      {
        detail:
          "验证 Agent 对照模拟构建版本和预览路径，验证 23 条回放、并发、重试和受限评论隔离。真实环境与 CI 未连接。",
        output: "预览行为验证 · 模拟 pass；REL01 生产授权与回退仍须核对",
      },
      {
        detail:
          "汇总 I01→M01/M02→Review→验证的证据。D01 仍待业务验收，R01 不自动关闭，REL01 未发布。",
        output: "实施包待人工确认 · 不改变 P02 基线或 S02 贡献状态",
      },
    ][index],
  }));
}
export interface EosRun {
  id: string;
  issueId: string;
  step: number;
  status: "waiting" | "running" | "stopped" | "completed";
  mode?: "manual";
  readyAt?: string;
  started: string;
  updated: string;
  acceptance: string;
}
export type EosCommand = {
  type: "eos";
  action: "start" | "next" | "tick" | "stop" | "restart";
  issueId: string;
  expectedStep?: number;
};
export function eosIssue(s: State, id: string) {
  if (s.catalogVersion === "v03" && id === "I01")
    return { id: "D01", projectId: "P02" };
  return id === "ISS-024"
    ? s.demands.find((d) => d.id === "REQ-024" && d.projectId === "PRJ-001")
    : undefined;
}
export function applyEos(s: State, actor: Actor, c: EosCommand, at: string) {
  if (!eosIssue(s, c.issueId))
    throw new Error("Issue 不存在或不在当前演示授权范围。");
  const runs = (s.eosRuns ||= []);
  const run = runs.find((r) => r.issueId === c.issueId);
  if (c.action === "start" || c.action === "restart") {
    if (actor !== "研发")
      throw new Error("仅研发角色可发起本次 EOS 实施演示。");
    if (c.action === "restart" && run) {
      if (run.mode === "manual" && run.status === "running")
        throw new Error("请先停止正在执行的阶段。");
      (s.eosHistory ||= []).push(structuredClone(run));
      runs.splice(runs.indexOf(run), 1);
    } else if (run?.status === "running" || run?.status === "waiting") return;
    if (c.action !== "restart" && run?.status === "stopped") {
      run.status = "waiting";
      run.mode = "manual";
      delete run.readyAt;
      run.updated = at;
    } else {
      if (run && c.action !== "restart")
        throw new Error("本次实施已完成，请先核对交付包；不重复派发。");
      runs.push({
        id: `EOS-${s.version + 1}`,
        issueId: c.issueId,
        step: 0,
        status: "waiting",
        mode: "manual",
        started: at,
        updated: at,
        acceptance:
          c.issueId === "I01" ? CATALOG_EOS_ACCEPTANCE : EOS_ACCEPTANCE,
      });
    }
  } else if (c.action === "next") {
    if (actor !== "研发") throw new Error("仅研发可推进下一步。");
    if (
      !run ||
      run.mode !== "manual" ||
      !["waiting", "stopped"].includes(run.status)
    )
      throw new Error("当前阶段不可推进，请等待执行结束。");
    if (c.expectedStep !== run.step)
      throw new Error("执行阶段已变化，请核对后重试。");
    if (run.step >= EOS_STEPS.length - 1) throw new Error("所有阶段已经完成。");
    run.status = "running";
    run.readyAt = new Date(Date.parse(at) + 1800).toISOString();
    run.updated = at;
  } else {
    if (!run || run.status !== "running")
      throw new Error("当前没有运行中的实施。");
    if (c.action === "stop") {
      if (actor !== "研发") throw new Error("仅研发可停止实施演示。");
      run.status = "stopped";
      delete run.readyAt;
    } else {
      if (actor !== "EOS Agents")
        throw new Error("仅 EOS Agents 可推进执行回执。");
      if (run.mode !== "manual")
        throw new Error("历史记录不可自动推进，请开始新的逐步演示。");
      if (run.readyAt && Date.parse(at) < Date.parse(run.readyAt))
        throw new Error("本阶段仍在执行中。");
      run.step = Math.min(run.step + 1, EOS_STEPS.length - 1);
      run.status = run.step === EOS_STEPS.length - 1 ? "completed" : "waiting";
      delete run.readyAt;
    }
    run.updated = at;
  }
  const active = runs.find((r) => r.issueId === c.issueId)!;
  s.events.push({
    id: `EVT-${s.events.length + 1}`,
    at,
    actor,
    object: c.issueId,
    title: `EOS 实施演示 · ${c.action === "stop" ? "已停止" : c.action === "next" ? "开始：" + eosSteps(c.issueId)[active.step + 1].title : eosSteps(c.issueId)[active.step].title}`,
    detail: "本地模拟；不修改真实代码、冻结标准、需求验收或发布门禁。",
  });
}
