import { describe, expect, it } from "vitest";
import { seed, transition, type Role } from "./model";
import { exampleQuestions } from "./catalog-dialogue";
import { catalogEntities } from "./catalog";
import { proposedCreation } from "./entity-creation";
import { appendQuestion, type BrainContext } from "./experience";
import { emptyPersonal } from "./personal";
const state = () => ({ ...seed(), catalogVersion: "v03" as const });
describe("role-specific natural demand examples", () => {
  it.each(["项目经理", "业务Owner"] as Role[])(
    "%s has two request examples on home, lists and related details",
    (role) => {
      const contexts: (BrainContext | undefined)[] = [
        undefined,
        {
          key: "list",
          title: "工作台",
          route: "home",
          entityKind: role === "业务Owner" ? "需求" : "项目",
        },
        ...["P02", "X02", "D01"].map((id) => ({
          key: id,
          title: id,
          route: "home" as const,
          objectId: id,
        })),
      ];
      for (const ctx of contexts) {
        const s = state(),
          examples = exampleQuestions(s, role, ctx);
        expect(examples[0]).toMatch(/^我需要/);
        expect(examples[1]).toMatch(/^我发现一个问题/);
        expect(examples).toHaveLength(4);
        for (const q of examples.slice(0, 2)) {
          const snapshot = JSON.stringify(s);
          const result = appendQuestion(emptyPersonal(), s, role, q, ctx);
          const draft = result.data.threads[0].messages.at(-1)!.entityDraft!;
          expect(draft.kind).toBe("需求");
          expect(draft.title).not.toContain("我需要");
          expect(draft.goal).toBeTruthy();
          expect(
            catalogEntities(s, role).some((e) => e.id === draft.parentId),
          ).toBe(true);
          expect(JSON.stringify(s)).toBe(snapshot);
          const saved = transition(s, role, { type: "catalog-create", draft });
          expect(saved.createdEntities![0].status).toBe("待澄清");
          expect(saved.createdEntities![0].links).toContain(draft.parentId);
        }
      }
    },
  );
  it.each(["P03", "P05", "P09"])(
    "uses %s-specific examples and resolves the mentioned parent from a list",
    (id) => {
      const s = state(),
        ctx = { key: id, title: id, route: "home" as const, objectId: id };
      for (const q of exampleQuestions(s, "项目经理", ctx).slice(0, 2)) {
        expect(q).toContain(
          catalogEntities(s, "项目经理").find((e) => e.id === id)!.title,
        );
        expect(proposedCreation(s, "项目经理", q)?.parentId).toBe(id);
        expect(q).not.toContain("评论");
      }
    },
  );
  it("supports unquoted feature requests and upload limitations without silently confirming facts", () => {
    expect(
      proposedCreation(state(), "业务Owner", "我需要增加评论截图上传", "P02")
        ?.title,
    ).toBe("评论截图上传");
    const d = proposedCreation(
      state(),
      "项目经理",
      "我发现一个问题，目前的系统不能让我上传批次Excel",
      "X07",
    )!;
    expect(d.title).toBe("批次Excel上传与校验");
    expect(d.goal).toContain("需核实");
    for (const q of [
      "我不需要增加上传功能",
      "如何增加上传功能？",
      "我发现一个问题，是否需要增加附件？",
    ])
      expect(proposedCreation(state(), "项目经理", q, "P02")).toBeUndefined();
  });
  it("does not replace other roles' existing suggestions or expose out-of-scope projects", () => {
    expect(
      exampleQuestions(state(), "研发", {
        key: "I01",
        title: "Issue",
        route: "home",
        objectId: "I01",
      }),
    ).toContain("开始EOS实施");
    const examples = exampleQuestions(state(), "业务Owner");
    expect(examples.join(" ")).not.toMatch(/海外|批次|配额/);
    expect(exampleQuestions(state(), "系统管理员").join(" ")).not.toContain(
      "我需要",
    );
  });
});
