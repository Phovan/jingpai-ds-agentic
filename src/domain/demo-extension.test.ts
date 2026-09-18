import { describe, expect, it } from "vitest";
import { seed, transition as t, type Command, type State } from "./model";
const evidence = "演示证据：已逐项核对冻结基线、完成验证并确认本次结果";
const config: Command = {
  type: "connection-configure",
  source: "飞书",
  scope: "数字经营部演示资料",
  owner: "资料Owner",
  interval: "仅手动同步",
};
function scheduled() {
  let s = t(seed(), "产品经理", {
    type: "baseline",
    id: "REQ-025",
    text: evidence,
  });
  s = t(s, "业务Owner", { type: "confirm-baseline", id: "REQ-025" });
  return t(s, "项目经理", {
    type: "schedule",
    id: "REQ-025",
    date: "2026-09-28",
  });
}
function delivered() {
  let s = t(scheduled(), "研发", {
    type: "demand-advance",
    id: "REQ-025",
    action: "start",
    evidence,
  });
  s = t(s, "研发", {
    type: "demand-advance",
    id: "REQ-025",
    action: "submit",
    evidence,
  });
  s = t(s, "EOS Agents", { type: "demand-review", id: "REQ-025" });
  return t(s, "研发", {
    type: "demand-advance",
    id: "REQ-025",
    action: "release",
    evidence,
  });
}
describe("administrator connector simulation", () => {
  it("requires administrator without granting business approval", () => {
    expect(() => t(seed(), "PMO", config)).toThrow("权限");
    expect(() =>
      t(seed(), "系统管理员", {
        type: "decide",
        plan: "assist",
        reason: evidence,
      }),
    ).toThrow("权限");
  });
  it("preserves prior result on failure and simulates retry without count duplication", () => {
    let s: State = t(seed(), "系统管理员", config);
    s = t(s, "系统管理员", { type: "connection-sync", source: "飞书" });
    s = t(s, "系统管理员", { type: "connection-fail", source: "飞书" });
    s = t(s, "系统管理员", { type: "connection-sync", source: "飞书" });
    expect(s.connections![0]).toMatchObject({
      status: "同步失败",
      count: 12,
      revision: 1,
    });
    s = t(s, "系统管理员", { type: "connection-sync", source: "飞书" });
    expect(s.connections![0]).toMatchObject({
      status: "已同步",
      count: 12,
      revision: 2,
    });
  });
  it("stops synchronization after revocation and retains history", () => {
    const s = t(t(seed(), "系统管理员", config), "系统管理员", {
      type: "connection-revoke",
      source: "飞书",
    });
    expect(s.connections![0].history).toHaveLength(2);
    expect(() =>
      t(s, "系统管理员", { type: "connection-sync", source: "飞书" }),
    ).toThrow("授权已撤回");
  });
});
describe("new demand simulated lifecycle", () => {
  it("reaches business acceptance with explicit simulated review evidence", () => {
    const s = t(delivered(), "业务Owner", {
      type: "demand-advance",
      id: "REQ-025",
      action: "accept",
      evidence,
    });
    expect(s.demands[1].stage).toBe("已关闭");
    expect(s.demands[1].evidence.join()).toContain("未运行真实代码或测试");
    expect(s.actual).toBe(3.5);
    expect(
      s.events.filter((e) => e.object === "REQ-025").length,
    ).toBeGreaterThan(6);
  });
  it("blocks skipped stages, wrong roles and missing evidence", () => {
    expect(() =>
      t(scheduled(), "研发", {
        type: "demand-advance",
        id: "REQ-025",
        action: "release",
        evidence,
      }),
    ).toThrow();
    expect(() =>
      t(delivered(), "研发", {
        type: "demand-advance",
        id: "REQ-025",
        action: "accept",
        evidence,
      }),
    ).toThrow("权限");
    expect(() =>
      t(scheduled(), "研发", {
        type: "demand-advance",
        id: "REQ-025",
        action: "start",
        evidence: "",
      }),
    ).toThrow();
  });
  it("returns rejected business results to development", () => {
    const s = t(delivered(), "业务Owner", {
      type: "demand-advance",
      id: "REQ-025",
      action: "reject",
      evidence,
    });
    expect(s.demands[1].stage).toBe("待开发");
  });
});
