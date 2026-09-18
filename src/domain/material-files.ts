import type { Material, Personal } from "./personal";
import type { BrainContext } from "./experience";

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("jingpai-conversation-files", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("本机文件存储不可用，材料未保存。"));
  });
}
async function putFile(key: string, file: File) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(file, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error("文件保存失败，请检查本机存储空间。"));
      tx.onabort = () => reject(new Error("文件保存被中止。"));
    });
  } finally {
    db.close();
  }
}
export async function materialFile(m: Material): Promise<File> {
  if (!m.fileKey)
    return new File([m.text], `${m.title.replace(/[/\\:*?"<>|]/g, "-")}.md`, {
      type: "text/markdown",
    });
  const db = await database();
  try {
    return await new Promise<File>((resolve, reject) => {
      const req = db.transaction("files").objectStore("files").get(m.fileKey!);
      req.onsuccess = () =>
        req.result
          ? resolve(
              new File([req.result], m.title, {
                type: m.mime || req.result.type,
              }),
            )
          : reject(new Error("原文件已不在本机，请重新添加。"));
      req.onerror = () => reject(new Error("无法读取原文件。"));
    });
  } finally {
    db.close();
  }
}
export function addConversationMaterials(
  p: Personal,
  items: Material[],
  threadId: string,
  context?: BrainContext,
): Personal {
  const existing = p.threads.find((t) => t.id === threadId);
  const groupId = context
    ? p.groups.find((g) => g.contextKey === context.key)?.id ||
      `context:${context.key}`
    : "";
  return {
    ...p,
    groups:
      !context || p.groups.some((g) => g.id === groupId)
        ? p.groups
        : [
            ...p.groups,
            {
              id: groupId,
              title: context.title.slice(0, 24),
              contextKey: context.key,
              collapsed: false,
            },
          ],
    threads: existing
      ? p.threads
      : [
          {
            id: threadId,
            title: context ? `${context.title} · 材料讨论` : "材料讨论",
            context,
            groupId,
            messages: [],
            updated: new Date().toISOString(),
          },
          ...p.threads,
        ],
    materials: [...items, ...p.materials],
  };
}
export async function importFiles(
  files: File[],
  threadId: string,
  version: number,
): Promise<Material[]> {
  if (!files.length) return [];
  if (files.length > 10 || files.some((f) => f.size > 20 * 1024 * 1024))
    throw new Error("每次最多 10 个文件，单个文件不超过 20 MB。");
  return Promise.all(
    files.map(async (file) => {
      const id = crypto.randomUUID();
      const textual =
        /\.(txt|md|csv|json|log|ya?ml)$/i.test(file.name) ||
        file.type.startsWith("text/");
      await putFile(id, file);
      return {
        id,
        fileKey: id,
        title: file.name,
        mime: file.type,
        size: file.size,
        text: textual
          ? (await file.text()).slice(0, 12000)
          : "原文件已保存在本机。本 Demo 未解析此文件，也未发送给模型。",
        kind: "input" as const,
        threadId,
        created: new Date().toISOString(),
        version,
      };
    }),
  );
}
export async function downloadMaterial(m: Material) {
  const file = await materialFile(m);
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
