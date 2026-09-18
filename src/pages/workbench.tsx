import { useEffect, useState } from "react";
import { ROLE_FOCUS } from "../domain/experience";
import {
  Star,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { PROFILES, type Role, type State, type Route } from "../domain/model";
import {
  DOMAINS,
  TOOLS,
  workItems,
  filterItems,
  type WorkItem,
  type WorkFilter,
} from "../domain/workbench";
import type { PersonalController } from "../domain/personal";
import { toggleFollow } from "../domain/personal";
import { Badge, Modal } from "../components/ui";

export function FollowButton({
  id,
  title,
  personal,
}: {
  id: string;
  title: string;
  personal: PersonalController;
}) {
  const followed = personal.data.follows.includes(id);
  return (
    <button
      className={`follow-button ${followed ? "followed" : ""}`}
      aria-label={`${followed ? "取消关注" : "添加关注"}：${title}`}
      aria-pressed={followed}
      onClick={() => personal.update((p) => toggleFollow(p, id))}
    >
      <Star size={16} fill={followed ? "currentColor" : "none"} />
      <span>{followed ? "已关注" : "关注"}</span>
    </button>
  );
}
export function Workbench({
  state,
  role,
  personal,
  onObject,
  navigate,
}: {
  state: State;
  role: Role;
  personal: PersonalController;
  onObject: (item: WorkItem) => void;
  navigate: (r: Route) => void;
}) {
  const initial: WorkFilter = {
    query: "",
    domain: "全部",
    kind: role === "管理层" || role === "PMO" ? "项目" : "全部",
    attention: false,
  };
  const [saved] = useState(() => {
    try {
      const v = JSON.parse(
        sessionStorage.getItem(`jingpai-view:${role}`) || "null",
      );
      return v &&
        typeof v.filter?.query === "string" &&
        Number.isInteger(v.page) &&
        Array.isArray(v.collapsed)
        ? (v as { filter: WorkFilter; page: number; collapsed: string[] })
        : null;
    } catch {
      return null;
    }
  });
  const [filter, setFilter] = useState(saved?.filter || initial);
  const [page, setPage] = useState(saved?.page || 1);
  const [collapsed, setCollapsed] = useState<string[]>(saved?.collapsed || []);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        `jingpai-view:${role}`,
        JSON.stringify({ filter, page, collapsed }),
      );
    } catch {
      /* View remains usable without storage. */
    }
  }, [role, filter, page, collapsed]);
  const [detail, setDetail] = useState<WorkItem | null>(null);
  const all = workItems(state, role);
  const relevant = all.filter((i) =>
    role === "管理层" || role === "PMO" ? i.kind === "项目" : true,
  );
  const attention = relevant.filter((i) => i.attention).length;
  const rows = filterItems(all, filter);
  const pages = Math.max(1, Math.ceil(rows.length / 6));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * 6, current * 6);
  function change(p: Partial<WorkFilter>) {
    setFilter({ ...filter, ...p });
    setPage(1);
    setCollapsed([]);
  }
  function open(item: WorkItem) {
    if (item.readonly) setDetail(item);
    else onObject(item);
  }
  const followedObjects = all.filter((i) =>
    personal.data.follows.includes(i.id),
  );
  const followedTools = TOOLS.filter((t) =>
    personal.data.follows.includes(`tool:${t.route}`),
  );
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">
            {role} · {PROFILES[role].scope}
          </p>
          <h1>我的工作台</h1>
          <p className="subtitle">
            {PROFILES[role].goal}。按领域看对象，按差距推进行动。
          </p>
        </div>
        <Badge>演示对象</Badge>
      </div>
      <section className="role-overview" aria-label="角色目标概览">
        <div>
          <small>当前关注目标</small>
          <strong>{PROFILES[role].goal}</strong>
          <span>{ROLE_FOCUS[role].focus}</span>
        </div>
        <div>
          <small>跟进范围</small>
          <strong>
            {relevant.length}
            <em> 个对象</em>
          </strong>
          <span>{PROFILES[role].scope}</span>
        </div>
        <div>
          <small>尚有差距或待补证</small>
          <strong className="warn-text">
            {attention}
            <em> 个对象</em>
          </strong>
          <span>逐项核实，不混合不同指标求平均</span>
        </div>
      </section>
      <section className="work-list-section">
        <div className="section-heading">
          <h2>我跟进的对象</h2>
          <span>可查看 {all.length} 个演示对象 · 非客户全量数据</span>
        </div>
        <div className="work-filters">
          <label className="work-search">
            <Search size={16} />
            <input
              aria-label="搜索跟进对象"
              placeholder="搜索名称、编号、目标或责任人"
              value={filter.query}
              onChange={(e) => change({ query: e.target.value })}
            />
          </label>
          <select
            aria-label="对象类型"
            value={filter.kind}
            onChange={(e) => change({ kind: e.target.value })}
          >
            {["全部", "项目", "系统", "需求"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <label className="attention-filter">
            <input
              type="checkbox"
              checked={filter.attention}
              onChange={(e) => change({ attention: e.target.checked })}
            />
            仅看有差距
          </label>
        </div>
        <div className="domain-filters" aria-label="领域筛选">
          {["全部", ...DOMAINS].map((d) => (
            <button
              key={d}
              aria-pressed={filter.domain === d}
              className={filter.domain === d ? "selected" : ""}
              onClick={() => change({ domain: d })}
            >
              {d}
              <small>
                {
                  all.filter(
                    (i) =>
                      (d === "全部" || i.domain === d) &&
                      (filter.kind === "全部" || i.kind === filter.kind),
                  ).length
                }
              </small>
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="work-empty">
            <h3>当前条件下没有对象</h3>
            <p>该角色没有此领域的演示对象，或关键词未匹配。</p>
            <button
              onClick={() =>
                change({
                  query: "",
                  domain: "全部",
                  kind: "全部",
                  attention: false,
                })
              }
            >
              清除筛选
            </button>
          </div>
        ) : (
          DOMAINS.filter((d) => visible.some((i) => i.domain === d)).map(
            (domain) => (
              <section className="domain-section" key={domain}>
                <button
                  className="domain-heading"
                  aria-expanded={!collapsed.includes(domain)}
                  onClick={() =>
                    setCollapsed((c) =>
                      c.includes(domain)
                        ? c.filter((x) => x !== domain)
                        : [...c, domain],
                    )
                  }
                >
                  {collapsed.includes(domain) ? (
                    <ChevronRight size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                  <strong>{domain}</strong>
                  <span>
                    {rows.filter((i) => i.domain === domain).length} 个对象
                    {rows.filter((i) => i.domain === domain).length >
                    visible.filter((i) => i.domain === domain).length
                      ? " · 本页部分展示"
                      : ""}
                  </span>
                </button>
                {!collapsed.includes(domain) && (
                  <div
                    className="work-object-table"
                    tabIndex={0}
                    role="region"
                    aria-label={`${domain}领域对象表格，可横向滚动`}
                  >
                    <table className="precise-table workbench-table">
                      <colgroup>
                        {[176, 136, 104, 128, 96, 184, 80].map((w, idx) => (
                          <col key={idx} style={{ width: w }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr>
                          <th>对象 / 领域</th>
                          <th>目标</th>
                          <th>实际</th>
                          <th>差距</th>
                          <th>状态</th>
                          <th>下一步 / 责任人</th>
                          <th>关注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible
                          .filter((i) => i.domain === domain)
                          .map((i) => (
                            <tr key={i.id}>
                              <td>
                                <button
                                  className="object-link"
                                  onClick={() => open(i)}
                                >
                                  {i.title}
                                  <ArrowUpRight size={14} />
                                </button>
                                <small>
                                  {i.id} · {i.kind}
                                  {i.readonly ? " · 只读示例" : ""}
                                </small>
                              </td>
                              <td>{i.goal}</td>
                              <td>{i.actual}</td>
                              <td
                                className={
                                  i.attention ? "warn-text" : "good-text"
                                }
                              >
                                {i.gap}
                              </td>
                              <td>
                                <Badge tone={i.attention ? "warn" : "good"}>
                                  {i.status}
                                </Badge>
                              </td>
                              <td>{i.next}</td>
                              <td>
                                <FollowButton
                                  id={i.id}
                                  title={i.title}
                                  personal={personal}
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ),
          )
        )}
        <div className="work-pagination">
          <span>
            {rows.length
              ? `${(current - 1) * 6 + 1}–${Math.min(current * 6, rows.length)}`
              : "0"}{" "}
            / {rows.length} 个结果
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="上一页"
              disabled={current === 1}
              onClick={() => {
                setPage(current - 1);
                setCollapsed([]);
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <span>
              {current} / {pages}
            </span>
            <button
              className="icon-button"
              aria-label="下一页"
              disabled={current === pages}
              onClick={() => {
                setPage(current + 1);
                setCollapsed([]);
              }}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <section className="follow-section">
        <div className="section-heading">
          <h2>
            <Star size={17} />
            我的关注
          </h2>
          <span>
            {followedObjects.length + followedTools.length} 个快捷入口
          </span>
        </div>
        {!followedObjects.length && !followedTools.length ? (
          <p className="follow-empty">
            关注常跟进的项目、系统、需求或业务工具，下次从这里直达。
          </p>
        ) : (
          <div className="follow-shortcuts">
            {followedObjects.map((i) => (
              <div key={i.id}>
                <button onClick={() => open(i)}>
                  <small>
                    {i.kind} · {i.domain}
                  </small>
                  <strong>{i.title}</strong>
                  <span>{i.gap}</span>
                </button>
                <FollowButton id={i.id} title={i.title} personal={personal} />
              </div>
            ))}
            {followedTools.map((t) => (
              <div key={t.route}>
                <button onClick={() => navigate(t.route)}>
                  <small>业务工具</small>
                  <strong>{t.title}</strong>
                  <span>{t.description}</span>
                </button>
                <FollowButton
                  id={`tool:${t.route}`}
                  title={t.title}
                  personal={personal}
                />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="tool-section">
        <div className="section-heading">
          <h2>业务工具</h2>
          <span>按需进入，也可添加关注</span>
        </div>
        <div className="tool-list">
          {TOOLS.map((t) => (
            <div key={t.route}>
              <button onClick={() => navigate(t.route)}>
                <strong>{t.title}</strong>
                <small>{t.description}</small>
                <ArrowUpRight size={16} />
              </button>
              <FollowButton
                id={`tool:${t.route}`}
                title={t.title}
                personal={personal}
              />
            </div>
          ))}
        </div>
      </section>
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <div className="stack">
            <Badge>只读演示对象 · {detail.domain}</Badge>
            <p>目标：{detail.goal}</p>
            <p>
              当前：{detail.actual}；差距：{detail.gap}
            </p>
            <p>下一步：{detail.next}</p>
            <p className="muted">
              此对象用于展示分类与目标差距，不连接客户真实数据。可交互业务闭环以订单协同为主。
            </p>
            <FollowButton
              id={detail.id}
              title={detail.title}
              personal={personal}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
