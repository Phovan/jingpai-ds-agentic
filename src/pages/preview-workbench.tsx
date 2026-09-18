import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { nextAction, type Role, type Route, type State } from "../domain/model";
import { ROLE_FOCUS } from "../domain/experience";
import {
  DOMAINS,
  filterItems,
  TOOLS,
  workItems,
  operationItems,
  type WorkFilter,
  type WorkItem,
} from "../domain/workbench";
import type { PersonalController } from "../domain/personal";
import { FollowButton } from "./workbench";
import { Modal } from "../components/ui";

export function PreviewWorkbench({
  state,
  role,
  personal,
  onObject,
  navigate,
  openOps,
}: {
  state: State;
  role: Role;
  personal: PersonalController;
  onObject: (i: WorkItem) => void;
  navigate: (r: Route) => void;
  openOps: (tab: import("../domain/operations").OpsTab, id?: string) => void;
}) {
  const portfolio = role === "管理层" || role === "PMO";
  const specialist = ["项目成员", "系统负责人", "测试", "运维"].includes(role);
  const [filter, setFilter] = useState<WorkFilter>(() => {
    try {
      return (
        JSON.parse(
          sessionStorage.getItem(`jingpai-compact:${role}`) || "null",
        ) || {
          query: "",
          domain: "全部",
          kind: portfolio ? "项目" : "全部",
          attention: false,
        }
      );
    } catch {
      return {
        query: "",
        domain: "全部",
        kind: portfolio ? "项目" : "全部",
        attention: false,
      };
    }
  });
  const [page, setPage] = useState(1),
    [detail, setDetail] = useState<WorkItem | null>(null),
    [tools, setTools] = useState(false),
    [goal, setGoal] = useState(false);
  const all = workItems(state, role),
    rows = filterItems(all, filter),
    pages = Math.max(1, Math.ceil(rows.length / 4)),
    current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * 4, current * 4),
    n = nextAction(state);
  const followed = [...all,...operationItems(state,role)].filter((i,index,items) => personal.data.follows.includes(i.id)&&items.findIndex(x=>x.id===i.id)===index);
  const followingTools = TOOLS.filter((t) =>
    personal.data.follows.includes(`tool:${t.route}`),
  );
  useEffect(() => {
    try {
      sessionStorage.setItem(`jingpai-compact:${role}`, JSON.stringify(filter));
    } catch {
      /* Filter remains in memory. */
    }
  }, [filter, role]);
  function change(v: Partial<WorkFilter>) {
    setFilter({ ...filter, ...v });
    setPage(1);
  }
  function open(i: WorkItem) {
    if (i.readonly) setDetail(i);
    else onObject(i);
  }
  return (
    <div className="preview-workbench">
      <div className="preview-page-heading">
        <h1>我的工作台</h1>
        <p>
          数字经营部 / {role}　 ·　演示事实 v{state.version}　 ·　非客户经营数据
        </p>
      </div>
      <section className="preview-goal-summary" aria-label="当前目标与差距">
        <div>
          <small>当前关注目标</small>
          <strong>
            {portfolio ? "提升订单协同效率" : ROLE_FOCUS[role].focus}
          </strong>
          <button className="text-button" onClick={() => setGoal(true)}>
            关联项目 1 个 · 查看目标关联 <ArrowRight size={14} />
          </button>
        </div>
        <div>
          <small>{specialist ? "跟进对象" : "当前响应时长"}</small>
          <strong>
            {specialist ? all.length + " 项" : state.actual + " 小时"}
          </strong>
          <span>
            {specialist
              ? "以本人职责与验收标准为准"
              : `目标 ≤${state.goal} 小时`}
          </span>
        </div>
        <div>
          <small>与目标的差距</small>
          <strong
            className={state.actual > state.goal ? "warn-text" : "good-text"}
          >
            {specialist
              ? all.filter((i) => i.attention).length + " 项待推进"
              : state.actual > state.goal
                ? `+${(state.actual - state.goal).toFixed(1)} 小时`
                : "本次样本达标"}
          </strong>
          <span>
            {specialist
              ? "缺证据不算完成"
              : state.actual > state.goal
                ? "需要推进异常提醒需求"
                : "保留业务验证证据"}
          </span>
        </div>
        <p>
          {specialist ? ROLE_FOCUS[role].prompt : n.reason}。<br />
          下一步：{specialist ? "打开跟进对象或场景入口" : n.role}。
        </p>
      </section>
      <section className="preview-list">
        <div className="preview-filter-row">
          <h2>
            {portfolio ? "所辖项目" : "跟进对象"}　
            {all.filter((i) => !portfolio || i.kind === "项目").length}
          </h2>
          <div className="preview-domain-tabs" aria-label="领域分类">
            {["全部", ...DOMAINS]
              .filter(
                (d) =>
                  d === "全部" ||
                  all.some(
                    (i) =>
                      i.domain === d &&
                      (filter.kind === "全部" || i.kind === filter.kind),
                  ),
              )
              .map((d) => (
                <button
                  key={d}
                  aria-pressed={filter.domain === d}
                  onClick={() => change({ domain: d })}
                >
                  {d}{" "}
                  <span>
                    {
                      all.filter(
                        (i) =>
                          (d === "全部" || i.domain === d) &&
                          (filter.kind === "全部" || i.kind === filter.kind),
                      ).length
                    }
                  </span>
                </button>
              ))}
          </div>
          <input
            aria-label="搜索跟进对象"
            placeholder="搜索项目、负责人…"
            value={filter.query}
            onChange={(e) => change({ query: e.target.value })}
          />
        </div>
        <div className="preview-table-shell">
          <table className="preview-object-table">
            <colgroup>
              {[22, 14, 9, 12, 11, 22, 10].map((v, i) => (
                <col key={i} style={{ width: `${v}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>{portfolio ? "项目" : "对象"} / 领域</th>
                <th>目标</th>
                <th>实际</th>
                <th>差距</th>
                <th>健康度</th>
                <th>下一步 / 责任人</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr
                  key={i.id}
                  className={i.id === "PRJ-001" ? "priority-row" : ""}
                >
                  <td>
                    <button className="preview-name" onClick={() => open(i)}>
                      {i.title}
                    </button>
                    <span>
                      {i.id} · {i.domain}
                    </span>
                  </td>
                  <td>{i.goal}</td>
                  <td>{i.actual}</td>
                  <td>{i.gap}</td>
                  <td>
                    <span
                      className={`preview-status ${!i.attention ? "good" : i.actual === "未采集" ? "unknown" : i.status === "偏离" ? "bad" : "warn"}`}
                    >
                      ● {i.status}
                    </span>
                  </td>
                  <td>{i.next}</td>
                  <td>
                    <button className="text-button" onClick={() => open(i)}>
                      查看 {i.id === "PRJ-001" ? "→" : ""}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="work-empty">
              <p>没有匹配对象</p>
              <button
                onClick={() =>
                  change({ query: "", domain: "全部", attention: false })
                }
              >
                清除筛选
              </button>
            </div>
          )}
          <div className="preview-table-footer">
            <span>
              展示 {visible.length} / {rows.length} 个
              {portfolio ? "项目" : "对象"}　 ·　按领域筛选或搜索定位　
              ·　缺失数据不按 0 处理
            </span>
            <div>
              <button
                className="icon-button"
                aria-label="上一页"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <span>
                {current}/{pages}
              </span>
              <button
                className="icon-button"
                aria-label="下一页"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="preview-follows">
        <strong>我的关注</strong>
        {followed.map((i) => (
          <button key={i.id} onClick={() => open(i)}>
            {i.title} ↗
          </button>
        ))}
        {followingTools.map((t) => (
          <button key={t.route} onClick={() => navigate(t.route)}>
            {t.title} ↗
          </button>
        ))}
        <span>
          {!followed.length && !followingTools.length
            ? "在本体页选择「关注」，即可添加到这里。"
            : "关注入口仅对当前角色保存。"}
        </span>
        <button className="text-button" onClick={() => setTools(true)}>
          更多工作入口 →
        </button>
      </section>
      <div className="ops-quicklinks" aria-label="场景工作入口">
        {(
          [
            "战略与项目",
            "工作承诺",
            "风险闭环",
            "系统健康",
            "版本与审核",
            "周期报告",
            "经验复用",
            "资料核实",
          ] as const
        ).map((t) => (
          <button key={t} onClick={() => openOps(t)}>
            {t} →
          </button>
        ))}
      </div>
      {tools && (
        <Modal title="工作入口" onClose={() => setTools(false)}>
          <div className="tool-list">
            {TOOLS.map((t) => (
              <div key={t.route}>
                <button onClick={() => navigate(t.route)}>
                  <strong>{t.title}</strong>
                  <small>{t.description}</small>
                </button>
                <FollowButton
                  id={`tool:${t.route}`}
                  title={t.title}
                  personal={personal}
                />
              </div>
            ))}
          </div>
        </Modal>
      )}
      {goal && (
        <Modal title="目标与关联对象" onClose={() => setGoal(false)}>
          <div className="stack">
            <p>
              项目目标 G-01：异常响应 ≤{state.goal}小时；实际 {state.actual}
              小时。
            </p>
            <p className="muted">
              上级战略待客户确认，不使用占位战略稿生成关联。
            </p>
            <button onClick={() => navigate("projects")}>
              PRJ-001 · 订单协同优化 →
            </button>
            <button onClick={() => navigate("demands")}>
              查看贡献需求与结果证据 →
            </button>
          </div>
        </Modal>
      )}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <div className="stack">
            <p>
              {detail.id} · {detail.domain} · 只读演示对象
            </p>
            <h3>{detail.goal}</h3>
            <p>
              实际 {detail.actual} · {detail.gap}
            </p>
            <p>下一步：{detail.next}</p>
            <FollowButton
              id={detail.id}
              title={detail.title}
              personal={personal}
            />
            <p className="muted">
              此对象用于组合展示；可执行闭环以订单协同为主。
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
