import type { Actor, State } from "./model";
import { plansFor, canReviewDelivery, bugs } from "./delivery";

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
  if (issueId === "I03") {
    const details = [
      "冻结并发配额审批的验收：两个账号同时提交同一申请，只能生效一次。预设反例中两个请求均读取待审批状态，随后各写入一条生效记录；保留时间线与审计日志，尚非真实生产归因。",
      "初版候选在提交前检查审批状态，并增加重复点击与失败重试单测。串行用例通过，但先查询再写入存在竞态，仍须独立并发复验；未连接真实仓库。",
      "独立 Review 用同步屏障同时释放两个审批请求，复现两次生效，判定 P1 阻断。仅增加前置查询不能保证原子性；保留初版、请求日志和读回证据，不降低验收。",
      "新候选把待审批到已生效的条件更新、配额变更与审计记录放在同一事务；只有更新成功的请求可产生业务效果，另一个返回已有结果。补失败回滚、重试、越权和历史意见反例。",
      "独立复审重新绑定修复候选，模拟核对双账号并发、超时重试、事务回滚、越权拒绝及审计读回：每个申请只有一次生效。提交项目经理人工审核，可确认或退回，不授权发布。",
      "人工批准后在模拟预览路径复验并发审批和历史申请，核对申请、配额及审计的一致性。测试证据绑定本轮候选；真实 CI 和生产环境未执行，不等于测试人员已签收。",
      "汇总并发配额审批的归因、两轮实现、P1 阻断、独立复审、人工意见与模拟验证。可转独立测试；市场健康度与渠道配额优化仍处测试阶段，原 P1 未自动关闭，配额候选版未发布。",
    ];
    const outputs = [
      "并发时间线与冻结验收",
      "初版候选 · 待独立审查",
      "P1 阻断 · 重复生效反例",
      "事务原子修复与回退草案",
      "独立复审记录 · 待人工审核",
      "预览验证记录（模拟）",
      "实施交付包 · 待转测试",
    ];
    return EOS_STEPS.map((step, i) => ({
      ...step,
      detail: details[i],
      output: `并发配额审批 · ${outputs[i]}`,
    }));
  }
  if (["I-BATCH", "I-SAMPLE"].includes(issueId)) {
    const subject =
      issueId === "I-BATCH" ? "批次映射边界校验" : "海外洞察样本授权校验";
    const samples =
      issueId === "I-SAMPLE"
        ? "20 条国家/语言基线样本及 18 条边界反例"
        : "18 条边界样本";
    return EOS_STEPS.map((step, i) => ({
      ...step,
      detail: [
        `${subject}：按已确认需求与资源计划建立反例，冻结验收；只运行本地模拟。`,
        `${subject}：提交初版校验实现与 12 条模拟单测；尚未独立审核。`,
        `独立审查阻断：校验函数未接入实际导入入口，异常样本可绕过；保留反例及 r1 证据。`,
        `接入导入入口并补缺字段、越权与重复提交反例；形成新候选，不覆盖 r1。`,
        `按冻结验收独立复放 ${samples}，入口与权限反例通过；交项目经理人工审核，未批准发布。`,
        `人工批准后核对候选与预览路径；${samples}模拟通过，不代表真实环境测试。`,
        `汇总 ${subject} 的实现、Review、人工决定与验证证据；待转独立测试，业务验收未完成。`,
      ][i],
      output: `${subject} · ${["归因与冻结验收", "初版候选", "P1 阻断证据", "修复候选", "独立复审记录", "模拟行为验证", "实施交付包"][i]}`,
    }));
  }
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
  humanReview?: "pending" | "approved" | "rejected";
  revision?: number;
  parentRunId?: string;
  reviewHistory?: {
    actor: Actor;
    at: string;
    decision: "approved" | "rejected";
    reason: string;
  }[];
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
export interface EosTestTask {
  id: string;
  runId: string;
  issueId: string;
  implId: string;
  recipient: "测试";
  recipientId?: string;
  status: "待测试";
  acceptance: string;
  createdAt: string;
  issuer: "研发";
}
export type EosCommand = {
  type: "eos";
  action:
    | "start"
    | "next"
    | "tick"
    | "stop"
    | "restart"
    | "transfer-test"
    | "approve"
    | "reject";
  reason?: string;
  issueId: string;
  expectedStep?: number;
  expectedRunId?: string;
};
export function eosIssue(s: State, id: string) {
  if (s.catalogVersion === "v03") {
    const plan = plansFor(s).find(
      (p) => p.issue === id && p.status === "已入队",
    );
    if (plan) return { id: plan.demand, projectId: plan.project };
    return undefined;
  }
  return id === "ISS-024"
    ? s.demands.find((d) => d.id === "REQ-024" && d.projectId === "PRJ-001")
    : undefined;
}
export function applyEos(s: State, actor: Actor, c: EosCommand, at: string) {
  if (!eosIssue(s, c.issueId)) {
    if (
      s.catalogVersion === "v03" &&
      (bugs.some((b) => b.issue === c.issueId) ||
        plansFor(s).some((p) => p.issue === c.issueId))
    )
      throw new Error(
        "该 Issue 尚无可执行的已批准实施计划，或已关闭。请先确认需求与资源计划；逐步演示可选择“并发配额审批重复生效”或“回写重复导致待办队列漏单”。",
      );
    throw new Error("Issue 不存在或不在当前演示授权范围。");
  }
  const runs = (s.eosRuns ||= []);
  const run = runs.find((r) => r.issueId === c.issueId);
  if (c.action === "approve" || c.action === "reject") {
    if (!canReviewDelivery(actor))
      throw new Error("请由管理层、项目经理或 PMO 人工审核，研发不可自审。");
    if (
      !run ||
      run.step !== 4 ||
      run.status !== "waiting" ||
      run.humanReview !== "pending" ||
      c.expectedRunId !== run.id
    )
      throw new Error("仅可审核当前待人工确认的候选，请刷新记录。");
    if (!c.reason?.trim()) throw new Error("请填写审核依据或退回原因。");
    run.humanReview = c.action === "approve" ? "approved" : "rejected";
    (run.reviewHistory ||= []).push({
      actor,
      at,
      decision: run.humanReview,
      reason: c.reason.trim(),
    });
    run.updated = at;
    if (c.action === "reject") {
      (s.eosHistory ||= []).push(structuredClone(run));
      runs.splice(runs.indexOf(run), 1, {
        ...structuredClone(run),
        id: `EOS-${s.version + 1}`,
        parentRunId: run.id,
        revision: (run.revision || 2) + 1,
        step: 2,
        status: "waiting",
        humanReview: undefined,
        started: at,
        updated: at,
      });
    }
    s.events.push({
      id: `EVT-${s.events.length + 1}`,
      at,
      actor,
      object: c.issueId,
      title:
        c.action === "approve"
          ? "人工审核通过 · 允许模拟验证"
          : "人工审核退回 · 新修复轮次待研发",
      detail: c.reason.trim(),
    });
    return;
  }
  if (c.action === "transfer-test") {
    if (actor !== "研发") throw new Error("仅研发可转测试。");
    if (!run || run.status !== "completed" || run.step !== EOS_STEPS.length - 1)
      throw new Error("请先完成本轮实施包，再转测试。");
    if (c.expectedRunId !== run.id)
      throw new Error("实施轮次已变化，请核对后重试。");
    if (s.eosTestTasks?.some((task) => task.runId === run.id))
      throw new Error("本轮已转测试，请勿重复派发。");
    (s.eosTestTasks ||= []).push({
      id: `TEST-${run.id}`,
      runId: run.id,
      issueId: run.issueId,
      implId:
        run.issueId === "I01" && (run.revision || 2) === 2
          ? "M02"
          : run.issueId === "ISS-024"
            ? "IMPL-024"
            : `IMPL-${run.id}`,
      recipient: "测试",
      recipientId: s.catalogVersion === "v03" ? "E13" : undefined,
      status: "待测试",
      acceptance: run.acceptance,
      createdAt: at,
      issuer: "研发",
    });
    s.events.push({
      id: `EVT-${s.events.length + 1}`,
      at,
      actor,
      object: run.issueId,
      title: "已转测试 · 独立测试待办已生成",
      detail:
        "接收人：测试工程师；关联当前实施包与冻结验收。仅本地演示，不代表测试通过、生产发布或业务验收。",
    });
    return;
  }
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
        revision: 2,
        acceptance:
          s.catalogVersion === "v03"
            ? plansFor(s).find((p) => p.issue === c.issueId)!.acceptance
            : EOS_ACCEPTANCE,
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
    if (
      s.catalogVersion === "v03" &&
      run.step === 4 &&
      run.humanReview !== "approved"
    )
      throw new Error("独立复审后须经人工审核通过，才能进入验证。");
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
      if (s.catalogVersion === "v03" && run.step === 4)
        run.humanReview = "pending";
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
