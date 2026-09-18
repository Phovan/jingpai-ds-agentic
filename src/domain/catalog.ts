import source from "../data/demo-v03.md?raw";
import type { Entity, EntityType } from "./ontology";
import type { Role, State } from "./model";
import { projectDomain, domainLabels } from "./project-domains";
import { narrativeText } from "./narrative";

/** V0.3 is a separate dataset, never an alias for the previous PRJ-/SYS- seed. */
export const CATALOG_DATE = "2026-09-18";
export const CATALOG_SOURCE =
  "2026-09-18-劲牌企业大脑Demo战略项目系统及关联本体虚拟数据-V0.3.md";
export const catalogSource = source;
export interface Dossier {
  sections: Record<string, string>;
  source: string;
  level: string;
}
export const dossiers: Record<string, Dossier> = {};
const clean = (s: string) => s.replace(/\*\*|`/g, "").trim();
const lines = source.split("\n");
const cells = (line: string) => line.trim().slice(1, -1).split("|").map(clean);
const tableRows = (prefix: string) =>
  lines.filter((l) => new RegExp(`^\\| ${prefix}\\d{2} `).test(l)).map(cells);
export function references(text: string): string[] {
  const expanded = text.replace(
    /\b(REL|[SPXDERLOCVFIBM])(\d{2})-(?:\1)?(\d{2})\b/g,
    (_, p, a, b) =>
      Array.from(
        { length: Math.max(0, Number(b) - Number(a) + 1) },
        (_, i) => p + String(Number(a) + i).padStart(2, "0"),
      ).join(" "),
  );
  return [
    ...new Set(expanded.match(/\b(?:REL\d{2}|[SPXDERLOCVFIBM]\d{2})\b/g) || []),
  ];
}
const profileMatches = [
  ...source.matchAll(
    /^## ([PX]\d{2})｜([^\n]+)\n([\s\S]*?)(?=^## |^# |$(?![\s\S]))/gm,
  ),
];
for (const m of profileMatches) {
  const sections: Record<string, string> = {};
  for (const part of m[3].split(/^### /m).slice(1)) {
    const split = part.indexOf("\n");
    sections[part.slice(0, split).trim()] = part.slice(split + 1).trim();
  }
  dossiers[m[1]] = { sections, source: CATALOG_SOURCE, level: "演示源记录" };
}
const rows: Entity[] = [];
function add(
  id: string,
  kind: EntityType,
  title: string,
  values: Partial<Entity> = {},
  sections: Record<string, string> = {},
) {
  const item: Entity = {
    id,
    kind,
    title,
    domain: "协作",
    goal: "由责任人核对范围与验收证据",
    actual: "待核实",
    gap: "尚未完成验证",
    status: "待确认",
    attention: true,
    next: "核对依据，明确责任与确认条件",
    route: "home",
    risk: "证据与权限须核实，不能用交付状态替代业务结果",
    summary: "",
    progress: "无量化进度；按阶段回执判断",
    links: [],
    ...values,
  };
  rows.push(item);
  dossiers[id] = {
    sections: { ...(dossiers[id]?.sections || {}), ...sections },
    source: CATALOG_SOURCE,
    level: "演示源记录",
  };
  return item;
}
const projectMetrics = [
  ["有效反馈归集率 ≥90%", "92%", "高于目标 2 个百分点；洞察采用待验证"],
  [
    "高风险评论 4 小时内分派率 ≥90%",
    "73% · 待复核",
    "暂差 17 个百分点；漏单影响口径",
  ],
  ["配额异常说明覆盖率 ≥85%", "68% · 口径待签收", "差 17 个百分点；分母待确认"],
  ["工艺异常追溯平均耗时 ≤30 分钟", "52 分钟", "多 22 分钟；仅含可核样本"],
  ["批次追溯覆盖率 ≥95%", "78%", "差 17 个百分点；需抽样验证"],
  ["交期偏差提前预警率 ≥80%", "55%", "差 25 个百分点；2 条变更待补证"],
  ["重点品类碳数据可核验率 ≥70%", "待采集", "无基线，尚不能计算差距"],
  ["关键岗位实训完成率 ≥85%", "88%", "高于目标 3 个百分点；方法有效性待验证"],
  ["2 个目标市场完成洞察与内容验证", "待观察", "未进入试点，不记作 0%"],
  ["试单履约闭环率 ≥90%", "待采集", "未立项，无执行基线"],
  ["试点项目风险提前识别率 ≥70%", "41%", "差 29 个百分点；仅试点范围"],
  ["试点需求全链路可追踪率 ≥90%", "54%", "差 36 个百分点；不能外推全集团"],
];
for (const c of tableRows("P")) {
  const id = c[0].slice(0, 3);
  const title = c[0].slice(4).replace(/（[^）]*）$/, "");
  const sections = dossiers[id]?.sections || {};
  const metrics = projectMetrics[Number(id.slice(1)) - 1];
  add(
    id,
    "项目",
    title,
    {
      domain: c[0].match(/（([^）]+)）$/)?.[1] || "未分类",
      status: c[1].split("；")[0],
      goal: metrics[0],
      actual: metrics[1],
      gap: metrics[2],
      summary: clean(sections["项目详情"] || c[2]),
      risk: clean(sections["风险与待决"] || c[4]),
      next: c[4],
      progress: clean(sections["进度与里程碑"] || "待确认"),
      links: references(
        c.join(" ") + " " + Object.values(sections).join(" "),
      ).filter((x) => x !== id),
      system: references(c[3]).find((x) => x.startsWith("X")),
      attention: !["P01", "P08"].includes(id),
    },
    { 目标口径: c[2], 责任与状态: c[1] },
  );
}
const strategyRows = tableRows("S");
for (const c of strategyRows.slice(0, 5)) {
  const id = c[0].slice(0, 3);
  const decomposition = strategyRows.find(
    (r) => r[0].startsWith(id) && r !== c && r[0] !== c[0],
  );
  add(
    id,
    "战略",
    c[1],
    {
      domain: c[0].slice(4),
      goal: c[2],
      actual:
        id === "S01"
          ? "按四个方向复盘"
          : id === "S04"
            ? "准备阶段 · 待观察"
            : c[2],
      gap: c[4],
      status: c[4].split("；")[0],
      summary:
        id === "S01"
          ? "上位愿景通过 S02—S05 承接；不按项目数或任务完成率计算愿景达成。"
          : "承接上位愿景，沿目标、指标、举措和业务验证追踪贡献。同一项目支持多个方向，不重复累加收益。",
      risk: c[4],
      next: c[4].split("；").slice(1).join("；") || c[4],
      progress: "战略贡献须业务验证，不以系统上线代替",
      links: references(c[3] + " " + (decomposition || []).join(" ")).filter(
        (x) => x !== id,
      ),
      attention: id !== "S01",
    },
    {
      战略拆解: decomposition
        ? `上位意图：${id === "S01" ? "长期愿景" : "S01"}\n\n细分目标：${decomposition[1]}\n\n领先 / 结果信号：${decomposition[2]}\n\n关键举措：${decomposition[3]}\n\n收益责任与验证：${decomposition[4]}`
        : c[2],
      指标与口径: c[2],
      收益验证: decomposition?.[4] || c[4],
    },
  );
}
const strategyPresentation: Record<string, [string, string, string]> = {
  S01: [
    "四个战略方向持续形成经验证的长期能力",
    "四方向持续跟踪",
    "定性愿景，不计算伪完成率",
  ],
  S02: [
    "4 小时分派率 ≥90%；批次追溯 ≥95%",
    "分派 73% 待复核；追溯 78%",
    "分别差 17 个百分点；问题解决需另验",
  ],
  S03: [
    "供应商提前反馈 ≥90%；实训完成 ≥85%",
    "供应商 82%；实训 88%",
    "供应协同差 8 个百分点；学习方法待验证",
  ],
  S04: [
    "2 个目标市场形成用户与渠道验证结论",
    "准备阶段 · 待观察",
    "尚未试点，不视为 0% 达成",
  ],
  S05: [
    "风险提前识别 ≥70%；需求可追踪 ≥90%",
    "风险 41%；需求 54%",
    "分别差 29 / 36 个百分点；仅试点口径",
  ],
};
for (const e of rows.filter((e) => e.kind === "战略")) {
  const [goal, actual, gap] = strategyPresentation[e.id];
  Object.assign(e, { goal, actual, gap });
}
for (const c of tableRows("X")) {
  const id = c[0].slice(0, 3),
    sections = dossiers[id]?.sections || {};
  add(id, "系统", c[0].slice(4).replace(/（[^）]*）$/, ""), {
    domain: c[0].match(/（([^）]+)）$/)?.[1] || "系统",
    status: c[1].split("；")[0],
    goal: c[2].split("；")[0],
    actual: c[2].split("；").slice(1).join("；") || "无运行实测数据",
    gap: c[4],
    summary: clean(sections["系统详情"] || c[2]),
    risk: clean(sections["风险与运行问题"] || c[4]),
    next: c[4],
    progress: clean(sections["建设与运行进度"] || c[1]),
    links: references(
      c.join(" ") + " " + Object.values(sections).join(" "),
    ).filter((x) => x !== id),
    attention: !["X01", "X03", "X09"].includes(id),
  });
}
const supporting = lines
  .filter((l) =>
    /^\| (组织|员工|供应商|需求|风险|承诺|Release|Issue|Impl|亮点|报告|资料) /.test(
      l,
    ),
  )
  .map(cells);
const support = (id: string) =>
  supporting.find((c) => references(c[0]).includes(id));
const demandNames = [
  "修复高风险评论待处理队列漏单",
  "跨平台高风险评论聚合与统一分派",
  "反馈去重规则",
  "洞察标签复核",
  "异常配额说明与人工确认",
  "指标口径、数据时效和版本提示",
  "设备时间戳可信标记",
  "原料与生产批次映射",
  "交期变更原因与新日期必填",
  "碳数据边界与来源登记",
  "实训案例与成果归档",
  "澄清清单效果追踪",
  "目标市场洞察资料包",
  "渠道试单状态同步",
  "风险主动看护与证据追问",
  "工程上下文与独立审查",
  "缺失批次的人工核实与追踪",
  "供应商回执超时提醒",
  "可疑碳数据人工复核标记",
  "本地化内容反馈",
  "海外交期异常升级",
  "项目、需求与系统跨场景 ID 关联",
  "已批话术版本失效提醒",
  "里程碑冲突提示",
  "证据时效与权限撤回提示",
];
const demandStatus = [
  "待排期",
  "待澄清",
  "已关闭",
  "已上线待业务验证",
  "待测试",
  "待澄清",
  "待排期",
  "开发中",
  "待澄清",
  "待受理",
  "已关闭",
  "已上线待业务验证",
  "待受理",
  "待受理",
  "开发中",
  "待排期",
  "待澄清",
  "待受理",
  "草稿",
  "草稿",
  "草稿",
  "待澄清",
  "待受理",
  "待受理",
  "待受理",
];
for (let i = 0; i < 25; i++) {
  const id = `D${String(i + 1).padStart(2, "0")}`;
  const excerpts: string[] = [],
    related: string[] = [];
  for (const [parent, d] of Object.entries(dossiers)) {
    if (!/^[PX]\d{2}$/.test(parent)) continue;
    const matching = (d.sections["相关需求清单"] || "")
      .split("\n")
      .filter(
        (l) => l.startsWith("|") && references(cells(l)[0] || "").includes(id),
      );
    if (matching.length) {
      related.push(parent);
      excerpts.push(
        `${parent}：\n${matching.map((l) => cells(l).join(" · ")).join("\n")}`,
      );
    }
  }
  const definition =
    support(id)?.slice(1).join("\n\n") || excerpts.join("\n\n");
  if (id === "D01")
    related.push(
      "P02",
      "P12",
      "X02",
      "I01",
      "REL01",
      "R01",
      "F01",
      "F02",
      "E05",
      "E04",
    );
  if (id === "D02") related.push("P02", "X02", "F02", "E05", "E12");
  add(
    id,
    "需求",
    demandNames[i],
    {
      status: demandStatus[i],
      goal: demandNames[i],
      actual: demandStatus[i],
      gap:
        demandStatus[i] === "已关闭"
          ? "验收已留证，后续收益另行验证"
          : "下一阶段须责任人签收，不以代码或上线替代业务验收",
      summary: clean(definition),
      risk:
        id === "D02"
          ? "原批准范围仅含单平台；跨平台属于新能力，承诺日期未确认，不纳入 REL01"
          : id === "D01"
            ? "F01 根因与影响仍待核实；业务观察未完成，不能因 I01 通过关闭需求"
            : excerpts[0]?.split("\n")[1] || "范围与验收证据仍须核对",
      next: clean(
        support(id)?.[2] ||
          excerpts[0] ||
          "由业务 Owner 提供样例，产品经理澄清验收",
      ),
      progress: demandStatus[i],
      links: [...new Set([...related, ...references(definition)])].filter(
        (x) => x !== id,
      ),
      project: related.find((x) => x.startsWith("P")),
      system: related.find((x) => x.startsWith("X")),
      attention: demandStatus[i] !== "已关闭",
    },
    {
      范围与验收: definition,
      生命周期: `当前：${demandStatus[i]}\n\n业务提出 → 受理澄清 → 范围与验收确认 → 排期 → 实现 → 独立验证 → 授权发布 → 业务观察 → 验收关闭。\n\n只显示源文件确认的当前阶段；后续节点是待完成条件，不是已完成回执。\n\n${excerpts.join("\n\n")}`,
    },
  );
}
const definitions: [string, EntityType, string, string, string[]][] = [
  [
    "R01",
    "风险",
    "高风险评论漏单可能延误消费者问题处置",
    "待核实",
    ["P02", "P11", "X02", "D01", "I01", "F01", "E03", "E04"],
  ],
  [
    "R02",
    "风险",
    "交期变更缺原因导致采购预警不可信",
    "待补证",
    ["P06", "X08", "V01", "F04", "E06"],
  ],
  [
    "C01",
    "承诺",
    "9/19 前完成评论样本与日志核对",
    "待完成",
    ["P02", "X02", "E04", "E03", "F01", "F02"],
  ],
  [
    "V01",
    "供应商",
    "演示采购协作供应商",
    "履约中 · 待补证",
    ["P06", "X08", "R02", "F04", "E06"],
  ],
  [
    "REL01",
    "版本",
    "评论待办漏单修复候选版",
    "拟定 · 待门禁",
    ["P02", "P12", "X02", "D01", "I01", "M01", "E04", "E13"],
  ],
  [
    "REL02",
    "版本",
    "市场健康与配额工作台首发版",
    "待业务验收",
    ["P03", "X04", "F03", "D05", "D06", "E08", "E13"],
  ],
  [
    "REL03",
    "版本",
    "原料批次映射试点版",
    "拟定",
    ["P05", "X06", "X07", "D08", "E07", "E13"],
  ],
  [
    "I01",
    "Issue",
    "回写重复导致待办队列漏单",
    "待实现",
    [
      "X02",
      "P02",
      "P12",
      "D01",
      "REL01",
      "R01",
      "M01",
      "F01",
      "F02",
      "E14",
      "E13",
    ],
  ],
  [
    "M01",
    "Impl",
    "评论待办幂等修复 · r1",
    "待独立审核",
    ["I01", "X02", "D01", "REL01", "E14", "E13"],
  ],
  [
    "L01",
    "亮点",
    "需求澄清清单",
    "候选 · 待验证",
    ["P08", "P12", "X09", "D12", "F05", "E11", "E12"],
  ],
  [
    "B01",
    "报告",
    "评论区项目与主动看护 · 9 月周报草稿",
    "待确认",
    ["P02", "P11", "R01", "C01", "REL01", "F01", "E02", "E03", "E04"],
  ],
  [
    "B02",
    "报告",
    "用户声音试点 · 结项复盘",
    "待收益复核",
    ["P01", "X01", "D04", "E15"],
  ],
];
for (const [id, kind, title, status, links] of definitions) {
  const c = support(id),
    body = c?.[1] || title,
    action = c?.[2] || "责任人核对后确认";
  add(
    id,
    kind,
    title,
    {
      status,
      summary: body,
      goal: title,
      actual: status,
      risk: action,
      next: action,
      links,
      project: links.find((x) => x.startsWith("P")),
      system: links.find((x) => x.startsWith("X")),
    },
    { 业务定义: body, 责任与门禁: action },
  );
}
const employees = [
  "管理层",
  "PMO",
  "评论区项目经理",
  "评论区系统负责人",
  "评论区业务 Owner",
  "采购业务 Owner",
  "质量业务 Owner",
  "营销业务 Owner",
  "生产业务 Owner",
  "国际业务 Owner",
  "培训负责人",
  "产品经理",
  "测试工程师",
  "研发工程师",
  "用户洞察 Owner",
  "数据治理负责人",
];
employees.forEach((title, i) => {
  const id = `E${String(i + 1).padStart(2, "0")}`;
  const responsibilities = Object.entries(dossiers)
    .filter(([key]) => /^[PX]\d{2}$/.test(key))
    .flatMap(([key, d]) =>
      (d.sections["相关员工清单"] || "")
        .split("\n")
        .filter((l) => references(l).includes(id))
        .map((l) => `${key}：${clean(l.replace(/^- /, ""))}`),
    );
  const org = [4, 12, 13, 14, 16].includes(i + 1)
    ? "O03"
    : i + 1 === 15
      ? "O04"
      : i === 0
        ? "O01"
        : "O02";
  add(
    id,
    "员工",
    title,
    {
      summary: "虚构角色账号，非客户真实员工。" + responsibilities.join("\n"),
      goal: responsibilities[0] || "按分派职责确认业务结果",
      actual: "职责待办按关联项目查看",
      status: "演示角色",
      risk: "只访问获授权工作范围；组织关系不等于全部资料权限",
      next: "核对本人承诺、所需输入及验收责任",
      links: [org, ...references(responsibilities.join(" "))],
      attention: id === "E04",
    },
    {
      职责与协作: responsibilities.join("\n\n") || "见演示组织职责。",
      权限边界: "虚构角色身份，仅演示岗位协作；不含真实个人资料。",
    },
  );
});
[
  [
    "O01",
    "范总团队",
    "演示管理范围，协调方向与跨部门资源",
    ["O02", "O03", "O04", "E01"],
  ],
  [
    "O02",
    "数字经营部",
    "项目优先级、目标与项目治理；P02 的项目责任",
    ["O01", "P02", "P11", "E02", "E03", "E05"],
  ],
  [
    "O03",
    "信息中心",
    "系统技术容量、工程门禁与运维；X02 的技术责任",
    ["O01", "P12", "X02", "E04", "E12", "E13", "E14", "E16"],
  ],
  [
    "O04",
    "用户洞察部",
    "用户样本、产品洞察与收益核验",
    ["O01", "P01", "X01", "E15"],
  ],
].forEach(([id, title, summary, links]) =>
  add(
    id as string,
    "组织",
    title as string,
    {
      summary: summary as string,
      goal: summary as string,
      status: "演示组织",
      actual: "职责范围内协作",
      risk: "P02 修复与 P03 上线存在技术容量协调需求，不能自动改基线",
      next: "相应负责人确认优先级与人员容量",
      links: links as string[],
    },
    { 职责与权限: support("O01")?.slice(1).join("\n\n") || "" },
  ),
);
const materials = [
  [
    "F01",
    "评论事件与待办样本 · 9/17",
    "23 条源事件、23 条处置回写、21 条待办；3 次回写事件 ID 重复。相关不等于根因。",
    ["P02", "X02", "R01", "D01", "I01", "C01", "E04"],
  ],
  [
    "F02",
    "评论区项目已批准范围",
    "已批准范围仅单平台、单品牌；原有待办生成属于既有能力。跨平台 D02 为新增能力，不能混入修复。",
    ["P02", "X02", "D01", "D02", "C01", "E03"],
  ],
  [
    "F03",
    "市场健康指标口径草案",
    "异常配额的分母与数据更新时间尚未签收。旧数据不自动视为实时。",
    ["P03", "X04", "X05", "D06", "REL02", "E08", "E16"],
  ],
  [
    "F04",
    "供应商交期变更回执",
    "2 条交期变更缺原因；可能是漏填、缺字段或批准变更未同步，不直接认定供应商失责。",
    ["P06", "X08", "R02", "V01", "D09", "E06"],
  ],
  [
    "F05",
    "AI 实训记录",
    "实训完成率 88%，不能证明澄清清单减少返工。管理层只读角色/团队汇总。",
    ["P08", "X09", "L01", "D11", "E11"],
  ],
] as const;
for (const [id, title, summary, links] of materials)
  add(
    id,
    "资料",
    title,
    {
      summary,
      goal: "提供可追溯的授权依据",
      actual: "V0.3 虚拟源记录",
      status: id === "F02" ? "批准范围 · 演示" : "待责任人核实",
      risk: "原文授权不随同步扩大；来源撤权后须停止引用并复核旧结论",
      next: "核对来源、版本与有效性，矛盾证据并列保留",
      links: [...links],
    },
    {
      内容摘要: summary,
      来源与权限: `来源：${links.find((x) => x.startsWith("X"))}；快照 ${CATALOG_DATE}；源文件 V0.3。${id === "F01" ? "样本日 9/17；管理层只看脱敏汇总，项目/技术角色按授权看样本。" : id === "F05" ? "个人学习明细不展示，仅展示聚合结果。" : "上传人、来源记录版本未在底稿明确的，不伪造已同步回执。"}当前全为演示摘要，不含真实日志或人员原文。`,
    },
  );

export const costRows: Record<
  string,
  [string, string, string, string, string, string]
> = {
  P01: ["48", "47", "已结项", "200", "196", "已结项"],
  P02: ["86", "39", "92", "360", "171", "386"],
  P03: ["70", "44", "75", "300", "188", "321"],
  P04: ["110", "68", "114", "440", "210", "450"],
  P05: ["64", "38", "69", "280", "155", "302"],
  P06: ["58", "29", "63", "240", "121", "260"],
  P07: [
    "未批准",
    "未发生统计",
    "估算 25–40",
    "未批准",
    "待采集",
    "估算 120–160",
  ],
  P08: ["20", "19", "已结项", "85", "82", "已结项"],
  P09: [
    "未批准",
    "未发生统计",
    "估算 45–65",
    "未批准",
    "待采集",
    "估算 150–220",
  ],
  P10: [
    "未批准",
    "未发生统计",
    "估算 60–90",
    "未批准",
    "待采集",
    "估算 200–300",
  ],
  P11: ["95", "36", "96", "380", "142", "390"],
  P12: ["120", "45", "128", "500", "181", "530"],
};
for (const id of ["P07", "P09", "P10"]) {
  costRows[id][1] = "待确认";
  costRows[id][4] = "待确认";
}
const milestoneSpecs: Record<string, [string, string, string][]> = {
  P01: [
    ["试点验收", "基线 9/10 · 实际 9/10", "已交付"],
    ["结项收益复核", "计划 9/20", "待验证"],
  ],
  P02: [
    ["核实漏单", "计划 9/18；C01 9/19 交付核实结论", "待核实"],
    ["修复方案", "原计划 9/23 · 预测 9/25 · 偏 2 天", "待核实根因"],
    ["预览验证", "计划 9/27", "待门禁"],
    ["候选发布", "预测窗口 10/03，非批准承诺", "拟定"],
    ["业务观察", "计划 10/10", "待验证"],
  ],
  P03: [
    ["指标口径签收", "计划 9/22", "待签收"],
    ["业务验收", "基线 9/29 · 预测 10/02 · 偏 3 天", "待口径"],
    ["授权发布", "生产日期未定", "待授权"],
  ],
  P04: [
    ["时间戳补证", "计划 9/25 · 预测 9/28", "待补证"],
    ["样本回放", "计划 10/08", "待验证"],
  ],
  P05: [
    ["映射规则冻结", "计划 9/24 · 预测 9/26", "待确认"],
    ["批次抽样复核", "计划 10/01", "待验证"],
  ],
  P06: [
    ["交期回执补证", "计划 9/21 · 预测 9/24", "待补证"],
    ["回执质量评估", "计划 9/30", "待验证"],
  ],
  P07: [
    ["核算范围讨论", "计划 9/26，非上线日期", "准备立项"],
    ["数据抽样", "候选 10/05，需范围确认", "拟定"],
  ],
  P08: [
    ["实训试点结项", "基线与实际 9/12", "已交付"],
    ["澄清清单复评", "计划 9/30", "待收益验证"],
  ],
  P09: [
    ["市场与样本确认", "待立项后定基线", "准备立项"],
    ["内容验证", "以市场确认与授权为前置", "拟定"],
  ],
  P10: [
    ["试单范围确认", "前置：P09 市场决定", "准备立项"],
    ["履约试单与复盘", "未承诺日期", "拟定"],
  ],
  P11: [
    ["试点来源核对", "计划 9/25 · 预测 9/28", "待补证"],
    ["提前预警对照", "计划 10/15", "待验证"],
    ["试点验收", "目标 11/30", "待验证"],
  ],
  P12: [
    ["预览验证", "计划 9/27 · 预测 9/29", "待门禁"],
    ["候选发布", "10/03，待授权", "拟定"],
    ["效果验证", "目标 11/30", "待业务验证"],
  ],
};
for (const [project, specs] of Object.entries(milestoneSpecs))
  specs.forEach(([title, dates, status], index) => {
    const id = `MS-${project}-${index + 1}`;
    add(
      id,
      "里程碑",
      title,
      {
        project,
        status,
        goal: dates,
        actual: status,
        gap: dates.includes("预测")
          ? "计划与预测分列，不自动覆盖基线"
          : "验收回执与收益验证分开",
        summary: `${project} · ${title}。${dates}。`,
        progress: dates,
        risk: "前置依赖与验收证据未齐不能标完成",
        next: "项目经理核对前置条件与验收人，变更须经授权",
        links: [project],
      },
      {
        计划与验收: `${dates}\n\n${dossiers[project].sections["里程碑、成本与工时"] || dossiers[project].sections["进度与里程碑"]}`,
        来源说明:
          "从 V0.3 项目档案拆出独立里程碑；MS-ID 为本轮 UI 扩展编号，未新增批准承诺。",
      },
    );
  });
// Only explicit membership creates core relations. Narrative mentions (e.g. exclusion) aren't ownership.
const known = new Set(rows.map((e) => e.id));
for (const row of rows)
  row.links = [...new Set(row.links)].filter(
    (id) => known.has(id) && id !== row.id,
  );
for (const row of rows)
  for (const id of [...row.links]) {
    const target = rows.find((e) => e.id === id)!;
    if (!target.links.includes(row.id)) target.links.push(row.id);
  }
// D02 is explicitly out of REL01 scope despite appearing in its boundary description.
for (const id of ["D02", "REL01"])
  rows.find((e) => e.id === id)!.links = rows
    .find((e) => e.id === id)!
    .links.filter((x) => x !== (id === "D02" ? "REL01" : "D02"));
for (const row of rows) {
  row.domain = projectDomain(row.domain);
  row.summary = domainLabels(row.summary);
}
for (const dossier of Object.values(dossiers))
  for (const key of Object.keys(dossier.sections))
    dossier.sections[key] = domainLabels(dossier.sections[key]);
export const catalog = rows;
export function catalogEntities(s: State, role: Role): Entity[] {
  if (role === "系统管理员") return [];
  const broad = ["管理层", "PMO"].includes(role);
  const assignments =
    role === "项目经理" || role === "业务Owner" || role === "项目成员"
      ? ["P02"]
      : ["P02", "P03", "P04", "P05", "P11", "P12"];
  const projects = new Set(assignments);
  const systems = new Set(
    rows
      .filter((e) => e.kind === "项目" && projects.has(e.id))
      .flatMap((e) => e.links.filter((id) => /^X\d+$/.test(id))),
  );
  const allowed = (e: Entity) =>
    broad ||
    (e.kind === "项目"
      ? projects.has(e.id)
      : e.kind === "系统"
        ? systems.has(e.id)
        : e.links.some((id) => projects.has(id) || systems.has(id)) ||
          [
            "S01",
            "O01",
            "O02",
            "O03",
            "E01",
            "E02",
            "E03",
            "E04",
            "E05",
            "E12",
            "E13",
            "E14",
          ].includes(e.id));
  const visible = rows
    .filter(allowed)
    .map((e) => ({ ...e, links: [...e.links] }));
  for (const custom of s.createdEntities || []) {
    if (
      broad ||
      custom.createdBy === role ||
      custom.links.some((id) =>
        visible.some((e) => e.id === id && ["项目", "系统"].includes(e.kind)),
      )
    )
      visible.push({
        ...custom,
        domain: projectDomain(custom.domain),
        links: [...custom.links],
      });
  }
  for (const custom of s.createdEntities || []) {
    if (!visible.some((e) => e.id === custom.id)) continue;
    for (const parent of visible)
      if (custom.links.includes(parent.id) && !parent.links.includes(custom.id))
        parent.links.push(custom.id);
  }
  const ids = new Set(visible.map((e) => e.id));
  for (const row of visible) {
    row.links = row.links.filter((id) => ids.has(id));
    if (row.project && !ids.has(row.project)) row.project = undefined;
    if (row.system && !ids.has(row.system)) row.system = undefined;
  }
  const run = s.eosRuns?.find((r) => r.issueId === "I01");
  if (run) {
    const issue = visible.find((e) => e.id === "I01"),
      impl = visible.find((e) => e.id === "M01");
    if (issue) {
      issue.status =
        run.status === "completed"
          ? s.eosTestTasks?.some((task) => task.runId === run.id)
            ? "已转测试 · 待独立测试"
            : "模拟验证完成 · 待人工确认"
          : run.status === "stopped"
            ? "实施已暂停"
            : run.status === "waiting"
              ? "阶段完成 · 待推进"
              : "实施中";
      issue.progress = `EOS 模拟步骤 ${run.step + 1}/7；生产未发布、业务未验收`;
      issue.actual = issue.status;
      issue.gap = "模拟工程回执；仍需人工核对与独立生产授权";
    }
    if (impl) {
      impl.status = run.step >= 2 ? "r1 已退回 · 保留失败证据" : "待独立审核";
      impl.actual = impl.status;
      impl.risk =
        run.step >= 2
          ? "模拟并发回放发现重复状态覆盖；保留 r1 与原验收，不用 r2 覆盖失败版本"
          : impl.risk;
    }
    if (run.step >= 3 && issue) {
      const revision: Entity = {
        ...rows.find((e) => e.id === "M01")!,
        id: "M02",
        title: "评论待办幂等修复 · r2",
        status: run.step >= 4 ? "模拟 Review 通过 · 未发布" : "待独立审核",
        actual: run.step >= 4 ? "r2 模拟审核通过" : "r2 已提交候选",
        gap: "未授权生产发布，业务结果尚未验证",
        summary:
          "r1 失败后新建候选实现 r2；补充原子幂等与并发回放，冻结验收保持不变。",
        links: ["I01", "D01", "X02", "REL01", "M01"],
      };
      visible.push(revision);
      for (const target of visible)
        if (revision.links.includes(target.id) && !target.links.includes("M02"))
          target.links.push("M02");
    }
  }
  return visible.map((e) => {
    const result = { ...e };
    for (const key of [
      "summary",
      "risk",
      "next",
      "goal",
      "actual",
      "gap",
      "progress",
    ] as const)
      result[key] = narrativeText(e[key], visible);
    return result;
  });
}

export interface DetailTab {
  key: string;
  title: string;
  sections?: string[];
  kinds?: EntityType[];
}
export function entityDossier(e: Entity): Dossier {
  return (
    dossiers[e.id] || {
      sections: {
        业务定义: e.summary,
        责任与门禁: [e.status, e.gap, e.risk].join("。"),
      },
      source: "本地演示记录",
      level: "会话登记 / 演示回执",
    }
  );
}
/** Numbers count visible linked records or actual content sections, never placeholders. */
export function populatedDetailTabs(
  e: Entity,
  visible: Entity[],
): (DetailTab & { count: number; countLabel: string })[] {
  const dossier = entityDossier(e);
  const result = detailTabs(e)
    .map((t) => {
      const records = visible.filter(
        (v) => e.links.includes(v.id) && t.kinds?.includes(v.kind),
      ).length;
      const sections = (t.sections || []).filter(
        (k) => !!dossier.sections[k]?.trim(),
      ).length;
      const metrics = t.key === "cost" && costRows[e.id] ? 2 : 0;
      const count = records || metrics || sections;
      return {
        ...t,
        count,
        countLabel: records
          ? `${records} 条可见关联记录`
          : metrics
            ? `${metrics} 项费用 / 工时口径`
            : `${sections} 个内容分节`,
      };
    })
    .filter((t) => t.count > 0);
  // A newly confirmed record still has its real summary, but no invented related records.
  return result.length
    ? result
    : [
        {
          key: "facts",
          title: "事实与责任",
          sections: Object.keys(dossier.sections).filter(
            (k) => !!dossier.sections[k]?.trim(),
          ),
          count: Object.values(dossier.sections).filter((v) => !!v.trim())
            .length,
          countLabel: "现有记录摘要与责任",
        },
      ].filter((t) => t.count > 0);
}
export function detailTabs(e: Entity): DetailTab[] {
  const relation = (kind: EntityType, title = `相关${kind}`): DetailTab => ({
    key: kind,
    title,
    kinds: [kind],
  });
  if (e.kind === "战略")
    return [
      { key: "map", title: "战略拆解", sections: ["战略拆解"] },
      { key: "metrics", title: "指标与口径", sections: ["指标与口径"] },
      relation("项目", "战略举措 / 项目"),
      { key: "benefits", title: "收益验证", sections: ["收益验证"] },
      relation("战略", "上位与支撑战略"),
      relation("风险"),
      relation("组织"),
      relation("员工", "责任人与协作"),
    ];
  if (e.kind === "项目")
    return [
      relation("里程碑", "里程碑"),
      relation("需求"),
      relation("风险"),
      { key: "cost", title: "成本 / 工时", sections: ["里程碑、成本与工时"] },
      { key: "quality", title: "质量验收", sections: ["质量与干系人"] },
      {
        key: "members",
        title: "相关成员 / 干系人",
        sections: ["相关员工清单"],
        kinds: ["员工", "组织", "供应商"],
      },
      relation("系统"),
      relation("战略"),
      relation("承诺"),
      relation("报告"),
      {
        key: "archive",
        title: "完整档案",
        sections: Object.keys(dossiers[e.id]?.sections || {}),
      },
    ];
  if (e.kind === "系统")
    return [
      {
        key: "lifecycle",
        title: "需求生命周期",
        sections: ["需求生命周期与交付链"],
      },
      relation("需求"),
      relation("Issue"),
      relation("版本", "版本与发布"),
      {
        key: "engineering",
        title: "质量与运维门禁",
        sections: ["工程质量与运维门禁"],
      },
      { key: "evidence", title: "数据与证据", sections: ["数据与证据"] },
      relation("系统", "接口依赖"),
      relation("项目"),
      {
        key: "members",
        title: "责任与协作",
        sections: ["相关员工清单"],
        kinds: ["员工"],
      },
      {
        key: "archive",
        title: "完整档案",
        sections: Object.keys(dossiers[e.id]?.sections || {}),
      },
    ];
  if (e.kind === "需求")
    return [
      { key: "scope", title: "范围与验收", sections: ["范围与验收"] },
      { key: "lifecycle", title: "生命周期", sections: ["生命周期"] },
      relation("Issue"),
      relation("版本", "交付与发布"),
      relation("风险"),
      relation("项目"),
      relation("系统"),
      relation("员工", "责任与验收人"),
      relation("资料", "来源证据"),
    ];
  if (e.kind === "Issue")
    return [
      {
        key: "scope",
        title: "验收与实施",
        sections: ["业务定义", "责任与门禁"],
      },
      relation("Impl"),
      relation("需求"),
      relation("版本", "发布门禁"),
      relation("风险"),
      relation("资料", "复现与证据"),
      relation("员工", "研发与审核"),
    ];
  if (e.kind === "Impl")
    return [
      {
        key: "review",
        title: "实现与独立审核",
        sections: ["业务定义", "责任与门禁"],
      },
      relation("Issue"),
      relation("需求", "冻结验收来源"),
      relation("版本", "候选版本"),
    ];
  return [
    {
      key: "facts",
      title: "事实与责任",
      sections: Object.keys(dossiers[e.id]?.sections || {}),
    },
    ...[
      ...new Set(rows.filter((x) => e.links.includes(x.id)).map((x) => x.kind)),
    ].map((k) => relation(k, k === "员工" ? "责任与协作" : `相关${k}`)),
  ];
}
