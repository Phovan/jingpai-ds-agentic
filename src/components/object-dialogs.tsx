import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { nextAction, type State, type Route, type Role } from "../domain/model";
import { visibleEntities } from "../domain/ontology";
import { Badge, Modal } from "./ui";
interface Props {
  state: State;
  navigate: (r: Route) => void;
  onClose: () => void;
}
export function Notifications({ state, navigate, onClose }: Props) {
  const next = nextAction(state);
  return (
    <Modal title="需要关注的变化" onClose={onClose}>
      <div className="notice">
        <Badge tone="brand">{next.role}</Badge>
        <h3>{next.title}</h3>
        <p>{next.reason}</p>
        <button
          className="primary"
          onClick={() => {
            navigate(next.route);
            onClose();
          }}
        >
          查看当前事项
        </button>
      </div>
      <div className="notification-list">
        {state.events
          .slice(-6)
          .reverse()
          .map((e) => (
            <div key={e.id}>
              <strong>{e.title}</strong>
              <p>
                {e.actor} · {e.object}
              </p>
            </div>
          ))}
      </div>
    </Modal>
  );
}
export function ObjectSearch({
  state,
  onClose,
  role,
  onSelect,
}: {
  state: State;
  role: Role;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = visibleEntities(state, role).filter((i) =>
    (i.id + i.title).toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <Modal title="搜索协作范围内的对象" onClose={onClose}>
      <input
        className="full-input"
        aria-label="全局对象搜索"
        autoFocus
        value={query}
        placeholder="输入项目、需求名称或 ID"
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="search-results">
        {matches.map((i) => (
          <button
            key={i.id}
            onClick={() => {
              onSelect(i.id);
              onClose();
            }}
          >
            <span>
              <strong>{i.title}</strong>
              <small>{i.id}</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
        {!matches.length && (
          <p className="muted">没有匹配对象，请调整关键词。</p>
        )}
      </div>
      <p className="muted">更完整的领域分类与筛选请前往工作台。</p>
    </Modal>
  );
}
