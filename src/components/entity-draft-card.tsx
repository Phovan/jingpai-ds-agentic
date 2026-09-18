import { useRef, useState } from "react";
import {
  canCreate,
  CREATE_KINDS,
  type EntityDraft,
} from "../domain/entity-creation";
import type { Entity } from "../domain/ontology";
import type { Role } from "../domain/model";
import { PROJECT_DOMAINS, projectDomain } from "../domain/project-domains";

export function EntityDraftCard({
  draft,
  role,
  entities,
  onChange,
  onConfirm,
  onSelect,
}: {
  draft: EntityDraft;
  role: Role;
  entities: Entity[];
  onChange: (draft: EntityDraft) => void;
  onConfirm: (draft: EntityDraft) => Promise<void>;
  onSelect: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const existing =
    entities.find((e) => "requestId" in e && e.requestId === draft.requestId) ||
    entities.find((e) => e.id === draft.createdId);
  const update = (patch: Partial<EntityDraft>) => {
    setError("");
    onChange({ ...draft, ...patch });
  };
  if (existing)
    return (
      <section className="entity-draft-card submitted">
        <header>
          <strong>已提交 · {existing.kind}</strong>
          <span>
            {existing.id} · {existing.status}
          </span>
        </header>
        <h3>{existing.title}</h3>
        <p>已加入对应清单，原业务基线未改变。</p>
        <button className="primary" onClick={() => onSelect(existing.id)}>
          查看详情 →
        </button>
      </section>
    );
  if (draft.cancelled)
    return (
      <section className="entity-draft-card">
        <strong>已取消新增{draft.kind}</strong>
        <p>未创建记录，原有数据不变。</p>
      </section>
    );
  return (
    <section className="entity-draft-card" aria-label="新增记录确认">
      <header>
        <strong>确认新增{draft.kind}</strong>
        <span>待确认 · 尚未写入清单</span>
      </header>
      <div className="entity-draft-grid">
        <label>
          类型
          <select
            aria-label="新增类型"
            value={draft.kind}
            disabled={busy}
            onChange={(e) =>
              update({ kind: e.target.value as EntityDraft["kind"] })
            }
          >
            {CREATE_KINDS.filter(
              (k) => canCreate(role, k) || k === draft.kind,
            ).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          名称
          <input
            aria-label="新增名称"
            maxLength={80}
            value={draft.title}
            disabled={busy}
            onChange={(e) => update({ title: e.target.value })}
          />
        </label>
        <label className="draft-wide">
          目标 / 用途
          <textarea
            aria-label="新增目标"
            rows={2}
            maxLength={400}
            value={draft.goal}
            placeholder="希望解决什么问题，以什么结果验收？"
            disabled={busy}
            onChange={(e) => update({ goal: e.target.value })}
          />
        </label>
        <label>
          关联记录
          <select
            aria-label="新增关联记录"
            value={draft.parentId}
            disabled={busy}
            onChange={(e) => update({ parentId: e.target.value })}
          >
            <option value="">暂不关联</option>
            {entities
              .filter((e) =>
                ["战略", "项目", "系统", "需求", "Issue", "组织"].includes(
                  e.kind,
                ),
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} · {e.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          业务领域
          <select
            aria-label="新增业务领域"
            value={projectDomain(draft.domain)}
            disabled={busy}
            onChange={(e) => update({ domain: e.target.value })}
          >
            {[
              ...PROJECT_DOMAINS,
              ...(!PROJECT_DOMAINS.includes(
                projectDomain(draft.domain) as (typeof PROJECT_DOMAINS)[number],
              )
                ? [projectDomain(draft.domain)]
                : []),
              "未分类",
            ]
              .filter((x, i, a) => a.indexOf(x) === i)
              .map((d) => (
                <option key={d}>{d}</option>
              ))}
          </select>
        </label>
      </div>
      <p className="draft-boundary">
        提交后保存为待核实记录，不自动批准立项、改范围或发布。
      </p>
      {!canCreate(role, draft.kind) && (
        <p role="alert" className="warning-text">
          当前角色无权新增{draft.kind}，请切换有权角色；此草稿不会提交。
        </p>
      )}
      {error && (
        <p role="alert" className="warning-text">
          {error}
        </p>
      )}
      <footer>
        <button disabled={busy} onClick={() => update({ cancelled: true })}>
          取消
        </button>
        <button
          className="primary"
          disabled={
            busy ||
            !draft.title.trim() ||
            !draft.goal.trim() ||
            !canCreate(role, draft.kind)
          }
          onClick={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError("");
            try {
              await onConfirm(draft);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "提交失败，草稿已保留，请重试。",
              );
            } finally {
              setBusy(false);
              lock.current = false;
            }
          }}
        >
          {busy ? "正在提交…" : "确认提交"}
        </button>
      </footer>
    </section>
  );
}
