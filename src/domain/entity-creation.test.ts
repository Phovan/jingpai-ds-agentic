import { describe, it, expect } from "vitest";
import { seed, transition, type State } from "./model";
import { proposedCreation, type EntityDraft } from "./entity-creation";
import { catalogEntities } from "./catalog";
import { parseState } from "./store";
import { appendQuestion } from "./experience";
import { emptyPersonal } from "./personal";
import { answerLayout } from "./answer-layout";
const fresh = (): State => ({ ...seed(), catalogVersion: "v03" });
const draft = (): EntityDraft => ({
  requestId: crypto.randomUUID(),
  kind: "需求",
  title: "评论漏单证据核对",
  goal: "核对 23 条事件并补全漏单责任",
  parentId: "P02",
  domain: "营销",
});
describe("conversation creation", () => {
  it("proposes explicit commands only, parsing editable fields without mutation", () => {
    const s = fresh(),
      d = proposedCreation(
        s,
        "PMO",
        "新增需求：评论漏单证据核对；目标：核对 23 条事件",
        "P02",
      )!;
    expect(d.title).toBe("评论漏单证据核对");
    expect(d.goal).toBe("核对 23 条事件");
    expect(d.parentId).toBe("P02");
    expect(s.createdEntities).toBeUndefined();
    for (const q of [
      "如何新增需求？",
      "不要新增项目",
      "新增需求会有什么影响？",
    ])
      expect(proposedCreation(s, "PMO", q)).toBeUndefined();
  });
  it("keeps conversation creation as a draft until explicit commit", () => {
    const s = fresh();
    const result = appendQuestion(
      emptyPersonal(),
      s,
      "PMO",
      "新增需求：证据核对；目标：补全证据",
      { key: "P02", title: "评论区", route: "home", objectId: "P02" },
      null,
    );
    expect(
      result.data.threads.find((t) => t.id === result.threadId)?.messages.at(-1)
        ?.entityDraft?.kind,
    ).toBe("需求");
    expect(s.createdEntities).toBeUndefined();
  });
  it("creates an auditable linked draft and survives storage round trip", () => {
    const s = fresh(),
      d = draft(),
      next = transition(s, "PMO", { type: "catalog-create", draft: d });
    expect(s.createdEntities).toBeUndefined();
    const created = next.createdEntities![0];
    expect(created.id).toBe("D26");
    expect(created.status).toBe("待澄清");
    expect(created.actual).toBe("待采集");
    expect(created.links).toContain("P02");
    const visible = catalogEntities(parseState(JSON.stringify(next)), "研发");
    expect(visible.find((e) => e.id === "D26")?.title).toBe(d.title);
    expect(visible.find((e) => e.id === "P02")?.links).toContain("D26");
    expect(next.events.at(-1)?.object).toBe("D26");
  });
  it("rejects cancellation, duplicates and stale concurrent submissions", () => {
    const s = fresh(),
      d = draft(),
      next = transition(s, "PMO", { type: "catalog-create", draft: d });
    expect(() =>
      transition(s, "PMO", {
        type: "catalog-create",
        draft: { ...d, cancelled: true },
      }),
    ).toThrow(/取消/);
    expect(() =>
      transition(next, "PMO", { type: "catalog-create", draft: d }),
    ).toThrow(/重复/);
    expect(() =>
      transition(next, "PMO", {
        type: "catalog-create",
        draft: { ...d, requestId: "new" },
      }),
    ).toThrow(/同名/);
    expect(() =>
      transition(next, "PMO", { type: "catalog-create", draft: d }, s.version),
    ).toThrow(/变化/);
  });
  it("validates roles, scope, goals and required parent type", () => {
    const s = fresh();
    expect(() =>
      transition(s, "业务Owner", {
        type: "catalog-create",
        draft: { ...draft(), kind: "项目" },
      }),
    ).toThrow(/角色/);
    expect(() =>
      transition(s, "系统管理员", { type: "catalog-create", draft: draft() }),
    ).toThrow(/角色/);
    expect(() =>
      transition(s, "业务Owner", {
        type: "catalog-create",
        draft: { ...draft(), parentId: "P06" },
      }),
    ).toThrow(/不可见/);
    expect(() =>
      transition(s, "PMO", {
        type: "catalog-create",
        draft: { ...draft(), goal: " " },
      }),
    ).toThrow(/目标/);
    expect(() =>
      transition(s, "研发", {
        type: "catalog-create",
        draft: { ...draft(), kind: "Impl" },
      }),
    ).toThrow(/关联 Issue/);
  });
  it("reserves EOS repair identity and exposes newly created projects to creator", () => {
    let s = transition(fresh(), "研发", {
      type: "catalog-create",
      draft: { ...draft(), kind: "Impl", parentId: "I01" },
    });
    expect(s.createdEntities![0].id).toBe("M03");
    s = transition(s, "项目经理", {
      type: "catalog-create",
      draft: { ...draft(), kind: "项目", title: "营销监控优化", parentId: "" },
    });
    expect(
      catalogEntities(s, "项目经理").find((e) => e.title === "营销监控优化")
        ?.status,
    ).toBe("准备立项");
    expect(catalogEntities(s, "系统管理员")).toHaveLength(0);
  });
});
describe("compact answer", () => {
  it("bounds the default view while retaining the entire response", () => {
    const answer = Array.from(
      { length: 8 },
      (_, i) => "事实：" + i + "。" + "说明".repeat(200),
    ).join("\n\n");
    const layout = answerLayout(answer);
    expect(layout.full).toBe(answer);
    expect(layout.cards.length).toBeLessThanOrEqual(4);
    expect(layout.lead.length).toBeLessThanOrEqual(161);
    expect(layout.cards.every((c) => c.text.length <= 152)).toBe(true);
  });
});
