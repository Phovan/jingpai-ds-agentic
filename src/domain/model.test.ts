import { describe, expect, it } from "vitest";
import {
  seed,
  transition as t,
  REPORT_ROLES,
  brainAnswer,
  type State,
  type Role,
} from "./model";
const evidence = "演示证据已核实，责任与边界已确认";
function planned() {
  let s = t(seed(), "管理层", {
    type: "decide",
    plan: "assist",
    reason: evidence,
  });
  return t(s, "项目经理", { type: "coordinate", evidence });
}
function blocked() {
  let s = t(planned(), "研发", { type: "start" });
  for (let i = 0; i < 3; i++) s = t(s, "EOS Agents", { type: "tick" });
  return s;
}
function ready() {
  return t(
    t(blocked(), "研发", { type: "environment", evidence }),
    "EOS Agents",
    { type: "tick" },
  );
}
function released() {
  return t(ready(), "项目经理", { type: "release", evidence });
}
describe("shared goal → decision → execution → business outcome", () => {
  it("queries never mutate objects", () => {
    const s = seed(),
      before = structuredClone(s);
    expect(brainAnswer(s, "目标差距")).toContain("1.5h");
    expect(s).toEqual(before);
  });
  it("rejects premature execution and role escalation", () => {
    expect(() => t(seed(), "研发", { type: "start" })).toThrow();
    expect(() =>
      t(seed(), "PMO", { type: "decide", plan: "assist", reason: evidence }),
    ).toThrow("权限");
  });
  it("approval alone does not alter forecast or result", () => {
    const s = t(seed(), "管理层", {
      type: "decide",
      plan: "assist",
      reason: evidence,
    });
    expect(s.demands[0].forecast).toBe("2026-09-27");
    expect(s.actual).toBe(3.5);
  });
  it("project coordination updates the shared forecast only", () => {
    const s = planned();
    expect(s.demands[0].forecast).toBe("2026-09-25");
    expect(s.actual).toBe(3.5);
    expect(s.events.some((e) => e.actor === "PMO Agents")).toBe(true);
  });
  it("blocks at missing real-identity verification rather than passing", () => {
    const s = blocked();
    expect(s.task).toBe("blocked");
    expect(s.demands[0].stage).toBe("待测试");
    expect(() => t(s, "项目经理", { type: "release", evidence })).toThrow();
  });
  it("human cannot directly advance the agent engine", () =>
    expect(() => t(planned(), "研发", { type: "tick" })).toThrow("权限"));
  it("retries verification and keeps failed evidence", () => {
    const s = ready();
    expect(s.task).toBe("ready");
    expect(s.events.some((e) => e.title.includes("阻塞"))).toBe(true);
    expect(s.events.some((e) => e.title.includes("现实验证通过"))).toBe(true);
  });
  it("release is not business acceptance", () => {
    const s = released();
    expect(s.actual).toBe(3.5);
    expect(s.demands[0].stage).toBe("已上线待业务验证");
    expect(() =>
      t(s, "研发", { type: "accept", actual: 1.8, evidence }),
    ).toThrow("权限");
  });
  it("owner evidence is required and target must be met", () => {
    const s = released();
    expect(() =>
      t(s, "业务Owner", { type: "accept", actual: 1.8, evidence: "" }),
    ).toThrow();
    expect(() =>
      t(s, "业务Owner", { type: "accept", actual: 3, evidence }),
    ).toThrow("未达到");
    expect(() =>
      t(s, "业务Owner", { type: "accept", actual: NaN, evidence }),
    ).toThrow();
  });
  it("verified outcome closes request and updates goal", () => {
    const s = t(released(), "业务Owner", {
      type: "accept",
      actual: 1.8,
      evidence,
    });
    expect(s.actual).toBe(1.8);
    expect(s.demands[0].stage).toBe("已关闭");
    expect(s.knowledgeVerified).toBe(false);
    expect(t(s, "PMO", { type: "knowledge-verify" }).knowledgeVerified).toBe(
      true,
    );
  });
  it("failed business validation returns same request with new Impl", () => {
    const s = t(released(), "业务Owner", { type: "reject", evidence });
    expect(s.demands[0].id).toBe("REQ-024");
    expect(s.demands[0].stage).toBe("待开发");
    expect(s.run).toBe(2);
    expect(s.actual).toBe(3.5);
    expect(s.events.some((e) => e.title.includes("发布完成"))).toBe(true);
  });
  it("stopping preserves receipts and requires explicit restart", () => {
    let s = t(planned(), "研发", { type: "start" });
    s = t(s, "EOS Agents", { type: "tick" });
    s = t(s, "研发", { type: "stop" });
    expect(s.task).toBe("stopped");
    expect(() => t(s, "EOS Agents", { type: "tick" })).toThrow();
    expect(s.events.some((e) => e.title.includes("实现产物"))).toBe(true);
  });
  it("dispatch failure and retry do not duplicate a task", () => {
    let s = t(planned(), "研发", { type: "fault" });
    s = t(s, "研发", { type: "start" });
    expect(s.task).toBe("idle");
    expect(s.dispatchFailed).toBe(true);
    s = t(s, "研发", { type: "retry-dispatch" });
    expect(s.task).toBe("running");
    expect(s.run).toBe(1);
    expect(() => t(s, "研发", { type: "retry-dispatch" })).toThrow();
  });
  it("duplicate approval and stale object version are rejected", () => {
    const s = t(seed(), "管理层", {
      type: "decide",
      plan: "assist",
      reason: evidence,
    });
    expect(() =>
      t(s, "管理层", { type: "decide", plan: "assist", reason: evidence }),
    ).toThrow();
    expect(() => t(s, "项目经理", { type: "coordinate", evidence }, 0)).toThrow(
      "已发生变化",
    );
  });
});
describe("new demand intake → baseline → schedule", () => {
  it("all roles use same request identity", () => {
    let s = t(seed(), "业务Owner", {
      type: "create-demand",
      title: "异常订单分配机制",
      problem: "需要责任人自动分配并记录交接依据",
      requested: "2026-09-30",
    });
    const id = s.demands[2].id;
    expect(s.demands[2].committed).toBe("");
    s = t(s, "产品经理", { type: "baseline", id, text: evidence });
    s = t(s, "业务Owner", { type: "confirm-baseline", id });
    s = t(s, "项目经理", { type: "schedule", id, date: "2026-10-01" });
    expect(s.demands[2].id).toBe(id);
    expect(s.demands[2].stage).toBe("待开发");
  });
  it("rejects duplicate demand and unconfirmed scheduling", () => {
    expect(() =>
      t(seed(), "业务Owner", {
        type: "create-demand",
        title: "订单异常提醒",
        problem: evidence,
        requested: "2026-09-30",
      }),
    ).toThrow("同名");
    expect(() =>
      t(seed(), "项目经理", {
        type: "schedule",
        id: "REQ-025",
        date: "2026-09-30",
      }),
    ).toThrow();
  });
  it("frozen baseline cannot be overwritten", () =>
    expect(() =>
      t(seed(), "产品经理", {
        type: "baseline",
        id: "REQ-024",
        text: evidence,
      }),
    ).toThrow("冻结"));
});
describe("report facts → confirmations → management sign-off", () => {
  it("must not assume silence is agreement", () => {
    const s = t(seed(), "PMO", { type: "report-generate" });
    expect(() => t(s, "PMO", { type: "report-reconcile" })).toThrow();
    expect(() => t(s, "管理层", { type: "report-finalize" })).toThrow();
  });
  it("collects four role confirmations, then reconciles and freezes", () => {
    let s = t(seed(), "PMO", { type: "report-generate" });
    const snapshot = s.report!.snapshot;
    for (const role of REPORT_ROLES)
      s = t(s, role, { type: "report-confirm", evidence });
    s = t(s, "PMO", { type: "report-reconcile" });
    s = t(s, "管理层", { type: "report-finalize" });
    expect(s.report!.finalized).toBe(true);
    s = t(s, "管理层", { type: "decide", plan: "assist", reason: evidence });
    expect(s.report!.snapshot).toBe(snapshot);
  });
  it("does not let PMO impersonate role confirmation", () => {
    const s = t(seed(), "PMO", { type: "report-generate" });
    expect(() => t(s, "PMO", { type: "report-confirm", evidence })).toThrow();
  });
});
describe("authorization matrix", () => {
  it("delay cannot change a business commitment without Owner approval", () => {
    let s = t(seed(), "管理层", {
      type: "decide",
      plan: "delay",
      reason: evidence,
    });
    expect(() => t(s, "项目经理", { type: "coordinate", evidence })).toThrow(
      "Owner",
    );
    s = t(s, "业务Owner", { type: "accept-delay", evidence });
    s = t(s, "项目经理", { type: "coordinate", evidence });
    expect(s.demands[0].committed).toBe("2026-09-27");
  });
  it("starting a new reporting round archives the signed snapshot", () => {
    let s = t(seed(), "PMO", { type: "report-generate" });
    for (const role of REPORT_ROLES)
      s = t(s, role, { type: "report-confirm", evidence });
    s = t(s, "PMO", { type: "report-reconcile" });
    s = t(s, "管理层", { type: "report-finalize" });
    const old = structuredClone(s.report);
    s = t(s, "PMO", { type: "report-generate" });
    expect(s.reportHistory[0]).toEqual(old);
    expect(s.report!.finalized).toBe(false);
  });
  it.each(["管理层", "PMO", "项目经理", "产品经理", "研发"] as Role[])(
    "%s cannot accept for Owner",
    (role) =>
      expect(() =>
        t(released(), role, { type: "accept", actual: 1.8, evidence }),
      ).toThrow(),
  );
  it("transitions never mutate input snapshots", () => {
    const s: State = seed();
    t(s, "管理层", { type: "decide", plan: "assist", reason: evidence });
    expect(s.version).toBe(0);
    expect(s.decision).toBe("pending");
  });
});
