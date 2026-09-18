import { useState } from "react";
import type { Command, Demand, Role, State } from "../domain/model";
import { execute } from "../domain/store";
import { Panel } from "./ui";

type Action = Extract<Command, { type: "demand-advance" }>["action"];
export function DemandDelivery({
  demand: d,
  role,
  state,
}: {
  demand: Demand;
  role: Role;
  state: State;
}) {
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actions: { action: Action; title: string }[] =
    role === "研发"
      ? d.stage === "待开发"
        ? [{ action: "start", title: "开始实现" }]
        : d.stage === "开发中"
          ? [{ action: "submit", title: "提交 Agent 模拟审核" }]
          : d.stage === "待发布"
            ? [{ action: "release", title: "确认预览发布" }]
            : []
      : role === "业务Owner" && d.stage === "已上线待业务验证"
        ? [
            { action: "accept", title: "确认业务验收" },
            { action: "reject", title: "退回研发改进" },
          ]
        : [];
  if (
    ![
      "待开发",
      "开发中",
      "待测试",
      "待发布",
      "已上线待业务验证",
      "已关闭",
    ].includes(d.stage)
  )
    return null;
  const next =
    d.stage === "待测试"
      ? "EOS Agents 正在模拟独立审核，回执将写入业务证据。"
      : d.stage === "已关闭"
        ? "业务Owner 已确认结果，完整证据与变化记录保留。"
        : d.stage === "已上线待业务验证"
          ? "下一步由业务Owner 对照冻结基线验证业务结果。"
          : "下一步由研发填写实现、验证或发布证据，推进当前需求。";
  return (
    <Panel title="交付与业务验证">
      <p>{next}</p>
      <p className="muted">
        本段演示状态流转与人机交接，不执行真实代码、自动化测试或生产发布；不自动改变项目经营指标。
      </p>
      {actions.length > 0 && (
        <form className="stack" onSubmit={(e) => e.preventDefault()}>
          <label>
            本次结果与证据
            <textarea
              aria-label="本次结果与证据"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="说明完成了什么、如何验证，以及对应的证据；验收或退回时写明与基线的对照结果。"
            />
          </label>
          <div className="button-row">
            {actions.map(({ action, title }) => (
              <button
                type="button"
                className={action === "reject" ? "" : "primary"}
                key={action}
                disabled={busy || evidence.trim().length < 8}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await execute(
                      role,
                      { type: "demand-advance", id: d.id, action, evidence },
                      state.version,
                    );
                    setEvidence("");
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "操作失败，请重试",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "处理中…" : title}
              </button>
            ))}
          </div>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </Panel>
  );
}
