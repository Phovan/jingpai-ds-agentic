import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Login } from "./login";
import { LOGIN_ROLES, ROLES } from "../domain/model";

describe("demo login choices", () => {
  it("shows seven approved identities without deleting workflow roles", () => {
    const html = renderToStaticMarkup(<Login onLogin={() => {}} />);
    expect(LOGIN_ROLES).toEqual(["管理层", "PMO", "项目经理", "业务Owner", "产品经理", "研发", "系统管理员"]);
    expect(html).toContain("7");
    for (const role of LOGIN_ROLES) expect(html).toContain(role);
    for (const role of ["项目成员", "系统负责人", "测试", "运维"] as const) {
      expect(html).not.toContain(role);
      expect(ROLES).toContain(role);
    }
  });
});
