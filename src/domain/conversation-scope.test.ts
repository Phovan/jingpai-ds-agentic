import { describe, it, expect } from "vitest";
import { seed } from "./model";
import { appendQuestion } from "./experience";
import { addGroup, emptyPersonal, moveThread, scopedThreads } from "./personal";

describe("view-scoped recent conversations", () => {
  const strategy = {
    key: "管理层:home:战略",
    title: "战略清单",
    route: "home" as const,
    entityKind: "战略",
  };
  const project = {
    key: "PRJ-001",
    title: "订单协同优化",
    route: "home" as const,
    objectId: "PRJ-001",
  };
  it("keeps list and object conversations isolated", () => {
    const first = appendQuestion(
      emptyPersonal(),
      seed(),
      "管理层",
      "战略差距？",
      strategy,
    );
    const second = appendQuestion(
      first.data,
      seed(),
      "管理层",
      "项目风险？",
      project,
    );
    expect(scopedThreads(second.data, strategy.key).map((t) => t.id)).toEqual([
      first.threadId,
    ]);
    expect(scopedThreads(second.data, project.key).map((t) => t.id)).toEqual([
      second.threadId,
    ]);
    expect(scopedThreads(second.data)).toEqual([]);
    expect(first.data.groups[0].title).toBe("战略清单");
  });
  it("user grouping never changes origin, renaming survives later messages", () => {
    const first = appendQuestion(
      emptyPersonal(),
      seed(),
      "管理层",
      "差距？",
      strategy,
    );
    let p = addGroup(first.data, "需要决策", strategy.key);
    p = moveThread(p, first.threadId, p.groups[1].id);
    p.groups[1].title = "本周重点";
    const next = appendQuestion(
      p,
      seed(),
      "管理层",
      "下一步？",
      strategy,
      first.threadId,
    );
    expect(scopedThreads(next.data, strategy.key)[0].messages).toHaveLength(2);
    expect(next.data.groups[1].title).toBe("本周重点");
    expect(next.data.threads[0].groupId).toBe(p.groups[1].id);
    expect(scopedThreads(next.data, project.key)).toEqual([]);
  });
  it("new list questions start a new thread but reuse the same default group", () => {
    const a = appendQuestion(
      emptyPersonal(),
      seed(),
      "管理层",
      "问题一",
      strategy,
      null,
    );
    const b = appendQuestion(
      a.data,
      seed(),
      "管理层",
      "问题二",
      strategy,
      null,
    );
    expect(b.data.groups).toHaveLength(1);
    expect(scopedThreads(b.data, strategy.key)).toHaveLength(2);
  });
  it("same folder labels in separate contexts do not collide", () => {
    let p = addGroup(emptyPersonal(), "重点", strategy.key);
    p = addGroup(p, "重点", project.key);
    expect(p.groups).toHaveLength(2);
    expect(() => addGroup(p, "重点", strategy.key)).toThrow();
  });
});
