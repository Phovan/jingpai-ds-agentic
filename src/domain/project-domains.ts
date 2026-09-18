/** One display taxonomy; original source documents and organization names stay unchanged. */
export const PROJECT_DOMAINS = [
  "生产研发",
  "产品质量",
  "采购供应链",
  "营销服务",
  "用户洞察",
  "国际业务",
  "集团治理",
] as const;
const aliases: Record<string, string> = {
  "生产/研发": "生产研发",
  研发: "生产研发",
  "产品/质量": "产品质量",
  产品: "产品质量",
  "采购/供应链": "采购供应链",
  "可持续/采购": "采购供应链",
  采购: "采购供应链",
  "营销/服务": "营销服务",
  营销决策: "营销服务",
  营销: "营销服务",
  服务: "营销服务",
  "国际业务/营销": "国际业务",
  "国际业务/供应链": "国际业务",
  集团项目治理: "集团治理",
  "人力/数字化": "集团治理",
  信息中心: "集团治理",
  运营: "集团治理",
};
export function projectDomain(value: string) {
  return aliases[value.trim()] || value.trim() || "未分类";
}
export function domainLabels(text: string) {
  return text.replace(
    /生产\/研发|产品\/质量|采购\/供应链|可持续\/采购|营销\/服务|国际业务\/营销|国际业务\/供应链|人力\/数字化|(?:营销决策|集团项目治理)(?=类?项目|方向)/g,
    (value) => projectDomain(value),
  );
}
export function orderedDomains(values: string[]) {
  const set = new Set(values.map(projectDomain));
  return [
    ...PROJECT_DOMAINS.filter((x) => set.has(x)),
    ...[...set].filter(
      (x) => !PROJECT_DOMAINS.includes(x as (typeof PROJECT_DOMAINS)[number]),
    ),
  ];
}
