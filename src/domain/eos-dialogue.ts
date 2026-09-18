import { eosSteps, type EosRun } from "./eos";
const results = [
  "结论：归因 Agent 已完成本轮演示核对，下一步仍需你启动研发。\n\n事实：F01 中 23 条评论事件对应 21 条待办；重复回写与漏单有关，但不是已经确认的生产根因。冻结 D01 验收：样本不漏单、重试一致、受限评论隔离。\n\n下一步：围绕 I01 形成最小修复候选；D02 的跨平台新能力不纳入本次修复。保留失败样本和对照日志，不直接改业务基线。",
  "结论：研发 Agent 已生成第一轮实现候选，等待独立 Review；研发自测通过不等于可发布。\n\n事实：M01 仅修改评论回写处理器、待办幂等仓储和失败重试适配，保留原分派规则。候选版本为 demo-r1，附回退开关与变更清单；没有调用真实仓库。\n\n验证：演示 focused tests 为 14/14，覆盖重复回写、受限账号和失败重试；其中使用了 mock 回执，尚未证明完整接线及实际存储读回。\n\n下一步：将冻结验收、候选版本、差异与测试清单交给独立 Review Agent；它不能沿用研发的“已通过”判断。",
  "结论：独立 Review 判定 block：发现 2 个 P1，第一轮实现不得进入发布。\n\n事实：审查独立绑定 demo-r1。P1-1：幂等 helper 在测试中调用，却缺少回写 worker 的完整接线证明；并发重试仍可能覆盖待办状态。P1-2：revision 与 digest 来自调用方自报，只证明彼此相等，不能证明与服务端的预期回执一致。\n\n验证：mock 测试全绿不能排除这两条失败路径。保存独立复现日志、输入和阻断结论，不把历史 block 改写成 approve。\n\n下一步：退回研发，补真实调用链、服务端预期回执和精确比较；冻结 D01 验收不变，原实现与失败证据保留。",
  "结论：研发 Agent 已生成第二轮实现候选，并提交针对两个 P1 的修复说明。\n\n事实：创建 M02（demo-r2），保留 M01。接线为事件受理 → 待处理 → 生成待办 → 状态回写 → 实际读回；预期 revision/digest 由服务端生成，读回只与预期逐字段核对。\n\n验证：补入租户、评论、事件、权限及版本的精确匹配负例；加入 SQL 占位符与实际参数列表逐项断言，避免 mock 通过而存储路径缺参。演示 focused tests 为 21/21，仍不是生产验证。\n\n下一步：把 demo-r2 的差异、预期回执和失败反例交给独立 Review 重新审核，不能仅复用上一轮自测结果。",
  "结论：独立 Review 对第二轮候选给出演示通过；仅解除本轮代码审查阻断，尚未授权发布。\n\n事实：重新绑定 demo-r2，复核调用链接线、服务端 expected receipt 与 actual readback 的精确匹配；补查 SQL 参数数量、顺序、缺参和错租户拒绝路径。\n\n验证：按原验收复放并发、重试、权限隔离与样本回放，示例结论为 P0=0 / P1=0。保留第一轮的 P1 与 block，并追加复验记录，不覆盖历史结论。\n\n下一步：交给验证 Agent 核对候选构建、环境、实际访问路径及失败回退；Review 通过不能代替部署或业务验收。",
  "结论：验证 Agent 已生成本轮模拟行为验证记录；真实 CI、生产环境和部署仍未连接。\n\n事实：以同一候选构建 demo-r2 对照预览路径；分别验证有权限用户与受限账号，并核对事件、待办与回写记录的对应关系。\n\n验证：演示回放覆盖 23 条样本、重复并发、失败重试和越权拒绝。环境失败应判为阻塞，不计产品通过；CI 未执行，不把 focused tests 或模拟 pass 写成 pipeline 成功。\n\n下一步：汇总候选实现、两轮独立 Review、回放证据与回退说明，交由负责人核对 REL01 的发布门禁。",
  "结论：企业大脑已汇总本轮实施包，等待研发与系统负责人确认。\n\n事实：实施包包含归因与冻结验收、两轮实现候选、第一轮阻断、第二轮复验、行为验证与回退草案。每份结论绑定对应候选版本，失败记录仍可追溯。\n\n确认边界：真实 CI、合并批准、部署授权与 D01 业务验收均未完成；R01 不自动关闭，P02 目标达成不变。\n\n下一步：先人工核对完整证据，再按发布审批推进；不能通过手工改绿审核记录或降低验收跳过门禁。",
];
/** Adapted demonstration, not a claim that the referenced PeopleOS MR ran in Jingpai. */
export function eosStageAnswer(run: EosRun, index: number, viewOnly = false) {
  if (index < 0 || index >= eosSteps(run.issueId).length)
    throw new Error("执行阶段不存在。");
  const step = eosSteps(run.issueId)[index];
  let answer =
    run.issueId === "I01"
      ? results[index]
      : `结论：${step.agent} · ${step.title}（本地模拟）。\n\n事实：${step.detail}\n\n结果：${step.output}\n\n下一步：核对本轮产物后，再手动推进后续阶段；不代表已发布。`;
  if (index === 4)
    answer = answer.replace(
      /下一步：[\s\S]*$/,
      "下一步：交管理层或项目经理人工审核；可通过或填写理由退回。获批后研发才可启动验证，不授权生产发布。",
    );
  if ((run.revision || 2) > 2 && index >= 3) {
    answer = `结论：本轮修复候选 r${run.revision}，接续人工退回要求。\n\n审核意见：${run.reviewHistory?.filter((h) => h.decision === "rejected").at(-1)?.reason}\n\n事实：保留上一轮实现和失败证据，本轮按原冻结验收补齐上述缺口；${step.agent} 的证据绑定新候选，不能复用旧版通过结论。\n\n验证：${index === 3 ? "已生成补充反例与修复说明，待独立重审" : index === 4 ? "独立重验通过（模拟），等待人工重新审核" : "按人工批准的新候选核对模拟行为路径，未连接真实 CI 或发布"}。\n\n下一步：${index === 4 ? "人工重新审核，可再次退回，不自动批准。" : "核对本阶段产物，再继续下一关口；不降低冻结验收。"}`;
  }
  return `围绕 ${step.agent} · ${step.title}\n\n${answer}${viewOnly ? "\n\n查看说明：本次只读取已完成阶段的记录，没有推进或重跑任何 Agent。" : ""}`;
}
