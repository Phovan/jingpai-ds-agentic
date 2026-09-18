import { describe, it, expect } from "vitest";
import { narrativeText } from "./narrative";
import { catalog, catalogEntities } from "./catalog";
import { deliveryEntities } from "./delivery";
import { seed, transition } from "./model";
import { eosStageAnswer } from "./eos-dialogue";
import { emptyPersonal, migratePersonalDefaults } from "./personal";
const entities = [
  { id: "P02", title: "评论区项目" },
  { id: "P03", title: "配额项目" },
  { id: "D01", title: "漏单修复" },
  { id: "M01", title: "回写实现" },
];
describe("business names in prose", () => {
  it("replaces identifiers and removes redundant parenthesized identifiers", () => {
    expect(
      narrativeText("评论区项目（P02）关联 D01；P03 需复核。", entities),
    ).toBe("评论区项目关联 漏单修复；配额项目 需复核。");
    expect(narrativeText("P02 评论区项目", entities)).toBe("评论区项目");
    expect(narrativeText("P02-P03", entities)).toBe("评论区项目、配额项目");
  });
  it("does not alter unknown objects, severity levels or embedded technical identifiers", () => {
    expect(narrativeText("P1、P0、demo-P02、P020、SECRET-1", entities)).toBe(
      "P1、P0、demo-P02、P020、SECRET-1",
    );
    expect(narrativeText("D01 依赖 D02", entities)).toBe("漏单修复 依赖 D02");
  });
  it("removes visible identifiers from all current catalog narrative fields, retaining IDs", () => {
    const rows = catalogEntities(
      { ...seed(), catalogVersion: "v03" },
      "管理层",
    );
    for (const row of rows) {
      expect(
        [
          ...catalog,
          ...deliveryEntities({ ...seed(), catalogVersion: "v03" }, catalog),
        ].some((e) => e.id === row.id),
      ).toBe(true);
      for (const key of [
        "summary",
        "risk",
        "next",
        "goal",
        "gap",
        "progress",
      ] as const)
        expect(narrativeText(row[key], rows)).toBe(row[key]);
    }
  });
  it("migrates only old developer defaults once and preserves later customization", () => {
    const old = {
      ...emptyPersonal(),
      ontologyDefaultsVersion: undefined,
      ontologyTabs: ["系统", "需求"],
    };
    const migrated = migratePersonalDefaults(old, "研发");
    expect(migrated.ontologyTabs).toEqual(["需求", "Issue", "系统"]);
    expect(
      migratePersonalDefaults(
        { ...migrated, ontologyTabs: ["系统", "需求"] },
        "研发",
      ).ontologyTabs,
    ).toEqual(["系统", "需求"]);
    expect(
      migratePersonalDefaults({ ...old, ontologyTabs: ["项目"] }, "研发")
        .ontologyTabs,
    ).toEqual(["项目"]);
  });
});
describe("manual EOS gates", () => {
  const start = () =>
    transition({ ...seed(), catalogVersion: "v03" }, "研发", {
      type: "eos",
      action: "start",
      issueId: "I01",
    });
  it("starts with attribution complete and blocks ticking until explicit next", () => {
    const s = start();
    expect(s.eosRuns![0]).toMatchObject({
      step: 0,
      status: "waiting",
      mode: "manual",
    });
    expect(() =>
      transition(s, "EOS Agents", {
        type: "eos",
        action: "tick",
        issueId: "I01",
      }),
    ).toThrow("没有运行");
    const snapshot = JSON.stringify(s);
    expect(eosStageAnswer(s.eosRuns![0], 0, true)).toContain("没有推进或重跑");
    expect(JSON.stringify(s)).toBe(snapshot);
  });
  it("rejects skipped, duplicate, unauthorized and prematurely completed stages", () => {
    const s = start();
    expect(() =>
      transition(s, "管理层", {
        type: "eos",
        action: "next",
        issueId: "I01",
        expectedStep: 0,
      }),
    ).toThrow("仅研发");
    expect(() =>
      transition(s, "研发", {
        type: "eos",
        action: "next",
        issueId: "I01",
        expectedStep: 2,
      }),
    ).toThrow("阶段已变化");
    const running = transition(s, "研发", {
      type: "eos",
      action: "next",
      issueId: "I01",
      expectedStep: 0,
    });
    expect(running.eosRuns![0].step).toBe(0);
    expect(() =>
      transition(running, "研发", {
        type: "eos",
        action: "next",
        issueId: "I01",
        expectedStep: 0,
      }),
    ).toThrow("不可推进");
    expect(() =>
      transition(running, "EOS Agents", {
        type: "eos",
        action: "tick",
        issueId: "I01",
      }),
    ).toThrow("仍在执行");
    const finished = transition(
      running,
      "EOS Agents",
      { type: "eos", action: "tick", issueId: "I01" },
      running.version,
      running.eosRuns![0].readyAt,
    );
    expect(finished.eosRuns![0]).toMatchObject({ step: 1, status: "waiting" });
    expect(() =>
      transition(finished, "EOS Agents", {
        type: "eos",
        action: "tick",
        issueId: "I01",
      }),
    ).toThrow("没有运行");
  });
  it("preserves prior run history when explicitly restarting", () => {
    const s = start();
    s.eosRuns![0].status = "completed";
    s.eosRuns![0].step = 6;
    const next = transition(s, "研发", {
      type: "eos",
      action: "restart",
      issueId: "I01",
    });
    expect(next.eosRuns![0]).toMatchObject({ step: 0, status: "waiting" });
    expect(next.eosHistory![0]).toEqual(s.eosRuns![0]);
    expect(next.demands).toEqual(s.demands);
  });
});
