import { describe, expect, it } from "vitest";
import {
  canonicalNavigation,
  defaultNavigation,
  navigationHash,
  parseNavigation,
} from "./navigation";

describe("browser navigation destinations", () => {
  it("round-trips a scoped project detail and workbench category", () => {
    const n = {
      ...defaultNavigation("管理层", "项目"),
      route: "home" as const,
      entityId: "PRJ-001",
    };
    expect(
      parseNavigation(navigationHash(n), "管理层", "战略", ["PRJ-001"], []),
    ).toEqual(n);
  });
  it("restores period and Topic pages separately", () => {
    const n = {
      ...defaultNavigation("管理层"),
      reportView: { period: "自定义Topic" as const, topicId: "topic-123" },
    };
    expect(
      parseNavigation(navigationHash(n), "管理层", "", [], []).reportView,
    ).toEqual(n.reportView);
    expect(
      navigationHash({ ...n, reportView: { period: "月报" } }),
    ).not.toEqual(navigationHash(n));
  });
  it("does not create extra destinations for stale hidden fields", () => {
    const n = { ...defaultNavigation("管理层"), threadId: "t1" };
    expect(navigationHash(n)).toBe(
      navigationHash({
        ...n,
        entityId: "PRJ-001",
        requestedKind: "系统",
        reportView: { period: "周报" },
        selectedDemand: "REQ-999",
      }),
    );
    expect(canonicalNavigation(n).threadId).toBe("t1");
  });
  it("rejects old routes, invalid ids and other identities conversations", () => {
    expect(
      parseNavigation("#view=operations", "研发", "系统", [], []).route,
    ).toBe("chat");
    expect(
      parseNavigation("#view=home&id=SECRET", "研发", "系统", ["PRJ-001"], [])
        .entityId,
    ).toBe("");
    expect(
      parseNavigation("#view=chat&thread=MANAGER", "研发", "系统", [], ["DEV"])
        .threadId,
    ).toBeNull();
    expect(
      parseNavigation("#view=demands&demand=SECRET", "研发", "需求", [], [])
        .selectedDemand,
    ).toBe("REQ-024");
    expect(
      parseNavigation(
        "#view=home&id=PRJ-001",
        "系统管理员",
        "",
        ["PRJ-001"],
        [],
      ).entityId,
    ).toBe("");
    expect(
      parseNavigation(
        "#view=chat&thread=ADMIN",
        "系统管理员",
        "",
        [],
        ["ADMIN"],
      ).threadId,
    ).toBe("ADMIN");
  });
  it("uses safe defaults for invalid periods and recognizes selected demand", () => {
    expect(
      parseNavigation("#view=chat&report=bad", "研发", "系统", [], [])
        .reportView,
    ).toBeNull();
    expect(
      parseNavigation(
        "#view=demands&demand=REQ-025",
        "研发",
        "系统",
        ["REQ-025"],
        [],
      ).selectedDemand,
    ).toBe("REQ-025");
  });
});
