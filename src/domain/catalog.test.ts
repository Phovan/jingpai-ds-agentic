import { describe, expect, it } from "vitest";
import {
  catalog,
  catalogEntities,
  dossiers,
  detailTabs,
  references,
  costRows,
} from "./catalog";
import { seed, transition, type State, LOGIN_ROLES } from "./model";
import { visibleEntities } from "./ontology";
import {
  guidedReply,
  exampleQuestions,
  scriptedEntities,
} from "./catalog-dialogue";
import { appendQuestion } from "./experience";
import { emptyPersonal } from "./personal";
import {
  inboxItems,
  topicsFor,
  reportingItems,
  periodSummary,
} from "./briefing";
const state = (): State => ({ ...seed(), catalogVersion: "v03" });
describe("V0.3 catalogue", () => {
  it("imports every primary entity and supporting identity, without duplicates", () => {
    const expected = {
      战略: 5,
      项目: 12,
      系统: 13,
      需求: 25,
      组织: 4,
      员工: 16,
      风险: 2,
      供应商: 1,
      版本: 3,
      Issue: 1,
      Impl: 1,
      亮点: 1,
      承诺: 1,
      报告: 2,
      资料: 5,
    };
    for (const [kind, count] of Object.entries(expected))
      expect(
        catalog.filter((e) => e.kind === kind),
        kind,
      ).toHaveLength(count);
    expect(new Set(catalog.map((e) => e.id)).size).toBe(catalog.length);
    expect(catalog.filter((e) => e.kind === "里程碑")).toHaveLength(30);
    expect(catalog).toHaveLength(122);
  });
  it("preserves every project/system dossier section and separate baseline/forecast", () => {
    for (const e of catalog.filter((e) => ["项目", "系统"].includes(e.kind))) {
      expect(
        Object.keys(dossiers[e.id].sections).length,
        e.id,
      ).toBeGreaterThanOrEqual(e.kind === "项目" ? 7 : 8);
      expect(
        dossiers[e.id].sections[
          e.kind === "项目" ? "相关员工清单" : "数据与证据"
        ],
        e.id,
      ).toBeTruthy();
    }
    expect(dossiers.P02.sections["里程碑、成本与工时"]).toContain("92 万元");
    expect(costRows.P02).toEqual(["86", "39", "92", "360", "171", "386"]);
  });
  it("keeps one shared demand across projects and systems", () => {
    const d = catalog.find((e) => e.id === "D08")!;
    for (const id of ["P04", "P05", "X06", "X07"])
      expect(d.links).toContain(id);
    const d1 = catalog.find((e) => e.id === "D01")!;
    for (const id of ["P02", "P12", "X02", "I01", "REL01"])
      expect(d1.links).toContain(id);
    expect(catalog.find((e) => e.id === "REL01")!.links).not.toContain("D02");
  });
  it("all relationships resolve in both directions", () => {
    for (const e of catalog)
      for (const id of e.links) {
        const target = catalog.find((x) => x.id === id);
        expect(target, `${e.id}→${id}`).toBeDefined();
        expect(target!.links, `${id}→${e.id}`).toContain(e.id);
      }
  });
  it("expands shorthand ranges without inventing duplicates", () =>
    expect(references("P01-P03 S02-S05 REL01 D08/D17")).toEqual([
      "P01",
      "P02",
      "P03",
      "S02",
      "S03",
      "S04",
      "S05",
      "REL01",
      "D08",
      "D17",
    ]));
  it("does not alias or destroy legacy facts when switching datasets", () => {
    const legacy = seed();
    expect(
      visibleEntities(legacy, "管理层").some((e) => e.id === "PRJ-001"),
    ).toBe(true);
    const current = { ...legacy, catalogVersion: "v03" as const };
    expect(
      visibleEntities(current, "管理层").some((e) => e.id === "PRJ-001"),
    ).toBe(false);
    expect(current.demands).toEqual(legacy.demands);
  });
  it("role filters apply before relations, lists, topics and inbox", () => {
    for (const role of LOGIN_ROLES) {
      const all = catalogEntities(state(), role),
        ids = all.map((e) => e.id);
      for (const e of all)
        for (const linked of e.links) expect(ids).toContain(linked);
      for (const t of topicsFor(state(), role, emptyPersonal()))
        for (const id of t.objectIds) expect(ids).toContain(id);
      for (const i of inboxItems(state(), role))
        expect(ids).toContain(i.objectId);
    }
    expect(catalogEntities(state(), "系统管理员")).toEqual([]);
    expect(
      catalogEntities(state(), "项目经理")
        .filter((e) => e.kind === "项目")
        .map((e) => e.id),
    ).toEqual(["P02"]);
  });
  it("keeps unknowns, drafts, unverified rates and unbuilt systems distinct", () => {
    expect(catalog.find((e) => e.id === "P02")!.actual).toContain("待复核");
    expect(catalog.find((e) => e.id === "P09")!.actual).toBe("待观察");
    expect(catalog.find((e) => e.id === "X10")!.status).toBe("准备建设");
    expect(catalog.find((e) => e.id === "R01")!.status).toBe("待核实");
    expect(catalog.find((e) => e.id === "M01")!.status).toBe("待独立审核");
  });
  it("orders methodology tabs and presents employees as stakeholders", () => {
    const tabs = detailTabs(catalog.find((e) => e.id === "P02")!);
    expect(tabs.slice(0, 6).map((t) => t.title)).toEqual([
      "里程碑",
      "相关需求",
      "相关风险",
      "成本 / 工时",
      "质量验收",
      "相关成员 / 干系人",
    ]);
    expect(
      detailTabs(catalog.find((e) => e.id === "I01")!).some((t) =>
        t.kinds?.includes("Impl"),
      ),
    ).toBe(true);
  });
  it("all 15 scripted starting points are available", () =>
    expect(scriptedEntities).toHaveLength(15));
  it("slash questions stay grounded in the current object", () => {
    const ctx = {
      key: "X07",
      title: "质量系统",
      route: "home" as const,
      objectId: "X07",
    };
    expect(
      exampleQuestions(state(), "研发", ctx).every((q) => q.includes("X07")),
    ).toBe(true);
  });
  it("a follow-up retains its focal entity and changes the inquiry", () => {
    const ctx = {
      key: "P02",
      title: "评论区项目",
      route: "home" as const,
      objectId: "P02",
    };
    const first = appendQuestion(
      emptyPersonal(),
      state(),
      "项目经理",
      "P02为什么有风险？",
      ctx,
    );
    const message = first.data.threads[0].messages[0];
    expect(message.answer).toContain("23 条");
    expect(message.answer).toContain("F01");
    expect(message.nextQuestions?.length).toBeGreaterThan(1);
    const follow = appendQuestion(
      first.data,
      state(),
      "项目经理",
      message.nextQuestions![0],
      ctx,
      first.threadId,
    );
    expect(follow.threadId).toBe(first.threadId);
    expect(follow.data.threads[0].messages.at(-1)!.answer).toContain("D02");
    expect(follow.data.threads[0].messages.at(-1)!.answer).not.toBe(
      message.answer,
    );
  });
  it("scripted outcomes are not treated as initial facts", () => {
    expect(
      guidedReply(
        state(),
        "PMO",
        { key: "B01", title: "周报", route: "home", objectId: "B01" },
        "生成本周报告",
      ).answer,
    ).toContain("R01 待核实");
    expect(
      guidedReply(
        state(),
        "研发",
        { key: "M01", title: "r1", route: "home", objectId: "M01" },
        "r1测试失败了吗？",
      ).answer,
    ).toContain("不是");
  });
  it("new-scope resource questions progress to alternatives instead of repeating scope", () => {
    const answer = guidedReply(
      state(),
      "管理层",
      { key: "P02", title: "评论区项目", route: "home", objectId: "P02" },
      "P02若纳入D02，需要比较哪些资源方案？",
    );
    expect(answer.intent).toBe("resources");
    expect(answer.answer).toContain("方案 A");
    expect(answer.answer).toContain("O03");
  });
  it("EOS preserves r1 failures and adds r2 without closing demand or risk", () => {
    let s = transition(
      state(),
      "研发",
      { type: "eos", action: "start", issueId: "I01" },
      state().version,
    );
    const acceptance = s.eosRuns![0].acceptance;
    for (let n = 0; n < 6; n++) {
      s = transition(s, "研发", {
        type: "eos",
        action: "next",
        issueId: "I01",
        expectedStep: n,
      });
      s = transition(
        s,
        "EOS Agents",
        { type: "eos", action: "tick", issueId: "I01" },
        s.version,
        s.eosRuns![0].readyAt,
      );
    }
    expect(s.eosRuns![0].acceptance).toBe(acceptance);
    const rows = catalogEntities(s, "研发");
    expect(rows.find((e) => e.id === "M01")!.status).toContain("退回");
    expect(rows.find((e) => e.id === "M02")!.status).toContain("未发布");
    expect(rows.find((e) => e.id === "I01")!.actual).toContain("模拟验证完成");
    expect(rows.find((e) => e.id === "M01")!.links).toContain("M02");
    expect(rows.find((e) => e.id === "D01")!.status).toBe("待排期");
    expect(rows.find((e) => e.id === "R01")!.status).toBe("待核实");
  });
  it("period summaries do not turn current snapshots into historical trends", () => {
    const summary = periodSummary(state(), "管理层", emptyPersonal(), {
      period: "年度总结",
    });
    expect(summary).toContain("12 个项目");
    expect(summary).toContain("不虚构历史");
    expect(topicsFor(state(), "管理层", emptyPersonal())).toHaveLength(4);
    expect(
      reportingItems(state(), "管理层", {
        ...emptyPersonal(),
        follows: ["PRJ-001"],
      }).length,
    ).toBeGreaterThan(0);
  });
});
