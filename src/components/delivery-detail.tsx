import { useState } from "react";
import type { Command, Role, State } from "../domain/model";
import {
  actionsFor,
  plansFor,
  canReviewDelivery,
  bugs,
  qualitySnapshots,
  type DeliveryAction,
  type DeliveryPlan,
} from "../domain/delivery";

type Controls = {
  state: State;
  role: Role;
  onCommand: (c: Command) => void | Promise<void>;
  onSelect: (id: string) => void;
  onExecution?: (id: string) => void;
};
const labels: Record<string, string> = {
  approve: "人工修订并分派",
  reject: "审核退回",
  resubmit: "修订重提",
  start: "领取行动",
  submit: "提交证据",
  accept: "验收通过",
  return: "验收退回",
};
function ActionCard({
  item,
  role,
  onCommand,
}: { item: DeliveryAction } & Pick<Controls, "role" | "onCommand">) {
  const [proposal, setProposal] = useState(item.proposal),
    [owner, setOwner] = useState(item.owner),
    [due, setDue] = useState(item.due),
    [deliverable, setDeliverable] = useState(item.deliverable),
    [reason, setReason] = useState(""),
    [evidence, setEvidence] = useState(item.evidence),
    [busy, setBusy] = useState(false);
  const reviewer = canReviewDelivery(role),
    mine = item.owner === role;
  const send = async (
    action: import("../domain/delivery").DeliveryCommand["action"],
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      await onCommand({
        type: "delivery",
        action,
        id: item.id,
        proposal,
        owner,
        due,
        deliverable,
        reason,
        evidence,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="delivery-action">
      <header>
        <h3>{item.title}</h3>
        <span className="ontology-status">{item.status}</span>
      </header>
      <p className="muted">AI 原建议：{item.original}</p>
      {["待审核", "已退回"].includes(item.status) && (reviewer || mine) ? (
        <div className="delivery-form">
          <label className="wide">
            人工修订建议
            <textarea
              aria-label="人工修订建议"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
            />
          </label>
          <label>
            责任人（演示身份）
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value as Role)}
            >
              <option value="研发">研发工程师 · 研发</option>
              <option value="项目经理">数字经营部项目经理 · 项目经理</option>
            </select>
          </label>
          <label>
            截止日期
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
          <label className="wide">
            交付物与验收证据
            <textarea
              aria-label="交付物与验收证据"
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <>
          <p>{item.proposal}</p>
          <p>
            <strong>{item.owner}</strong> · 截止 {item.due} · 交付：
            {item.deliverable}
          </p>
        </>
      )}
      {item.evidence && (
        <div className="delivery-evidence">
          <strong>已提交证据</strong>
          <p>{item.evidence}</p>
        </div>
      )}
      {reviewer && ["待审核", "待验收"].includes(item.status) && (
        <label className="delivery-note">
          审核意见 / 退回原因
          <textarea
            aria-label="审核意见 / 退回原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="退回时必填；说明缺口和重提条件"
          />
        </label>
      )}
      {mine && item.status === "处理中" && (
        <label className="delivery-note">
          本次交付证据
          <textarea
            aria-label="本次交付证据"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="填写样本、版本、复测结果或演示附件说明"
          />
        </label>
      )}
      <div className="delivery-buttons">
        {reviewer && item.status === "待审核" && (
          <>
            <button
              className="primary"
              disabled={busy}
              onClick={() => send("approve")}
            >
              确认并分派
            </button>
            <button
              disabled={busy || !reason.trim()}
              onClick={() => send("reject")}
            >
              退回建议
            </button>
          </>
        )}
        {(reviewer || mine) && item.status === "已退回" && (
          <button disabled={busy} onClick={() => send("resubmit")}>
            修订后重新提交
          </button>
        )}
        {mine && item.status === "已分派" && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => send("start")}
          >
            领取行动
          </button>
        )}
        {mine && item.status === "处理中" && (
          <button
            className="primary"
            disabled={busy || !evidence.trim()}
            onClick={() => send("submit")}
          >
            提交证据，申请验收
          </button>
        )}
        {reviewer && item.status === "待验收" && (
          <>
            <button
              className="primary"
              disabled={busy}
              onClick={() => send("accept")}
            >
              确认验收
            </button>
            <button
              disabled={busy || !reason.trim()}
              onClick={() => send("return")}
            >
              退回补证
            </button>
          </>
        )}
      </div>
      {!!item.history.length && (
        <details>
          <summary>决定与变更记录 · {item.history.length}</summary>
          <ol>
            {item.history.map((h, i) => (
              <li key={i}>
                <strong>
                  {labels[h.action]} · {h.actor}
                </strong>
                <small>{new Date(h.at).toLocaleString("zh-CN")}</small>
                <p>{h.detail}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  );
}
function PlanCard({
  plan,
  role,
  onCommand,
  onSelect,
}: { plan: DeliveryPlan } & Pick<Controls, "role" | "onCommand" | "onSelect">) {
  const [resource, setResource] = useState(plan.resource),
    [due, setDue] = useState(plan.due),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false);
  const send = async (action: "queue" | "confirm-demand") => {
    setBusy(true);
    try {
      await onCommand({
        type: "delivery",
        action,
        id: plan.demand,
        resource,
        due,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="delivery-action">
      <header>
        <h3>{plan.title}</h3>
        <span className="ontology-status">{plan.status}</span>
      </header>
      <ol className="delivery-steps">
        <li>
          需求与验收确认
          {plan.confirmedBy ? ` · ${plan.confirmedBy} 已确认` : " · 待确认"}
        </li>
        <li>
          计划 / 资源确认
          {plan.plannedBy ? ` · ${plan.plannedBy} 已批准` : " · 待批准"}
        </li>
        <li>
          Issue 执行队列{plan.status === "已入队" ? " · 已生成" : " · 尚未生成"}
        </li>
      </ol>
      <p>
        <strong>冻结验收：</strong>
        {plan.acceptance}
      </p>
      {plan.status === "待确认" &&
        ["管理层", "产品经理", "业务Owner"].includes(role) && (
          <>
            <label className="delivery-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              确认范围与验收，不包含生产发布授权
            </label>
            <button
              className="primary"
              disabled={!checked || busy}
              onClick={() => send("confirm-demand")}
            >
              确认需求与验收
            </button>
          </>
        )}
      {plan.status === "待计划" && ["项目经理", "PMO"].includes(role) ? (
        <>
          <div className="delivery-form">
            <label>
              资源与前置条件
              <input
                value={resource}
                onChange={(e) => setResource(e.target.value)}
              />
            </label>
            <label>
              计划完成日期
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </div>
          <button
            className="primary"
            disabled={busy}
            onClick={() => send("queue")}
          >
            确认计划并加入执行队列
          </button>
        </>
      ) : (
        <p>
          资源：{plan.resource} · 计划：{plan.due}
        </p>
      )}
      {plan.status === "已入队" && (
        <button className="text-button" onClick={() => onSelect(plan.issue)}>
          进入相关 Issue →
        </button>
      )}
      <p className="muted">
        队列按人工批准的计划独立执行；不自动改变其他项目的优先级或资源。
      </p>
    </article>
  );
}
export function DeliveryDetail({
  id,
  mode,
  ...p
}: Controls & {
  id: string;
  mode: "actions" | "plan" | "quality" | "execution";
}) {
  if (mode === "quality")
    return (
      <div className="delivery-quality">
        <h3>质量收敛 · 配额候选版 rc3</h3>
        <p className="delivery-gate">
          发布阻断：P0 = 0，未关闭 P1 = 1，P2 = 1。关键审批 /
          权限反例必须复测；人工审核与生产授权仍独立。
        </p>
        <div className="dossier-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "日期",
                  "新发现",
                  "关闭",
                  "重开",
                  "剩余",
                  "未关闭 P1",
                  "用例通过",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qualitySnapshots.map((q) => (
                <tr key={q.date}>
                  <td>{q.date}</td>
                  <td>{q.opened}</td>
                  <td>{q.closed}</td>
                  <td>{q.reopened}</td>
                  <td>{q.remaining}</td>
                  <td>{q.p1}</td>
                  <td>
                    {q.passed}/{q.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          期末缺陷 = 期初 + 新发现 + 重开 − 关闭；09-18 重开 1
          项说明质量尚未持续收敛，不能只看 28/30 的通过数。
        </p>
        <div className="dossier-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "缺陷",
                  "严重级别 / 状态",
                  "责任 / 版本",
                  "复测要求与证据",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bugs.map((b) => (
                <tr key={b.id}>
                  <td>
                    <button
                      className="ontology-name"
                      onClick={() => p.onSelect(b.issue)}
                    >
                      {b.title}
                    </button>
                    <small>{b.id}</small>
                  </td>
                  <td>
                    {b.severity} · {b.status}
                  </td>
                  <td>
                    {b.owner}
                    <small>{b.version}</small>
                  </td>
                  <td>{b.retest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  if (mode === "actions")
    return (
      <div>
        {actionsFor(p.state)
          .filter((a) => a.project === id || a.id === id)
          .map((a) => (
            <ActionCard
              key={a.id + a.status}
              item={a}
              role={p.role}
              onCommand={p.onCommand}
            />
          ))}
      </div>
    );
  const plan = plansFor(p.state).find((x) => x.demand === id || x.issue === id);
  const run = p.state.eosRuns?.find((r) => r.issueId === id);
  return (
    <div>
      {plan && <PlanCard key={plan.demand + plan.status} plan={plan} {...p} />}
      {mode === "execution" && (
        <div className="delivery-action">
          <h3>执行与人工审核</h3>
          {run ? (
            <>
              <p>
                {run.humanReview === "pending"
                  ? "独立复审完成，等待管理层 / 项目经理人工决定；验证尚未开始。"
                  : run.humanReview === "approved"
                    ? "人工审核已通过，研发可继续模拟验证。"
                    : "在会话中逐步推进 Agent，保留每一阶段证据。"}
              </p>
              {run.reviewHistory?.map((h, i) => (
                <p key={i}>
                  {h.actor} · {h.decision === "rejected" ? "退回" : "通过"}：
                  {h.reason}
                </p>
              ))}
              <button className="primary" onClick={() => p.onExecution?.(id)}>
                执行详情 →
              </button>
            </>
          ) : (
            <p>研发在下方会话输入“开始EOS实施”，建立归因记录并等待下一步。</p>
          )}
        </div>
      )}
    </div>
  );
}
