import type { Role, Route } from "./model";
import type { ReportView } from "./briefing";
import { PERIODS } from "./briefing";

export type AppRoute = Exclude<Route, "operations"> | "chat";
export interface NavigationState {
  role: Role;
  route: AppRoute;
  entityId: string;
  requestedKind: string;
  threadId: string | null;
  reportView: ReportView | null;
  selectedDemand: string;
}
export const ROUTES: AppRoute[] = [
  "chat",
  "home",
  "projects",
  "demands",
  "engineering",
  "reports",
  "agents",
  "knowledge",
];
export function defaultNavigation(role: Role, kind = ""): NavigationState {
  return {
    role,
    route: role === "系统管理员" ? "home" : "chat",
    entityId: "",
    requestedKind: kind,
    threadId: null,
    reportView: null,
    selectedDemand: "REQ-024",
  };
}
/** Store only the active destination; stale hidden fields must not create phantom Back steps. */
export function canonicalNavigation(n: NavigationState): NavigationState {
  const base = {
    ...n,
    entityId: n.route === "home" ? n.entityId : "",
    threadId: n.route === "chat" ? n.threadId : null,
    reportView: n.route === "chat" && !n.threadId ? n.reportView : null,
    selectedDemand: n.route === "demands" ? n.selectedDemand : "REQ-024",
  };
  if (base.route !== "home") base.requestedKind = "";
  return base;
}
export function navigationHash(nav: NavigationState) {
  const n = canonicalNavigation(nav);
  const params = new URLSearchParams({ view: n.route });
  if (n.entityId) params.set("id", n.entityId);
  if (n.requestedKind) params.set("kind", n.requestedKind);
  if (n.threadId) params.set("thread", n.threadId);
  if (n.reportView) {
    params.set("report", n.reportView.period);
    if (n.reportView.topicId) params.set("topic", n.reportView.topicId);
  }
  if (n.route === "demands") params.set("demand", n.selectedDemand);
  return "#" + params.toString();
}
export function parseNavigation(
  hash: string,
  role: Role,
  kind: string,
  ids: string[],
  threads: string[],
): NavigationState {
  const n = defaultNavigation(role, kind);
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  if (role === "系统管理员") {
    if (p.get("view") === "chat" && threads.includes(p.get("thread") || "")) {
      n.route = "chat";
      n.threadId = p.get("thread");
    }
    return n;
  }
  const route = p.get("view");
  if (!ROUTES.includes(route as AppRoute)) return n;
  n.route = route as AppRoute;
  if (n.route === "home") {
    n.entityId = ids.includes(p.get("id") || "") ? p.get("id")! : "";
    n.requestedKind = p.get("kind") || kind;
  }
  if (n.route === "chat") {
    n.threadId = threads.includes(p.get("thread") || "")
      ? p.get("thread")!
      : null;
    const period = p.get("report");
    if (!n.threadId && [...PERIODS, "自定义Topic"].includes(period || ""))
      n.reportView = {
        period: period as ReportView["period"],
        ...(p.get("topic") ? { topicId: p.get("topic")! } : {}),
      };
  }
  if (n.route === "demands" && ids.includes(p.get("demand") || ""))
    n.selectedDemand = p.get("demand")!;
  return n;
}
