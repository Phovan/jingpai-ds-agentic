import { useRef, useState } from "react";
import type { Role } from "./model";
import type { BrainContext, SavedBoard } from "./experience";
export interface Message {
  entityDraft?: import("./entity-creation").EntityDraft;
  createdAt?: string;
  presented?: boolean;
  dataset?: "v03";
  nextQuestions?: string[];
  focusId?: string;
  intent?: string;
  reportAction?: import("./briefing").ReportAction;
  actionDone?: boolean;
  eosIssueId?: string;
  eosRunId?: string;
  eosStepIndex?: number;
  eosAdvance?: boolean;
  id: string;
  question: string;
  answer: string;
  version: number;
}
export interface Thread {
  context?: BrainContext;
  id: string;
  title: string;
  groupId: string;
  messages: Message[];
  updated: string;
}
export interface Group {
  contextKey?: string;
  id: string;
  title: string;
  collapsed: boolean;
}
export interface Material {
  fileKey?: string;
  mime?: string;
  size?: number;
  id: string;
  title: string;
  text: string;
  kind: "input" | "output";
  threadId: string;
  created: string;
  version: number;
}
export interface Personal {
  ontologyDefaultsVersion?: number;
  topics?: import("./briefing").Topic[];
  reportDrafts?: Record<string, import("./briefing").ReportDraft>;
  readInbox?: string[];
  ontologyTabs?: string[];
  boards?: SavedBoard[];
  schema: 1;
  groups: Group[];
  threads: Thread[];
  follows: string[];
  materials: Material[];
  feedback: { id: string; text: string; created: string }[];
}
export const emptyPersonal = (): Personal => ({
  ontologyDefaultsVersion: 3,
  schema: 1,
  groups: [],
  threads: [],
  follows: [],
  materials: [],
  feedback: [],
});
export const personalKey = (role: Role) => `jingpai-personal-v1:${role}`;
export function toggleFollow(s: Personal, id: string): Personal {
  return {
    ...s,
    follows: s.follows.includes(id)
      ? s.follows.filter((x) => x !== id)
      : [...s.follows, id],
  };
}
export function addGroup(
  s: Personal,
  title: string,
  contextKey?: string,
): Personal {
  const clean = title.trim();
  if (!clean || clean.length > 24) throw new Error("分组名称需为 1–24 个字。");
  if (s.groups.some((g) => g.title === clean && g.contextKey === contextKey))
    throw new Error("已有同名分组。");
  return {
    ...s,
    groups: [
      ...s.groups,
      { id: crypto.randomUUID(), title: clean, collapsed: false, contextKey },
    ],
  };
}
export function moveThread(s: Personal, id: string, groupId: string): Personal {
  if (groupId && !s.groups.some((g) => g.id === groupId))
    throw new Error("分组不存在，请重新选择。");
  return {
    ...s,
    threads: s.threads.map((t) => (t.id === id ? { ...t, groupId } : t)),
  };
}
export function migratePersonalDefaults(s: Personal, role: Role): Personal {
  if ((s.ontologyDefaultsVersion || 0) >= 3) return s;
  const oldDefault =
    role === "研发" &&
    s.ontologyTabs?.length === 2 &&
    s.ontologyTabs.includes("系统") &&
    s.ontologyTabs.includes("需求");
  return {
    ...s,
    ontologyDefaultsVersion: 3,
    ...(oldDefault ? { ontologyTabs: ["需求", "Issue", "系统"] } : {}),
    ...(role === "PMO" &&
    s.ontologyTabs?.length === 1 &&
    s.ontologyTabs[0] === "项目"
      ? { ontologyTabs: ["项目", "会议"] }
      : {}),
  };
}
function loadPersonal(role: Role): { data: Personal; warning: string } {
  try {
    const raw = localStorage.getItem(personalKey(role));
    if (!raw) return { data: emptyPersonal(), warning: "" };
    const s: Personal = JSON.parse(raw);
    if (
      s.schema !== 1 ||
      !Array.isArray(s.groups) ||
      !Array.isArray(s.threads) ||
      !Array.isArray(s.follows) ||
      !Array.isArray(s.materials) ||
      !Array.isArray(s.feedback)
    )
      throw new Error();
    return { data: migratePersonalDefaults(s, role), warning: "" };
  } catch {
    return {
      data: emptyPersonal(),
      warning: "个人空间无法读取，原数据不会覆盖；本次对话仅在当前页面保留。",
    };
  }
}
export function usePersonal(role: Role) {
  const [initial] = useState(() => loadPersonal(role));
  const [data, setData] = useState(initial.data);
  const [warning, setWarning] = useState(initial.warning);
  const current = useRef(data);
  const update = (fn: (p: Personal) => Personal) => {
    const next = fn(current.current);
    current.current = next;
    if (!initial.warning) {
      try {
        localStorage.setItem(personalKey(role), JSON.stringify(next));
      } catch {
        setWarning(
          "本机存储不可用，当前改动仅在本页保留，请先导出需要保留的内容。",
        );
      }
    }
    setData(next);
  };
  return { data, update, warning };
}
export type PersonalController = ReturnType<typeof usePersonal>;

/** Conversation scope follows the originating view, never the editable folder name. */
export function scopedThreads(s: Personal, contextKey?: string) {
  return s.threads
    .filter((t) => t.context?.key === contextKey)
    .sort((a, b) => b.updated.localeCompare(a.updated));
}
