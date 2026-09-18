import { X } from "lucide-react";
import { useState } from "react";
import { eosSteps, type EosRun } from "../domain/eos";
import type { Entity } from "../domain/ontology";
import { narrativeText } from "../domain/narrative";
import { Modal } from "./ui";

export function EosExecutionPanel({
  run,
  entities,
  drawer,
  onClose,
  onStop,
  onExport,
  onNext,
  onView,
  onRestart,
  canAdvance,
  canReview,
  onReview,
  testTask,
  onTransferTest,
  transferring,
  onPreviewTest,
}: {
  run: EosRun;
  entities: Entity[];
  drawer: boolean;
  onClose: () => void;
  onStop: () => void;
  onExport: () => void;
  onNext: () => void;
  onView: (index: number) => void;
  onRestart: () => void;
  canAdvance: boolean;
  canReview: boolean;
  onReview: (
    action: "approve" | "reject",
    reason: string,
  ) => void | Promise<void>;
  testTask?: import("../domain/eos").EosTestTask;
  onTransferTest: () => void;
  transferring: boolean;
  onPreviewTest: () => void;
}) {
  const [reason, setReason] = useState(""),
    [reviewing, setReviewing] = useState(false);
  const review = async (action: "approve" | "reject") => {
    if (reviewing) return;
    setReviewing(true);
    try {
      await onReview(action, reason);
    } finally {
      setReviewing(false);
    }
  };
  const steps = eosSteps(run.issueId);
  const text = (value: string) => narrativeText(value, entities);
  const manual = run.mode === "manual";
  const content = (
    <>
      <p className="muted">
        {run.id} ·{" "}
        {entities.find((e) => e.id === run.issueId)?.title || run.issueId} ·
        本地模拟
      </p>
      <div className="eos-run-status">
        <strong>
          {run.status === "completed"
            ? "交付包就绪 · 待人工确认"
            : !manual
              ? "历史执行记录"
              : run.status === "running"
                ? "正在执行当前阶段"
                : run.status === "stopped"
                  ? "已停止 · 可继续下一步"
                  : "阶段完成 · 等待下一步"}
        </strong>
        <small>每次只运行一个阶段。不连接真实仓库或发布环境。</small>
      </div>
      <details className="eos-acceptance">
        <summary>冻结验收 · 执行中不变更</summary>
        <p>{text(run.acceptance)}</p>
      </details>
      {!!run.reviewHistory?.length && (
        <details className="human-review">
          <summary>人工决定与退回记录 · {run.reviewHistory.length}</summary>
          {run.reviewHistory.map((h, i) => (
            <p key={i}>
              {h.actor} · {h.decision === "approved" ? "通过" : "退回"}：
              {h.reason}
            </p>
          ))}
          <p>当前候选 r{run.revision || 2}；历史轮次和冻结验收保留。</p>
        </details>
      )}
      {run.humanReview === "pending" && (
        <section className="human-review" aria-label="人工审核关口">
          <h3>待人工审核 · 候选 r{run.revision || 2}</h3>
          <p>
            独立复审通过不等于人工批准。确认验收、资源影响与证据完整性后，才能进入模拟验证。
          </p>
          {canReview ? (
            <>
              <textarea
                aria-label="EOS审核意见"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="填写通过依据；退回时写清缺口和重提条件"
              />
              <div className="delivery-buttons">
                <button
                  className="primary"
                  disabled={!reason.trim() || reviewing}
                  onClick={() => review("approve")}
                >
                  审核通过
                </button>
                <button
                  disabled={!reason.trim() || reviewing}
                  onClick={() => review("reject")}
                >
                  退回研发
                </button>
              </div>
            </>
          ) : (
            <p>请切换管理层或项目经理处理；研发不可自审。</p>
          )}
        </section>
      )}
      <ol className="eos-timeline">
        {steps.map((step, index) => {
          const reached =
            manual || run.status === "completed"
              ? index <= run.step
              : index < run.step;
          const active =
            manual && index === run.step + 1 && run.status === "running";
          const next = manual && index === run.step + 1;
          return (
            <li
              key={step.title}
              className={reached ? "reached" : active ? "executing" : ""}
              aria-current={active ? "step" : undefined}
            >
              {next && (
                <div className="eos-step-controls">
                  <button
                    className="primary"
                    disabled={
                      !canAdvance ||
                      run.status === "running" ||
                      run.humanReview === "pending"
                    }
                    onClick={onNext}
                  >
                    {run.status === "running" ? "执行中…" : "下一步"}
                  </button>
                  <button
                    onClick={() => onView(run.step)}
                    title={`查看${steps[run.step].agent}已完成结果`}
                  >
                    查看结果
                  </button>
                  <small>上一阶段：{steps[run.step].agent}</small>
                </div>
              )}
              <small className="eos-step-status">
                {step.agent} ·{" "}
                {reached ? "已完成" : active ? "执行中" : "待开始"}
              </small>
              <h3>
                {index === 3 && (run.revision || 2) > 2
                  ? `按人工意见修复 · r${run.revision}`
                  : step.title}
              </h3>
              <p>
                {reached
                  ? index >= 3 && (run.revision || 2) > 2
                    ? `候选 r${run.revision}：${index === 3 ? "按人工退回要求补充实现与反例；新候选等待独立复审。" : index === 4 ? "按原冻结验收重新独立复放，补充证据已生成，仍须人工再次决定。" : "核对人工批准的新候选与本轮证据；未连接真实 CI、生产环境或发布。"}`
                    : text(step.detail)
                  : active
                    ? "正在核对本阶段输入并执行模拟任务；等待完成回执。"
                    : "等待前序证据与手动推进；本阶段尚未执行。"}
              </p>
              {reached && (
                <div className="eos-artifact">
                  {index >= 3 && (run.revision || 2) > 2
                    ? `r${run.revision} · ${step.agent} 本轮证据（模拟）；旧轮次保留`
                    : text(step.output)}
                </div>
              )}
              {reached && index >= 3 && (run.revision || 2) > 2 && (
                <p>
                  本轮候选 r{run.revision} · 人工补充要求：
                  {
                    run.reviewHistory
                      ?.filter((h) => h.decision === "rejected")
                      .at(-1)?.reason
                  }
                  。旧轮次仍在档案中。
                </p>
              )}
              {reached &&
              index === steps.length - 1 &&
              run.status === "completed" ? (
                <div className="eos-step-controls">
                  <button
                    className="primary"
                    onClick={onTransferTest}
                    disabled={!canAdvance || !!testTask || transferring}
                  >
                    {testTask
                      ? "已转测试"
                      : transferring
                        ? "正在转交…"
                        : "转测试"}
                  </button>
                  <small>
                    {testTask
                      ? "测试工程师 · 待测试"
                      : "转交后，测试工程师将收到独立测试待办"}
                  </small>
                  {testTask && (
                    <button onClick={onPreviewTest}>查看测试待办</button>
                  )}
                </div>
              ) : (
                reached &&
                (index < run.step || run.status === "completed") && (
                  <button
                    className="text-button eos-history-result"
                    onClick={() => onView(index)}
                  >
                    查看本阶段结果
                  </button>
                )
              )}
            </li>
          );
        })}
      </ol>
      <p className="muted">
        Review 阻断 → 研发修复 →
        独立复验；失败证据与冻结验收保留。测试通过不代表已合并或发布。
      </p>
      <div className="eos-panel-actions">
        {manual && run.status === "running" && canAdvance && (
          <button onClick={onStop}>停止执行</button>
        )}
        {(!manual || run.status === "completed") && canAdvance && (
          <button onClick={onRestart}>开始新一轮逐步演示</button>
        )}
        <button onClick={onExport}>保存当前执行记录</button>
      </div>
    </>
  );
  return drawer ? (
    <Modal title="EOS 执行详情" onClose={onClose}>
      {content}
    </Modal>
  ) : (
    <aside
      className="context-details-panel eos-execution-panel"
      aria-label="EOS 执行详情"
    >
      <header>
        <h2>EOS 执行详情</h2>
        <button
          className="icon-button"
          aria-label="收起执行详情"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      {content}
    </aside>
  );
}
