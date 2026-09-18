import {
  catalogEntities,
  dossiers,
  CATALOG_DATE,
  catalogSource,
  costRows,
} from "./catalog";
import type { Entity } from "./ontology";
import type { BrainContext } from "./experience";
import type { Message } from "./personal";
import type { State, Role } from "./model";

export interface GuidedReply {
  answer: string;
  nextQuestions: string[];
  focusId?: string;
  intent?: string;
}
const scriptMap: Record<string, { question: string; answer: string }> = {};
for (const m of catalogSource.matchAll(
  /^### 6\.\d+ [^\n]*?\b((?:REL|[SPXDERLOCVFIBM])\d{2})[^\n]*\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm,
)) {
  const q = m[2].match(/^> [^：\n]+：(.+)$/m)?.[1]?.trim();
  const a = m[2].match(/^> 大脑：(.+)$/m)?.[1]?.trim();
  if (q && a) scriptMap[m[1]] = { question: q, answer: a.replace(/\*\*/g, "") };
}
export const scriptedEntities = Object.keys(scriptMap);
const name = (e: Entity) => `${e.title}（${e.id}）`;
export function exampleQuestions(
  s: State,
  role: Role,
  ctx?: BrainContext,
  previous?: Message,
): string[] {
  if (role === "系统管理员")
    return [
      "哪些连接有授权或同步问题？",
      "来源撤权后如何处理历史引用？",
      "同步成功是否意味着所有人都能看原文？",
    ];
  if (ctx?.report)
    return [
      "这份汇报哪些结果仍需复核？",
      "补充关注：区分已交付与经业务验证的成果",
      "确认本期汇报",
    ];
  const entities = catalogEntities(s, role);
  const e = entities.find((x) => x.id === (previous?.focusId || ctx?.objectId));
  if (!e) {
    const items = entities.filter((x) =>
      ctx?.entityKind === "我的关注"
        ? ctx.followedIds?.includes(x.id)
        : ctx?.entityKind
          ? x.kind === ctx.entityKind
          : ["P02", "P03", "P06"].includes(x.id),
    );
    const chosen =
      items.find(
        (x) =>
          x.id === "S02" || x.id === "P02" || x.id === "X02" || x.id === "D01",
      ) || items[0];
    return [
      "当前清单哪些事项需要优先处理，依据是什么？",
      ...(chosen
        ? [
            `${name(chosen)}目前的风险与下一步是什么？`,
            `${name(chosen)}需要谁确认哪些证据？`,
          ]
        : ["我的关注中有哪些证据尚未核实？"]),
    ];
  }
  const specific = scriptMap[e.id]?.question;
  const byKind: Record<string, string[]> = {
    战略: [
      `${e.id}如何逐层拆解目标，哪些项目真正贡献收益？`,
      `${e.id}的过程指标能否代表业务结果？`,
    ],
    项目: [
      `${e.id}的里程碑、成本和工时偏差如何？`,
      `${e.id}哪些需求会改变原范围？`,
    ],
    系统: [
      `${e.id}的需求到交付链路是否完整？`,
      `${e.id}上线或运维还缺哪些门禁？`,
    ],
    需求: [
      `${e.id}到哪一步了，下一步由谁验收？`,
      `${e.id}的范围、验收和版本承诺是什么？`,
    ],
    Issue: [
      `${e.id}的复现证据与验收边界是什么？`,
      ...(role === "研发"
        ? ["开始EOS实施"]
        : [`${e.id}有哪些实现与独立审核记录？`]),
    ],
    Impl: [
      `${e.id}有哪些独立审核证据，失败如何回流？`,
      `${e.id}通过后能直接发布吗？`,
    ],
    里程碑: [
      `${e.id}的计划、预测和实际分别是什么？`,
      `${e.id}的前置条件和验收责任是什么？`,
    ],
    组织: [
      `${e.id}有哪些跨部门依赖和资源冲突？`,
      `${e.id}由谁决定优先级，哪些权限不能越过？`,
    ],
  };
  return [
    ...new Set([
      ...(specific ? [specific] : []),
      ...(byKind[e.kind] || [
        `${e.id}当前事实与待核实项是什么？`,
        `${e.id}下一步需要什么证据，由谁确认？`,
      ]),
    ]),
  ].slice(0, 4);
}
function intentOf(q: string): string {
  if (/成本|费用|工时|人天|超支/.test(q)) return "cost";
  if (/资源|容量|协调|谁来|谁决定/.test(q)) return "resources";
  if (/范围|新能力|跨平台|D02|混入/.test(q)) return "scope";
  if (/发布|上线|门禁|REL01|10 月 3|10月3/.test(q)) return "release";
  if (/审核|退回|r1|r2|并发|验收边界|测试/.test(q)) return "review";
  if (/收益|贡献|战略|拆解|效果|结项/.test(q)) return "benefits";
  if (/证据|日志|核实|根因|幂等|两条|为什么|为何/.test(q)) return "evidence";
  if (/下一步|如何处理|怎么|方案|建议|安排/.test(q)) return "plan";
  return "overview";
}
export function guidedReply(
  s: State,
  role: Role,
  ctx: BrainContext | undefined,
  q: string,
  previous?: Message,
): GuidedReply {
  const visible = catalogEntities(s, role);
  const normalized = q.replace(/\s+/g, "");
  const explicit = visible.filter(
    (e) =>
      new RegExp(`(^|[^A-Za-z0-9])${e.id}([^A-Za-z0-9]|$)`).test(q) ||
      normalized.includes(e.title.replace(/\s+/g, "")),
  );
  explicit.sort((a, b) => {
    const pos = (x: Entity) =>
      Math.min(
        ...[
          q.indexOf(x.id),
          normalized.indexOf(x.title.replace(/\s+/g, "")),
        ].filter((i) => i >= 0),
      );
    return pos(a) - pos(b);
  });
  const e =
    explicit[0] ||
    visible.find((x) => x.id === (previous?.focusId || ctx?.objectId));
  if (!e && ctx?.objectId)
    return {
      answer:
        "该记录不在当前 V0.3 演示授权范围；旧存档未删除，但旧编号不会自动映射到新项目。请从工作台选择当前记录。",
      nextQuestions: [],
    };
  if (!e) {
    const list = visible.filter((x) =>
      ctx?.entityKind === "我的关注"
        ? ctx.followedIds?.includes(x.id)
        : ctx?.entityKind
          ? x.kind === ctx.entityKind
          : ["P02", "P03", "P06"].includes(x.id),
    );
    const priority = [...list]
      .sort((a, b) => Number(b.attention) - Number(a.attention))
      .slice(0, 3);
    return {
      answer: `按${ctx?.title || "当前职责"}筛选，共 ${list.length} 项。优先级依据是业务影响与证据缺口，不是把所有未完成事项都标为故障。\n\n${priority.map((x, i) => `${i + 1}. ${name(x)}\n当前：${x.actual}；${x.gap}。\n需处理：${x.risk}\n下一步：${x.next}`).join("\n\n")}\n\n以下可逐项核对原因，再讨论方案。快照 ${CATALOG_DATE} · V0.3 虚拟数据；未知值不作零值。`,
      nextQuestions: priority.map(
        (x) => `${x.id}的关键证据是什么，下一步怎么处理？`,
      ),
      intent: "list",
    };
  }
  let intent = intentOf(q);
  // Short follow-ups retain the focal record from the preceding response, not an unrelated global example.
  if (/^(然后呢|继续|接下来呢|下一步呢)[？?。！!]*$/.test(q.trim()))
    intent =
      previous?.intent === "evidence"
        ? "plan"
        : previous?.intent === "plan"
          ? "release"
          : "evidence";
  const d = dossiers[e.id]?.sections || {};
  const related = e.links
    .map((id) => visible.find((x) => x.id === id))
    .filter((x): x is Entity => !!x);
  const refs = related
    .filter((x) => x.kind === "资料")
    .map(name)
    .join("、");
  const isMain = [
    "S02",
    "S05",
    "P02",
    "P12",
    "X02",
    "D01",
    "D02",
    "I01",
    "M01",
    "M02",
    "REL01",
    "R01",
    "C01",
    "F01",
    "F02",
    "E04",
    "O02",
    "O03",
  ].includes(e.id);
  let body = "",
    next: string[] = [];
  if (isMain && intent === "evidence") {
    body =
      "事实：评论区营销系统（X02）的 F01 样本有 23 条源事件、23 条处置回写，但只有 21 条待办；3 次回写事件 ID 重复。重复与漏单相关，尚不能直接认定因果。\n\n影响：评论区营销与消费者问题闭环（P02）的 4 小时分派率显示 73%，目标 90%，暂差 17 个百分点；漏单期间指标须待复核。由 X02 系统负责人（E04）比对幂等键、待办写入与失败重试日志，评论区项目经理（E03）核对已批准范围（F02）和影响时间窗。\n\n核实输出归入 C01：是否缺陷、实际影响条数、复现条件、临时补查结果。未获责任人确认，R01 仍待核实，不改 P02 基线。";
    next = [
      `${e.id}核实之后，缺陷修复与新能力应该如何分流？`,
      "P02的修复方案会影响成本和里程碑吗？",
      "I01需要补哪些并发与权限验收用例？",
    ];
  } else if (isMain && intent === "scope") {
    body =
      "分成两条路径，不混用范围与版本：\n\n① 修复高风险评论待处理队列漏单（D01）：已批准范围（F02）本来要求生成待办。先核实 F01；确认既有能力缺陷后由回写重复导致待办队列漏单（I01）实施，进入评论待办漏单修复候选版（REL01）的门禁。\n\n② 跨平台高风险评论聚合与统一分派（D02）：原范围只有单平台，它是新增能力。评论区业务 Owner（E05）需补目标平台、公开评论样例、数据授权和业务价值，产品经理（E12）澄清验收，PMO 再评估容量与优先级。当前待澄清，没有承诺日期，不纳入 REL01 或 P02 原费用预测。\n\n这是范围判断与澄清建议，不是已批准变更；责任人确认前不扩大交付承诺。";
    next = [
      "D02的验收和数据授权应该怎样澄清？",
      "D01如何验证消费者问题真正解决？",
      "P02若纳入D02，需要比较哪些资源方案？",
    ];
    if (
      e.id === "D02" &&
      /验收|授权|澄清/.test(q) &&
      previous?.intent === "scope"
    ) {
      body =
        "跨平台高风险评论聚合与统一分派（D02）仍待澄清，建议形成四格验收草案：\n\n1. 输入：E05 选择目标平台，提供各平台正常、重复、缺字段样例，确认只处理已授权的公开评论。\n2. 规则：E12 与 E05 确定跨平台去重键、风险分类、分派责任和超时升级；这些阈值目前未批准。\n3. 输出：同一高风险事件可以追到平台来源、处置人和结果，越权账号不能读取受限内容。\n4. 业务验证：先定试点范围与观察窗口，再验证是否改善问题处置，不能用聚合条数代替效果。\n\nPMO（E02）在样例与授权齐备后评估 P02 范围变更、技术容量和独立候选版本。REL01 保持只修 D01。";
      next = [
        "P02若纳入D02，需要比较哪些资源方案？",
        "D02未获批准前哪些承诺必须保持不变？",
      ];
    }
  } else if (intent === "cost" && costRows[e.id]) {
    const c = costRows[e.id];
    body = `费用（万元）：批准基线 ${c[0]}；已发生 ${c[1]}；完工预测 / 估算 ${c[2]}。\n工时（人天）：基线 ${c[3]}；已投入 ${c[4]}；完工预测 / 估算 ${c[5]}。\n\n${d["里程碑、成本与工时"]}\n\n判断：费用与人天平行展示，不能相加，也不能机械换算采购报价。预测不覆盖批准基线；准备立项的估算不是预算审批。建议由项目经理解释偏差和范围假设，再决定是否发起变更。`;
    next = [
      `${e.id}的偏差需要谁协调和决定？`,
      `${e.id}哪些验收证据能避免返工？`,
    ];
  } else if (isMain && intent === "release") {
    body =
      "评论待办漏单修复候选版（REL01）的 10/03 是预测窗口，不是生产承诺。发布需要依次过门禁：\n\n1. D01 原验收冻结，I01 可复现，23 条回放与新增并发、失败重试、权限用例齐备。\n2. 候选实现 M01 / 后续 r2 经测试工程师（E13）独立审核，失败版本和日志保留。\n3. 预览环境行为验证、构建版本一致、回退脚本和生产授权完整。\n4. 发布后由 E05 在观察窗口核实消费者问题是否解决，再分别决定 D01 验收与 R01 关闭。\n\n代码通过、生产发布、业务结果是三个不同状态。跨平台新需求（D02）不在 REL01；我不会自动发布或代签授权。";
    next = [
      "I01的独立审核具体检查什么？",
      "D01发布后的业务观察要看哪些证据？",
      "P02如何在周报中表述这个未承诺窗口？",
    ];
  } else if (isMain && intent === "review") {
    const run = s.eosRuns?.find((r) => r.issueId === "I01");
    body = `回写重复导致待办队列漏单（I01）的验收保持 D01 原边界：同事件重复回写不漏单、失败重试后待办一致、受限评论不可被越权读取。\n\nF01 的 23 条样本用于基线回放，还需并发回写、重试恢复、乱序与双账号权限反例。研发工程师（E14）提交实现，测试工程师（E13）独立重建反例，不能由研发单次自测代替。\n\n${run && run.step >= 2 ? "本次模拟 r1 已被 Review 退回：并发重放出现重复状态覆盖。保留 M01 r1 与失败证据；后续创建 M02 r2，验收标准不变。" : "当前 M01 是待独立审核的 r1；源文件里的 r1 失败是拟演示脚本，不当成当前已发生事实。开始 EOS 实施后可观察 Review 退回与 r2 修复的模拟回路。"}\n\n通过之后仍须 REL01 发布门禁与 E05 业务观察，不自动关闭 R01。`;
    next = [
      ...(role === "研发" && e.id === "I01"
        ? ["开始EOS实施"]
        : ["I01如何安排EOS实施？"]),
      "REL01当前还缺哪些发布门禁？",
    ];
  } else if (isMain && intent === "resources") {
    body =
      "数字经营部（O02）决定项目优先级，信息中心（O03）确认技术容量。X02 系统负责人（E04）同时被 P02 的日志核实承诺（C01）与市场健康度与渠道配额优化（P03）的上线门禁占用。\n\n方案 A：先完成 P02 漏单核实与人工补查；保护消费者处置目标，P03 的预测窗口须重新评估。\n方案 B：先完成 P03 上线门禁；P02 必须由 E03 明确临时补查责任、覆盖窗口及暴露风险。\n\n推荐先补足 F01 / F03 的证据，由两部门负责人核对容量，再由管理层确认超权限优先级。没有批准前不调人、不改项目基线；D02 新能力还需单独评估增量工作量。";
    next = [
      "P03的口径和验收证据还缺什么？",
      "P02的成本与工时预测如何？",
      "C01的交付怎样才算被接收？",
    ];
  } else if (e.kind === "战略" || intent === "benefits") {
    body =
      e.kind === "战略"
        ? `${d["战略拆解"]}\n\n${d["指标与口径"]}\n\n验证：${d["收益验证"]}`
        : `${d["质量与干系人"] || d["范围与验收"] || e.summary}\n\n收益不能用建设状态替代。${e.id === "P01" ? "用户声音试点虽已结项，B02 仍需 E15 验证洞察是否被采用。" : e.id === "P08" || e.id === "L01" ? "员工实训完成率 88% 只证明训练完成；需求澄清清单（L01）须在 P12 试用两轮，对比澄清往返与返工，产品负责人确认后再推广。" : "由业务 Owner 先确认观察窗口、样本和目标口径，再把可验证的结果回写关联战略。"}`;
    const projects = related.filter((x) => x.kind === "项目");
    next = (
      projects.length
        ? projects.slice(0, 2).map((x) => `${x.id}当前目标差距有什么证据？`)
        : [`${e.id}还缺哪些业务验收证据？`]
    ).concat(`${e.id}下一步需要谁确认？`);
  } else {
    const sectionKeys =
      intent === "release"
        ? ["工程质量与运维门禁", "责任与门禁"]
        : intent === "scope"
          ? ["范围与验收", "需求生命周期与交付链"]
          : intent === "evidence"
            ? ["数据与证据", "来源与权限", "风险与待决", "风险与运行问题"]
            : intent === "resources"
              ? ["质量与干系人", "相关员工清单", "职责与协作"]
              : intent === "review"
                ? [
                    "工程质量与运维门禁",
                    "质量与干系人",
                    "责任与门禁",
                    "范围与验收",
                  ]
                : [
                    "生命周期",
                    "建设与运行进度",
                    "进度与里程碑",
                    "业务定义",
                    "职责与权限",
                    "计划与验收",
                  ];
    const detail = sectionKeys
      .map((k) => d[k])
      .filter(Boolean)
      .slice(0, 2)
      .join("\n\n");
    body = `当前：${e.actual}；${e.gap}。\n\n${detail || e.summary}\n\n需核实：${e.risk}\n\n建议下一步：${e.next}`;
    const script = scriptMap[e.id];
    if (
      script &&
      q.trim() === script.question &&
      !["B01", "M01", "C01"].includes(e.id)
    )
      body =
        script.answer +
        "\n\n以上是待确认建议，尚未建立或更新业务决定。当前状态：" +
        e.status +
        "。";
    if (e.id === "B01")
      body =
        "评论区项目与主动看护 · 9 月周报草稿（B01）应保留四个不同状态：P02 分派率 73% 待复核、R01 待核实、C01 待完成、REL01 拟定。不能套用脚本后半段的‘风险处理中’冒充当前回执。\n\nE03 核项目预测，E04 补日志结论，PMO 汇总后交管理层确认；生成草稿不等于负责人已签收。";
    next = [
      `${e.id}需要哪些证据才能进入下一阶段？`,
      ...related
        .filter((x) => ["项目", "系统", "需求"].includes(x.kind))
        .slice(0, 2)
        .map((x) => `${x.id}会受到什么影响，下一步是什么？`),
    ];
    if (intent === "evidence") next[0] = `${e.id}补齐证据后如何安排下一步？`;
  }
  if (
    /下发|发给|创建|新建|安排|交给|批准|关闭|登记/.test(q) &&
    !/如何|怎么|怎样|谁|什么|是否|能否|不能/.test(q)
  )
    body +=
      "\n\n动作边界：本轮仅整理建议，不会凭一句话批准、发布或关闭记录。请在对应详情核对责任与范围；已有 EOS 实施和汇报确认入口保留独立确认回执。";
  const linkedNames = related
    .filter((x) => ["项目", "系统", "需求"].includes(x.kind))
    .slice(0, 3)
    .map(name)
    .join("、");
  const answer = `围绕 ${name(e)}\n\n${body.replace(/\*\*/g, "")}\n\n关联：${linkedNames || "见当前记录的责任与证据"}。\n依据：${refs || e.id + " 对象档案"} · ${CATALOG_DATE} / V0.3 虚拟快照。${intent === "plan" ? "方案为演示建议，尚未批准。" : "不是客户真实经营数据；未确认事项仍保留待核实。"}`;
  return {
    answer,
    nextQuestions: [...new Set(next)].filter((x) => x !== q).slice(0, 3),
    focusId: e.id,
    intent,
  };
}
