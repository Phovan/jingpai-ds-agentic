import { describe, it, expect } from "vitest";
import { seed, transition } from "./model";
import { emptyPersonal, scopedThreads } from "./personal";
import { appendQuestion } from "./experience";
import {
  inboxItems,
  periodLabel,
  reportContext,
  reportReply,
  reportingItems,
  reportText,
  topicsFor,
} from "./briefing";

describe("personal homepage and periodic reports", () => {
  it("limits rollups and topics to visible objects, never trusts saved follow ids", () => {
    const p = { ...emptyPersonal(), follows: ["PRJ-001", "PRJ-002", "SECRET"] };
    expect(reportingItems(seed(), "研发", p).map((x) => x.id)).toEqual([
      "PRJ-001",
    ]);
    expect(reportingItems(seed(), "系统管理员", p)).toEqual([]);
    expect(
      topicsFor(seed(), "研发", {
        ...p,
        topics: [
          { id: "bad", title: "test", summary: "", objectIds: ["SECRET"] },
        ],
      }).find((t) => t.id === "bad")?.objectIds,
    ).toEqual([]);
  });
  it("keeps weekly, monthly and topic conversations in distinct persistent groups", () => {
    const s = seed(),
      p = emptyPersonal();
    const weekly = reportContext("管理层", { period: "周报" }, p, s);
    const monthly = reportContext("管理层", { period: "月报" }, p, s);
    let result = appendQuestion(p, s, "管理层", "检查差距", weekly);
    result = appendQuestion(result.data, s, "管理层", "本月进展", monthly);
    expect(result.data.groups).toHaveLength(2);
    expect(scopedThreads(result.data, weekly.key)).toHaveLength(1);
    const topic = reportContext(
      "管理层",
      { period: "自定义Topic", topicId: "order-goal" },
      p,
      s,
    );
    expect(topic.key).not.toBe(weekly.key);
  });
  it("does not mutate facts on report edits or treat missing evidence as attainment", () => {
    const s = seed(),
      p = emptyPersonal(),
      before = structuredClone(s);
    const ctx = reportContext("管理层", { period: "周报" }, p, s);
    const reply = reportReply(s, "管理层", p, ctx, "补充关注：接口阻塞");
    expect(reply.note).toContain("接口阻塞");
    expect(s).toEqual(before);
    expect(reportText(s, "管理层", p, ctx)).toContain(
      "不代表已接入该周期的历史趋势",
    );
    expect(reportReply(s, "管理层", p, ctx, "确认本期汇报").action?.kind).toBe(
      "confirm",
    );
  });
  it("requires management authority, explicit confirmation and in-team recipients", () => {
    const s = seed(),
      p = emptyPersonal(),
      ctx = reportContext("管理层", { period: "月报" }, p, s);
    const reply = reportReply(
      s,
      "管理层",
      p,
      ctx,
      "向研发下发月报关注点：提供验证证据",
    );
    expect(reply.action).toMatchObject({
      kind: "focus",
      period: "月报",
      recipients: ["研发"],
    });
    expect(s.reportFocus).toBeUndefined();
    const cmd = {
      type: "report-focus" as const,
      id: "focus1",
      period: "月报" as const,
      recipients: ["研发" as const],
      content: "提供验证证据",
    };
    expect(() => transition(s, "研发", cmd)).toThrow();
    expect(() =>
      transition(s, "管理层", { ...cmd, recipients: ["系统管理员"] }),
    ).toThrow();
    const next = transition(s, "管理层", cmd);
    expect(next.reportFocus?.[0].recipients).toEqual(["研发"]);
    expect(() => transition(next, "管理层", cmd)).toThrow();
    const devCtx = reportContext("研发", { period: "月报" }, p, next);
    expect(reportText(next, "研发", p, devCtx)).toContain(
      "上级关注：提供验证证据",
    );
    expect(
      reportReply(s, "研发", p, devCtx, "下发团队关注").action,
    ).toBeUndefined();
  });
  it("gives weekly keys correct local Monday boundaries and role-specific pending actions", () => {
    expect(periodLabel("周报", new Date(2026, 8, 20))).toBe("2026/9/14 当周");
    expect(periodLabel("季报", new Date(2026, 8, 20))).toBe("2026年Q3");
    expect(inboxItems(seed(), "管理层").some((i) => i.kind === "待处理")).toBe(
      true,
    );
    expect(inboxItems(seed(), "研发").some((i) => i.kind === "待处理")).toBe(
      false,
    );
    expect(inboxItems(seed(), "系统管理员")).toEqual([]);
  });
});
