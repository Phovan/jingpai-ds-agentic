import { describe, expect, it } from "vitest";
import { seed, ROLES, type Role } from "./model";
import { seedOperations } from "./operations";
import { configuredTabs, visibleEntities } from "./ontology";
import { contextItems } from "./experience";
import { emptyPersonal, toggleFollow } from "./personal";

describe("ontology workbench", () => {
  it.each([
    ["管理层", ["战略", "项目", "系统"]],
    ["PMO", ["项目"]],
    ["项目经理", ["项目"]],
    ["业务Owner", ["需求"]],
    ["产品经理", ["系统", "需求"]],
    ["研发", ["需求", "Issue", "系统"]],
  ] as [Role, string[]][])("%s defaults match role intent", (role, expected) =>
    expect(configuredTabs(role)).toEqual(expected),
  );
  it("deduplicates preferences, rejects unknown types, restores empty defaults", () => {
    expect(configuredTabs("研发", ["项目", "项目", "invalid"])).toEqual([
      "项目",
    ]);
    expect(configuredTabs("研发", [])).toEqual(["需求", "Issue", "系统"]);
    expect(configuredTabs("系统管理员", ["项目"])).toEqual([]);
  });
  it("adding project and strategy tabs never broadens developer read scope", () => {
    const s = seed();
    configuredTabs("研发", ["战略", "项目", "系统"]);
    const dev = visibleEntities(s, "研发");
    expect(dev.filter((x) => x.kind === "项目").map((x) => x.id)).toEqual([
      "PRJ-001",
    ]);
    expect(dev.some((x) => x.id === "SYS-02")).toBe(false);
    expect(
      visibleEntities(s, "管理层").filter((x) => x.kind === "项目"),
    ).toHaveLength(7);
    expect(
      contextItems(s, "研发", {
        key: "PRJ-002",
        title: "hidden",
        route: "home",
        objectId: "PRJ-002",
      }),
    ).toEqual([]);
  });
  it("every relation stays within the same role scope and is reversible", () => {
    for (const role of ROLES) {
      const rows = visibleEntities(seed(), role);
      for (const e of rows)
        for (const id of e.links) {
          const target = rows.find((x) => x.id === id);
          expect(target).toBeDefined();
          expect(target!.links).toContain(e.id);
        }
    }
  });
  it("project drilldown covers requirements risks strategy systems and people", () => {
    const rows = visibleEntities(seed(), "项目经理");
    const project = rows.find((x) => x.id === "PRJ-001")!;
    expect(
      new Set(
        rows.filter((x) => project.links.includes(x.id)).map((x) => x.kind),
      ),
    ).toEqual(new Set(["战略", "系统", "需求", "风险", "承诺", "员工"]));
  });
  it("follow collection is role-scoped and grouped by real ontology type", () => {
    let p = emptyPersonal();
    for (const id of ["PRJ-001", "SYS-01", "REQ-024", "PRJ-002"])
      p = toggleFollow(p, id);
    const rows = contextItems(seed(), "研发", {
      key: "follows",
      title: "我的关注",
      route: "home",
      entityKind: "我的关注",
      followedIds: p.follows,
    });
    expect(rows.map((x) => x.kind)).toEqual(["项目", "系统", "需求"]);
    p = toggleFollow(p, "SYS-01");
    expect(p.follows).not.toContain("SYS-01");
  });
  it("hides private and revoked sources regardless of follow or tab preferences", () => {
    const s = seed();
    s.operations = seedOperations();
    s.operations.sources.push({
      id: "SRC-X",
      title: "private",
      text: "secret",
      source: "upload",
      version: 1,
      object: "PRJ-001",
      owner: "业务Owner",
      visibility: "个人",
      status: "待核实",
      history: [],
    });
    expect(visibleEntities(s, "研发").some((x) => x.id === "SRC-X")).toBe(
      false,
    );
    expect(visibleEntities(s, "业务Owner").some((x) => x.id === "SRC-X")).toBe(
      true,
    );
    s.operations.sources[0].status = "已撤回";
    expect(visibleEntities(s, "业务Owner").some((x) => x.id === "SRC-X")).toBe(
      false,
    );
  });
  it("missing actual is unknown; delivery progress is not business attainment", () => {
    const rows = visibleEntities(seed(), "管理层");
    expect(rows.find((x) => x.id === "PRJ-004")?.actual).toBe("待采集");
    expect(rows.find((x) => x.id === "PRJ-001")?.progress).toContain(
      "需求已验收",
    );
    expect(rows.find((x) => x.id === "PRJ-001")?.actual).toBe("3.5小时");
  });
});
