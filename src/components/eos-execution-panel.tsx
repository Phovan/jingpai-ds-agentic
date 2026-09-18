import { X } from "lucide-react";
import { EOS_STEPS, type EosRun } from "../domain/eos";
import { Modal } from "./ui";

export function EosExecutionPanel({
  run,
  drawer,
  onClose,
  onStop,
  onExport,
}: {
  run: EosRun;
  drawer: boolean;
  onClose: () => void;
  onStop: () => void;
  onExport: () => void;
}) {
  const content = (
    <>
      <p className="muted">
        {run.id} · {run.issueId} · 本地模拟
      </p>
      <div className="eos-run-status">
        <strong>
          {run.status === "running"
            ? "Agents 正在协同"
            : run.status === "stopped"
              ? "已停止 · 可在会话中继续实施"
              : "交付包就绪 · 待人工确认"}
        </strong>
        <small>不连接真实仓库，不执行真实代码或发布。</small>
      </div>
      <details className="eos-acceptance">
        <summary>冻结验收 · 执行中不变更</summary>
        <p>{run.acceptance}</p>
      </details>
      <ol className="eos-timeline">
        {EOS_STEPS.map((step, index) => {
          const reached = index <= run.step;
          const active = index === run.step;
          return (
            <li
              key={step.title}
              className={reached ? "reached" : ""}
              aria-current={active ? "step" : undefined}
            >
              <small>
                {step.agent} ·{" "}
                {index < run.step || (active && run.status === "completed")
                  ? "已完成"
                  : active
                    ? run.status === "stopped"
                      ? "已停止"
                      : "执行中"
                    : "待执行"}
              </small>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
              {reached && <div className="eos-artifact">{step.output}</div>}
            </li>
          );
        })}
      </ol>
      <p className="muted">
        质量回路：Review → 研发修复；方案或目标不成立 → 归因；环境/授权缺失 →
        人工处理。演示仅自动运行一次 Review 退回与修复，不做无限重试。
      </p>
      <div className="eos-panel-actions">
        {run.status === "running" && <button onClick={onStop}>停止执行</button>}
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
