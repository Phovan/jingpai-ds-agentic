import { useState } from "react";
import type { Entity } from "../domain/ontology";
import { visibleEntities } from "../domain/ontology";
import { contextItems, type BrainContext } from "../domain/experience";
import type { Role, State } from "../domain/model";
import { Modal } from "./ui";
import { dossiers } from "../domain/catalog";

export function EntitySummary({
  entity,
  entities,
  compact = false,
}: {
  entity: Entity;
  entities: Entity[];
  compact?: boolean;
}) {
  const projects = entities.filter(
    (e) => e.kind === "项目" && entity.links.includes(e.id),
  );
  const attention = projects.filter((e) => e.attention);
  const sourceBacked = !!dossiers[entity.id];
  const reasons =
    sourceBacked && entity.kind !== "战略"
      ? [
          entity.risk.split("。").slice(0, 2).join("。") + "。",
          `下一步：${entity.next}`,
        ]
      : entity.kind === "战略"
        ? attention
            .slice(0, 3)
            .map(
              (e) =>
                `${e.title}：${e.actual}，${e.gap}；${e.risk}。下一步：${e.next}。`,
            )
        : [
            `${entity.risk}。${entity.attention ? `当前${entity.actual}，${entity.gap}；尚不能据此认定业务目标已经达成。` : "继续保留观察证据，避免将单次样本当作持续达标。"}`,
            `影响：${entity.kind === "项目" || entity.kind === "需求" ? "交付承诺与业务效果需要分别确认；依赖未解除前，应持续评估后续验收与交付安排。" : "需核实关联交付、运行指标及业务目标是否受到影响，不能只以状态标签作判断。"}`,
            `建议行动：${entity.next}；补齐处理结果与验证证据，再决定是否关闭风险。`,
          ];
  return (
    <>
      <section
        className={"ontology-summary " + (compact ? "compact-summary" : "")}
        aria-label="详情摘要"
      >
        <div className="ontology-summary-intro">
          <div>
            <small>概述</small>
            <p>{entity.summary || entity.goal}</p>
          </div>
          <span
            className={
              "ontology-status " + (entity.attention ? "attention" : "")
            }
          >
            {entity.status}
          </span>
        </div>
        <div className="ontology-summary-metrics">
          <div>
            <small>目标</small>
            <strong>{entity.goal}</strong>
            <p>
              当前：{entity.actual} · {entity.gap}
            </p>
          </div>
          <div>
            <small>交付进展</small>
            <strong>
              {sourceBacked
                ? entity.progress.split("。")[0] + "。"
                : entity.progress}
            </strong>
          </div>
          <div>
            <small>关键下一步</small>
            <strong>{entity.next}</strong>
          </div>
        </div>
        {entity.kind === "项目" && entity.delivery && (
          <div className="delivery-overview" aria-label="项目交付总览">
            <div>
              <small>当前阶段</small>
              <strong>{entity.delivery.stage}</strong>
              <p>需求 → 计划 → 开发 → 测试 → 交付 / 运行</p>
            </div>
            <div>
              <small>交付完成度</small>
              <strong>
                {Math.round(
                  (entity.delivery.done / entity.delivery.total) * 100,
                )}
                % · {entity.delivery.done}/{entity.delivery.total}
              </strong>
              <p>{entity.delivery.basis}；非业务 KPI</p>
            </div>
            <div>
              <small>参与方</small>
              <strong>{entity.delivery.participants}</strong>
            </div>
            <div>
              <small>质量与风险分类</small>
              <strong>{entity.delivery.riskType}</strong>
              <p>{entity.delivery.quality}</p>
            </div>
          </div>
        )}
      </section>
      <section className="ontology-risk-strip" aria-label="风险分析">
        <div>
          <small>主要风险 / 大脑关注点 · 演示分析</small>
          {entity.kind === "战略" && (
            <p>{entity.risk}。优先核对以下项目的业务贡献与执行方向：</p>
          )}
          <ul>
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {entity.kind === "战略" && (
            <p>
              管理建议：先由项目经理核实偏差、由业务Owner确认效果，再决定调整范围、优先级或资源；当前为建议，尚未形成批准决议。
            </p>
          )}
        </div>
      </section>
    </>
  );
}

export function ContextDetails({
  context,
  state,
  role,
  onClose,
  onReturn,
  drawer = false,
}: {
  context: BrainContext;
  state: State;
  role: Role;
  onClose: () => void;
  onReturn: () => void;
  drawer?: boolean;
}) {
  const entities = visibleEntities(state, role),
    entity = entities.find((e) => e.id === context.objectId);
  const all = contextItems(state, role, context);
  const [query, setQuery] = useState("");
  const rows = all.filter((e) => (e.title + e.id).includes(query));
  const content = (
    <>
      <header className="context-details-heading">
        <h2>{context.objectId ? "详情" : "清单摘要"}</h2>
        <button className="text-button" onClick={onClose}>
          收起 ›
        </button>
      </header>
      <h3>{context.title}</h3>
      {entity ? (
        <EntitySummary entity={entity} entities={entities} compact />
      ) : context.objectId ? (
        <p>当前角色无权查看，或该记录已不可用。</p>
      ) : (
        <>
          <p className="muted">
            {all.length} 项 · {all.filter((e) => e.attention).length} 项需关注
          </p>
          <input
            aria-label="搜索右侧清单"
            placeholder="搜索名称或编号"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="context-compact-list">
            {rows.slice(0, 6).map((e) => (
              <article key={e.id}>
                <strong>{e.title}</strong>
                <small>
                  {e.id} · {e.status}
                </small>
                <p>目标：{e.goal}</p>
                <p>差距：{e.gap}</p>
                <p>下一步：{e.next}</p>
              </article>
            ))}
            {!rows.length && <p>没有匹配记录。</p>}
          </div>
          {rows.length > 6 && (
            <p className="muted">仅显示前 6 项；返回完整清单查看其余记录。</p>
          )}
        </>
      )}
      <button className="secondary" onClick={onReturn}>
        返回完整{context.objectId ? "详情" : "清单"} →
      </button>
    </>
  );
  return drawer ? (
    <Modal title="查看详情" onClose={onClose}>
      <div className="context-details-content">{content}</div>
    </Modal>
  ) : (
    <aside className="context-details-panel" aria-label="当前会话详情">
      {content}
    </aside>
  );
}
