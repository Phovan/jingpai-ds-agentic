import { useBrowserNavigation } from "./components/use-browser-navigation";
import { BrainHome, ReportHub } from "./pages/brain-home";
import {
  reportContext,
  reportReply,
  reportText,
  type ReportView,
} from "./domain/briefing";
import type { BrainContext } from "./domain/experience";
import { EosExecutionPanel } from "./components/eos-execution-panel";
import { eosSteps } from "./domain/eos";
import { eosStageAnswer } from "./domain/eos-dialogue";
import { narrativeText } from "./domain/narrative";
import "./catalog.css";
import { importFiles, addConversationMaterials } from "./domain/material-files";
import { Notifications, ObjectSearch } from "./components/object-dialogs";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Menu,
  Paperclip,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  PROFILES,
  LOGIN_ROLES,
  type Role,
  type Route,
  type Command,
} from "./domain/model";
import {
  useDemo,
  execute,
  resetDemo,
  startAgentClock,
  storageWarning,
  readDemoState,
} from "./domain/store";
import { usePersonal } from "./domain/personal";
import { TOOLS } from "./domain/workbench";
import { Modal } from "./components/ui";
import { EntityText } from "./components/entity-text";
import { Login } from "./components/login";
import { useMobile } from "./components/use-mobile";
import { ConversationSidebar } from "./components/conversation-sidebar";
import { MaterialPanel } from "./components/material-panel";
import { ActionDialog, type ActionKind } from "./components/action-dialog";
import {
  Projects,
  Demands,
  Engineering,
  Reports,
  Agents,
  Knowledge,
  type WorkspaceProps,
} from "./pages/workspace";
import { FollowButton } from "./pages/workbench";
import { OntologyWorkbench as Workbench } from "./pages/ontology-workbench";
import {
  visibleEntities,
  configuredTabs,
  type EntityType,
} from "./domain/ontology";
import { Admin } from "./pages/admin";
import { Conversation } from "./pages/conversation";
import { ContextComposer } from "./components/context-composer";
import { ContextDetails } from "./components/context-details";
import { appendQuestion, routeContext } from "./domain/experience";
import type { EntityDraft } from "./domain/entity-creation";

