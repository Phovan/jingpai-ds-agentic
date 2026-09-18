import { describe, it, expect } from "vitest";
import { seed, transition, type State } from "./model";
import { inboxItems } from "./briefing";
import { catalogEntities } from "./catalog";
const complete = () => {
  let s: State = transition({ ...seed(), catalogVersion: "v03" }, "研发", {
    type: "eos",
    action: "start",
    issueId: "I01",
  });
  for (let i = 0; i < 6; i++) {
    if (i === 4)
      s = transition(s, "项目经理", {
        type: "eos",
        action: "approve",
        issueId: "I01",
        expectedRunId: s.eosRuns![0].id,
        reason: "冻结验收与复验证据齐全，仅批准模拟验证",
      });
    s = transition(s, "研发", {
      type: "eos",
      action: "next",
      issueId: "I01",
      expectedStep: i,
    });
    s = transition(
      s,
      "EOS Agents",
      { type: "eos", action: "tick", issueId: "I01" },
      s.version,
      s.eosRuns![0].readyAt,
    );
  }
  return s;
};
describe("EOS transfer to independent testing", () => {
  it("creates one persistent tester-only todo with frozen evidence and unchanged business state", () => {
    const before = complete(),
      run = before.eosRuns![0];
    const next = transition(before, "研发", {
      type: "eos",
      action: "transfer-test",
      issueId: "I01",
      expectedRunId: run.id,
    });
    expect(next.eosTestTasks).toHaveLength(1);
    expect(next.eosTestTasks![0]).toMatchObject({
      runId: run.id,
      issueId: "I01",
      implId: "M02",
      recipient: "测试",
      recipientId: "E13",
      status: "待测试",
      acceptance: run.acceptance,
    });
    const saved = JSON.parse(JSON.stringify(next));
    const task = inboxItems(saved, "测试").find(
      (i) => i.id === next.eosTestTasks![0].id,
    )!;
    expect(task.kind).toBe("待处理");
    expect(task.title).toContain("回写重复导致待办队列漏单");
    expect(task.body).toContain("评论待办幂等修复");
    expect(task.body).not.toMatch(/\b(?:I01|M02|D01)\b/);
    expect(inboxItems(saved, "测试").some((i) => i.id === "v03-review")).toBe(
      false,
    );
    for (const role of ["研发", "管理层", "系统管理员"] as const)
      expect(inboxItems(saved, role).some((i) => i.id === task.id)).toBe(false);
    expect(catalogEntities(saved, "测试").some((e) => e.id === "M02")).toBe(
      true,
    );
    expect(next.demands).toEqual(before.demands);
    expect(next.eosRuns).toEqual(before.eosRuns);
    expect(next.actual).toEqual(before.actual);
    expect(next.task).toEqual(before.task);
  });
  it("rejects premature, unauthorized, stale-round and duplicate transfers", () => {
    const before = complete(),
      run = before.eosRuns![0];
    const cmd = {
      type: "eos" as const,
      action: "transfer-test" as const,
      issueId: "I01",
      expectedRunId: run.id,
    };
    expect(() => transition(before, "测试", cmd)).toThrow("仅研发");
    expect(() =>
      transition(before, "研发", { ...cmd, expectedRunId: "old" }),
    ).toThrow("轮次");
    expect(() =>
      transition(
        { ...before, eosRuns: [{ ...run, status: "waiting", step: 2 }] },
        "研发",
        cmd,
      ),
    ).toThrow("先完成");
    const sent = transition(before, "研发", cmd);
    expect(() => transition(sent, "研发", cmd)).toThrow("重复");
    const restarted = transition(sent, "研发", {
      type: "eos",
      action: "restart",
      issueId: "I01",
    });
    expect(restarted.eosTestTasks).toEqual(sent.eosTestTasks);
    expect(() => transition(restarted, "研发", cmd)).toThrow();
  });
});
