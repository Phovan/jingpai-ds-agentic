import { describe, expect, it } from "vitest";
import { seed, transition } from "./model";
import { catalogEntities } from "./catalog";
import { exampleQuestions } from "./catalog-dialogue";
import { eosStageAnswer } from "./eos-dialogue";
import { eosSteps } from "./eos";
const fresh = () => ({ ...seed(), catalogVersion: "v03" as const });
const questions = (id: string) =>
  exampleQuestions(fresh(), "研发", {
    key: id,
    title: id,
    route: "home",
    objectId: id,
  });
describe("EOS Issue entry regression", () => {
  it.each(["I01", "I03"])(
    "%s offers an executable manual workflow",
    (issueId) => {
      expect(questions(issueId)).toContain("开始EOS实施");
      let s = transition(fresh(), "研发", {
        type: "eos",
        action: "start",
        issueId,
      });
      expect(s.eosRuns![0]).toMatchObject({
        step: 0,
        status: "waiting",
        mode: "manual",
      });
      const before = JSON.stringify(s);
      expect(eosStageAnswer(s.eosRuns![0], 0, true)).toContain("没有推进");
      expect(JSON.stringify(s)).toBe(before);
      s = transition(s, "研发", {
        type: "eos",
        action: "next",
        issueId,
        expectedStep: 0,
      });
      expect(s.eosRuns![0]).toMatchObject({ step: 0, status: "running" });
      s = transition(
        s,
        "EOS Agents",
        { type: "eos", action: "tick", issueId },
        s.version,
        s.eosRuns![0].readyAt,
      );
      expect(s.eosRuns![0]).toMatchObject({ step: 1, status: "waiting" });
      const rows = catalogEntities(s, "研发");
      expect(new Set(rows.map((e) => e.id)).size).toBe(rows.length);
      if (issueId === "I03") {
        expect(rows.find((e) => e.id === "D05")!.status).toBe(
          catalogEntities(fresh(), "研发").find((e) => e.id === "D05")!.status,
        );
        expect(rows.find((e) => e.id === "I03")!.actual).toContain("2/7");
        expect(s.eosRuns![0].acceptance).toContain("配额");
      }
    },
  );
  it.each(["I02", "I04", "I05", "I06", "I07", "I08"])(
    "does not offer an unavailable launch for %s",
    (id) => {
      expect(questions(id)).not.toContain("开始EOS实施");
    },
  );
  it("explains missing plans rather than claiming a visible Issue does not exist", () => {
    expect(() =>
      transition(fresh(), "研发", {
        type: "eos",
        action: "start",
        issueId: "I04",
      }),
    ).toThrow("实施计划");
  });
  it("uses quota-specific evidence throughout all seven stages", () => {
    const steps = eosSteps("I03");
    expect(steps).toHaveLength(7);
    expect(steps[2].detail).toContain("P1");
    expect(steps[3].detail).toContain("事务");
    expect(steps[4].detail).toContain("人工审核");
    expect(steps[6].detail).toContain("未自动关闭");
    expect(steps.map((s) => s.detail + s.output).join("")).not.toMatch(
      /评论|订单|批次/,
    );
  });
});
