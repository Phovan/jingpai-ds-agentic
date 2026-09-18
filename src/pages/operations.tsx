import { useEffect, useLayoutEffect, useState } from "react";
import {
  getOperations,
  OPS_TABS,
  projectGap,
  type OpsAction,
  type OpsTab,
} from "../domain/operations";
import { ROLES, type Role } from "../domain/model";
import { execute } from "../domain/store";
import { Modal, Panel, Badge } from "../components/ui";
import type { WorkspaceProps } from "./workspace";
import { visibleEntities } from "../domain/ontology";
import { PROJECT_DOMAINS } from "../domain/project-domains";

type Field = { key: string; label: string; options?: string[]; type?: string };
const field = (key: string, label: string, type = "text"): Field => ({
  key,
  label,
  type,
});
const choice = (key: string, label: string, options: string[]): Field => ({
  key,
  label,
  options,
});
const evidence = field("evidence", "结果、依据与证据", "textarea");
const due = field("due", "责任期限 / 复评日期", "date");
const decision = (options: string[]) => choice("decision", "处理结论", options);
const businessRoles = ROLES.filter((r) => r !== "系统管理员");
const owner = choice("owner", "责任角色", businessRoles);
const labels: Record<OpsAction, string> = {
  "project-create": "大脑辅助建项",
  "project-edit": "修改草稿",
  "project-confirm": "确认立项依据",
  "project-decide": "管理层立项决定",
  "project-result": "验证业务结果",
  "project-handover": "移交运行与复评",
  "decision-demand": "形成决议与需求卡",
  "commit-create": "分派工作承诺",
  "commit-submit": "提交结果 / 说明阻塞",
  "commit-check": "验收工作交付",
  "risk-create": "登记风险信号",
  "risk-verify": "核实风险",
  "risk-escalate": "升级管理决定",
  "risk-treat": "提交处置 / 决策",
  "risk-close": "验证风险关闭",
  "system-check": "更新运行证据",
  "release-create": "编排版本",
  "release-ready": "核对就绪条件",
  "change-propose": "提出版本变更",
  "change-confirm": "确认变更影响",
  "impl-submit": "提交实现候选",
  "impl-review": "独立审核",
  "release-authorize": "确认发布门禁",
  "release-publish": "模拟预览发布",
  "release-rollback": "模拟回退",
  "release-result": "验证上线效果",
  "report-create": "生成周期报告",
  "report-respond": "确认本人事项",
  "report-check": "专业核对",
  "report-return": "退回补证据",
  "report-finalize": "管理确认与后续行动",
  "lesson-create": "提报经验候选",
  "lesson-verify": "核实成果",
  "lesson-adopt": "采用并生成行动",
  "lesson-result": "复评采用效果",
  "lesson-retire": "标记失效",
  "source-add": "添加授权资料",
  "source-confirm": "核实来源与归属",
  "source-revoke": "撤回共享",
  "demand-note": "补充澄清与边界",
};
export function OperationsPage(p: WorkspaceProps) {
  const { state: s, role } = p;
  const raw = getOperations(s);
  const visible = new Set(visibleEntities(s, role).map((e) => e.id));
  const o = {
    ...raw,
    projects: raw.projects.filter((e) => visible.has(e.id)),
    systems: raw.systems.filter((e) => visible.has(e.id)),
    risks: raw.risks.filter((e) => visible.has(e.id)),
    commitments: raw.commitments.filter((e) => visible.has(e.id)),
    releases: raw.releases.filter((e) => visible.has(e.id)),
    sources: raw.sources.filter((e) => visible.has(e.id)),
    strategies: raw.strategies
      .filter((e) => visible.has(e.id))
      .map((e) => ({
        ...e,
        projects: e.projects.filter((id) => visible.has(id)),
      })),
  };
  const defaultTab: OpsTab =
    role === "项目成员"
      ? "工作承诺"
      : role === "系统负责人"
        ? "系统健康"
        : role === "研发" || role === "测试" || role === "运维"
          ? "版本与审核"
          : role === "PMO"
            ? "风险闭环"
            : "战略与项目";
  const [tab, setTab] = useState<OpsTab>(p.opsTab || defaultTab),
    [selected, setSelected] = useState(p.opsId || ""),
    [query, setQuery] = useState(""),
    [attention, setAttention] = useState(false);
  const [action, setAction] = useState<OpsAction | null>(null),
    [values, setValues] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useLayoutEffect(() => {
    document.getElementById("main-content")?.scrollTo({ top: 0 });
  }, [tab, selected]);
  const project = o.projects.find((x) => x.id === selected),
    commit = o.commitments.find((x) => x.id === selected),
    risk = o.risks.find((x) => x.id === selected),
    sys = o.systems.find((x) => x.id === selected),
    release = o.releases.find((x) => x.id === selected),
    report = o.reports.find((x) => x.id === selected),
    lesson = o.lessons.find((x) => x.id === selected),
    source = o.sources.find((x) => x.id === selected);
  const visibleSources = o.sources.filter(
    (x) =>
      x.status !== "已撤回" && (x.owner === role || x.visibility === "项目"),
  );
  const projects = choice(
    "project",
    "关联项目",
    o.projects.map((x) => x.id),
  );
  const systems = choice(
    "system",
    "关联系统",
    o.systems.map((x) => x.id),
  );
  const forms: Record<OpsAction, Field[]> = {
    "project-create": [
      field("title", "项目名称"),
      choice("domain", "项目领域", [...PROJECT_DOMAINS]),
      field("goal", "业务目标"),
      field("target", "目标值", "number"),
      field("baseline", "基线值", "number"),
      field("unit", "单位"),
      choice("direction", "目标方向", ["≤", "≥"]),
      field("deadline", "目标期限", "date"),
      systems,
      field("supplier", "供应商 / 内部交付"),
      field("scope", "范围、里程碑、投入与验收", "textarea"),
    ],
    "project-edit": [
      field("scope", "修订范围与里程碑", "textarea"),
      field("deadline", "目标期限", "date"),
    ],
    "project-confirm": [evidence],
    "project-decide": [decision(["批准", "退回", "暂缓"]), evidence],
    "project-result": [
      field("actual", "同口径实测值", "number"),
      decision(["确认", "部分验收", "退回"]),
      due,
      evidence,
    ],
    "project-handover": [due, evidence],
    "decision-demand": [
      projects,
      field("title", "新增 / 改善需求"),
      due,
      field("conversation", "来源会话 / 决议说明"),
      evidence,
    ],
    "commit-create": [
      projects,
      field("title", "工作承诺"),
      owner,
      due,
      field("criteria", "验收标准", "textarea"),
      field("dependency", "上游输入与依赖"),
    ],
    "commit-submit": [decision(["提交验收", "受阻"]), evidence],
    "commit-check": [decision(["接受", "退回"]), evidence],
    "risk-create": [
      projects,
      field("title", "风险信号"),
      owner,
      due,
      field("impact", "受影响目标与跨项目影响", "textarea"),
      field("criteria", "关闭标准", "textarea"),
    ],
    "risk-verify": [decision(["核实", "误报"]), evidence],
    "risk-escalate": [evidence],
    "risk-treat": [evidence],
    "risk-close": [decision(["关闭", "继续处理"]), evidence],
    "system-check": [field("actual", "观察期可用率 %", "number"), evidence],
    "release-create": [
      field("title", "版本名称"),
      systems,
      field("demands", "需求编号（英文逗号分隔）"),
      due,
      field("scope", "版本范围与验收", "textarea"),
      field("impact", "复用/配置/自研方案与依赖、容量、供应商约束", "textarea"),
    ],
    "release-ready": [decision(["就绪", "缺项"]), evidence],
    "change-propose": [
      due,
      field("scope", "修订后的范围", "textarea"),
      evidence,
    ],
    "change-confirm": [decision(["批准", "退回"]), evidence],
    "impl-submit": [evidence],
    "impl-review": [
      decision(["通过", "退回"]),
      choice("reason", "失败原因（退回时）", [
        "实现缺陷",
        "规则问题",
        "环境问题",
      ]),
      evidence,
    ],
    "release-authorize": [evidence],
    "release-publish": [decision(["成功", "失败"]), evidence],
    "release-rollback": [evidence],
    "release-result": [decision(["通过", "退回"]), evidence],
    "report-create": [
      choice("scene", "报告场景", ["PMO", "EOS"]),
      choice("period", "报告周期", ["周报", "月报", "季报"]),
    ],
    "report-respond": [evidence],
    "report-check": [evidence],
    "report-return": [evidence],
    "report-finalize": [
      evidence,
      projects,
      field("title", "下一期跟踪行动"),
      owner,
      due,
    ],
    "lesson-create": [
      field("title", "做法与成果"),
      field("source", "来源项目 / 需求 / 版本"),
      field("conditions", "适用条件与失效边界", "textarea"),
      evidence,
    ],
    "lesson-verify": [decision(["确认", "补证", "不采纳"]), evidence],
    "lesson-adopt": [projects, due],
    "lesson-result": [projects, decision(["有效", "失效"]), evidence],
    "lesson-retire": [evidence],
    "source-add": [
      field("title", "资料标题"),
      choice("source", "来源", [
        "直接上传",
        "飞书授权导出",
        "企微授权导出",
        "Obsidian选定笔记",
      ]),
      choice(
        "object",
        "关联对象",
        [...o.projects, ...o.systems].map((x) => x.id),
      ),
      choice("visibility", "可见范围", ["个人", "项目"]),
      field("text", "资料正文（仅本地保存）", "textarea"),
    ],
    "source-confirm": [decision(["核实", "冲突"]), evidence],
    "source-revoke": [evidence],
    "demand-note": [evidence],
  };
  function open(a: OpsAction) {
    setAction(a);
    setError("");
    setValues({
      project: project?.id || "PRJ-001",
      system: project?.system || release?.system || "SYS-01",
      scope: project?.scope || release?.scope || "",
      deadline: project?.deadline || "2026-10-15",
      owner: "项目成员",
      domain: "服务",
      direction: "≤",
      unit: "小时",
      target: "2",
      baseline: "3.5",
      supplier: "内部交付（演示）",
      due: release?.date || "2026-10-15",
      scene: role === "系统负责人" ? "EOS" : "PMO",
      period: "周报",
      source: "直接上传",
      object: "PRJ-001",
      visibility: "项目",
      reason: "实现缺陷",
      demands: s.demands
        .filter(
          (d) =>
            d.baselineConfirmed &&
            d.committed &&
            !o.releases.some(
              (r) =>
                r.demands.includes(d.id) &&
                !["已回退", "已验证"].includes(r.status),
            ),
        )
        .map((d) => d.id)
        .join(","),
    });
  }
  function choose(t: OpsTab, id = "") {
    setTab(t);
    setSelected(id);
    setQuery("");
  }
  const staff = role !== "系统管理员";
  const is = (...rs: Role[]) => rs.includes(role);
  const actions: OpsAction[] = [];
  if (project) {
    if (
      is("PMO", "项目经理") &&
      ["草稿", "退回", "暂缓"].includes(project.status)
    )
      actions.push("project-edit");
    if (
      is("PMO", "系统负责人", "业务Owner") &&
      ["草稿", "待批准"].includes(project.status)
    )
      actions.push("project-confirm");
    if (role === "管理层" && ["草稿", "待批准"].includes(project.status))
      actions.push("project-decide");
    if (role === "管理层" && !["草稿", "退回", "暂缓"].includes(project.status))
      actions.push("decision-demand");
    if (
      is("项目经理", "PMO", "管理层", "系统负责人") &&
      !["草稿", "退回", "暂缓"].includes(project.status)
    )
      actions.push("commit-create");
    if (
      role === "业务Owner" &&
      ["进行中", "整改中", "部分验收"].includes(project.status)
    )
      actions.push("project-result");
    if (role === "系统负责人" && project.status === "待移交")
      actions.push("project-handover");
  }
  if (commit) {
    if (
      role === commit.owner &&
      ["待完成", "受阻", "退回"].includes(commit.status)
    )
      actions.push("commit-submit");
    if (is("项目经理", "PMO") && commit.status === "待验收")
      actions.push("commit-check");
  }
  if (risk) {
    if (is("PMO", "项目经理", "系统负责人") && risk.status === "待核实")
      actions.push("risk-verify");
    if (is("PMO", "项目经理", "系统负责人") && risk.status === "处理中")
      actions.push("risk-escalate");
    if (
      (role === risk.owner && risk.status === "处理中") ||
      (role === "管理层" && risk.status === "待管理决定")
    )
      actions.push("risk-treat");
    if (is("PMO", "项目经理") && risk.status === "待验证")
      actions.push("risk-close");
  }
  if (sys && is("系统负责人", "运维")) actions.push("system-check");
  if (release) {
    if (
      is("项目经理", "系统负责人", "产品经理") &&
      !release.pending &&
      !["已发布", "已验证", "已回退"].includes(release.status)
    )
      actions.push("change-propose");
    if (release.pending && is("管理层", "业务Owner", "系统负责人"))
      actions.push("change-confirm");
    if (!release.pending) {
      if (
        is("研发", "测试", "运维", "系统负责人") &&
        ["待就绪", "受阻"].includes(release.status)
      )
        actions.push("release-ready");
      if (role === "研发" && ["就绪", "返工"].includes(release.status))
        actions.push("impl-submit");
      if (role === "测试" && release.status === "待独立审核")
        actions.push("impl-review");
      if (is("系统负责人", "业务Owner") && release.status === "待发布授权")
        actions.push("release-authorize");
      if (role === "运维" && release.status === "待发布")
        actions.push("release-publish");
      if (role === "运维" && ["已发布", "发布失败"].includes(release.status))
        actions.push("release-rollback");
      if (role === "业务Owner" && release.status === "已发布")
        actions.push("release-result");
    }
  }
  if (report) {
    if (report.required.includes(role) && report.status === "待员工确认")
      actions.push("report-respond");
    if (
      is("项目经理", report.scene === "PMO" ? "PMO" : "系统负责人") &&
      report.status === "待专业核对"
    )
      actions.push("report-check");
    if (
      is("PMO", "项目经理", "系统负责人", "管理层") &&
      report.status !== "已确认"
    )
      actions.push("report-return");
    if (role === "管理层" && report.status === "待管理确认")
      actions.push("report-finalize");
  }
  if (lesson) {
    if (
      is("PMO", "系统负责人", "业务Owner") &&
      ["候选", "待补证据"].includes(lesson.status)
    )
      actions.push("lesson-verify");
    if (staff && lesson.status === "有效") actions.push("lesson-adopt");
    if (is("项目经理", "系统负责人") && lesson.uses.length)
      actions.push("lesson-result");
    if (is("PMO", "系统负责人") && lesson.status === "有效")
      actions.push("lesson-retire");
  }
  if (source) {
    if (
      is("PMO", "系统负责人") &&
      source.status === "待核实" &&
      (source.visibility === "项目" || source.owner === role)
    )
      actions.push("source-confirm");
    if (source.owner === role && source.status !== "已撤回")
      actions.push("source-revoke");
  }
  const create: OpsAction | undefined =
    tab === "战略与项目" && is("PMO", "项目经理")
      ? "project-create"
      : tab === "工作承诺" && is("PMO", "项目经理", "系统负责人", "管理层")
        ? "commit-create"
        : tab === "风险闭环" && staff
          ? "risk-create"
          : tab === "版本与审核" && is("项目经理", "系统负责人")
            ? "release-create"
            : tab === "周期报告" && is("PMO", "项目经理", "系统负责人")
              ? "report-create"
              : tab === "经验复用" && staff
                ? "lesson-create"
                : tab === "资料核实" && staff
                  ? "source-add"
                  : undefined;
  const rows =
    tab === "战略与项目"
      ? o.projects.map((p) => ({
          id: p.id,
          title: p.title,
          goal: `${p.goal} ${p.direction}${p.target}${p.unit}`,
          status: p.status,
          next: `${p.domain} · ${projectGap(p, s)}`,
        }))
      : tab === "工作承诺"
        ? o.commitments
            .filter((a) => role !== "项目成员" || a.owner === role)
            .map((a) => ({
              id: a.id,
              title: a.title,
              goal: a.criteria,
              status: a.status,
              next: `${a.owner} · ${a.due}`,
            }))
        : tab === "风险闭环"
          ? o.risks.map((r) => ({
              id: r.id,
              title: r.title,
              goal: r.impact,
              status: r.status,
              next: `${r.owner} · ${r.due}`,
            }))
          : tab === "系统健康"
            ? o.systems.map((x) => ({
                id: x.id,
                title: x.title,
                goal: `可用率 ≥${x.goal}%`,
                status: x.status,
                next: `实际 ${x.actual === null ? "待核实" : x.actual + "%"} · ${x.owner}`,
              }))
            : tab === "版本与审核"
              ? o.releases.map((r) => ({
                  id: r.id,
                  title: r.title,
                  goal: r.scope,
                  status: r.pending ? "变更待确认 · " + r.status : r.status,
                  next: `${r.date} · ${r.demands.join("、")}`,
                }))
              : tab === "周期报告"
                ? o.reports.map((r) => ({
                    id: r.id,
                    title: `${r.scene} ${r.period}`,
                    goal: `确认 ${Object.keys(r.responses).length}/${r.required.length} · 事实v${r.sourceVersion}`,
                    status: r.status,
                    next:
                      r.required.filter((x) => !r.responses[x]).join("、") ||
                      "专业核对 / 管理确认",
                  }))
                : tab === "经验复用"
                  ? o.lessons.map((l) => ({
                      id: l.id,
                      title: l.title,
                      goal: l.conditions,
                      status: l.status,
                      next: `v${l.version} · 复用 ${l.uses.length} 项目`,
                    }))
                  : visibleSources.map((d) => ({
                      id: d.id,
                      title: d.title,
                      goal: `${d.object} · ${d.source} · v${d.version}`,
                      status: d.status,
                      next: `${d.owner} · ${d.visibility}`,
                    }));
  const displayed = rows.filter(
    (r) =>
      (!attention ||
        ![
          "已接受",
          "已关闭",
          "已验证",
          "已确认",
          "有效",
          "正常",
          "已移交",
        ].includes(r.status)) &&
      `${r.title} ${r.id} ${r.status} ${r.next}`.includes(query),
  );
  const current = rows.find((r) => r.id === selected);
  useEffect(() => {
    p.onOpsContext?.(tab, current?.id, current?.title);
  }, [tab, current?.id, current?.title]);
  const relatedDemand = (id: string) => {
    p.onDemandChange?.(id);
    p.navigate("demands");
  };
  const log = s.events.filter((e) => e.object === selected);
  return (
    <div className="ops-page">
      <div className="preview-page-heading">
        <h1>{tab}</h1>
        <p>
          {role} · 目标—判断—行动—验证　 /　所有数值、战略和执行均为本地演示
        </p>
      </div>
      <nav className="ops-tabs" aria-label="协作能力">
        {OPS_TABS.map((t) => (
          <button key={t} aria-pressed={t === tab} onClick={() => choose(t)}>
            {t}
          </button>
        ))}
      </nav>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {tab === "战略与项目" && !selected && o.strategies[0] && (
        <section className="ops-insight">
          <strong>{o.strategies[0].title}</strong>
          <p>
            {o.strategies[0].goal}。关联项目 {o.strategies[0].projects.length}{" "}
            个；真实客户战略仍待确认，不使用 001 占位稿。
          </p>
          <p>
            大脑建议：先看目标差距与共享系统依赖，再决定继续、调整或暂缓。讨论不改变基线；确认后才形成需求卡。
          </p>
          <div className="button-row">
            {o.projects
              .filter((x) => o.strategies[0].projects.includes(x.id))
              .map((x) => (
                <button key={x.id} onClick={() => setSelected(x.id)}>
                  {x.title} · {projectGap(x, s)}
                </button>
              ))}
          </div>
        </section>
      )}
      {!selected && (
        <>
          <div className="ops-toolbar">
            <input
              aria-label="搜索协作对象"
              placeholder="搜索对象、状态或责任人"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={attention}
                onChange={(e) => setAttention(e.target.checked)}
              />
              只看待办与偏差
            </label>
            {create && (
              <button className="primary" onClick={() => open(create)}>
                {labels[create]}
              </button>
            )}
          </div>
          <div className="ops-table-wrap">
            <table className="precise-table">
              <thead>
                <tr>
                  <th>对象</th>
                  <th>目标 / 贡献</th>
                  <th>状态</th>
                  <th>差距 / 下一责任</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.title}</strong>
                      <small>{r.id}</small>
                    </td>
                    <td>{r.goal}</td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td>{r.next}</td>
                    <td>
                      <button onClick={() => setSelected(r.id)}>查看 →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!displayed.length && (
              <div className="empty">
                <h3>当前没有匹配对象</h3>
                <p>可以调整筛选；有创建权限的角色可从右上入口发起。</p>
              </div>
            )}
          </div>
        </>
      )}
      {selected && current && (
        <div className="stack">
          <button className="text-button" onClick={() => setSelected("")}>
            ← 返回{tab}
          </button>
          <header className="ops-detail-heading">
            <div>
              <small>{current.id}</small>
              <h2>{current.title}</h2>
              <p>{current.goal}</p>
            </div>
            <Badge>{current.status}</Badge>
          </header>
          <section className="ops-insight">
            <strong>大脑判断 / 下一步</strong>
            <p>
              {current.next}。
              {release
                ? release.pending
                  ? "变更未获齐批准前，原计划保留、实施与发布暂停。"
                  : "实现与独立审核分开留痕，发布不等于业务达标。"
                : report
                  ? "未回复仍为待确认；报告快照不随后续事实静默改写。"
                  : risk
                    ? `关闭标准：${risk.criteria}。先核实再处置，不以回复代替解决。`
                    : project
                      ? "交付、采用和业务收益分别核实；查看与追问不改动原基线。"
                      : "每次动作保留责任人、依据和结果；缺证据不可自动通过。"}
            </p>
          </section>
          <div className="ops-action-bar">
            {actions.map((a) => (
              <button key={a} onClick={() => open(a)}>
                {labels[a]}
              </button>
            ))}
            {!actions.length && (
              <p className="muted">
                当前角色暂无待执行动作。可查阅证据，或在「设置」切换相应责任角色继续。
              </p>
            )}
          </div>
          {project && (
            <>
              <Panel title="目标与关联">
                <dl className="ops-facts">
                  <dt>目标与基线</dt>
                  <dd>
                    {project.goal} {project.direction}
                    {project.target}
                    {project.unit} · 初始 {project.baseline}
                    {project.unit}
                  </dd>
                  <dt>实际 / GAP</dt>
                  <dd>
                    {project.id === "PRJ-001"
                      ? s.actual
                      : (project.actual ?? "待采集")}{" "}
                    / {projectGap(project, s)}
                  </dd>
                  <dt>范围与计划</dt>
                  <dd>
                    {project.scope} · 承诺 {project.deadline}
                  </dd>
                  <dt>系统 / 供应商</dt>
                  <dd>
                    <button onClick={() => choose("系统健康", project.system)}>
                      {project.system}
                    </button>{" "}
                    · {project.supplier}
                  </dd>
                  <dt>立项专业确认</dt>
                  <dd>
                    {project.confirmations.join("、") ||
                      "待确认：Owner、系统负责人、PMO"}
                  </dd>
                  <dt>复评日期</dt>
                  <dd>{project.reassess || "尚未移交"}</dd>
                </dl>
              </Panel>
              <Panel title="同一项目的需求、承诺与风险">
                <div className="ops-linked">
                  {s.demands
                    .filter((d) => d.projectId === project.id)
                    .map((d) => (
                      <button key={d.id} onClick={() => relatedDemand(d.id)}>
                        {d.id} {d.title} · {d.stage} →
                      </button>
                    ))}
                  {o.commitments
                    .filter((a) => a.project === project.id)
                    .map((a) => (
                      <button
                        key={a.id}
                        onClick={() => choose("工作承诺", a.id)}
                      >
                        {a.title} · {a.status} →
                      </button>
                    ))}
                  {o.risks
                    .filter((a) => a.project === project.id)
                    .map((a) => (
                      <button
                        key={a.id}
                        onClick={() => choose("风险闭环", a.id)}
                      >
                        {a.title} · {a.status} →
                      </button>
                    ))}
                </div>
              </Panel>
              <Panel title="批准基线与验收证据">
                {[...project.history, ...project.evidence].map((x, i) => (
                  <p key={i}>{x}</p>
                ))}
                {!project.history.length && !project.evidence.length && (
                  <p>演示初始基线；后续变更与确认在此留痕。</p>
                )}
              </Panel>
            </>
          )}
          {commit && (
            <Panel title="输入、验收与回执">
              <p>
                关联项目 {commit.project} · 责任人 {commit.owner} · 期限{" "}
                {commit.due}
              </p>
              <p>输入 / 依赖：{commit.dependency}</p>
              <p>验收标准：{commit.criteria}</p>
              {commit.evidence.map((x, i) => (
                <p key={i}>{x}</p>
              ))}
            </Panel>
          )}
          {risk && (
            <Panel title="影响范围与关闭依据">
              <p>{risk.impact}</p>
              <p>
                关联 {risk.project} / {risk.system}；同系统项目：
                {o.projects
                  .filter((p) => p.system === risk.system)
                  .map((p) => p.title)
                  .join("、")}
              </p>
              <p>
                责任 {risk.owner} / {risk.due}；关闭标准：{risk.criteria}
              </p>
              {risk.evidence.map((x, i) => (
                <p key={i}>{x}</p>
              ))}
            </Panel>
          )}
          {sys && (
            <>
              <Panel title="运行目标与专业证据">
                <p>
                  可用率目标 ≥{sys.goal}% / 当前 {sys.actual ?? "待采集"}%
                </p>
                <p>{sys.evidence}</p>
                <p>
                  供应商 {sys.supplier} · 责任 {sys.owner}
                </p>
              </Panel>
              <Panel title="支撑的项目与版本">
                <div className="ops-linked">
                  {o.projects
                    .filter((p) => p.system === sys.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => choose("战略与项目", p.id)}
                      >
                        {p.title} · {projectGap(p, s)} →
                      </button>
                    ))}
                  {o.releases
                    .filter((r) => r.system === sys.id)
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => choose("版本与审核", r.id)}
                      >
                        {r.title} · {r.status} →
                      </button>
                    ))}
                </div>
              </Panel>
            </>
          )}
          {release && (
            <>
              <Panel title="版本范围、容量与变更">
                <p>
                  原承诺 {release.originalDate} / 最新预测 {release.date}；系统{" "}
                  {release.system}
                </p>
                <p>{release.impact}</p>
                <p>
                  就绪确认：
                  {release.readiness.join("、") ||
                    "待研发、测试、运维、系统负责人补齐"}
                </p>
                <p>
                  发布门禁：
                  {release.confirmations.join("、") ||
                    "待系统负责人、业务Owner确认"}
                </p>
                {release.pending && (
                  <div className="notice">
                    <strong>待批准变更</strong>
                    <p>
                      {release.pending.scope} / {release.pending.date}
                    </p>
                    <p>
                      {release.pending.reason}；已确认{" "}
                      {release.pending.confirmations.join("、") || "无"}
                    </p>
                  </div>
                )}
                <div className="ops-linked">
                  {release.demands.map((d) => (
                    <button key={d} onClick={() => relatedDemand(d)}>
                      {d} · {s.demands.find((x) => x.id === d)?.stage} →
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel title="Issue → Impl → 独立审核">
                <p className="muted">
                  每个关联需求为一个 Issue
                  工作单元；本版按整个版本覆盖基线验收，不以完成百分比关闭需求。
                </p>
                {release.demands.map((d, i) => (
                  <p key={d}>
                    {release.id}-Issue-{i + 1} · {d} ·{" "}
                    {s.demands.find((x) => x.id === d)?.baseline}
                  </p>
                ))}
                {release.impls.map((i) => (
                  <article className="ops-review" key={i.id}>
                    <h3>
                      {i.id} · {i.result}
                    </h3>
                    <p>研发实现证据：{i.evidence}</p>
                    <p>
                      独立测试证据：
                      {i.review || "待测试角色核对原标准、正反样例和实际身份"}
                    </p>
                    <p>{i.reason}</p>
                  </article>
                ))}
                {!release.impls.length && (
                  <p>
                    完成就绪检查后，由研发提交实现候选。真实代码与工具调用未接入。
                  </p>
                )}
              </Panel>
              <Panel title="变更、发布、回退与观察记录">
                {release.history.map((x, i) => (
                  <p key={i}>{x}</p>
                ))}
              </Panel>
            </>
          )}
          {report && (
            <>
              <Panel title="来源快照">
                <pre className="ops-pre">{report.snapshot}</pre>
              </Panel>
              <Panel title="员工回执与专业核对">
                <table className="precise-table">
                  <thead>
                    <tr>
                      <th>责任人</th>
                      <th>确认 / 未完成原因与证据</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.required.map((r) => (
                      <tr key={r}>
                        <td>{r}</td>
                        <td>{report.responses[r] || "待确认，不按同意处理"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>已专业核对：{report.checks.join("、") || "无"}</p>
                {report.history.map((x, i) => (
                  <p key={i}>{x}</p>
                ))}
              </Panel>
            </>
          )}
          {lesson && (
            <>
              <Panel title="适用条件与来源">
                <p>{lesson.conditions}</p>
                <p>
                  来源 {lesson.source} · 版本 {lesson.version}
                </p>
                <pre className="ops-pre">{lesson.evidence}</pre>
                <p>核实人：{lesson.approvals.join("、") || "未核实"}</p>
              </Panel>
              <Panel title="采用与效果复评">
                {lesson.uses.map((u) => (
                  <p key={u.project}>
                    {u.project} · {u.owner}：{u.result}
                  </p>
                ))}
                {!lesson.uses.length && (
                  <p>尚未采用。核实为有效后，可关联到新项目形成实际行动。</p>
                )}
              </Panel>
            </>
          )}
          {source && visibleSources.some((x) => x.id === source.id) && (
            <Panel title="来源与资料证据">
              <p>
                {source.source} · 内容Owner {source.owner} · v{source.version} ·
                可见 {source.visibility}
              </p>
              <pre className="ops-pre">{source.text}</pre>
              {source.history.map((x, i) => (
                <p key={i}>{x}</p>
              ))}
              <p className="muted">
                资料中的指令不成为系统执行授权；核实仅确认来源，不自动覆盖业务基线。
              </p>
            </Panel>
          )}
          <Panel title="动作时间线">
            {log.length ? (
              log.map((e) => (
                <div className="ops-log" key={e.id}>
                  <small>
                    {e.at} · {e.actor}
                  </small>
                  <strong>{e.title}</strong>
                  <p>{e.detail}</p>
                </div>
              ))
            ) : (
              <p className="muted">
                暂无操作记录。后续确认与回执将按本体保留。
              </p>
            )}
          </Panel>
        </div>
      )}
      {selected && !current && (
        <p className="notice">
          当前对象不可见或已撤回。
          <button onClick={() => setSelected("")}>返回清单</button>
        </p>
      )}
      {action && (
        <Modal
          title={labels[action]}
          onClose={() => !busy && setAction(null)}
          wide
        >
          <form
            className="form-stack ops-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const defaults = Object.fromEntries(
                  forms[action]
                    .filter((f) => f.options)
                    .map((f) => [f.key, f.options![0]]),
                );
                await execute(
                  role,
                  {
                    type: "ops",
                    action,
                    id: selected || undefined,
                    values: Object.fromEntries(
                      forms[action].map((f) => [
                        f.key,
                        values[f.key] ?? defaults[f.key] ?? "",
                      ]),
                    ),
                  },
                  s.version,
                );
                setMessage(`${labels[action]}已保存，关联对象与回执已更新。`);
                setAction(null);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="notice">
              {action === "impl-review"
                ? "独立核对原验收标准、实际用户身份、正反样例。不可修改验收条件来换取通过。"
                : "大脑草拟 / 人工确认：保存后才改变业务对象。所有执行均为本地模拟。"}
            </p>
            {action === "project-create" && (
              <button
                type="button"
                onClick={() =>
                  setValues({
                    ...values,
                    title: "服务协同试点（演示）",
                    goal: "服务请求响应时长",
                    scope:
                      "先覆盖一个服务团队；第一周确认口径，第二周试点；投入2人周；以连续7天响应时长验证。需Owner、系统负责人和PMO确认。",
                  })
                }
              >
                让大脑补一份可编辑草稿
              </button>
            )}
            {action === "source-add" && (
              <label>
                从本地选定文本（可选，不上传外部服务）
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 200000) {
                      setError("演示仅支持200KB以内文本");
                      return;
                    }
                    setValues({
                      ...values,
                      title: f.name,
                      text: await f.text(),
                    });
                  }}
                />
              </label>
            )}
            {forms[action].map((f) => (
              <label key={f.key}>
                {f.label}
                {f.options ? (
                  <select
                    value={values[f.key] || f.options[0]}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                    onFocus={() => {
                      if (!values[f.key])
                        setValues((v) => ({ ...v, [f.key]: f.options![0] }));
                    }}
                  >
                    {f.options.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    required
                    rows={4}
                    value={values[f.key] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    type={f.type || "text"}
                    step={f.type === "number" ? "any" : undefined}
                    required
                    value={values[f.key] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="button-row">
              <button
                type="button"
                onClick={() => setAction(null)}
                disabled={busy}
              >
                取消
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "保存中…" : "确认并保存"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
