import { describe, expect, it } from "vitest";
import { seed, transition, type State } from "./model";
import {
  actionsFor,
  plansFor,
  meetings,
  bugs,
  qualitySnapshots,
  deliveryCases,
} from "./delivery";
import { catalogEntities } from "./catalog";
import { inboxItems } from "./briefing";
import { migratePersonalDefaults, emptyPersonal } from "./personal";
import { guidedReply } from "./catalog-dialogue";
const fresh = (): State => ({ ...seed(), catalogVersion: "v03" });
const assign = () =>
  transition(fresh(), "管理层", {
    type: "delivery",
    id: "ACT01",
    action: "approve",
    proposal: "补充乱序样本与缺失待办对照，不扩大生产权限",
    owner: "研发",
    due: "2026-09-21",
    deliverable: "23 条对照与失败重试日志",
  });
const advance = (s: State, issueId = "I01") => {
  s = transition(s, "研发", {
    type: "eos",
    action: "next",
    issueId,
    expectedStep: s.eosRuns!.find((r) => r.issueId === issueId)!.step,
  });
  return transition(
    s,
    "EOS Agents",
    { type: "eos", action: "tick", issueId },
    s.version,
    s.eosRuns!.find((r) => r.issueId === issueId)!.readyAt,
  );
};
const reviewReady = () => {
  let s = transition(fresh(), "研发", {
    type: "eos",
    action: "start",
    issueId: "I01",
  });
  for (let i = 0; i < 4; i++) s = advance(s);
  return s;
};
describe("meeting and stage evidence", () => {
  it("adds five meetings with views, owners, dates and reversible project links", () => {
    const rows = catalogEntities(fresh(), "PMO");
    expect(meetings).toHaveLength(5);
    for (const m of meetings) {
      expect(m.viewpoints.length).toBeGreaterThanOrEqual(3);
      expect(m.actions.every((a) => a.includes("｜"))).toBe(true);
      expect(rows.find((e) => e.id === m.project)!.links).toContain(m.id);
      expect(rows.find((e) => e.id === m.id)!.links).toContain(m.project);
    }
  });
  it("preserves customized tabs while upgrading the old PMO default", () => {
    expect(
      migratePersonalDefaults(
        {
          ...emptyPersonal(),
          ontologyDefaultsVersion: 2,
          ontologyTabs: ["项目"],
        },
        "PMO",
      ).ontologyTabs,
    ).toEqual(["项目", "会议"]);
    expect(
      migratePersonalDefaults(
        {
          ...emptyPersonal(),
          ontologyDefaultsVersion: 2,
          ontologyTabs: ["项目", "系统"],
        },
        "PMO",
      ).ontologyTabs,
    ).toEqual(["项目", "系统"]);
  });
  it("uses explicit work-package progress and separates readiness from quality", () => {
    expect(Object.values(deliveryCases).map((x) => x.stage)).toEqual([
      "需求确认",
      "开发",
      "测试",
      "运维改进",
    ]);
    expect(deliveryCases.P05.done / deliveryCases.P05.total).not.toBe(0.78);
    expect(deliveryCases.P09.riskType).not.toContain("质量");
    expect(deliveryCases.P03.quality).toContain("P1");
  });
  it("bug snapshots reconcile and final severity matches the defect ledger", () => {
    let remaining = 0;
    for (const s of qualitySnapshots) {
      remaining += s.opened + s.reopened - s.closed;
      expect(s.remaining).toBe(remaining);
    }
    expect(bugs.filter((b) => b.status !== "已关闭")).toHaveLength(remaining);
    expect(
      bugs.filter((b) => b.status !== "已关闭" && b.severity === "P1"),
    ).toHaveLength(1);
  });
  it("grounded conversation follows the meeting and current human action receipt", () => {
    const meeting = guidedReply(
      fresh(),
      "PMO",
      { key: "meeting", route: "home", title: "会议", objectId: "MT02" },
      "这场会讨论了什么？",
    );
    expect(meeting.answer).toContain("讨论观点");
    expect(meeting.answer).toContain("P1");
    expect(meeting.nextQuestions[0]).toContain("复测证据");
    const action = guidedReply(
      assign(),
      "研发",
      { key: "action", route: "home", title: "行动", objectId: "ACT01" },
      "下一步是什么？",
    );
    expect(action.answer).toContain("已分派");
    expect(action.answer).toContain("乱序样本");
  });
});
describe("human-reviewed task assignment", () => {
  it("keeps original and modified advice, creates the assignee todo only after approval", () => {
    expect(
      inboxItems(fresh(), "研发").some((i) => i.objectId === "ACT01"),
    ).toBe(false);
    const s = assign(),
      a = actionsFor(s)[0];
    expect(a.proposal).not.toBe(a.original);
    expect(a.status).toBe("已分派");
    expect(a.history[0].actor).toBe("管理层");
    expect(inboxItems(s, "研发").some((i) => i.objectId === "ACT01")).toBe(
      true,
    );
  });
  it("requires reviewer permission, all fields and non-duplicate approval", () => {
    expect(() =>
      transition(fresh(), "研发", {
        type: "delivery",
        action: "approve",
        id: "ACT01",
      }),
    ).toThrow("审核");
    expect(() =>
      transition(fresh(), "管理层", {
        type: "delivery",
        action: "approve",
        id: "ACT01",
      }),
    ).toThrow("责任人");
    expect(() =>
      transition(assign(), "管理层", {
        type: "delivery",
        action: "approve",
        id: "ACT01",
      }),
    ).toThrow("重复");
  });
  it("returns a proposal with reason then resubmits without dispatching", () => {
    expect(() =>
      transition(fresh(), "项目经理", {
        type: "delivery",
        action: "reject",
        id: "ACT01",
      }),
    ).toThrow("原因");
    let s = transition(fresh(), "项目经理", {
      type: "delivery",
      action: "reject",
      id: "ACT01",
      reason: "先补充乱序场景",
    });
    s = transition(s, "研发", {
      type: "delivery",
      action: "resubmit",
      id: "ACT01",
      proposal: "补齐乱序场景与消费者待办对照",
    });
    expect(actionsFor(s)[0].status).toBe("待审核");
    expect(actionsFor(s)[0].history).toHaveLength(2);
  });
  it("recipient submits evidence; reviewer returns, then independently accepts", () => {
    let s = assign();
    expect(() =>
      transition(s, "项目经理", {
        type: "delivery",
        action: "start",
        id: "ACT01",
      }),
    ).toThrow("责任人");
    s = transition(s, "研发", {
      type: "delivery",
      action: "start",
      id: "ACT01",
    });
    s = transition(s, "研发", {
      type: "delivery",
      action: "submit",
      id: "ACT01",
      evidence: "23 条对照，其中 2 条补查待办",
    });
    expect(inboxItems(s, "管理层").some((i) => i.objectId === "ACT01")).toBe(
      true,
    );
    expect(() =>
      transition(s, "研发", {
        type: "delivery",
        action: "accept",
        id: "ACT01",
      }),
    ).toThrow("审核");
    s = transition(s, "项目经理", {
      type: "delivery",
      action: "return",
      id: "ACT01",
      reason: "缺独立账号反例",
    });
    s = transition(s, "研发", {
      type: "delivery",
      action: "submit",
      id: "ACT01",
      evidence: "补独立账号反例，回执全量对照完成",
    });
    s = transition(s, "项目经理", {
      type: "delivery",
      action: "accept",
      id: "ACT01",
    });
    expect(actionsFor(s)[0].status).toBe("已完成");
    expect(inboxItems(s, "研发").some((i) => i.objectId === "ACT01")).toBe(
      false,
    );
    expect(s.actual).toBe(fresh().actual);
  });
});
describe("demand to approved execution queue", () => {
  it("blocks execution and scheduling until prior human gates are confirmed", () => {
    expect(() =>
      transition(fresh(), "研发", {
        type: "eos",
        action: "start",
        issueId: "I-BATCH",
      }),
    ).toThrow("实施计划");
    expect(() =>
      transition(fresh(), "项目经理", {
        type: "delivery",
        action: "queue",
        id: "D-DEMO-BATCH",
      }),
    ).toThrow("先确认");
  });
  it("creates visible linked Issue, starts a second case with its own acceptance", () => {
    let s = transition(fresh(), "管理层", {
      type: "delivery",
      action: "confirm-demand",
      id: "D-DEMO-BATCH",
    });
    expect(() =>
      transition(s, "研发", {
        type: "delivery",
        action: "queue",
        id: "D-DEMO-BATCH",
        resource: "2人日",
        due: "2026-09-22",
      }),
    ).toThrow("项目经理");
    s = transition(s, "项目经理", {
      type: "delivery",
      action: "queue",
      id: "D-DEMO-BATCH",
      resource: "2人日，供应商样本已备齐",
      due: "2026-09-22",
    });
    const entities = catalogEntities(s, "研发");
    expect(entities.find((e) => e.id === "D-DEMO-BATCH")!.links).toContain(
      "I-BATCH",
    );
    expect(entities.find((e) => e.id === "I-BATCH")!.links).toContain("P05");
    s = transition(s, "研发", {
      type: "eos",
      action: "start",
      issueId: "I-BATCH",
    });
    expect(s.eosRuns![0].acceptance).toBe(plansFor(s)[1].acceptance);
    expect(s.eosRuns![0].acceptance).not.toContain("评论");
    expect(
      catalogEntities(s, "业务Owner").some((e) => e.id === "I-BATCH"),
    ).toBe(false);
  });
});
describe("independent human EOS branch", () => {
  it("does not allow developer to approve or advance pending human review", () => {
    const s = reviewReady(),
      run = s.eosRuns![0];
    expect(run.humanReview).toBe("pending");
    expect(() => advance(s)).toThrow("人工审核");
    expect(() =>
      transition(s, "研发", {
        type: "eos",
        action: "approve",
        issueId: "I01",
        expectedRunId: run.id,
        reason: "我觉得通过",
      }),
    ).toThrow("不可自审");
    expect(() =>
      transition(s, "项目经理", {
        type: "eos",
        action: "reject",
        issueId: "I01",
        expectedRunId: run.id,
      }),
    ).toThrow("原因");
  });
  it("archives rejection, creates a new candidate, requires re-review and preserves business facts", () => {
    let s = reviewReady();
    const before = structuredClone(s),
      old = s.eosRuns![0];
    s = transition(s, "项目经理", {
      type: "eos",
      action: "reject",
      issueId: "I01",
      expectedRunId: old.id,
      reason: "缺少乱序写入的精确读回证据",
    });
    expect(s.eosHistory![0]).toMatchObject({
      id: old.id,
      humanReview: "rejected",
      step: 4,
    });
    expect(s.eosRuns![0]).toMatchObject({
      parentRunId: old.id,
      revision: 3,
      step: 2,
      status: "waiting",
    });
    expect(s.eosRuns![0].acceptance).toBe(old.acceptance);
    s = advance(advance(s));
    expect(s.eosRuns![0].humanReview).toBe("pending");
    expect(() =>
      transition(s, "项目经理", {
        type: "eos",
        action: "approve",
        issueId: "I01",
        expectedRunId: old.id,
        reason: "通过",
      }),
    ).toThrow("刷新");
    s = transition(s, "项目经理", {
      type: "eos",
      action: "approve",
      issueId: "I01",
      expectedRunId: s.eosRuns![0].id,
      reason: "新候选反例证据完整，只批准模拟验证",
    });
    s = advance(advance(s));
    expect(s.eosRuns![0].status).toBe("completed");
    const impls = catalogEntities(s, "研发").filter((e) => e.kind === "Impl");
    expect(
      impls.some((e) => e.id === "M02" && e.status.includes("人工退回")),
    ).toBe(true);
    expect(impls.some((e) => e.title.includes("r3"))).toBe(true);
    expect(s.actual).toBe(before.actual);
    expect(s.demands).toEqual(before.demands);
  });
});
