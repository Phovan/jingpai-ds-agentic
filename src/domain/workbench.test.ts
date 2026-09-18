import { describe, it, expect } from "vitest";
import { seed, ROLES } from "./model";
import { workItems, filterItems } from "./workbench";
import {
  emptyPersonal,
  toggleFollow,
  addGroup,
  moveThread,
  personalKey,
} from "./personal";
describe("role workbench and personal workspace", () => {
  it("keeps all role namespaces separate", () =>
    expect(new Set(ROLES.map(personalKey)).size).toBe(11));
  it("gives management a classified project portfolio", () => {
    const items = workItems(seed(), "管理层");
    for (const domain of ["研发", "产品", "营销", "服务", "采购"])
      expect(items.some((i) => i.domain === domain && i.kind === "项目")).toBe(
        true,
      );
  });
  it("keeps Owner and product workbenches focused on demands", () => {
    for (const r of ["业务Owner", "产品经理"] as const)
      expect(workItems(seed(), r).every((i) => i.kind === "需求")).toBe(true);
  });
  it("keeps engineering focused on its system and requirements", () => {
    expect(workItems(seed(), "研发").map((i) => i.id)).toContain("SYS-01");
    expect(workItems(seed(), "研发").some((i) => i.kind === "项目")).toBe(
      false,
    );
  });
  it("combines domain, object type, search and gap filters", () => {
    const items = workItems(seed(), "管理层");
    expect(
      filterItems(items, {
        domain: "服务",
        kind: "项目",
        query: "prj-001",
        attention: true,
      }).map((i) => i.id),
    ).toEqual(["PRJ-001"]);
    expect(
      filterItems(items, {
        domain: "采购",
        kind: "需求",
        query: "",
        attention: false,
      }),
    ).toEqual([]);
  });
  it("updates the displayed business gap without changing facts", () => {
    const s = seed();
    s.actual = 1.8;
    s.task = "verified";
    const item = workItems(s, "管理层")[0];
    expect(item.gap).toBe("本次样本达标");
    expect(item.attention).toBe(false);
    expect(s.version).toBe(0);
  });
  it("adds and removes a follow without duplicates or source mutation", () => {
    const p = emptyPersonal();
    const added = toggleFollow(p, "REQ-024");
    expect(added.follows).toEqual(["REQ-024"]);
    expect(toggleFollow(added, "REQ-024").follows).toEqual([]);
    expect(p.follows).toEqual([]);
  });
  it("validates groups and moves conversation without changing its messages", () => {
    let p = addGroup(emptyPersonal(), "  重点项目  ");
    expect(p.groups[0].title).toBe("重点项目");
    expect(() => addGroup(p, "重点项目")).toThrow();
    expect(() => addGroup(p, " ")).toThrow();
    p = {
      ...p,
      threads: [
        {
          id: "T-1",
          title: "问题",
          updated: "now",
          groupId: "",
          messages: [
            { id: "m1", question: "目标", answer: "证据", version: 1 },
          ],
        },
      ],
    };
    const moved = moveThread(p, "T-1", p.groups[0].id);
    expect(moved.threads[0].groupId).toBe(p.groups[0].id);
    expect(moved.threads[0].messages).toEqual(p.threads[0].messages);
    expect(() => moveThread(p, "T-1", "missing")).toThrow();
    expect(moveThread(moved, "T-1", "").threads[0].groupId).toBe("");
  });
});
