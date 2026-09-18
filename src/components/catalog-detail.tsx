import { useState } from "react";
import {
  populatedDetailTabs,
  entityDossier,
  costRows,
} from "../domain/catalog";
import type { Entity } from "../domain/ontology";
import { SourceContent, EntityText } from "./entity-text";

export function CatalogDetail({
  entity,
  entities,
  onSelect,
}: {
  entity: Entity;
  entities: Entity[];
  onSelect: (id: string) => void;
}) {
  const tabs = populatedDetailTabs(entity, entities);
  const [selected, setSelected] = useState(tabs[0]?.key || "");
  const tab = tabs.find((t) => t.key === selected) || tabs[0];
  const linked = entities.filter(
    (e) => entity.links.includes(e.id) && tab?.kinds?.includes(e.kind),
  );
  const cost = costRows[entity.id];
  const dossier = entityDossier(entity);
  if (!tab) return null;
  return (
    <div className="catalog-detail">
      <nav
        className="ontology-tabs ontology-subtabs"
        role="tablist"
        aria-label="详情分类"
      >
        {tabs.map((t) => (
          <button
            role="tab"
            key={t.key}
            aria-selected={tab.key === t.key}
            onClick={() => setSelected(t.key)}
          >
            {t.title}
            <span title={t.countLabel}>{t.count}</span>
          </button>
        ))}
      </nav>
      <section
        className="dossier-content"
        role="tabpanel"
        aria-label={tab.title}
      >
        {tab.key === "cost" && cost && (
          <div className="dossier-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>口径</th>
                  <th>批准基线</th>
                  <th>已发生 / 已投入</th>
                  <th>完工预测 / 估算</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>费用 · 万元</th>
                  {cost.slice(0, 3).map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
                <tr>
                  <th>工时 · 人天</th>
                  {cost.slice(3).map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {tab.sections?.map((key) =>
          dossier?.sections[key] ? (
            <article key={key} className="dossier-section">
              <h3>{key === "相关员工清单" ? "相关成员与职责" : key}</h3>
              <SourceContent
                text={dossier.sections[key]}
                entities={entities}
                onSelect={onSelect}
              />
            </article>
          ) : null,
        )}
        {tab.kinds &&
          (linked.length ? (
            <div className="dossier-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tab.title}</th>
                    <th>状态 / 当前事实</th>
                    <th>目标与验收</th>
                    <th>下一步 / 责任</th>
                  </tr>
                </thead>
                <tbody>
                  {linked.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <button
                          className="ontology-name"
                          onClick={() => onSelect(e.id)}
                        >
                          {e.title}
                        </button>
                        <small>
                          {e.id} · {e.kind === "员工" ? "成员" : e.kind}
                        </small>
                      </td>
                      <td>
                        {e.status}
                        <small>{e.actual !== e.status ? e.actual : ""}</small>
                      </td>
                      <td>
                        <EntityText
                          text={e.goal}
                          entities={entities}
                          onSelect={onSelect}
                        />
                      </td>
                      <td>
                        <EntityText
                          text={e.next}
                          entities={entities}
                          onSelect={onSelect}
                        />
                        <button
                          className="text-button"
                          onClick={() => onSelect(e.id)}
                        >
                          查看详情 →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              当前授权范围内尚未登记{tab.title}
              。未登记不等于不存在，也不虚构交付结果。
            </p>
          ))}
        <p className="dossier-source">
          V0.3 虚拟快照 · 2026-09-18 · {dossier?.level || "演示执行回执"} ·
          正式决定与业务验证分开记录
        </p>
      </section>
    </div>
  );
}
