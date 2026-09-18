import { describe, expect, it } from "vitest";
import { seed, ROLES } from "./model";
import { emptyPersonal } from "./personal";
import { appendQuestion, contextItems, routeContext } from "./experience";

describe("context conversations and boards", () => {
  it("creates one stable object group and supports explicit continuation or a new topic", () => {
    const s = seed(),
      c = routeContext("projects", "管理层", s, "REQ-024");
    const first = appendQuestion(
      emptyPersonal(),
      s,
      "管理层",
      "目标差距是什么？",
      c,
    );
    const next = appendQuestion(
      first.data,
      s,
      "管理层",
      "下一步呢？",
      c,
      first.threadId,
    );
    expect(next.data.groups).toHaveLength(1);
    expect(next.data.threads).toHaveLength(1);
    expect(next.data.threads[0].messages).toHaveLength(2);
    const topic = appendQuestion(
      next.data,
      s,
      "管理层",
      "风险是什么？",
      c,
      null,
    );
    expect(topic.data.groups).toHaveLength(1);
    expect(topic.data.threads).toHaveLength(2);
    expect(s.version).toBe(0);
    expect(s.decision).toBe("pending");
  });
  it("does not append a demand question to a project thread", () => {
    const s = seed(),
      c = routeContext("projects", "管理层", s, "REQ-024");
    const first = appendQuestion(emptyPersonal(), s, "管理层", "为什么？", c);
    const d = routeContext("demands", "管理层", s, "REQ-025");
    const next = appendQuestion(
      first.data,
      s,
      "管理层",
      "还有什么缺口？",
      d,
      first.threadId,
    );
    expect(next.threadId).not.toBe(first.threadId);
    expect(next.data.groups).toHaveLength(2);
    expect(next.data.threads[0].messages[0].answer).toContain("REQ-025");
    expect(next.data.threads[0].messages[0].answer).not.toContain("PRJ-002");
  });
  it("retains a renamed object group", () => {
    const s = seed(),
      c = routeContext("projects", "管理层", s, "REQ-024");
    const p = appendQuestion(emptyPersonal(), s, "管理层", "目标？", c).data;
    p.groups[0].title = "重点交付";
    const next = appendQuestion(p, s, "管理层", "进展？", c).data;
    expect(next.groups).toHaveLength(1);
    expect(next.groups[0].title).toBe("重点交付");
  });
  it("uses each role's workbench scope and keeps missing values unknown", () => {
    const s = seed();
    for (const role of ROLES) {
      const items = contextItems(
        s,
        role,
        routeContext("home", role, s, "REQ-024"),
      );
      if (role === "系统管理员") {
        expect(items).toHaveLength(0);
        continue;
      }
      expect(items.length).toBeGreaterThan(0);
      if (role === "业务Owner" || role === "产品经理")
        expect(items.every((i) => i.kind === "需求")).toBe(true);
      if (role === "管理层" || role === "PMO")
        expect(items.every((i) => i.kind === "项目")).toBe(true);
    }
    expect(
      contextItems(
        s,
        "管理层",
        routeContext("home", "管理层", s, "REQ-024"),
      ).find((i) => i.id === "PRJ-004")?.actual,
    ).toBe("未采集");
  });
  it("remains compatible with personal spaces that have no boards or context", () => {
    const p = emptyPersonal();
    expect(p.boards || []).toEqual([]);
    const next = appendQuestion(p, seed(), "研发", "下一步是什么？");
    expect(next.data.groups).toEqual([]);
    expect(next.data.threads[0].context).toBeUndefined();
  });
});
