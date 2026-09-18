import { describe, expect, it } from "vitest";
import { seed, transition } from "./model";
import { EOS_ACCEPTANCE, EOS_STEPS } from "./eos";
import { visibleEntities } from "./ontology";

describe("EOS implementation demo", () => {
  it("links demand → Issue → Impl and preserves role scope", () => {
    const rows = visibleEntities(seed(), "研发");
    expect(rows.find((x) => x.id === "REQ-024")?.links).toContain("ISS-024");
    expect(rows.find((x) => x.id === "ISS-024")?.links).toContain("IMPL-024");
    expect(rows.find((x) => x.id === "IMPL-024")?.links).toContain("ISS-024");
    expect(
      visibleEntities(seed(), "业务Owner").some((x) => x.kind === "Issue"),
    ).toBe(false);
    expect(visibleEntities(seed(), "系统管理员")).toEqual([]);
  });
  it("rejects unauthorized starts and invalid issues", () => {
    expect(() =>
      transition(seed(), "业务Owner", {
        type: "eos",
        action: "start",
        issueId: "ISS-024",
      }),
    ).toThrow("仅研发");
    expect(() =>
      transition(seed(), "研发", {
        type: "eos",
        action: "start",
        issueId: "ISS-secret",
      }),
    ).toThrow("授权范围");
  });
  it("is idempotent while running, can stop and resume, limits ticks to agents", () => {
    let s = transition(seed(), "研发", {
      type: "eos",
      action: "start",
      issueId: "ISS-024",
    });
    s = transition(s, "研发", {
      type: "eos",
      action: "start",
      issueId: "ISS-024",
    });
    expect(s.eosRuns).toHaveLength(1);
    expect(s.eosRuns?.[0].status).toBe("waiting");
    s = transition(s, "研发", {
      type: "eos",
      action: "next",
      issueId: "ISS-024",
      expectedStep: 0,
    });
    expect(() =>
      transition(s, "研发", {
        type: "eos",
        action: "tick",
        issueId: "ISS-024",
      }),
    ).toThrow("仅 EOS");
    s = transition(s, "研发", {
      type: "eos",
      action: "stop",
      issueId: "ISS-024",
    });
    expect(() =>
      transition(s, "EOS Agents", {
        type: "eos",
        action: "tick",
        issueId: "ISS-024",
      }),
    ).toThrow("没有运行");
    s = transition(s, "研发", {
      type: "eos",
      action: "start",
      issueId: "ISS-024",
    });
    expect(s.eosRuns?.[0].status).toBe("waiting");
    expect(s.eosRuns).toHaveLength(1);
  });
  it("runs independent review repair loop without changing acceptance, release or business results", () => {
    const original = seed();
    let s = transition(original, "研发", {
      type: "eos",
      action: "start",
      issueId: "ISS-024",
    });
    for (let i = 1; i < EOS_STEPS.length; i++) {
      s = transition(s, "研发", {
        type: "eos",
        action: "next",
        issueId: "ISS-024",
        expectedStep: i - 1,
      });
      s = transition(
        s,
        "EOS Agents",
        {
          type: "eos",
          action: "tick",
          issueId: "ISS-024",
        },
        s.version,
        s.eosRuns![0].readyAt,
      );
    }
    expect(s.eosRuns?.[0].status).toBe("completed");
    expect(s.eosRuns?.[0].acceptance).toBe(EOS_ACCEPTANCE);
    expect(s.events.some((x) => x.title.includes("退回修复"))).toBe(true);
    expect(s.demands).toEqual(original.demands);
    expect(s.operations).toEqual(original.operations);
    expect(s.actual).toBe(original.actual);
    expect(s.task).toBe(original.task);
    expect(() =>
      transition(s, "研发", {
        type: "eos",
        action: "start",
        issueId: "ISS-024",
      }),
    ).toThrow("不重复");
    expect(
      visibleEntities(s, "研发").find((x) => x.id === "IMPL-024")?.actual,
    ).toContain("r2");
  });
});