function readRole() {
  try {
    const r = sessionStorage.getItem("jingpai-role");
    return LOGIN_ROLES.includes(r as Role) ? (r as Role) : null;
  } catch {
    return null;
  }
}
export default function App() {
  const [role, setRole] = useState<Role | null>(readRole);
  function login(r: Role) {
    try {
      sessionStorage.setItem("jingpai-role", r);
    } catch {
      /* In-memory identity remains available. */
    }
    setRole(r);
  }
  function logout() {
    try {
      sessionStorage.removeItem("jingpai-role");
    } catch {
      /* In-memory logout still works. */
    }
    setRole(null);
  }
  return role ? (
    <WorkspaceShell key={role} role={role} logout={logout} />
  ) : (
    <Login onLogin={login} />
  );
}
function WorkspaceShell({ role, logout }: { role: Role; logout: () => void }) {
  const state = useDemo();
  const personal = usePersonal(role);
  const mobile = useMobile();
  const narrow = useMobile(1279);
  const [executionIssue, setExecutionIssue] = useState<string | null>(null);
  const eosRun = state.eosRuns?.find((r) => r.issueId === executionIssue);
  const eosClick = useRef(false);
  const testTransferLock = useRef(false);
  const [transferringTest, setTransferringTest] = useState(false);
  const [testPreview, setTestPreview] = useState<string | null>(null);
  const testReceipt = state.eosTestTasks?.find(
    (task) => task.id === testPreview,
  );
  const uploading = useRef(false);
  const [boards, setBoards] = useState(false);
  const [boardDrawer, setBoardDrawer] = useState(false);
  const entities = visibleEntities(state, role);
  const { nav, setField, restoreTick } = useBrowserNavigation(
    role,
    configuredTabs(role, personal.data.ontologyTabs)[0] || "",
    entities.map((e) => e.id),
    personal.data.threads.map((t) => t.id),
  );
  const {
    route,
    reportView,
    entityId,
    requestedKind,
    threadId,
    selectedDemand,
  } = nav;
  const setRoute = (r: Route | "chat") =>
    setField("route", r === "operations" ? "home" : r);
  const setReportView = (v: ReportView | null) => setField("reportView", v);
  const setEntityId = (id: string) => setField("entityId", id);
  const setEntityKind = (kind: string) => setField("requestedKind", kind);
  const setThreadId = (id: string | null) => setField("threadId", id);
  const setSelectedDemand = (id: string) => setField("selectedDemand", id);
  const configured = configuredTabs(role, personal.data.ontologyTabs);
  const entityKind =
    requestedKind === "我的关注" ||
    configured.includes(requestedKind as EntityType)
      ? requestedKind
      : configured[0];
  const entity = entities.find((e) => e.id === entityId);
  function selectEntity(id: string) {
    if (id && !entities.some((e) => e.id === id)) return;
    setEntityId(id);
    setBoards(false);
    setBoardDrawer(false);
    setRoute("home");
  }
  const [action, setAction] = useState<{ kind: ActionKind; id: string } | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [materials, setMaterials] = useState(false);
  const [materialTab, setMaterialTab] = useState<"input" | "output">("output");
  const [utility, setUtility] = useState<
    "settings" | "feedback" | "reset" | "search" | "notifications" | null
  >(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  useEffect(() => {
    setMenu(false);
    setMaterials(false);
    setBoards(false);
    setBoardDrawer(false);
    setExecutionIssue(null);
    setAction(null);
    setUtility(null);
    setError("");
  }, [restoreTick]);
  const workbenchScroll = useRef(0);
  useLayoutEffect(() => {
    document
      .getElementById("main-content")
      ?.scrollTo({ top: route === "home" ? workbenchScroll.current : 0 });
  }, [route, selectedDemand]);
  useEffect(() => startAgentClock(), []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (!mobile) setMenu(false);
  }, [mobile]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  function navigate(r: Route) {
    if (role === "系统管理员" && r !== "home") return;
    if (route === "home")
      workbenchScroll.current =
        document.getElementById("main-content")?.scrollTop || 0;
    setRoute(r);
    if (r === "home") setEntityId("");
    setMenu(false);
    setError("");
    setBoardDrawer(false);
    setMaterials(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openReport(view: ReportView) {
    setReportView(view);
    setRoute("chat");
    setThreadId(null);
    setMaterials(false);
    setBoardDrawer(false);
    setBoards(false);
    setExecutionIssue(null);
  }
  function newChat() {
    setReportView(null);
    if (role === "系统管理员") {
      setRoute("home");
      setThreadId(null);
      setMenu(false);
      setNotice("可在下方围绕连接与同步发起新对话。");
      return;
    }
    setRoute("chat");
    setThreadId(null);
    setMenu(false);
    setMaterials(false);
    setError("");
    setBoardDrawer(false);
  }
  function openThread(id: string) {
    if (route === "home")
      workbenchScroll.current =
        document.getElementById("main-content")?.scrollTop || 0;
    const ctx = personal.data.threads.find((t) => t.id === id)?.context;
    if (ctx?.report) setReportView(ctx.report);
    else setReportView(null);
    if (ctx?.route === "demands" && ctx.objectId)
      setSelectedDemand(ctx.objectId);
    setRoute("chat");
    setThreadId(id);
    setMenu(false);
    setBoardDrawer(false);
  }
  async function act(c: Command) {
    try {
      await execute(role, c, state.version);
      setNotice("已保存。关联对象与回执已更新。");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              business:
                role === "系统管理员"
                  ? { connections: state.connections || [] }
                  : state,
              personal: personal.data,
              role,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "jingpai-demo-snapshot.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const currentTool = TOOLS.find((t) => t.route === route);
  const context: BrainContext | undefined =
    route === "chat"
      ? personal.data.threads.find((t) => t.id === threadId)?.context ||
        (reportView
          ? reportContext(role, reportView, personal.data, state)
          : {
              key: role + ":landing",
              title: "我的首页",
              route: "home",
              landing: true,
            })
      : route === "home" && role !== "系统管理员"
        ? {
            key: entity?.id || `${role}:home:${entityKind}`,
            title:
              entity?.title ||
              (entityKind === "我的关注" ? "我的关注" : `${entityKind}清单`),
            route: "home" as const,
            objectId: entity?.id,
            entityKind,
            followedIds:
              entityKind === "我的关注" ? personal.data.follows : undefined,
          }
        : routeContext(route, role, state, selectedDemand);
  function returnContext() {
    if (!context) return;
    if (context.report) {
      openReport(context.report);
      return;
    }
    if (context.landing) {
      newChat();
      return;
    }
    if (context.entityKind) setEntityKind(context.entityKind);
    if (context.objectId) selectEntity(context.objectId);
    else navigate(context.route);
    setBoards(false);
    setBoardDrawer(false);
  }
  function showDetails() {
    setExecutionIssue(null);
    setMaterials(false);
    if (narrow) setBoardDrawer(true);
    else setBoards(true);
  }
  async function confirmCreation(draft: EntityDraft): Promise<string> {
    const existing = readDemoState().createdEntities?.find(
      (e) => e.requestId === draft.requestId,
    );
    if (existing) return existing.id;
    await execute(role, { type: "catalog-create", draft }, state.version);
    const saved = readDemoState().createdEntities?.find(
      (e) => e.requestId === draft.requestId,
    );
    if (!saved) throw new Error("提交未保存，请重试。");
    personal.update((p) => ({
      ...p,
      ontologyTabs: [
        ...new Set([...configuredTabs(role, p.ontologyTabs), saved.kind]),
      ],
    }));
    return saved.id;
  }
  async function confirmReportAction(messageId: string) {
    const thread = personal.data.threads.find((t) => t.id === threadId);
    const message = thread?.messages.find((m) => m.id === messageId);
    if (!thread?.context || !message?.reportAction || message.actionDone)
      return;
    const action = message.reportAction;
    try {
      if (action.kind === "focus")
        await execute(
          role,
          {
            type: "report-focus",
            id: message.id,
            period: action.period,
            recipients: action.recipients,
            content: action.content,
          },
          state.version,
        );
      personal.update((p) => ({
        ...p,
        reportDrafts:
          action.kind === "confirm"
            ? {
                ...p.reportDrafts,
                [action.key]: {
                  ...p.reportDrafts?.[action.key],
                  notes: p.reportDrafts?.[action.key]?.notes || [],
                  confirmedAt: new Date().toISOString(),
                  version: state.version,
                  snapshot: reportText(state, role, p, thread.context!),
                },
              }
            : p.reportDrafts,
        threads: p.threads.map((t) =>
          t.id === thread.id
            ? {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === messageId ? { ...m, actionDone: true } : m,
                ),
              }
            : t,
        ),
      }));
      setNotice(
        action.kind === "focus"
          ? "关注点已下发到演示团队，切换接收角色可在对应周期汇报查看。"
          : "汇报快照已确认保存。",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function askContext(question: string, target: string | null) {
    if (/^继续下一步[。！!\s]*$/.test(question.trim()) && context?.objectId) {
      const run = readDemoState().eosRuns?.find(
        (r) => r.issueId === context.objectId,
      );
      if (run) {
        await eosInteract("next", run.issueId);
        return;
      }
    }
    const issueId = context?.objectId;
    const launch =
      entities.some((e) => e.id === issueId && e.kind === "Issue") &&
      /(?:开始|继续)\s*EOS\s*实施/i.test(question);
    try {
      if (launch) {
        if (role !== "研发") throw new Error("请由研发角色发起 EOS 实施。");
        const run = state.eosRuns?.find((r) => r.issueId === issueId);
        if (!run || run.status === "stopped")
          await execute(
            role,
            { type: "eos", action: "start", issueId: issueId! },
            state.version,
          );
      }
      let nextId = "";
      personal.update((p) => {
        const result = appendQuestion(
          p,
          state,
          role,
          question,
          context,
          target,
        );
        nextId = result.threadId;
        if (
          !result.data.threads.find((t) => t.id === nextId)?.messages.at(-1)
            ?.entityDraft &&
          (context?.report || (context?.landing && /下发|布置/.test(question)))
        ) {
          const reply = reportReply(state, role, p, context, question);
          const thread = result.data.threads.find((t) => t.id === nextId)!;
          const message: import("./domain/personal").Message =
            thread.messages[thread.messages.length - 1];
          message.answer = reply.answer;
          message.reportAction = reply.action;
          message.nextQuestions = reply.action
            ? ["这份汇报哪些结果仍需复核？"]
            : reply.note
              ? ["确认本期汇报"]
              : ["补充关注：区分已交付、待验证与待核实事项", "确认本期汇报"];
          if (reply.note)
            result.data.reportDrafts = {
              ...p.reportDrafts,
              [context.key]: {
                notes: [
                  ...(p.reportDrafts?.[context.key]?.notes || []),
                  reply.note,
                ],
              },
            };
        }
        if (launch) {
          const thread = result.data.threads.find((t) => t.id === nextId)!;
          const message = thread.messages[thread.messages.length - 1];
          message.eosIssueId = issueId;
          message.answer = state.eosRuns?.some(
            (r) => r.issueId === issueId && r.status === "completed",
          )
            ? "此 Issue 的模拟实施已完成，交付包等待人工核对，不重复启动。点击执行详情查看各阶段证据。"
            : "已开启逐步 EOS 演示：归因 Agent 的核对记录已就绪，研发、Review 与验证阶段尚未开始。\n\n点击「执行详情」后，可先查看归因结果，或点击「下一步」执行研发。每次只运行一个阶段；完成后停下等待你的选择。仅为本地模拟，不访问真实代码库，不自动批准发布或确认业务价值。";
        }
        return result.data;
      });
      setMaterials(false);
      setBoards(false);
      setBoardDrawer(false);
      setExecutionIssue(null);
      openThread(nextId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "实施未能启动，请重试。");
    }
  }
  async function attachFiles(files: File[]) {
    if (!files.length || uploading.current) return;
    uploading.current = true;
    const target =
      route === "chat" && threadId ? threadId : crypto.randomUUID();
    const sourceContext = context;
    setNotice("正在保存材料到本机…");
    try {
      const items = await importFiles(files, target, state.version);
      personal.update((p) =>
        addConversationMaterials(p, items, target, sourceContext),
      );
      openThread(target);
      showMaterials("input");
      setNotice(`已添加 ${items.length} 个材料；仅本机保存，未发送给模型。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加材料失败。");
    } finally {
      uploading.current = false;
    }
  }
  function showExecution(issueId: string) {
    if (!entities.some((e) => e.id === issueId)) return;
    setMaterials(false);
    setBoards(false);
    setBoardDrawer(false);
    setExecutionIssue(issueId);
  }
  async function eosInteract(
    action: "next" | "view" | "restart",
    issueId: string,
    index?: number,
  ) {
    if (eosClick.current) return;
    eosClick.current = true;
    try {
      const before = readDemoState();
      const previous = before.eosRuns?.find((r) => r.issueId === issueId);
      if (!previous || !entities.some((e) => e.id === issueId))
        throw new Error("执行记录不可见。");
      if (action === "next" || action === "restart")
        await execute(
          role,
          { type: "eos", action, issueId, expectedStep: previous.step },
          before.version,
        );
      const current = readDemoState(),
        run = current.eosRuns!.find((r) => r.issueId === issueId)!;
      const stage =
        action === "next"
          ? run.step + 1
          : action === "restart"
            ? 0
            : (index ?? run.step);
      if (action === "view" && stage > run.step)
        throw new Error("该阶段尚未完成，没有执行结果。");
      const step = eosSteps(issueId)[stage];
      let id = "";
      personal.update((p) => {
        const result = appendQuestion(
          p,
          current,
          role,
          action === "next"
            ? `继续下一步：${step.agent} · ${step.title}`
            : action === "restart"
              ? "开始新一轮逐步演示"
              : `查看${step.agent}执行的情况：${step.title}`,
          context,
          threadId,
        );
        id = result.threadId;
        const message = result.data.threads
          .find((t) => t.id === id)!
          .messages.at(-1)!;
        message.answer = eosStageAnswer(run, stage, action === "view");
        message.eosIssueId = issueId;
        message.eosRunId = run.id;
        message.eosStepIndex = stage;
        message.eosAdvance = action === "next";
        message.nextQuestions = [];
        return result.data;
      });
      openThread(id);
      setExecutionIssue(issueId);
      setMaterials(false);
      setBoards(false);
      setBoardDrawer(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "执行操作未完成。");
    } finally {
      eosClick.current = false;
    }
  }
  async function transferToTest() {
    if (!eosRun || testTransferLock.current) return;
    testTransferLock.current = true;
    setTransferringTest(true);
    try {
      const current = readDemoState();
      await execute(
        role,
        {
          type: "eos",
          action: "transfer-test",
          issueId: eosRun.issueId,
          expectedRunId: eosRun.id,
        },
        current.version,
      );
      setNotice("已转测试，测试工程师的即时信息中已新增待办。");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "转测试未完成，请重试。");
    } finally {
      testTransferLock.current = false;
      setTransferringTest(false);
    }
  }
  function exportExecution() {
    if (!eosRun || !threadId) return;
    personal.update((p) => ({
      ...p,
      materials: [
        {
          id: crypto.randomUUID(),
          kind: "output",
          threadId,
          created: new Date().toISOString(),
          version: state.version,
          title: `${entities.find((e) => e.id === eosRun.issueId)?.title || eosRun.issueId} · EOS 执行记录`,
          text: narrativeText(
            `# EOS 实施演示\n\n执行：${eosRun.id} · ${eosRun.status}\n冻结验收：${eosRun.acceptance}\n\n${eosSteps(
              eosRun.issueId,
            )
              .slice(0, eosRun.step + 1)
              .map(
                (x, i) =>
                  `## ${i + 1}. ${x.agent} · ${x.title}\n${x.detail}\n产物：${x.output}`,
              )
              .join(
                "\n\n",
              )}\n\n仅为本地模拟，不代表真实代码已合并或发布。人工核对与业务验收尚未完成。`,
            entities,
          ),
        },
        ...p.materials,
      ],
    }));
    showMaterials("output");
  }
  function showMaterials(tab: "input" | "output") {
    setExecutionIssue(null);
    setMaterialTab(tab);
    setMaterials(true);
    setBoardDrawer(false);
  }
  const title =
    route === "chat"
      ? personal.data.threads.find((t) => t.id === threadId)?.title ||
        (reportView ? "周期汇报" : "我的首页")
      : route === "home"
        ? "工作台"
        : currentTool?.title;
  const props: WorkspaceProps = {
    onEntity: selectEntity,
    follow: context?.objectId ? (
      <FollowButton
        id={context.objectId}
        title={context.title}
        personal={personal}
      />
    ) : undefined,
    state,
    role,
    navigate,
    open: (kind, id = "REQ-024") => setAction({ kind, id }),
    act: (c) => void act(c),
    brain: () => {
      document.getElementById("context-question")?.focus();
    },
    selectedDemand,
    onDemandChange: setSelectedDemand,
  };
  const pages = {
    projects: Projects,
    demands: Demands,
    engineering: Engineering,
    reports: Reports,
    agents: Agents,
    knowledge: Knowledge,
  };
  const Page = route !== "chat" && route !== "home" ? pages[route] : null;
  return (
    <div
      className={
        "agentic-shell r2-shell " +
        (materials && !mobile ? "with-materials" : "")
      }
    >
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      {mobile && menu && (
        <button
          className="conversation-backdrop"
          aria-label="关闭导航"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        className={"conversation-sidebar " + (menu ? "open" : "")}
        inert={mobile && !menu ? true : undefined}
        aria-label="对话导航"
      >
        <ConversationSidebar
          formatText={(text) => narrativeText(text, entities)}
          personal={personal}
          contextKey={context?.key}
          active={route === "chat" ? threadId : null}
          workbench={route !== "chat"}
          onNew={newChat}
          onWorkbench={() => navigate("home")}
          onThread={openThread}
          onUtility={(v) => {
            setUtility(v);
            setMenu(false);
          }}
        />
      </aside>
      <div className="agentic-main">
        <header className="agentic-topbar">
          <div className="agentic-breadcrumb">
            {mobile && (
              <button
                className="icon-button"
                aria-label="打开导航"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <Menu size={20} />
              </button>
            )}
            {route !== "chat" && route !== "home" && (
              <button
                className="icon-button"
                aria-label="返回工作台"
                onClick={() => navigate("home")}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <button
              className="breadcrumb-home"
              onClick={() =>
                route === "chat" && context ? returnContext() : navigate("home")
              }
            >
              {route === "chat"
                ? narrativeText(context?.title || title || "我的首页", entities)
                : "我的工作台"}
            </button>
          </div>
          <div className="agentic-top-actions">
            <button
              className="icon-button desktop-search"
              aria-label="搜索对象"
              onClick={() => setUtility("search")}
            >
              <Search size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="查看通知"
              onClick={() => setUtility("notifications")}
            >
              <Bell size={18} />
            </button>
            <button
              className="role-pill"
              aria-label="当前角色与设置"
              onClick={() => setUtility("settings")}
            >
              {role} · 演示数据
            </button>
            {route === "chat" &&
              context &&
              !context.report &&
              !context.landing &&
              role !== "系统管理员" && (
                <button
                  className="icon-button"
                  aria-label={
                    (narrow ? boardDrawer : boards && !materials)
                      ? "收起详情"
                      : "展开详情"
                  }
                  aria-expanded={narrow ? boardDrawer : boards && !materials}
                  onClick={() => {
                    setMaterials(false);
                    if (narrow) setBoardDrawer(!boardDrawer);
                    else setBoards(materials || !boards);
                  }}
                >
                  详情 ›
                </button>
              )}
            <button
              className={"icon-button " + (materials ? "selected" : "")}
              aria-label={materials ? "收起产出与材料" : "展开产出与材料"}
              aria-expanded={materials}
              onClick={() => {
                setMaterials(!materials);
                setBoardDrawer(false);
              }}
            >
              <Paperclip size={19} />
            </button>
          </div>
        </header>
        <div className="r2-workspace">
          <div className="r2-center">
            <main
              id="main-content"
              className={
                route === "chat" ? "agentic-chat-main" : "agentic-business-main"
              }
            >
              {(storageWarning() || personal.warning) && (
                <div className="error" role="alert">
                  {storageWarning() || personal.warning}
                </div>
              )}
              {error && (
                <div className="error error-banner" role="alert">
                  {error}
                  <button
                    className="icon-button"
                    aria-label="关闭错误提示"
                    onClick={() => setError("")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {route === "chat" ? (
                <Conversation
                  key={role + "-" + (threadId || context?.key || "new")}
                  state={state}
                  role={role}
                  personal={personal}
                  threadId={threadId}
                  onThread={openThread}
                  onEntity={selectEntity}
                  onCreate={confirmCreation}
                  onMaterials={showMaterials}
                  onFiles={attachFiles}
                  onContextAsk={askContext}
                  onExecution={showExecution}
                  onReportAction={confirmReportAction}
                  activeContext={context}
                  landing={
                    reportView ? (
                      <ReportHub
                        state={state}
                        role={role}
                        personal={personal}
                        view={reportView}
                        onReport={openReport}
                        onEntity={selectEntity}
                        navigate={navigate}
                        onAsk={(q) => askContext(q, null)}
                        onHome={newChat}
                      />
                    ) : (
                      <BrainHome
                        state={state}
                        role={role}
                        personal={personal}
                        onEntity={selectEntity}
                        onReport={openReport}
                        navigate={navigate}
                      />
                    )
                  }
                  navigate={(r) =>
                    context && r === context.route
                      ? returnContext()
                      : navigate(r)
                  }
                  contextHeader={
                    context &&
                    threadId && (
                      <div className="ontology-chat-context">
                        <button
                          className="context-title-link"
                          onClick={returnContext}
                        >
                          {context.title}
                        </button>
                        {!context.landing && !context.report && (
                          <button className="text-button" onClick={showDetails}>
                            查看详情 →
                          </button>
                        )}
                        {context.objectId &&
                          entities.some((e) => e.id === context.objectId) && (
                            <FollowButton
                              id={context.objectId}
                              title={context.title}
                              personal={personal}
                            />
                          )}
                      </div>
                    )
                  }
                  origin={
                    context?.report && threadId ? (
                      <ReportHub
                        state={state}
                        role={role}
                        personal={personal}
                        view={context.report}
                        onReport={openReport}
                        onEntity={selectEntity}
                        navigate={navigate}
                        onAsk={(q) => askContext(q, threadId)}
                        onHome={newChat}
                      />
                    ) : context &&
                      role !== "系统管理员" &&
                      (context.objectId || context.entityKind) ? (
                      <section
                        className="conversation-origin"
                        aria-label="会话发起时的完整视图"
                      >
                        <Workbench
                          state={state}
                          role={role}
                          personal={personal}
                          selectedId={context.objectId || ""}
                          selectedKind={context.entityKind || entityKind}
                          onSelect={selectEntity}
                          onCommand={act}
                          onExecution={showExecution}
                          onContext={setEntityKind}
                          navigate={navigate}
                          onDemand={(id) => {
                            setSelectedDemand(id);
                            navigate("demands");
                          }}
                        />
                      </section>
                    ) : undefined
                  }
                />
              ) : route === "home" && role === "系统管理员" ? (
                <Admin {...props} />
              ) : route === "home" ? (
                <Workbench
                  state={state}
                  role={role}
                  personal={personal}
                  navigate={navigate}
                  selectedId={entityId}
                  selectedKind={entityKind}
                  onSelect={selectEntity}
                  onCommand={act}
                  onExecution={showExecution}
                  onContext={setEntityKind}
                  onDemand={(id) => {
                    setSelectedDemand(id);
                    navigate("demands");
                  }}
                />
              ) : (
                <>
                  {route !== "projects" && (
                    <div className="business-context">
                      <span>
                        工作台 / {currentTool?.title} · 共享事实 v
                        {state.version}
                      </span>
                      {currentTool && (
                        <FollowButton
                          id={context?.objectId || "tool:" + route}
                          title={context?.title || currentTool.title}
                          personal={personal}
                        />
                      )}
                    </div>
                  )}
                  {Page && (
                    <Page key={route + "-" + selectedDemand} {...props} />
                  )}
                </>
              )}
            </main>
            {route !== "chat" && context && (
              <ContextComposer
                state={state}
                key={context.key}
                context={context}
                role={role}
                onAsk={askContext}
                onFiles={attachFiles}
                onMaterials={() => showMaterials("input")}
              />
            )}
          </div>
          {route === "chat" &&
            context &&
            !context.report &&
            !context.landing &&
            role !== "系统管理员" &&
            !materials &&
            !executionIssue &&
            ((!narrow && boards) || (narrow && boardDrawer)) && (
              <ContextDetails
                key={context.key}
                context={context}
                state={state}
                role={role}
                drawer={narrow}
                onClose={() => {
                  setBoards(false);
                  setBoardDrawer(false);
                }}
                onReturn={returnContext}
              />
            )}
          {(route === "chat" || route === "home") &&
            eosRun &&
            (context?.objectId === eosRun.issueId ||
              entityId === eosRun.issueId) &&
            !materials && (
              <EosExecutionPanel
                run={eosRun}
                entities={entities}
                canAdvance={role === "研发"}
                canReview={["管理层", "项目经理", "PMO"].includes(role)}
                onReview={(action, reason) =>
                  act({
                    type: "eos",
                    action,
                    reason,
                    issueId: eosRun.issueId,
                    expectedRunId: eosRun.id,
                  })
                }
                testTask={state.eosTestTasks?.find(
                  (task) => task.runId === eosRun.id,
                )}
                onTransferTest={() => void transferToTest()}
                transferring={transferringTest}
                onPreviewTest={() =>
                  setTestPreview(
                    state.eosTestTasks?.find((task) => task.runId === eosRun.id)
                      ?.id || null,
                  )
                }
                onNext={() => void eosInteract("next", eosRun.issueId)}
                onView={(index) =>
                  void eosInteract("view", eosRun.issueId, index)
                }
                onRestart={() => void eosInteract("restart", eosRun.issueId)}
                drawer={narrow}
                onClose={() => setExecutionIssue(null)}
                onStop={() =>
                  void act({
                    type: "eos",
                    action: "stop",
                    issueId: eosRun.issueId,
                  })
                }
                onExport={exportExecution}
              />
            )}
        </div>
      </div>
      {testReceipt && role === "研发" && (
        <Modal title="测试待办 · 转交预览" onClose={() => setTestPreview(null)}>
          <p>
            <strong>测试工程师 · 待测试</strong>
          </p>
          <p>本轮已转交独立测试；这是刚刚发出的待办预览，不代表测试完成。</p>
          <p>
            <EntityText
              text={`关联 Issue：${testReceipt.issueId}；候选实现：${testReceipt.implId}`}
              entities={entities}
              onSelect={(id) => {
                setTestPreview(null);
                selectEntity(id);
              }}
            />
          </p>
          <h3>冻结验收</h3>
          <p>{narrativeText(testReceipt.acceptance, entities)}</p>
          <h3>测试工作</h3>
          <p>
            核对实现差异、两轮 Review
            与失败记录，独立验证重复并发、失败重试和权限隔离，记录实际环境、版本与证据。
          </p>
          <small>
            执行轮次：{testReceipt.runId} · 本地演示待办，不发送外部通知。
          </small>
        </Modal>
      )}
      {materials && (
        <MaterialPanel
          personal={personal}
          threadId={route === "chat" ? threadId : null}
          version={state.version}
          mobile={mobile}
          tab={materialTab}
          setTab={setMaterialTab}
          onClose={() => setMaterials(false)}
        />
      )}
      {action && (
        <ActionDialog
          key={action.kind + "-" + action.id}
          kind={action.kind}
          id={action.id}
          role={role}
          state={state}
          onClose={() => setAction(null)}
          onSuccess={setNotice}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Sparkles size={17} />
          {notice}
        </div>
      )}
      {utility === "settings" && (
        <Modal title="设置" onClose={() => setUtility(null)}>
          <div className="stack">
            <div className="settings-identity">
              <span className="avatar">{PROFILES[role].initials}</span>
              <div>
                <strong>{role}</strong>
                <p>{PROFILES[role].scope}</p>
              </div>
            </div>
            <p className="muted">
              业务角色共享演示事实；管理员仅演示连接配置。对话、分组、关注与材料按演示角色保存在当前浏览器。不是生产账号权限体系。
            </p>
            <button onClick={logout}>切换演示身份</button>
            {role !== "系统管理员" && (
              <button onClick={() => setUtility("reset")}>重置业务演示</button>
            )}
            <small>
              本版界面以实际应用为准；AI、Agents、业务指标均为演示。
            </small>
          </div>
        </Modal>
      )}
      {utility === "feedback" && (
        <Modal title="反馈意见" onClose={() => setUtility(null)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!feedback.trim()) {
                setFeedbackError("请填写反馈内容。");
                return;
              }
              personal.update((p) => ({
                ...p,
                feedback: [
                  {
                    id: crypto.randomUUID(),
                    text: feedback.trim(),
                    created: new Date().toISOString(),
                  },
                  ...p.feedback,
                ],
              }));
              setFeedback("");
              setFeedbackError("");
              setNotice("反馈已保存在本机，尚未发送到服务端。");
            }}
          >
            <p className="muted">
              记录你对当前 Demo 的建议。本版仅本地留存，可在设置中导出。
            </p>
            <label>
              反馈内容
              <textarea
                maxLength={3000}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </label>
            {feedbackError && (
              <p className="error" role="alert">
                {feedbackError}
              </p>
            )}
            <button className="primary">保存反馈到本地</button>
            {personal.data.feedback.map((f) => (
              <div className="feedback-entry" key={f.id}>
                <small>{new Date(f.created).toLocaleString("zh-CN")}</small>
                <p>{f.text}</p>
              </div>
            ))}
          </form>
        </Modal>
      )}
      {utility === "reset" && (
        <Modal title="重置本地业务演示？" onClose={() => setUtility(null)}>
          <p>
            恢复业务决定、需求、执行与报告的初始场景，不清除个人对话、分组、材料和关注。历史回答仍保留原快照。
          </p>
          <div className="dialog-actions">
            <button onClick={exportData}>先导出快照</button>
            <button
              className="danger-button"
              onClick={() =>
                void resetDemo()
                  .then(() => {
                    setUtility(null);
                    setNotice("业务场景已重置；个人空间保留。");
                  })
                  .catch((e) => setError(e.message))
              }
            >
              清除业务记录并恢复
            </button>
          </div>
        </Modal>
      )}
      {utility === "notifications" && (
        <Notifications
          state={state}
          navigate={navigate}
          onClose={() => setUtility(null)}
        />
      )}
      {utility === "search" && (
        <ObjectSearch
          state={state}
          role={role}
          onSelect={selectEntity}
          onClose={() => setUtility(null)}
        />
      )}
    </div>
  );
}
