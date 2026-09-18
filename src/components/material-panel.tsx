import { useEffect, useState } from "react";
import { FileText, X, MoreHorizontal } from "lucide-react";
import type { PersonalController, Material } from "../domain/personal";
import { downloadMaterial, materialFile } from "../domain/material-files";
import { Modal, Badge } from "./ui";
export function MaterialPanel({
  personal,
  threadId,
  version,
  onClose,
  mobile,
  tab,
  setTab,
}: {
  personal: PersonalController;
  threadId: string | null;
  version: number;
  onClose: () => void;
  mobile: boolean;
  tab: "output" | "input";
  setTab: (tab: "output" | "input") => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setMessage("");
    setSelected(null);
  }, [threadId, tab]);
  const materials = personal.data.materials.filter(
    (m) => m.kind === tab && !!threadId && m.threadId === threadId,
  );
  async function action(m: Material, type: string) {
    try {
      if (type === "copy") {
        personal.update((p) => ({
          ...p,
          materials: [
            {
              ...m,
              id: crypto.randomUUID(),
              title: m.title + " · 副本",
              created: new Date().toISOString(),
            },
            ...p.materials,
          ],
        }));
        setMessage("已在当前会话创建文件副本。");
      } else if (type === "text") {
        await navigator.clipboard.writeText(m.text);
        setMessage("文本已复制到剪贴板。");
      } else if (type === "download") {
        await downloadMaterial(m);
        setMessage("已发起文件下载。");
      } else {
        const file = await materialFile(m);
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: m.title });
          setMessage("文件已交给系统分享。");
        } else {
          await downloadMaterial(m);
          setMessage(
            "此浏览器不支持文件分享，已下载文件，请自行发送；未创建公开链接。",
          );
        }
      }
    } catch (e) {
      setMessage(
        e instanceof Error && e.name === "AbortError"
          ? "已取消分享。"
          : e instanceof Error
            ? e.message
            : "操作失败，请重试。",
      );
    }
  }
  const content = (
    <>
      <div className="material-tabs" role="tablist" aria-label="材料类型">
        {(["output", "input"] as const).map((kind) => (
          <button
            key={kind}
            role="tab"
            aria-selected={tab === kind}
            onClick={() => {
              setTab(kind);
              setSelected(null);
              setMessage("");
            }}
          >
            {kind === "output" ? "产出" : "材料"}
          </button>
        ))}
      </div>
      <p className="muted">
        {tab === "output"
          ? "本次会话生成的摘要与执行记录，可查看、复制和分享文件。"
          : "本次会话添加的文件。把文件拖入底部对话框，或点击“添加材料”。"}
      </p>
      <small>仅保存在当前浏览器；未上传企业知识库或发送给模型。</small>
      {message && (
        <p role="status" className="material-action-status">
          {message}
        </p>
      )}
      <div className="material-list">
        {!materials.length && (
          <div className="material-empty">
            <FileText size={24} />
            <p>
              {!threadId
                ? "请先进入会话，或直接把文件拖入对话框。"
                : tab === "output"
                  ? "尚无产出，可在会话中生成追踪摘要或保存执行记录。"
                  : "本次会话尚未添加材料。"}
            </p>
          </div>
        )}
        {materials.map((m) => (
          <article key={m.id}>
            <div className="material-item-heading">
              <button
                className="material-title"
                onClick={() => setSelected(selected === m.id ? null : m.id)}
                aria-expanded={selected === m.id}
              >
                <FileText size={17} />
                <strong>{m.title}</strong>
              </button>
              <details className="material-actions">
                <summary aria-label={m.title + "的文件操作"}>
                  <MoreHorizontal size={18} />
                </summary>
                <div>
                  {[
                    ["copy", "复制文件"],
                    ["share", "分享文件"],
                    ["download", "下载文件"],
                    ["text", "复制文本"],
                  ].map(([type, label]) => (
                    <button
                      key={type}
                      onClick={(e) => {
                        e.currentTarget
                          .closest("details")
                          ?.removeAttribute("open");
                        void action(m, type);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </details>
            </div>
            <small>
              {new Date(m.created).toLocaleString("zh-CN")}
              {m.size !== undefined
                ? ` · ${Math.max(1, Math.ceil(m.size / 1024))} KB`
                : ` · v${m.version}`}
            </small>
            {selected === m.id && <pre>{m.text}</pre>}
            {m.kind === "output" && m.version !== version && (
              <Badge tone="warn">执行快照 · 非实时报告</Badge>
            )}
          </article>
        ))}
      </div>
    </>
  );
  return mobile ? (
    <Modal title="产出与材料" onClose={onClose}>
      {content}
    </Modal>
  ) : (
    <aside className="material-panel" aria-label="产出与材料">
      <header>
        <h2>产出与材料</h2>
        <button
          className="icon-button"
          aria-label="收起材料面板"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      {content}
    </aside>
  );
}
