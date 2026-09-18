import { describe, expect, it } from "vitest";
import { addConversationMaterials, importFiles } from "./material-files";
import { emptyPersonal, type Material } from "./personal";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { MaterialPanel } from "../components/material-panel";

const material: Material = {
  id: "file1",
  title: "需求说明.md",
  text: "要求",
  kind: "input",
  threadId: "t1",
  version: 1,
  created: "2026-09-18",
};
describe("conversation files", () => {
  it("creates scoped conversation for attachment-first input, reuses it on follow-up", () => {
    const context = {
      key: "ISS-024",
      title: "订单提醒",
      route: "home" as const,
      objectId: "ISS-024",
    };
    const p = addConversationMaterials(
      emptyPersonal(),
      [material],
      "t1",
      context,
    );
    expect(p.threads[0].context).toEqual(context);
    expect(p.threads[0].messages).toEqual([]);
    expect(p.groups[0].contextKey).toBe("ISS-024");
    const next = addConversationMaterials(
      p,
      [{ ...material, id: "file2" }],
      "t1",
      context,
    );
    expect(next.threads).toHaveLength(1);
    expect(next.groups).toHaveLength(1);
    expect(next.materials).toHaveLength(2);
  });
  it("drawer only lists files from the current conversation, never global/other files", () => {
    const data = {
      ...emptyPersonal(),
      materials: [
        material,
        { ...material, id: "other", title: "其他会话机密", threadId: "t2" },
        { ...material, id: "global", title: "历史通用材料", threadId: "" },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(MaterialPanel, {
        personal: { data, warning: "", update: () => {} },
        threadId: "t1",
        version: 1,
        mobile: false,
        tab: "input",
        setTab: () => {},
        onClose: () => {},
      }),
    );
    expect(html).toContain("产出与材料");
    expect(html).toContain("需求说明.md");
    expect(html).not.toContain("其他会话机密");
    expect(html).not.toContain("历史通用材料");
    expect(html).not.toContain("输入材料");
    expect(html).toContain("复制文件");
    expect(html).toContain("分享文件");
  });
  it("rejects oversized batches before writing any files", async () => {
    await expect(
      importFiles(Array(11).fill(new File(["a"], "x.md")), "t1", 1),
    ).rejects.toThrow("最多 10");
    expect(await importFiles([], "t1", 1)).toEqual([]);
  });
});
