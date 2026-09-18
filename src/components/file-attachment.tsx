import { useRef } from "react";
import { Paperclip } from "lucide-react";

export function FileAttachment({
  onFiles,
}: {
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className="text-button"
        onClick={() => input.current?.click()}
      >
        <Paperclip size={15} />
        添加材料
      </button>
    </>
  );
}
export function fileDrop(onFiles: (files: File[]) => void) {
  return {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.add("file-drop-active");
    },
    onDragLeave: (e: React.DragEvent) => {
      if (
        !(e.relatedTarget instanceof Node) ||
        !e.currentTarget.contains(e.relatedTarget)
      )
        e.currentTarget.classList.remove("file-drop-active");
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove("file-drop-active");
      onFiles(Array.from(e.dataTransfer.files));
    },
  };
}
