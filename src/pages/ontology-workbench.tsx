import { useState } from "react";
import { ArrowRight, Plus, Search, Settings2, Star } from "lucide-react";
import type { Role, Route, State } from "../domain/model";
import type { PersonalController } from "../domain/personal";
import {
  configuredTabs,
  DEFAULT_TABS,
  ENTITY_TYPES,
  visibleEntities,
  type Entity,
  type EntityType,
} from "../domain/ontology";
import { Modal } from "../components/ui";
import { FollowButton } from "./workbench";
import { EntitySummary } from "../components/context-details";
import { CatalogDetail } from "../components/catalog-detail";
import { orderedDomains } from "../domain/project-domains";
import { FilterChips } from "../components/filter-chips";

interface Props {
  state: State;
  role: Role;
  personal: PersonalController;
  selectedId: string;
  selectedKind: string;
  onSelect: (id: string) => void;
  navigate: (r: Route) => void;
  onDemand: (id: string) => void;
  onContext: (kind: string) => void;
}
export function OntologyWorkbench(p: Props) {
  const entities = visibleEntities(p.state, p.role);
  const tabs = configuredTabs(p.role, p.personal.data.ontologyTabs);
  const active = p.selectedKind;
  const current =
    tabs.includes(active as EntityType) || active === "我的关注"
      ? active
      : tabs[0];
  const [settings, setSettings] = useState(false);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("全部"),
    [status, setStatus] = useState("全部"),
    [system, setSystem] = useState("全部"),
    [page, setPage] = useState(1);
  const [related, setRelated] = useState("");
  const detail = entities.find((e) => e.id === p.selectedId);
  const followed = entities.filter((e) =>
    p.personal.data.follows.includes(e.id),
  );
  const base =
    current === "我的关注"
      ? followed
      : entities.filter((e) => e.kind === current);
  const label = (id?: string) =>
    entities.find((e) => e.id === id)?.title || "未关联";
  const classify = (e: Entity) =>
    current === "我的关注"
      ? e.kind
      : current === "项目"
        ? e.domain
        : current === "需求"
          ? label(e.project)
          : e.status;
  const categories =
    current === "项目"
      ? orderedDomains(base.map(classify))
      : [...new Set(base.map(classify))];
  const filtered = base.filter(
    (e) =>
      (category === "全部" || classify(e) === category) &&
      (status !== "attention" || e.attention) &&
      (system === "全部" || e.system === system) &&
      `${e.title} ${e.id} ${e.goal} ${label(e.project)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 6)),
    currentPage = Math.min(page, pages);
  const displayed = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  function switchTab(t: string) {
    setCategory("全部");
    setSystem("全部");
    setQuery("");
    setStatus("全部");
    setPage(1);
    p.onSelect("");
    p.onContext(t);
  }
  function open(e: Entity) {
    setRelated("");
    p.onSelect(e.id);
  }
  function table(rows: Entity[], projectColumn = false) {
    return (
      <div className="ontology-table-wrap">
        <table className="ontology-table">
          <thead>
            <tr>
              <th>名称 / 状态</th>
              {projectColumn && <th>所属项目</th>}
              <th>目标 / 当前差距</th>
              <th>主要风险</th>
              <th>下一步</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td>
                  <button className="ontology-name" onClick={() => open(e)}>
                    {e.title}
                  </button>
                  <small>
                    {e.id} · {e.kind === "项目" ? e.domain + " · " : ""}
                    {e.status}
                  </small>
                </td>
                {projectColumn && (
                  <td>
                    {e.project ? (
                      <button
                        className="text-button"
                        onClick={() =>
                          open(entities.find((x) => x.id === e.project)!)
                        }
                      >
                        {label(e.project)}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td>
                  <span>{e.goal}</span>
                  <small>当前：{e.actual}</small>
                  <small className={e.attention ? "ontology-amber" : ""}>
                    {e.gap}
                  </small>
                </td>
                <td>
                  <span className={e.attention ? "ontology-risk" : ""}>
                    {e.risk}
                  </span>
                </td>
                <td>{e.next}</td>
                <td>
                  <button
                    className="ontology-detail-link"
                    onClick={() => open(e)}
                  >
                    详情 <ArrowRight size={13} />
                  </button>
                  <FollowButton
                    id={e.id}
                    title={e.title}
                    personal={p.personal}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="ontology-empty">
            <Star size={22} />
            <strong>
              {current === "我的关注"
                ? "还没有符合条件的关注"
                : "暂无符合条件的对象"}
            </strong>
            <p>调整分类或筛选；也可以在对象详情和对话中添加关注。</p>
          </div>
        )}
      </div>
    );
  }
  const linked = detail
    ? entities.filter((e) => detail.links.includes(e.id))
    : [];
  const preferred: Partial<Record<EntityType, EntityType[]>> = {
    Issue: ["Impl", "需求", "系统"],
    Impl: ["Issue"],
    项目: ["需求", "风险", "承诺", "战略", "系统", "员工"],
    战略: ["项目", "风险"],
    系统: ["需求", "版本", "风险", "项目", "员工"],
    需求: ["Issue", "项目", "系统", "版本", "风险", "员工"],
  };
  const relationTypes = detail
    ? [
        ...new Set([
          ...(preferred[detail.kind] || []),
          ...linked.map((e) => e.kind),
        ]),
      ].filter((t) => linked.some((e) => e.kind === t))
    : [];
  const relation = relationTypes.includes(related as EntityType)
    ? related
    : relationTypes[0];
  return (
    <div className="ontology-workbench">
      {detail && (
        <header className="ontology-heading">
          <div>
            <h1>{detail ? detail.title : "我的工作台"}</h1>
            <p>
              {detail
                ? `${detail.kind}视图 · ${detail.id}`
                : `${p.role} · 与我直接相关的工作`}{" "}
              <span> / 演示数据</span>
            </p>
          </div>
          <div className="ontology-heading-actions">
            <FollowButton
              id={detail.id}
              title={detail.title}
              personal={p.personal}
            />
          </div>
        </header>
      )}
      {!detail && (
        <div className="ontology-tabs" role="tablist" aria-label="工作台分类">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={current === t}
              onClick={() => switchTab(t)}
            >
              {t}
              <span>{entities.filter((e) => e.kind === t).length}</span>
            </button>
          ))}
          <button
            aria-label="自定义工作台分类"
            onClick={() => setSettings(true)}
          >
            <Plus size={16} />
          </button>
          <button
            role="tab"
            aria-selected={current === "我的关注"}
            className="ontology-follow-tab"
            onClick={() => switchTab("我的关注")}
          >
            <Star size={14} />
            我的关注<span>{followed.length}</span>
          </button>
        </div>
      )}
      {detail ? (
        <section className="ontology-detail">
          <EntitySummary entity={detail} entities={entities} />
          {p.state.catalogVersion === "v03" ? (
            <CatalogDetail
              key={detail.id}
              entity={detail}
              entities={entities}
              onSelect={p.onSelect}
            />
          ) : (
            <>
              <div
                className="ontology-tabs ontology-subtabs"
                role="tablist"
                aria-label="关联对象"
              >
                {relationTypes.map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={relation === t}
                    onClick={() => setRelated(t)}
                  >
                    相关{t}
                    <span>{linked.filter((e) => e.kind === t).length}</span>
                  </button>
                ))}
              </div>
              {table(
                linked.filter((e) => e.kind === relation),
                relation === "需求",
              )}
              <p className="ontology-footnote">
                只展示当前角色可见的关联；目标达成需业务证据确认，不以交付完成替代。
              </p>
            </>
          )}
        </section>
      ) : (
        <section role="tabpanel" aria-label={`${current}清单`}>
          <div className="ontology-filters">
            <FilterChips
              label={current === "项目" ? "项目类型" : "清单分类"}
              value={category}
              options={["全部", ...categories].map((c) => ({
                value: c,
                label: c,
                count:
                  c === "全部"
                    ? base.length
                    : base.filter((e) => classify(e) === c).length,
              }))}
              onChange={(c) => {
                setCategory(c);
                setPage(1);
              }}
            />
            <div className="ontology-selects">
              <label className="ontology-search">
                <Search size={15} />
                <input
                  aria-label="搜索对象"
                  placeholder="搜索名称、编号、目标…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <select
                aria-label="风险筛选"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="全部">全部状态</option>
                <option value="attention">仅需关注</option>
              </select>
              {current === "需求" && (
                <select
                  aria-label="按系统筛选"
                  value={system}
                  onChange={(e) => {
                    setSystem(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="全部">全部系统</option>
                  {entities
                    .filter((e) => e.kind === "系统")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>
          {current === "我的关注" && displayed.length
            ? ENTITY_TYPES.filter((t) =>
                displayed.some((e) => e.kind === t),
              ).map((t) => (
                <div className="ontology-follow-group" key={t}>
                  <h3>
                    {t}{" "}
                    <span>{filtered.filter((e) => e.kind === t).length}</span>
                  </h3>
                  {table(
                    displayed.filter((e) => e.kind === t),
                    t === "需求",
                  )}
                </div>
              ))
            : table(displayed, current === "需求")}
          <div className="ontology-pagination">
            <span>
              共 {filtered.length} 项 · 每页 6 项 · 仅显示授权范围内的演示数据
            </span>
            <div>
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                上一页
              </button>
              <span>
                {currentPage} / {pages}
              </span>
              <button
                disabled={currentPage >= pages}
                onClick={() => setPage(currentPage + 1)}
              >
                下一页
              </button>
            </div>
          </div>
        </section>
      )}
      {settings && (
        <Modal title="自定义工作台" onClose={() => setSettings(false)}>
          <p className="muted">
            添加或移除对象
            Tab，不改变角色的数据权限。至少保留一个；我的关注始终在最后。
          </p>
          <div className="ontology-tab-options">
            {ENTITY_TYPES.map((t) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={tabs.includes(t)}
                  disabled={tabs.length === 1 && tabs.includes(t)}
                  onChange={() =>
                    p.personal.update((s) => ({
                      ...s,
                      ontologyTabs: tabs.includes(t)
                        ? tabs.filter((x) => x !== t)
                        : [...tabs, t],
                    }))
                  }
                />
                <span>{t}</span>
                <small>
                  {entities.filter((e) => e.kind === t).length} 项可见
                </small>
              </label>
            ))}
          </div>
          <div className="ontology-modal-actions">
            <button
              className="secondary"
              onClick={() =>
                p.personal.update((s) => ({
                  ...s,
                  ontologyTabs: DEFAULT_TABS[p.role],
                }))
              }
            >
              <Settings2 size={14} />
              恢复角色默认
            </button>
            <button className="primary" onClick={() => setSettings(false)}>
              完成
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
