import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContextDetails } from "./context-details";
import { OntologyWorkbench } from "../pages/ontology-workbench";
import { seed } from "../domain/model";
import { emptyPersonal } from "../domain/personal";
const noop = () => {};
describe("compact workspace contract", () => {
  const state = seed();
  const props = {
    state,
    role: "管理层" as const,
    personal: { data: emptyPersonal(), warning: "", update: noop },
    selectedKind: "战略",
    onSelect: noop,
    onContext: noop,
    onDemand: noop,
    onCommand: noop,
    onExecution: noop,
    navigate: noop,
    openOps: noop,
  };
  it("list removes duplicate headings and scene collaboration", () => {
    const html = renderToStaticMarkup(
      <OntologyWorkbench {...props} selectedId="" />,
    );
    expect(html).not.toContain("场景协作");
    expect(html).not.toContain("ontology-list-heading");
    expect(html).not.toContain("本体");
    expect(html).toContain("搜索名称、编号、目标");
  });
  it("detail retains related tabs but removes workbench tabs and extra actions", () => {
    const html = renderToStaticMarkup(
      <OntologyWorkbench {...props} selectedId="PRJ-001" />,
    );
    expect(html).toContain("相关需求");
    expect(html).not.toContain("工作台分类");
    expect(html).not.toContain("进入协作处理");
    expect(html).not.toContain("追问大脑");
    expect(html).toContain("建议行动");
  });
  it("project lists show delivery progress separately and use the action heading", () => {
    const html = renderToStaticMarkup(
      <OntologyWorkbench
        {...props}
        state={{ ...state, catalogVersion: "v03" }}
        selectedKind="项目"
        selectedId=""
      />,
    );
    expect(html).toContain("<th>项目进度</th>");
    expect(html).toContain("<th>下一步举措</th>");
    expect(html).toContain("4/8 已完成");
    expect(html).toContain("50%");
    expect(html).toContain("ontology-project-progress");
  });
  it("right pane renders only details without relationship tabs or boards", () => {
    const html = renderToStaticMarkup(
      <ContextDetails
        context={{
          key: "PRJ-001",
          title: "订单协同优化",
          route: "home",
          objectId: "PRJ-001",
        }}
        state={state}
        role="管理层"
        onClose={noop}
        onReturn={noop}
      />,
    );
    expect(html).toContain("详情摘要");
    expect(html).not.toContain("tablist");
    expect(html).not.toContain("产出看板");
  });
  it("list sidebar is a bounded summary rather than the full table", () => {
    const html = renderToStaticMarkup(
      <ContextDetails
        context={{
          key: "list",
          title: "项目清单",
          route: "home",
          entityKind: "项目",
        }}
        state={state}
        role="管理层"
        onClose={noop}
        onReturn={noop}
      />,
    );
    expect(html.match(/<article>/g)).toHaveLength(6);
    expect(html).not.toContain("<table");
    expect(html).toContain("仅显示前 6 项");
  });
});
