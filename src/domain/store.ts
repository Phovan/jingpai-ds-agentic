import { useSyncExternalStore } from "react";
import {
  seed,
  transition,
  STAGES,
  type State,
  type Actor,
  type Command,
} from "./model";
const KEY = "jingpai-agentic-v1";
const listeners = new Set<() => void>();
export function parseState(raw: string | null): State {
  if (!raw) return seed();
  const s: unknown = JSON.parse(raw);
  if (!s || typeof s !== "object") throw new Error("存档格式不正确");
  const v = s as State;
  if (
    v.schema !== 1 ||
    !Number.isInteger(v.version) ||
    !Array.isArray(v.demands) ||
    v.demands[0]?.id !== "REQ-024" ||
    !v.demands.every(
      (d) => STAGES.includes(d.stage) && Array.isArray(d.evidence),
    ) ||
    !Array.isArray(v.events) ||
    !Number.isFinite(v.actual) ||
    ![
      "idle",
      "running",
      "blocked",
      "ready",
      "released",
      "verified",
      "stopped",
    ].includes(v.task)
  )
    throw new Error("演示存档版本或结构不兼容");
  return {
    ...v,
    delayAccepted: v.delayAccepted ?? false,
    reportHistory: v.reportHistory ?? [],
  };
}
let warning = "";
function load() {
  try {
    return parseState(localStorage.getItem(KEY));
  } catch {
    warning =
      "本地存档无法读取，当前为临时演示。可导出当前数据或重置演示；旧存档在重置前不覆盖。";
    return seed();
  }
}
let current: State = typeof localStorage === "undefined" ? seed() : load();
let locked = !!warning;
function notify() {
  listeners.forEach((l) => l());
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      try {
        current = parseState(e.newValue);
        notify();
      } catch {
        warning = "其他标签页存档异常，请刷新或重置演示。";
        notify();
      }
    }
  });
export function useDemo() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => current,
  );
}
export const storageWarning = () => warning;
export async function execute(actor: Actor, command: Command, version: number) {
  const update = () => {
    if (locked) throw new Error(warning);
    const disk = parseState(localStorage.getItem(KEY));
    if (disk.version !== current.version) {
      current = disk;
      notify();
      throw new Error("其他标签页已更新对象，请核对后重试。");
    }
    const next = transition(current, actor, command, version);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new Error("本地存储不可写，动作未提交。请检查浏览器存储权限。");
    }
    current = next;
    notify();
  };
  if (navigator.locks) await navigator.locks.request("jingpai-state", update);
  else update();
}
export async function resetDemo() {
  const reset = () => {
    const next = seed();
    localStorage.setItem(KEY, JSON.stringify(next));
    current = next;
    warning = "";
    locked = false;
    notify();
  };
  if (navigator.locks) await navigator.locks.request("jingpai-state", reset);
  else reset();
}
export function startAgentClock() {
  const interval = window.setInterval(() => {
    const eos = current.eosRuns?.find((r) => r.status === "running");
    if (eos) {
      void execute(
        "EOS Agents",
        { type: "eos", action: "tick", issueId: eos.issueId },
        current.version,
      ).catch(() => {});
      return;
    }
    const review = current.demands.find(
      (d) =>
        d.id !== "REQ-024" &&
        d.stage === "待测试" &&
        !current.operations?.releases.some((r) => r.demands.includes(d.id)),
    );
    if (review && current.task !== "running")
      void execute(
        "EOS Agents",
        { type: "demand-review", id: review.id },
        current.version,
      ).catch(() => {});
    if (current.task === "running")
      void execute("EOS Agents", { type: "tick" }, current.version).catch(
        () => {
          /* A competing tab may already have advanced this step. */
        },
      );
  }, 2200);
  return () => window.clearInterval(interval);
}
