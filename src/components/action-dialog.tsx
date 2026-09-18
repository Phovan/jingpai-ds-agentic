import { useState } from "react";
import type { Command, Role, State } from "../domain/model";
import { execute } from "../domain/store";
import { Badge, Modal } from "./ui";
import { getOperations } from "../domain/operations";
export type ActionKind =
  | "decision"
  | "coordinate"
  | "environment"
  | "release"
  | "accept"
  | "report-confirm"
  | "create"
  | "baseline"
  | "schedule"
  | "accept-delay"
  | "defer"
  | "clarify";
const titles: Record<ActionKind, string> = {
  clarify: "补充需求澄清与边界",
  decision: "比较方案 · 人来做关键决定",
  coordinate: "确认资源与交付安排",
  environment: "补充演示环境回执",
  release: "确认预览发布",
  accept: "验证业务结果",
  "report-confirm": "确认本人事项",
  create: "提出业务需求",
  baseline: "起草验收基线",
  schedule: "确认交付承诺",
  defer: "暂缓决定",
  "accept-delay": "确认延期的业务影响",
};
export function ActionDialog({
  kind,
  state,
  role,
  id,
  onClose,
  onSuccess,
}: {
  kind: ActionKind;
  state: State;
  role: Role;
  id: string;
  onClose: () => void;
  onSuccess: (s: string) => void;
}) {
  const [version] = useState(state.version);
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<"assist" | "delay">("assist");
  const [actual, setActual] = useState("1.8");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("PRJ-001");
  const [date, setDate] = useState("2026-09-30");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const d = state.demands.find((d) => d.id === id) || state.demands[0];
  async function submit(reject = false) {
    setError("");
    if (
      !ack &&
      ["decision", "coordinate", "release", "accept"].includes(kind)
    ) {
      setError("请先确认影响范围与授权边界。");
      return;
    }
    setBusy(true);
    let command: Command;
    switch (kind) {
      case "clarify":
        command = {
          type: "ops",
          action: "demand-note",
          id,
          values: { evidence: text },
        };
        break;
      case "decision":
        command = { type: "decide", plan, reason: text };
        break;
      case "coordinate":
        command = { type: "coordinate", evidence: text };
        break;
      case "environment":
        command = { type: "environment", evidence: text };
        break;
      case "release":
        command = { type: "release", evidence: text };
        break;
      case "accept":
        command = reject
          ? { type: "reject", evidence: text }
          : { type: "accept", actual: Number(actual), evidence: text };
        break;
      case "report-confirm":
        command = { type: "report-confirm", evidence: text };
        break;
      case "create":
        command = {
          type: "create-demand",
          title,
          problem: text,
          requested: date,
          projectId,
        };
        break;
      case "baseline":
        command = { type: "baseline", id, text };
        break;
      case "schedule":
        command = { type: "schedule", id, date };
        break;
      case "defer":
        command = { type: "defer", reason: text };
        break;
      case "accept-delay":
        command = { type: "accept-delay", evidence: text };
        break;
    }
    try {
      await execute(role, command, version);
      onSuccess("已保存，关联对象与变化记录已更新。");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={titles[kind]} onClose={onClose} wide={kind === "decision"}>
      <div className="form-stack">
        {kind === "create" && (
          <label>
            关联项目
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {getOperations(state)
                .projects.filter(
                  (p) => !["草稿", "退回", "暂缓"].includes(p.status),
                )
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.title} · {p.id}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="object-strip">
          <span>{kind === "decision" ? "DEC-007" : d.id}</span>
          <strong>{d.title}</strong>
          <Badge>事实版本 v{version}</Badge>
        </div>
        {kind === "decision" && (
          <>
            <p>
              接口依赖使交付预测从 09/25 延后至
              09/27。以下是演示推演，资源可用性仍需项目经理确认。
            </p>
            <div className="plan-grid">
              {[
                {
                  id: "assist" as const,
                  name: "A · 协调接口支持",
                  benefit: "预计恢复 09/25 交付",
                  cost: "需要 2 人日；须确认不挤占其他承诺",
                  tag: "大脑建议",
                },
                {
                  id: "delay" as const,
                  name: "B · 保持资源安排",
                  benefit: "无新增资源投入",
                  cost: "交付调整至 09/27；业务影响需沟通",
                  tag: "备选方案",
                },
              ].map((p) => (
                <label
                  className={`plan ${plan === p.id ? "selected" : ""}`}
                  key={p.id}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={p.id}
                    checked={plan === p.id}
                    onChange={() => setPlan(p.id)}
                  />
                  <Badge tone={p.id === "assist" ? "brand" : "neutral"}>
                    {p.tag}
                  </Badge>
                  <h3>{p.name}</h3>
                  <p>{p.benefit}</p>
                  <small>{p.cost}</small>
                </label>
              ))}
            </div>
            <div className="notice">
              <strong>变更预览</strong>
              <p>
                新增决定 DEC-007 → 项目经理确认资源 → 回写 REQ-024 预测与 EOS
                执行计划。当前实际 3.5h 不变。此批准不包含生产发布授权。
              </p>
            </div>
          </>
        )}
        {kind === "coordinate" && (
          <div className="notice">
            确认本演示范围内资源安排可用。预测日期将回写为{" "}
            {state.plan === "assist" ? "09/25" : "09/27"}，执行计划交给 EOS
            Agents；若尚未协调好，请取消，不代签确认。
          </div>
        )}
        {kind === "environment" && (
          <div className="notice">
            补充 preview 环境、business-test
            身份与权限回执。仅用于模拟恢复验证，不会修改真实账号权限。
          </div>
        )}
        {kind === "release" && (
          <div className="notice">
            <strong>环境：演示 preview，不是生产</strong>
            <p>
              构建 build-demo-024 · 独立 Review
              与现实验证已通过。影响订单提醒功能；异常时回退上一预览构建。发布后仍待
              Owner 业务验证。
            </p>
          </div>
        )}
        {kind === "accept" && (
          <>
            <div className="notice">
              对照冻结验收基线及真实业务样本。全部数据均为演示；达到目标才可关闭。未达标请记录不通过，回到原需求继续修复。
            </div>
            <label>
              实测异常响应均值（小时）
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </label>
          </>
        )}
        {kind === "create" && (
          <label>
            需求名称
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="例如：异常订单责任人自动匹配"
            />
          </label>
        )}
        {kind === "baseline" && (
          <div className="notice">
            业务原问题：{d.problem}
            <p>
              写明触发条件、权限边界、正反用例和结果口径。保存为草稿，交 Owner
              确认。
            </p>
          </div>
        )}
        {["create", "schedule"].includes(kind) && (
          <label>
            {kind === "create"
              ? "期望日期（不是承诺）"
              : "承诺日期（已核实容量）"}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        )}
        {kind !== "schedule" && (
          <label>
            {kind === "create"
              ? "业务问题与影响"
              : kind === "baseline"
                ? "验收条件"
                : kind === "defer"
                  ? "暂缓原因与下一复核时间"
                  : "依据 / 结果 / 证据说明"}
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                kind === "accept"
                  ? "例如：演示抽样 20 单，已核对业务记录，无跨组织数据泄露。"
                  : "请写清做了什么、证据是什么、仍有哪些限制。"
              }
              maxLength={1200}
            />
          </label>
        )}
        {["decision", "coordinate", "release", "accept"].includes(kind) && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            我已核对影响、依据与当前角色授权范围。
          </label>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <footer className="dialog-actions">
          <button onClick={onClose}>取消</button>
          {kind === "accept" && (
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => void submit(true)}
            >
              不通过并退回
            </button>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy
              ? "正在保存…"
              : kind === "decision"
                ? "批准方案并生成行动"
                : kind === "accept"
                  ? "验证通过并回写目标"
                  : "确认并保存"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
