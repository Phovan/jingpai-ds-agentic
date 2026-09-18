import { useState } from "react";
import { ArrowUpRight, BarChart3, ChevronRight, Paperclip } from "lucide-react";
import {
  contextItems,
  ROLE_FOCUS,
  type BrainContext,
} from "../domain/experience";
import type { Role, State } from "../domain/model";
import type { PersonalController } from "../domain/personal";
import { type WorkItem } from "../domain/workbench";
import { visibleEntities } from "../domain/ontology";
import { Badge, Modal } from "./ui";

export function BoardPanel({
  context,
  state,
  role,
  personal,
  onClose,
  onMaterials,
  onObject,
  onAsk,
  drawer = false,
}: {
  context: BrainContext;
  state: State;
  role: Role;
  personal: PersonalController;
  drawer?: boolean;
  onClose: () => void;
  onMaterials: () => void;
  onObject: (item: Pick<WorkItem, "id" | "route" | "readonly">) => void;
  onAsk: (question: string) => void;
}) {
  const [selected, setSelected] = useState<{
    title: string;
    filter: boolean;
    demands?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState("");
  const items = contextItems(state, role, context);
  const projectDemands = visibleEntities(state, role).filter((i) =>
    state.demands.some(
      (d) => d.id === i.id && d.projectId === context.objectId,
    ),
  );
  const visible = selected?.demands
    ? projectDemands
    : selected?.filter
      ? items.filter((i) => i.attention)
      : items;
  const titles =
    context.objectId === "PRJ-001"
      ? ["目标达成追踪", "接口依赖与风险", "需求交付进度"]
      : context.objectId
        ? [`${context.title} · 目标追踪`, "差距与待补证事项", "下一步与责任人"]
        : ROLE_FOCUS[role].boards;
  const saved = (personal.data.boards || []).filter(
    (b) => b.context.key === context.key,
  );
  const content = (
    <div className="board-panel-content">
      <div className="board-panel-heading">
        <h2>
          <BarChart3 size={17} />
          产出看板
        </h2>
        {!drawer && (
          <button
            className="icon-button"
            aria-label="收起看板"
            onClick={onClose}
          >
            收起 ›
          </button>
        )}
      </div>
      <p className="board-scope">{context.title}</p>
      <p className="board-description">
        把值得持续关注的事项，沉淀为可查看的追踪视图。
      </p>
      <div className="board-list">
        {titles.map((title, i) => (
          <button
            className="board-card"
            key={title}
            onClick={() => {
              setSelected({
                title,
                filter: i === 1,
                demands: context.objectId === "PRJ-001" && i === 2,
              });
              setCopied("");
            }}
          >
            <strong>{title}</strong>
            <small>
              演示事实 v{state.version} ·{" "}
              {context.objectId === "PRJ-001" && i === 2
                ? projectDemands.length
                : i === 1
                  ? items.filter((x) => x.attention).length
                  : items.length}{" "}
              个对象
            </small>
            <span>
              打开看板 <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
        {saved.map((b) => (
          <button
            className="board-card saved-board"
            key={b.id}
            onClick={() => {
              setSelected({ title: b.title, filter: false });
              setCopied("");
            }}
          >
            <strong>{b.title}</strong>
            <small>
              手动生成 · {new Date(b.created).toLocaleDateString("zh-CN")}
            </small>
            <span>
              打开看板 <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
      </div>
      <button className="board-material-link" onClick={onMaterials}>
        <Paperclip size={16} />
        输入材料与会议纪要
        <ChevronRight size={16} />
      </button>
      <p className="board-description">
        可从底部主动生成看板。不会把每一次对话都自动变成看板。
      </p>
    </div>
  );
  return (
    <>
      {drawer ? (
        <Modal title="关联看板" onClose={onClose}>
          {content}
        </Modal>
      ) : (
        <aside className="board-panel" aria-label="关联看板">
          {content}
        </aside>
      )}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} wide>
          <div className="stack">
            <div className="board-dialog-meta">
              <span>
                {context.title} · 当前演示事实 v{state.version}
              </span>
              <Badge>非客户真实数据</Badge>
            </div>
            <p className="muted">
              与对象共用事实；缺失数据保留“待核实”，不按 0
              计算。此看板随演示状态更新。
            </p>
            <div className="board-table-scroll">
              <table className="precise-table">
                <thead>
                  <tr>
                    <th>对象</th>
                    <th>目标</th>
                    <th>当前</th>
                    <th>差距</th>
                    <th>下一步</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.readonly ? (
                          <strong>{i.title}</strong>
                        ) : (
                          <button
                            className="object-link"
                            onClick={() => {
                              setSelected(null);
                              onObject(i);
                            }}
                          >
                            {i.title}
                            <ArrowUpRight size={14} />
                          </button>
                        )}
                        <small>
                          {i.id}
                          {i.readonly ? " · 只读示例" : ""}
                        </small>
                      </td>
                      <td>{i.goal}</td>
                      <td>{i.actual}</td>
                      <td className={i.attention ? "warn-text" : "good-text"}>
                        {i.gap}
                      </td>
                      <td>{i.next}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <p>当前没有待补证或偏差对象。可以关闭本视图查看完整对象清单。</p>
            )}
            <div className="board-dialog-actions">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${selected.title}\n${context.title} · 演示数据 v${state.version}\n${visible.map((i) => `${i.title}｜目标 ${i.goal}｜当前 ${i.actual}｜${i.gap}｜${i.next}`).join("\n")}`,
                    );
                    setCopied("已复制摘要；未对外发布链接。");
                  } catch {
                    setCopied("复制未成功，请在看板中选取所需内容。");
                  }
                }}
              >
                复制分享摘要
              </button>
              <button
                className="primary"
                onClick={() => {
                  setSelected(null);
                  onAsk(`请分析「${context.title}」的目标差距与下一步行动。`);
                }}
              >
                围绕本体追问 <ArrowUpRight size={15} />
              </button>
            </div>
            <p className="muted" role="status">
              {copied || "分享仅复制演示摘要，不发布公共页面。"}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
