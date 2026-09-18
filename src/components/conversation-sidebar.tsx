import { useState } from "react";
import {
  SquarePen,
  LayoutDashboard,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  MessageSquare,
  Settings,
  MessageSquarePlus,
} from "lucide-react";
import {
  addGroup,
  scopedThreads,
  moveThread,
  type PersonalController,
  type Thread,
} from "../domain/personal";
import { Modal } from "./ui";

export function ConversationSidebar({
  personal,
  contextKey,
  active,
  workbench,
  onNew,
  onWorkbench,
  onThread,
  onUtility,
}: {
  personal: PersonalController;
  contextKey?: string;
  active: string | null;
  workbench: boolean;
  onNew: () => void;
  onWorkbench: () => void;
  onThread: (id: string) => void;
  onUtility: (v: "settings" | "feedback") => void;
}) {
  const { data, update } = personal;
  const [edit, setEdit] = useState<{
    kind: "group" | "thread";
    id: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [error, setError] = useState("");
  function open(kind: "group" | "thread", id = "", title = "", groupId = "") {
    setEdit({ kind, id });
    setName(title);
    setGroup(groupId);
    setError("");
  }
  function save() {
    try {
      if (!edit) return;
      if (!name.trim()) throw new Error("请填写名称。");
      if (edit.kind === "group") {
        if (!edit.id) update((p) => addGroup(p, name, contextKey));
        else {
          if (
            name.trim().length > 24 ||
            data.groups.some(
              (g) =>
                g.id !== edit.id &&
                g.title === name.trim() &&
                g.contextKey === contextKey,
            )
          )
            throw new Error("名称过长或与已有分组重复。");
          update((p) => ({
            ...p,
            groups: p.groups.map((g) =>
              g.id === edit.id ? { ...g, title: name.trim() } : g,
            ),
          }));
        }
      } else
        update((p) => ({
          ...moveThread(p, edit.id, group),
          threads: moveThread(p, edit.id, group).threads.map((t) =>
            t.id === edit.id ? { ...t, title: name.trim().slice(0, 60) } : t,
          ),
        }));
      setEdit(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function threads(list: Thread[]) {
    return list.map((t) => (
      <div
        className={`recent-thread ${active === t.id ? "selected" : ""}`}
        key={t.id}
      >
        <button
          className="thread-link"
          title={t.title}
          onClick={() => onThread(t.id)}
          aria-current={active === t.id ? "page" : undefined}
        >
          <MessageSquare size={15} />
          <span>{t.title}</span>
        </button>
        <button
          className="icon-button thread-options"
          aria-label={`整理会话：${t.title}`}
          onClick={() => open("thread", t.id, t.title, t.groupId)}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    ));
  }
  const sorted = scopedThreads(data, contextKey);
  const groups = data.groups.filter(
    (g) =>
      g.contextKey === contextKey || sorted.some((t) => t.groupId === g.id),
  );
  return (
    <>
      <button className="conversation-brand" onClick={onNew}>
        <img src="/logo.png" alt="" width={28} height={28} />
        <strong>劲牌企业大脑</strong>
      </button>
      <nav className="primary-navigation" aria-label="主要导航">
        <button
          onClick={onNew}
          className={!workbench && !active ? "selected" : ""}
        >
          <SquarePen size={18} />
          新对话
        </button>
        <button onClick={onWorkbench} className={workbench ? "selected" : ""}>
          <LayoutDashboard size={18} />
          工作台
        </button>
      </nav>
      <div className="recent-heading">
        <span>最近会话</span>
        <button
          className="icon-button"
          aria-label="新建会话分组"
          onClick={() => open("group")}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="recent-scroll">
        {sorted.length === 0 && (
          <p className="sidebar-empty">
            从一个问题开始，
            <br />
            当前视图的会话会保存在这里。
          </p>
        )}
        {groups.map((g) => (
          <section className="thread-group" key={g.id}>
            <div className="group-heading">
              <button
                aria-expanded={!g.collapsed}
                onClick={() =>
                  update((p) => ({
                    ...p,
                    groups: p.groups.map((x) =>
                      x.id === g.id ? { ...x, collapsed: !x.collapsed } : x,
                    ),
                  }))
                }
              >
                {g.collapsed ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                <span>{g.title}</span>
                <small>{sorted.filter((t) => t.groupId === g.id).length}</small>
              </button>
              <button
                className="icon-button"
                aria-label={`重命名分组：${g.title}`}
                onClick={() => open("group", g.id, g.title)}
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
            {!g.collapsed && threads(sorted.filter((t) => t.groupId === g.id))}
            {!g.collapsed && !sorted.some((t) => t.groupId === g.id) && (
              <p className="group-empty">从对话菜单移入此分组</p>
            )}
          </section>
        ))}
        {groups.length > 0 && sorted.some((t) => !t.groupId) && (
          <p className="ungrouped">未分组</p>
        )}
        {threads(sorted.filter((t) => !t.groupId))}
      </div>
      <div className="conversation-bottom">
        <button onClick={() => onUtility("feedback")}>
          <MessageSquarePlus size={18} />
          反馈意见
        </button>
        <button onClick={() => onUtility("settings")}>
          <Settings size={18} />
          设置
        </button>
      </div>
      {edit && (
        <Modal
          title={
            edit.kind === "thread"
              ? "整理会话"
              : edit.id
                ? "重命名分组"
                : "新建会话分组"
          }
          onClose={() => setEdit(null)}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label>
              名称
              <input
                value={name}
                maxLength={edit.kind === "group" ? 24 : 60}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>
            {edit.kind === "thread" && (
              <label>
                所属分组
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <option value="">未分组</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button type="button" onClick={() => setEdit(null)}>
                取消
              </button>
              <button className="primary">保存</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
