import { fileDrop } from "./file-attachment";
import { useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { ROLE_FOCUS, type BrainContext } from "../domain/experience";
import type { Role } from "../domain/model";

export function ContextComposer({
  context,
  role,
  onAsk,
  onMaterials,
  onFiles,
}: {
  onFiles: (files: File[]) => void;
  context: BrainContext;
  role: Role;
  onAsk: (question: string, threadId: string | null) => void;
  onMaterials: () => void;
}) {
  const [question, setQuestion] = useState("");
  const send = () => {
    if (question.trim()) {
      onAsk(question, null);
      setQuestion("");
    }
  };
  return (
    <section className="context-composer-wrap" aria-label="当前视图的大脑对话">
      <form
        className="context-composer"
        {...fileDrop(onFiles)}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          id="context-question"
          rows={1}
          maxLength={3000}
          aria-label="向企业大脑提问"
          placeholder={
            context.objectId?.startsWith("ISS-")
              ? "输入「开始EOS实施」，或拖入材料补充上下文"
              : `继续和大脑对话，或把文件材料拖到这里。${ROLE_FOCUS[role].prompt}`
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          className="primary icon-button"
          aria-label="发送问题"
          disabled={!question.trim()}
        >
          <ArrowUp size={19} />
        </button>
      </form>
      <div className="context-composer-meta">
        <span title={context.title}>上下文：{context.title}</span>
        <div>
          <button className="text-button" onClick={onMaterials}>
            <Paperclip size={14} />
            材料
          </button>
        </div>
      </div>
      <p className="context-disclaimer">
        可拖入文件 · 演示规则引擎 · 关键决策由人确认 · Enter 发送，Shift + Enter
        换行
      </p>
    </section>
  );
}
