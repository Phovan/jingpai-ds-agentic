import type { Role } from "./model";
import type { Entity } from "./ontology";

/** Offer editable requests, not assertions that the reported limitation is verified. */
export function demandExamples(
  role: Role,
  entities: Entity[],
  context?: Entity,
): string[] {
  if (!["项目经理", "业务Owner"].includes(role)) return [];
  const target =
    context && ["项目", "系统"].includes(context.kind)
      ? context
      : entities.find((e) => e.id === context?.system) ||
        entities.find((e) => e.id === context?.project) ||
        entities.find(
          (e) =>
            context?.links.includes(e.id) && ["项目", "系统"].includes(e.kind),
        ) ||
        entities.find((e) => e.id === "P02");
  if (!target) return [];
  const project =
    target.kind === "项目"
      ? target.id
      : target.project ||
        target.links.find((id) => ["P02", "P03", "P05", "P09"].includes(id));
  const [feature, material, purpose] = (
    {
      P02: [
        "评论处置超时提醒",
        "评论处置截图",
        "让责任人及时跟进，并保留消费者问题处置证据",
      ],
      P03: [
        "配额审批差异对比",
        "区域配额 Excel 明细",
        "核对配额变化与审批依据，减少人工比对遗漏",
      ],
      P05: [
        "异常批次附件留存",
        "供应商批次 Excel 清单",
        "核对批次映射并追溯异常来源",
      ],
      P09: [
        "多语言洞察样本标注",
        "海外访谈 PDF 材料",
        "保留样本来源与授权信息，支持人工核验洞察",
      ],
    } as Record<string, string[]>
  )[project || ""] || [
    "处理结果附件留存",
    "验收附件",
    "保留处理过程与验收依据，便于责任人核对",
  ];
  return [
    `我需要为「${target.title}」增加「${feature}」，用于${purpose}`,
    `我发现一个问题：目前「${target.title}」不能让我上传「${material}」，我需要增加「${material}上传与校验」，用于${purpose}`,
  ];
}
