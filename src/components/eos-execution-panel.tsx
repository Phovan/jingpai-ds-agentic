import { X } from "lucide-react";
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
}) {
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
                    disabled={!canAdvance || run.status === "running"}
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
              <h3>{step.title}</h3>
              <p>
                {reached
                  ? text(step.detail)
                  : active
                    ? "正在核对本阶段输入并执行模拟任务；等待完成回执。"
                    : "等待前序证据与手动推进；本阶段尚未执行。"}
              </p>
              {reached && (
                <div className="eos-artifact">{text(step.output)}</div>
              )}
              {reached && (index < run.step || run.status === "completed") && (
                <button
                  className="text-button eos-history-result"
                  onClick={() => onView(index)}
                >
                  查看本阶段结果
                </button>
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
