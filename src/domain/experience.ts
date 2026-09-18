import {
  brainAnswer,
  PROFILES,
  type Role,
  type Route,
  type State,
} from "./model";
import { TOOLS, workItems, operationItems } from "./workbench";
import type { Personal } from "./personal";
import { visibleEntities } from "./ontology";
import { guidedReply } from "./catalog-dialogue";
import { proposedCreation } from "./entity-creation";

export interface BrainContext {
  landing?: boolean;
  report?: import("./briefing").ReportView;
  entityKind?: string;
  followedIds?: string[];
  key: string;
  title: string;
  route: Route;
  objectId?: string;
}
export interface SavedBoard {
  id: string;
  title: string;
  context: BrainContext;
  created: string;
}
export const ROLE_FOCUS: Record<
  Role,
  { focus: string; prompt: string; boards: string[] }
> = {
  项目成员: {
    focus: "本人承诺与交付结果",
    prompt: "我的承诺缺少哪些输入，结果如何被接受？",
    boards: ["我的承诺", "未解除阻塞", "交付结果"],
  },
  系统负责人: {
    focus: "系统健康与项目支撑",
    prompt: "哪些系统依赖影响项目目标，哪些版本需要我确认？",
    boards: ["系统健康", "依赖与风险", "发布门禁"],
  },
  测试: {
    focus: "独立审核与验证缺口",
    prompt: "哪些实现等待审核，原验收标准还有哪些缺口？",
    boards: ["待审核实现", "测试缺口", "失败与返工"],
  },
  运维: {
    focus: "发布与运行稳定",
    prompt: "哪些版本可以发布，运行风险和回退条件是什么？",
    boards: ["发布门禁", "运行风险", "发布回执"],
  },
  系统管理员: {
    focus: "连接、范围与同步健康",
    prompt: "哪些来源需要处理授权或同步问题？",
    boards: ["连接健康度", "待处理同步", "授权范围"],
  },
  管理层: {
    focus: "目标贡献与关键决策",
    prompt: "哪些目标存在差距，需要我做什么决策？",
    boards: ["所辖项目健康度", "目标偏差追踪", "关键行动与责任人"],
  },
  PMO: {
    focus: "跨项目风险与事实口径",
    prompt: "哪些项目需要补齐基线或跨部门协调？",
    boards: ["项目组合全景", "偏差与补证清单", "跨项目协同行动"],
  },
  项目经理: {
    focus: "项目承诺与依赖闭环",
    prompt: "当前项目被什么阻塞，下一步谁来处理？",
    boards: ["项目目标与交付", "未闭环对象", "交付行动与责任人"],
  },
  业务Owner: {
    focus: "需求进展与业务效果",
    prompt: "我提出的需求到哪一步了，离业务目标还有多远？",
    boards: ["我的需求全生命周期", "业务目标差距", "需求下一步"],
  },
  产品经理: {
    focus: "需求基线与验收条件",
    prompt: "哪些需求还缺验收基线或交付承诺？",
    boards: ["需求交付全景", "基线与交付缺口", "需求交接行动"],
  },
  研发: {
    focus: "实现、验证与发布证据",
    prompt: "当前实现还有哪些验证与交付缺口？",
    boards: ["系统与需求交付", "验证与交付缺口", "工程接续行动"],
  },
};
export function routeContext(
  route: Route,
  role: Role,
  state: State,
  demandId: string,
): BrainContext {
  const objectId =
    route === "projects"
      ? "PRJ-001"
      : route === "engineering"
        ? "SYS-01"
        : route === "demands"
          ? demandId
          : undefined;
  const item = workItems(state, "管理层").find((i) => i.id === objectId);
  return {
    key: objectId || `${role}:${route}`,
    title:
      item?.title ||
      (route === "home"
        ? `${role}工作台`
        : TOOLS.find((t) => t.route === route)?.title || "工作台"),
    route,
    objectId,
  };
}
export function contextItems(state: State, role: Role, context: BrainContext) {
  const authorized = visibleEntities(state, role);
  if (state.catalogVersion === "v03" && context.landing)
    return authorized.filter((e) => ["P02", "P03", "P06"].includes(e.id));
  if (context.report)
    return authorized.filter((i) => context.followedIds?.includes(i.id));
  if (context.objectId)
    return authorized.filter((i) => i.id === context.objectId);
  if (context.route === "home" && context.entityKind)
    return authorized.filter((i) =>
      context.entityKind === "我的关注"
        ? context.followedIds?.includes(i.id)
        : i.kind === context.entityKind,
    );
  if (context.route === "operations") {
    const items = operationItems(state, role).filter((i) =>
      authorized.some((e) => e.id === i.id),
    );
    return context.objectId
      ? items.filter((i) => i.id === context.objectId)
      : items.filter(
          (i) =>
            i.kind ===
              (
                {
                  战略与项目: "项目",
                  工作承诺: "承诺",
                  风险闭环: "风险",
                  系统健康: "系统",
                  版本与审核: "版本",
                  周期报告: "报告",
                  经验复用: "经验",
                  资料核实: "资料",
                } as Record<string, string>
              )[context.title] || context.title === "场景协作",
        );
  }
  const items = workItems(state, role).filter((i) =>
    authorized.some((e) => e.id === i.id),
  );
  if (context.objectId) return items.filter((i) => i.id === context.objectId);
  return context.route === "home" && (role === "管理层" || role === "PMO")
    ? items.filter((i) => i.kind === "项目")
    : items;
}
export function contextualAnswer(
  state: State,
  role: Role,
  context: BrainContext | undefined,
  question: string,
) {
  if (role === "系统管理员" && /权限|授权|原文|撤权/.test(question))
    return "同步成功仅表示抓取了已获授权的资料，不代表所有角色都能读取原文。连接管理员不能代替业务负责人授予评论或员工资料阅读权。\n\n建议核对连接范围、来源权限、授权版本和最后成功时间。来源撤权后停止新检索，历史引用标为待复核；管理层默认只看脱敏汇总。\n\n当前为本地配置演示，未读取真实业务原文，也不会自动同步知识库。";
  if (role === "系统管理员")
    return `当前已配置 ${(state.connections || []).length} 个来源。\n\n${(state.connections || []).map((c) => `${c.source}：${c.status}；范围 ${c.scope}；授权人 ${c.owner}`).join("\n") || "尚未配置连接。请在管理员工作台选择来源、共享范围和内容授权人。"}\n\n这是本地接入演示，不会调用真实连接器、读取业务资料或同步项目知识库。`;
  if (!context) return brainAnswer(state, question);
  const items = contextItems(state, role, context);
  const attention = items.filter((i) => i.attention);
  const selected = /风险|差距|缺口|阻塞|基线/.test(question)
    ? attention
    : items;
  return `正在围绕「${context.title}」回答。你的角色目标：${PROFILES[role].goal}。\n\n${selected.length ? selected.map((i) => `${i.title}（${i.id}）\n目标：${i.goal}\n当前：${i.actual}；差距：${i.gap}\n下一步：${i.next}`).join("\n\n") : "当前范围未发现待推进对象；这不代表已经完成客户正式验收。"}\n\n建议：${attention.length ? "先核实上述差距的依据，再与责任人确认行动与验收条件。" : "继续观察业务效果并保留验证证据。"}这里是基于演示事实的规则回答，尚未接入真实大模型；不会自动创建需求、执行任务或作出决策。`;
}
/** A context group is stable by object identity, independent of its editable display name. */
export function appendQuestion(
  personal: Personal,
  state: State,
  role: Role,
  question: string,
  context?: BrainContext,
  requestedThreadId?: string | null,
) {
  const q = question.trim();
  if (!q) throw new Error("请输入问题。");
  const existing = personal.threads.find(
    (t) => t.id === requestedThreadId && t.context?.key === context?.key,
  );
  const id = existing?.id || crypto.randomUUID();
  const contextThread =
    context &&
    personal.threads.find(
      (t) =>
        t.context?.key === context.key &&
        personal.groups.some((g) => g.id === t.groupId),
    );
  const groupId =
    existing?.groupId ||
    contextThread?.groupId ||
    (context ? `context:${context.key}` : "");
  const groups =
    groupId && !personal.groups.some((g) => g.id === groupId)
      ? [
          ...personal.groups,
          {
            id: groupId,
            title: context!.title.slice(0, 24),
            collapsed: false,
            contextKey: context!.key,
          },
        ]
      : personal.groups.map((g) =>
          g.id === groupId ? { ...g, collapsed: false } : g,
        );
  const guided =
    state.catalogVersion === "v03" && role !== "系统管理员"
      ? guidedReply(state, role, context, q, existing?.messages.at(-1))
      : undefined;
  const entityDraft =
    state.catalogVersion === "v03"
      ? proposedCreation(
          state,
          role,
          q,
          context?.objectId || existing?.messages.at(-1)?.focusId,
        )
      : undefined;
  return {
    threadId: id,
    data: {
      ...personal,
      groups,
      threads: [
        {
          id,
          title: existing?.title || q.slice(0, 26),
          context,
          groupId,
          updated: new Date().toISOString(),
          messages: [
            ...(existing?.messages || []),
            {
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              entityDraft,
              question: q,
              answer: entityDraft
                ? `已整理新增${entityDraft.kind}草稿，请核对下方名称、目标和关联记录。确认提交后才写入工作台；登记不等于业务批准。`
                : guided?.answer || contextualAnswer(state, role, context, q),
              nextQuestions: entityDraft ? [] : guided?.nextQuestions,
              focusId: guided?.focusId,
              intent: guided?.intent,
              version: state.version,
              dataset: state.catalogVersion,
            },
          ],
        },
        ...personal.threads.filter((t) => t.id !== id),
      ],
    },
  };
}
