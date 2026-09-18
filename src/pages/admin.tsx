import { useState } from "react";
import type { ConnectionSource } from "../domain/model";
import { execute } from "../domain/store";
import type { WorkspaceProps } from "./workspace";
import { Modal, Badge } from "../components/ui";
const SOURCES: ConnectionSource[] = ["飞书", "企微", "Obsidian"];
export function Admin(p: WorkspaceProps) {
  const [editing, setEditing] = useState<ConnectionSource | null>(null),
    [scope, setScope] = useState(""),
    [owner, setOwner] = useState(""),
    [interval, setInterval] = useState("每天增量同步"),
    [ack, setAck] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<ConnectionSource | null>(null);
  const connections = p.state.connections || [],
    active = connections.filter((c) => c.status === "已同步");
  function configure(source: ConnectionSource) {
    const c = connections.find((c) => c.source === source);
    setEditing(source);
    setScope(c?.scope || "");
    setOwner(c?.owner || "");
    setInterval(c?.interval || "每天增量同步");
    setAck(false);
    setError("");
  }
  return (
    <div className="admin-page">
      <div className="preview-page-heading">
        <h1>知识接入工作台</h1>
        <p>系统管理员 / 外部连接　 ·　仅本地演示，不访问真实外部系统</p>
      </div>
      <section className="preview-goal-summary">
        <div>
          <small>管理目标</small>
          <strong>让授权资料持续可用</strong>
          <span>范围明确、来源可追溯、失败可恢复</span>
        </div>
        <div>
          <small>已配置来源</small>
          <strong>{connections.length} / 3</strong>
        </div>
        <div>
          <small>同步可用</small>
          <strong>{active.length}</strong>
        </div>
        <p>
          管理员配置连接规则，
          <br />
          不因此获得全部业务资料读取权。
        </p>
      </section>
      <div className="admin-connections">
        {SOURCES.map((source) => {
          const c = connections.find((c) => c.source === source);
          return (
            <section key={source}>
              <div className="section-heading">
                <h2>{source}</h2>
                <Badge tone={c?.status === "已同步" ? "good" : "neutral"}>
                  {c?.status || "未配置"}
                </Badge>
              </div>
              <p>
                {source === "Obsidian"
                  ? "仅共享内容所有者选定的目录或笔记，不扫描整个个人库。"
                  : source === "企微"
                    ? "仅获授权且接口支持的文档与文件，不默认读取群聊或个人聊天。"
                    : "同步选定空间或目录内的获授权文档，保留原始来源与版本。"}
              </p>
              <dl>
                <dt>授权范围</dt>
                <dd>{c?.scope || "待选择"}</dd>
                <dt>内容授权人</dt>
                <dd>{c?.owner || "待确认"}</dd>
                <dt>同步计划</dt>
                <dd>{c?.interval || "未设置"}（演示计划）</dd>
                <dt>最后成功</dt>
                <dd>
                  {c?.lastSuccess
                    ? new Date(c.lastSuccess).toLocaleString("zh-CN")
                    : "尚未同步"}
                </dd>
                <dt>资料结果</dt>
                <dd>
                  {c?.status === "已撤权"
                    ? "已停止检索使用"
                    : `${c?.count || 0} 份模拟资料 · 版本 ${c?.revision || 0}`}
                </dd>
              </dl>
              <div className="admin-actions">
                <button onClick={() => configure(source)}>
                  {c ? "修改配置" : "配置连接"}
                </button>
                {c && c.status !== "已撤权" && (
                  <>
                    <button
                      className="primary"
                      onClick={() => p.act({ type: "connection-sync", source })}
                    >
                      {c.status === "同步失败"
                        ? "重试同步"
                        : c.status === "已暂停"
                          ? "恢复并同步"
                          : "模拟同步"}
                    </button>
                    <button
                      onClick={() =>
                        p.act({ type: "connection-pause", source })
                      }
                    >
                      暂停
                    </button>
                    <button
                      onClick={() => p.act({ type: "connection-fail", source })}
                    >
                      模拟下次失败
                    </button>
                    <button
                      onClick={() =>
                        p.act({ type: "connection-revoke", source })
                      }
                    >
                      撤回授权
                    </button>
                  </>
                )}
                <button onClick={() => setHistory(source)}>同步记录</button>
              </div>
              {c?.failureNext && (
                <p className="warn-text">
                  已设置：下次同步模拟失败，不影响已有结果。
                </p>
              )}
            </section>
          );
        })}
      </div>
      <p className="muted">
        本页不会执行 jinpai-rag
        sync，不保存密钥，也不会自动调用真实连接器。定时计划仅保存配置，不在后台运行真实任务。
      </p>
      {editing && (
        <Modal
          title={`${editing} · 授权与范围`}
          onClose={() => setEditing(null)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!ack) {
                setError("请确认内容所有者已同意本次演示范围。");
                return;
              }
              setBusy(true);
              try {
                await execute(
                  p.role,
                  {
                    type: "connection-configure",
                    source: editing,
                    scope,
                    owner,
                    interval,
                  },
                  p.state.version,
                );
                setEditing(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="notice">
              这是接入流程演示，不是实际授权。请勿填写密钥、密码或客户敏感资料。
            </p>
            <label>
              共享目录 / 空间
              <input
                required
                minLength={2}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="例如：数字经营部 / 项目资料（演示）"
              />
            </label>
            <label>
              内容授权人
              <input
                required
                minLength={2}
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="例如：资料Owner（演示）"
              />
            </label>
            <label>
              同步计划
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                <option>每天增量同步</option>
                <option>每周增量同步</option>
                <option>仅手动同步</option>
              </select>
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              已确认选定范围；链接不扩大授权
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "保存中…" : "保存演示配置"}
            </button>
          </form>
        </Modal>
      )}
      {history && (
        <Modal title={`${history} · 同步记录`} onClose={() => setHistory(null)}>
          <div className="stack">
            {!connections.find((c) => c.source === history)?.history.length ? (
              <p>尚无记录。先配置连接，再模拟同步。</p>
            ) : (
              connections
                .find((c) => c.source === history)!
                .history.map((h, i) => (
                  <div className="admin-log" key={i}>
                    <small>{new Date(h.at).toLocaleString("zh-CN")}</small>
                    <p>{h.result}</p>
                  </div>
                ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
