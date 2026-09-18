import type { Actor, Role, State } from "./model";
import type { Entity, EntityType } from "./ontology";
import { catalog, catalogEntities } from "./catalog";
import { projectDomain } from "./project-domains";

export const CREATE_KINDS = [
  "项目",
  "需求",
  "系统",
  "战略",
  "风险",
  "里程碑",
  "Issue",
  "Impl",
  "版本",
  "组织",
  "员工",
  "供应商",
  "承诺",
  "亮点",
  "报告",
  "资料",
] as const;
export type CreateKind = (typeof CREATE_KINDS)[number];
export interface EntityDraft {
  requestId: string;
  kind: CreateKind;
  title: string;
  goal: string;
  parentId: string;
  domain: string;
  cancelled?: boolean;
  createdId?: string;
}
export interface CreatedEntity extends Entity {
  createdBy: Role;
  createdAt: string;
  requestId: string;
}
export type CreateCommand = { type: "catalog-create"; draft: EntityDraft };
export function canCreate(role: Actor, kind: EntityType): boolean {
  if (["系统管理员", "PMO Agents", "EOS Agents"].includes(role)) return false;
  if (["战略", "组织", "员工"].includes(kind)) return role === "管理层";
  if (kind === "项目" || kind === "里程碑")
    return ["管理层", "PMO", "项目经理"].includes(role);
  if (kind === "系统" || kind === "版本")
    return ["管理层", "产品经理", "系统负责人", "研发"].includes(role);
  if (kind === "Impl") return role === "研发";
  if (kind === "Issue")
    return ["研发", "产品经理", "系统负责人", "测试"].includes(role);
  return CREATE_KINDS.includes(kind as CreateKind);
}
export function proposedCreation(
  s: State,
  role: Role,
  question: string,
  parentId?: string,
): EntityDraft | undefined {
  if (/如何|怎么|怎样|是否|能否|有什么|区别|不要|不需要|暂不/.test(question))
    return;
  const match = question.match(
    /(?:新增|新建|创建|建立|登记)(?:一[个条份项]|一个新的|新的)?\s*(项目|需求|系统|战略|风险|里程碑|Issue|Impl|版本|组织|员工|供应商|承诺|亮点|报告|资料)/i,
  );
  if (!match) return;
  const kind = CREATE_KINDS.find(
    (k) => k.toLowerCase() === match[1].toLowerCase(),
  )!;
  const visible = catalogEntities(s, role);
  const parent = visible.find((e) => e.id === parentId);
  const rest = question
    .slice(match.index! + match[0].length)
    .trim()
    .replace(/^[：:，,\s]+/, "");
  const title = (
    rest.match(/[「“"]([^」”"]+)[」”"]/)?.[1] ||
    rest.split(/[；;\n]|[，,]\s*(?:目标|用于|关联)/)[0]
  )
    .replace(/^(?:名称为|名为|叫做|叫|名称)\s*[:：]?\s*/, "")
    .trim();
  const goal =
    question.match(/(?:目标|用于)[：:\s]*([^；;\n]+)/)?.[1]?.trim() || "";
  return {
    requestId: crypto.randomUUID(),
    kind,
    title: title.slice(0, 80),
    goal: goal.slice(0, 400),
    parentId: parent?.id || "",
    domain: parent?.domain || "未分类",
  };
}
export function applyCreation(
  s: State,
  actor: Actor,
  c: CreateCommand,
  at: string,
) {
  const d = c.draft;
  if (s.catalogVersion !== "v03")
    throw new Error("请在当前 V0.3 工作空间新增。");
  if (!CREATE_KINDS.includes(d.kind) || !canCreate(actor, d.kind))
    throw new Error("当前角色不能新增此类记录，请交给有权角色。");
  if (d.cancelled || d.createdId) throw new Error("此草稿已取消或已提交。");
  if (
    !d.requestId ||
    s.createdEntities?.some((e) => e.requestId === d.requestId)
  )
    throw new Error("该草稿已提交，请勿重复创建。");
  const title = d.title.trim(),
    goal = d.goal.trim();
  if (!title || title.length > 80) throw new Error("名称需为 1–80 个字。");
  if (!goal || goal.length > 400)
    throw new Error("请填写目标 / 用途（1–400 个字）。");
  const visible = catalogEntities(s, actor as Role);
  const parent = visible.find((e) => e.id === d.parentId);
  if (d.parentId && !parent)
    throw new Error("关联记录不可见或已失效，请重新选择。");
  if (
    (d.kind === "Issue" || d.kind === "Impl" || d.kind === "里程碑") &&
    !parent
  )
    throw new Error("请先选择关联记录。");
  if (d.kind === "Impl" && parent?.kind !== "Issue")
    throw new Error("实现必须关联 Issue。");
  if (d.kind === "里程碑" && parent?.kind !== "项目")
    throw new Error("里程碑必须关联项目。");
  if (d.kind === "Issue" && parent && !["系统", "需求"].includes(parent.kind))
    throw new Error("Issue 必须关联系统或需求。");
  if (
    [...catalog, ...(s.createdEntities || [])].some(
      (e) => e.kind === d.kind && e.title === title,
    )
  )
    throw new Error("已有同类型同名记录，请查看已有记录或调整名称。");
  const prefix: Record<CreateKind, string> = {
    项目: "P",
    需求: "D",
    系统: "X",
    战略: "S",
    风险: "R",
    里程碑: "MS",
    Issue: "I",
    Impl: "M",
    版本: "REL",
    组织: "O",
    员工: "E",
    供应商: "V",
    承诺: "C",
    亮点: "L",
    报告: "B",
    资料: "F",
  };
  const used = new Set(
    [...catalog, ...(s.createdEntities || [])].map((e) => e.id),
  );
  // M02 belongs to the existing I01 demo repair loop and must never collide with user input.
  used.add("M02");
  let n = 1;
  while (used.has(`${prefix[d.kind]}${String(n).padStart(2, "0")}`)) n++;
  const id = `${prefix[d.kind]}${String(n).padStart(2, "0")}`;
  const status =
    d.kind === "项目"
      ? "准备立项"
      : d.kind === "需求"
        ? "待澄清"
        : "草稿 · 待核实";
  const project = parent?.kind === "项目" ? parent.id : parent?.project;
  const system = parent?.kind === "系统" ? parent.id : parent?.system;
  const created: CreatedEntity = {
    id,
    kind: d.kind,
    title,
    goal,
    domain: projectDomain(d.domain.trim().slice(0, 30)),
    status,
    actual: "待采集",
    gap: "尚未核实基线与验收条件",
    risk: "新记录待补范围、证据与责任；提交不等于批准",
    next: `${actor}补充范围与验收，再由有权负责人确认`,
    summary: `${goal}。由${actor}在会话中确认提交；当前为演示草稿，未自动立项、排期或发布。`,
    progress: "待明确计划与责任，不预填完成率",
    route: "home",
    links: [
      ...new Set(
        [parent?.id, project, system].filter(
          (x): x is string => !!x && visible.some((e) => e.id === x),
        ),
      ),
    ],
    project,
    system,
    attention: true,
    requestId: d.requestId,
    createdBy: actor as Role,
    createdAt: at,
  };
  (s.createdEntities ||= []).push(created);
  s.events.push({
    id: `EVT-${s.events.length + 1}`,
    at,
    actor,
    object: id,
    title: `确认新增${d.kind}`,
    detail: `${title}；来源会话草稿 ${d.requestId}；仅登记，不代替业务批准。`,
  });
}
