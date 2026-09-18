import { describe, expect, it } from "vitest";
import {
  catalog,
  catalogEntities,
  populatedDetailTabs,
  dossiers,
} from "./catalog";
import {
  PROJECT_DOMAINS,
  orderedDomains,
  projectDomain,
  domainLabels,
} from "./project-domains";
import { LOGIN_ROLES, seed, transition } from "./model";
describe("shared project categories", () => {
  it("merges all twelve projects into the ordered seven categories", () => {
    const projects = catalog.filter((e) => e.kind === "项目");
    expect(orderedDomains(projects.map((e) => e.domain))).toEqual(
      PROJECT_DOMAINS,
    );
    expect(
      PROJECT_DOMAINS.map((d) => projects.filter((e) => e.domain === d).length),
    ).toEqual([1, 1, 2, 2, 1, 2, 3]);
  });
  it("uses the same map for existing and newly submitted records without changing organization names", () => {
    const state = transition({ ...seed(), catalogVersion: "v03" }, "PMO", {
      type: "catalog-create",
      draft: {
        requestId: "category",
        kind: "项目",
        title: "供应链核对试点",
        goal: "核对供应商回执",
        parentId: "",
        domain: "可持续/采购",
      },
    });
    expect(state.createdEntities![0].domain).toBe("采购供应链");
    state.createdEntities![0].domain = "国际业务/供应链";
    expect(
      catalogEntities(state, "PMO").find(
        (e) => e.id === state.createdEntities![0].id,
      )?.domain,
    ).toBe("国际业务");
    expect(projectDomain("信息中心")).toBe("集团治理");
    expect(catalog.find((e) => e.id === "O03")?.title).toBe("信息中心");
    expect(domainLabels("信息中心核实营销/服务项目")).toBe(
      "信息中心核实营销服务项目",
    );
  });
});
describe("counted detail tabs", () => {
  it("has no zero or unnumbered tab for every visible record and login role", () => {
    for (const role of LOGIN_ROLES) {
      const visible = catalogEntities(
        { ...seed(), catalogVersion: "v03" },
        role,
      );
      for (const e of visible) {
        const tabs = populatedDetailTabs(e, visible);
        expect(tabs.length, e.id).toBeGreaterThan(0);
        for (const t of tabs) {
          expect(Number.isInteger(t.count), e.id + ":" + t.key).toBe(true);
          expect(t.count, e.id + ":" + t.key).toBeGreaterThan(0);
          if (
            t.kinds &&
            visible.some(
              (x) => e.links.includes(x.id) && t.kinds!.includes(x.kind),
            )
          )
            expect(t.count).toBe(
              visible.filter(
                (x) => e.links.includes(x.id) && t.kinds!.includes(x.kind),
              ).length,
            );
        }
      }
    }
  });
  it("counts actual sections for narrative tabs and hides missing relations", () => {
    const x = catalog.find((e) => e.id === "X02")!;
    const tabs = populatedDetailTabs(x, catalog);
    expect(tabs.find((t) => t.key === "lifecycle")?.count).toBe(1);
    expect(tabs.find((t) => t.key === "archive")?.count).toBe(
      Object.keys(dossiers.X02.sections).length,
    );
    const stripped = { ...x, links: [] };
    expect(
      populatedDetailTabs(stripped, []).some((t) => t.key === "Issue"),
    ).toBe(false);
  });
  it("shows real summary for new records, not fictional associated data", () => {
    const s = transition({ ...seed(), catalogVersion: "v03" }, "PMO", {
      type: "catalog-create",
      draft: {
        requestId: "tab",
        kind: "项目",
        title: "新试点",
        goal: "验证基线",
        parentId: "",
        domain: "营销服务",
      },
    });
    const e = s.createdEntities![0];
    expect(populatedDetailTabs(e, [e])).toMatchObject([
      { key: "facts", count: 2 },
    ]);
  });
});
