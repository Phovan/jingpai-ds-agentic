import { describe, it, expect } from "vitest";
import { seed, transition, type State, type Role } from "./model";
import { getOperations, type OpsAction } from "./operations";
import { contextItems } from "./experience";
import { workItems } from "./workbench";
const ev = "已对照原标准、业务样例与责任范围核实，演示证据齐备";
function step(
  s: State,
  role: Role,
  action: OpsAction,
  id?: string,
  values: Record<string, string> = {},
) {
  return transition(s, role, {
    type: "ops",
    action,
    id,
    values: { evidence: ev, ...values },
  });
}
const project = {
  title: "新建服务效率试点",
  domain: "服务",
  goal: "服务响应时长",
  target: "2",
  baseline: "3.5",
  unit: "小时",
  direction: "≤",
  deadline: "2026-10-15",
  system: "SYS-01",
  supplier: "内部团队",
  scope: "单一团队试点，第一周确认口径第二周验证结果",
};
const releaseValues = {
  title: "十月协同版本",
  system: "SYS-01",
  demands: "REQ-024",
  due: "2026-10-15",
  scope: "异常提醒和权限正反验证",
  impact: "复用接口；投入研发2人日，测试1人日；运维验证环境与身份",
};
function releaseSeed() {
  return step(seed(), "项目经理", "release-create", undefined, releaseValues);
}
function ready() {
  let s = releaseSeed();
  for (const role of ["研发", "测试", "运维", "系统负责人"] as Role[])
    s = step(s, role, "release-ready", "REL-001", { decision: "就绪" });
  return s;
}
function reviewed() {
  let s = step(ready(), "研发", "impl-submit", "REL-001");
  return step(s, "测试", "impl-review", "REL-001", { decision: "通过" });
}
function authorized() {
  let s = step(reviewed(), "系统负责人", "release-authorize", "REL-001");
  return step(s, "业务Owner", "release-authorize", "REL-001");
}
describe("P09 project approval and strategic demand", () => {
  it("requires three professional confirmations before management approval", () => {
    let s = step(seed(), "PMO", "project-create", undefined, project);
    expect(() =>
      step(s, "管理层", "project-decide", "PRJ-008", { decision: "批准" }),
    ).toThrow();
    for (const r of ["业务Owner", "系统负责人", "PMO"] as Role[])
      s = step(s, r, "project-confirm", "PRJ-008");
    s = step(s, "管理层", "project-decide", "PRJ-008", { decision: "批准" });
    expect(s.operations!.projects.at(-1)!.status).toBe("进行中");
    expect(s.operations!.commitments.at(-1)!.project).toBe("PRJ-008");
    expect(workItems(s, "管理层").some((p) => p.id === "PRJ-008")).toBe(true);
  });
  it("guards duplicate projects and unauthorized approval", () => {
    const s = step(seed(), "PMO", "project-create", undefined, project);
    expect(() => step(s, "PMO", "project-create", undefined, project)).toThrow(
      "同名",
    );
    expect(() =>
      step(s, "研发", "project-decide", "PRJ-008", { decision: "批准" }),
    ).toThrow("权限");
  });
  it("returns draft without losing original decision", () => {
    let s = step(seed(), "PMO", "project-create", undefined, project);
    s = step(s, "管理层", "project-decide", "PRJ-008", { decision: "退回" });
    s = step(s, "项目经理", "project-edit", "PRJ-008", {
      scope: "修订后的试点范围与里程碑",
      deadline: "2026-10-20",
    });
    expect(s.operations!.projects.at(-1)!.history.join()).toContain("退回");
  });
  it("creates the same demand object from strategic decision", () => {
    const s = step(seed(), "管理层", "decision-demand", undefined, {
      project: "PRJ-001",
      title: "完善异常通知与业务追踪",
      due: "2026-10-15",
      conversation: "战略对象会话",
    });
    expect(s.demands.at(-1)).toMatchObject({
      id: "REQ-026",
      projectId: "PRJ-001",
      stage: "待受理",
      baselineConfirmed: false,
    });
    expect(s.actual).toBe(3.5);
  });
  it("does not approve unmet business results and records handover after verified outcomes", () => {
    expect(() =>
      step(seed(), "业务Owner", "project-result", "PRJ-002", {
        actual: "40",
        decision: "确认",
        due: "2026-10-20",
      }),
    ).toThrow("差距");
    let s = step(seed(), "业务Owner", "project-result", "PRJ-002", {
      actual: "25",
      decision: "确认",
      due: "2026-10-20",
    });
    s = step(s, "系统负责人", "project-handover", "PRJ-002", {
      due: "2026-10-30",
    });
    expect(s.operations!.projects[1]).toMatchObject({
      status: "已移交",
      actual: 25,
      reassess: "2026-10-30",
    });
  });
});
describe("P06 P10 P11 commitments and risk", () => {
  it("requires member submission and manager acceptance", () => {
    let s = step(seed(), "项目成员", "commit-submit", "ACT-001", {
      decision: "提交验收",
    });
    expect(s.operations!.commitments[0].status).toBe("待验收");
    s = step(s, "项目经理", "commit-check", "ACT-001", { decision: "接受" });
    expect(s.operations!.commitments[0].status).toBe("已接受");
    expect(() => step(seed(), "研发", "commit-submit", "ACT-001")).toThrow(
      "权限",
    );
  });
  it("blocked work creates a traceable risk", () => {
    const s = step(seed(), "项目成员", "commit-submit", "ACT-001", {
      decision: "受阻",
    });
    expect(s.operations!.risks.at(-1)!.project).toBe("PRJ-001");
  });
  it("runs verify, escalate, management decision, treatment and evidence-based close", () => {
    let s = step(seed(), "PMO", "risk-verify", "RSK-001", { decision: "核实" });
    s = step(s, "PMO", "risk-escalate", "RSK-001");
    expect(() => step(s, "系统负责人", "risk-treat", "RSK-001")).toThrow(
      "权限",
    );
    s = step(s, "管理层", "risk-treat", "RSK-001");
    s = step(s, "系统负责人", "risk-treat", "RSK-001");
    s = step(s, "项目经理", "risk-close", "RSK-001", { decision: "关闭" });
    expect(s.operations!.risks[0].status).toBe("已关闭");
    expect(s.actual).toBe(3.5);
  });
  it("cannot close unverified risk", () =>
    expect(() =>
      step(seed(), "PMO", "risk-close", "RSK-001", { decision: "关闭" }),
    ).toThrow());
  it("updates system sample with valid bounds", () => {
    const s = step(seed(), "运维", "system-check", "SYS-01", {
      actual: "99.95",
    });
    expect(s.operations!.systems[0].status).toBe("正常");
    expect(() =>
      step(s, "运维", "system-check", "SYS-01", { actual: "101" }),
    ).toThrow();
  });
});
describe("E09 E10 E11 version gates and lifecycle", () => {
  it("requires baseline and scheduling before version compilation", () =>
    expect(() =>
      step(seed(), "项目经理", "release-create", undefined, {
        ...releaseValues,
        demands: "REQ-025",
      }),
    ).toThrow("基线"));
  it("cannot implement without all readiness checks", () =>
    expect(() => step(releaseSeed(), "研发", "impl-submit", "REL-001")).toThrow(
      "就绪",
    ));
  it("keeps independent review separate from implementation", () => {
    const s = step(ready(), "研发", "impl-submit", "REL-001");
    expect(() =>
      step(s, "研发", "impl-review", "REL-001", { decision: "通过" }),
    ).toThrow("权限");
    expect(s.demands[0].stage).toBe("待测试");
  });
  it("retains failed Impl and creates a new candidate", () => {
    let s = step(ready(), "研发", "impl-submit", "REL-001");
    s = step(s, "测试", "impl-review", "REL-001", {
      decision: "退回",
      reason: "实现缺陷",
    });
    s = step(s, "研发", "impl-submit", "REL-001");
    expect(s.operations!.releases[0].impls).toHaveLength(2);
    expect(s.operations!.releases[0].impls[0].result).toBe("退回");
  });
  it("does not publish on reviewer approval alone", () =>
    expect(() =>
      step(reviewed(), "运维", "release-publish", "REL-001", {
        decision: "成功",
      }),
    ).toThrow("门禁"));
  it("publishes then waits for business results, not inferred metrics", () => {
    let s = step(authorized(), "运维", "release-publish", "REL-001", {
      decision: "成功",
    });
    expect(s.demands[0].stage).toBe("已上线待业务验证");
    expect(s.actual).toBe(3.5);
    s = step(s, "业务Owner", "release-result", "REL-001", { decision: "通过" });
    expect(s.demands[0].stage).toBe("已关闭");
    expect(s.actual).toBe(3.5);
  });
  it("cannot bypass version gates via old commands", () => {
    const s = releaseSeed();
    expect(() => transition(s, "研发", { type: "start" })).toThrow("门禁");
  });
  it("keeps original date until all change approvals, then invalidates verification", () => {
    let s = reviewed();
    s = step(s, "项目经理", "change-propose", "REL-001", {
      scope: "新增异常分级规则与重新验证",
      due: "2026-10-20",
    });
    expect(s.operations!.releases[0].date).toBe("2026-10-15");
    expect(() =>
      step(s, "业务Owner", "release-authorize", "REL-001"),
    ).toThrow();
    for (const role of ["业务Owner", "系统负责人", "管理层"] as Role[])
      s = step(s, role, "change-confirm", "REL-001", { decision: "批准" });
    expect(s.operations!.releases[0]).toMatchObject({
      date: "2026-10-20",
      originalDate: "2026-10-15",
      status: "待就绪",
    });
    expect(s.operations!.releases[0].impls[0].result).toBe("退回");
    expect(s.demands[0].committed).toBe("2026-09-25");
  });
  it("records failed publication and rollback without closing demand", () => {
    let s = step(authorized(), "运维", "release-publish", "REL-001", {
      decision: "失败",
    });
    s = step(s, "运维", "release-rollback", "REL-001");
    expect(s.operations!.releases[0].status).toBe("已回退");
    expect(s.demands[0].stage).toBe("待开发");
  });
  it("preserves old state on failed writes and persists operations", () => {
    const s = releaseSeed(),
      before = JSON.stringify(s);
    expect(() => step(s, "研发", "release-publish", "REL-001")).toThrow();
    expect(JSON.stringify(s)).toBe(before);
    expect(getOperations(JSON.parse(before)).releases).toHaveLength(1);
  });
});
describe("P12 E12 reports and subsequent actions", () => {
  for (const scene of ["PMO", "EOS"]) {
    it(`${scene} report needs all scoped roles and both professional checks`, () => {
      let s = step(seed(), "PMO", "report-create", undefined, {
        scene,
        period: "月报",
      });
      expect(() => step(s, "管理层", "report-finalize", "RPT-001")).toThrow();
      for (const r of s.operations!.reports[0].required)
        s = step(s, r, "report-respond", "RPT-001");
      s = step(s, "项目经理", "report-check", "RPT-001");
      s = step(
        s,
        scene === "PMO" ? "PMO" : "系统负责人",
        "report-check",
        "RPT-001",
      );
      s = step(s, "管理层", "report-finalize", "RPT-001", {
        project: "PRJ-001",
        title: "跟踪下期业务收益复评",
        owner: "项目经理",
        due: "2026-10-20",
      });
      expect(s.operations!.reports[0].status).toBe("已确认");
      expect(s.operations!.commitments.at(-1)!.dependency).toBe("RPT-001");
      expect(() => step(s, "管理层", "report-return", "RPT-001")).toThrow(
        "不可静默",
      );
    });
  }
  it("returns missing evidence and keeps the original snapshot", () => {
    let s = step(seed(), "PMO", "report-create", undefined, {
      scene: "PMO",
      period: "周报",
    });
    const snapshot = s.operations!.reports[0].snapshot;
    s = step(s, "项目成员", "report-respond", "RPT-001");
    s = step(s, "PMO", "report-return", "RPT-001");
    expect(s.operations!.reports[0].responses).toEqual({});
    expect(s.operations!.reports[0].snapshot).toBe(snapshot);
  });
});
describe("P14 E13 verified learning and P01 sources", () => {
  it("validates, adopts, reviews and retires experience", () => {
    let s = step(seed(), "研发", "lesson-create", undefined, {
      title: "接口契约先行减少返工",
      source: "PRJ-001 / REL-001",
      conditions: "适用同类接口场景；权限模型不同需重新验证",
    });
    expect(() =>
      step(s, "项目经理", "lesson-adopt", "EXP-001", {
        project: "PRJ-002",
        due: "2026-10-20",
      }),
    ).toThrow("未核实");
    for (const r of ["业务Owner", "系统负责人", "PMO"] as Role[])
      s = step(s, r, "lesson-verify", "EXP-001", { decision: "确认" });
    s = step(s, "项目经理", "lesson-adopt", "EXP-001", {
      project: "PRJ-002",
      due: "2026-10-20",
    });
    s = step(s, "系统负责人", "lesson-result", "EXP-001", {
      project: "PRJ-002",
      decision: "失效",
    });
    expect(s.operations!.lessons[0].status).toBe("失效");
    expect(() =>
      step(s, "项目经理", "lesson-adopt", "EXP-001", {
        project: "PRJ-003",
        due: "2026-10-20",
      }),
    ).toThrow();
  });
  it("keeps private and revoked notes out of another role's object context", () => {
    let s = step(seed(), "项目成员", "source-add", undefined, {
      title: "个人接口笔记",
      text: "仅本人可见的演示笔记资料",
      source: "Obsidian选定笔记",
      object: "PRJ-001",
      visibility: "个人",
    });
    const ctx = {
      key: "DOC-001",
      title: "资料",
      route: "operations" as const,
      objectId: "DOC-001",
    };
    expect(contextItems(s, "PMO", ctx)).toHaveLength(0);
    expect(() =>
      step(s, "PMO", "source-confirm", "DOC-001", { decision: "核实" }),
    ).toThrow("无权");
    s = step(s, "项目成员", "source-revoke", "DOC-001");
    expect(contextItems(s, "项目成员", ctx)).toHaveLength(0);
  });
  it("deduplicates imports, preserves version and does not overwrite business baseline", () => {
    const values = {
      title: "接口评审记录",
      text: "接口评审的初始内容与待确认结论",
      source: "飞书授权导出",
      object: "PRJ-001",
      visibility: "项目",
    };
    let s = step(seed(), "项目成员", "source-add", undefined, values);
    expect(() => step(s, "项目成员", "source-add", undefined, values)).toThrow(
      "重复",
    );
    s = step(s, "项目成员", "source-add", undefined, {
      ...values,
      text: "接口评审的修订内容与待确认结论",
    });
    s = step(s, "PMO", "source-confirm", "DOC-001", { decision: "冲突" });
    expect(s.operations!.sources[0]).toMatchObject({
      version: 2,
      status: "事实冲突",
    });
    expect(s.demands[0].baseline).toBe(seed().demands[0].baseline);
  });
});
