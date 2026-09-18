import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { LOGIN_ROLES, PROFILES, type Role } from "../domain/model";
import { Badge } from "./ui";
export function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [selected, setSelected] = useState<Role>("管理层");
  return (
    <div className="login">
      <section className="login-story">
        <div className="login-brand">
          <img src="/logo.png" alt="劲牌" width={48} height={48} />
          <span>劲牌企业大脑</span>
        </div>
        <div className="login-message">
          <p className="eyebrow">JINGPAI · AGENTIC WORKSPACE</p>
          <h1>
            目标有人把握。
            <br />
            行动，交给大脑协同。
          </h1>
          <p>
            把项目、需求、工程与业务结果连在一起。
            <br />
            从一段对话开始，持续推动目标达成。
          </p>
          <div className="login-path">
            <span>发现偏差</span>
            <ArrowRight />
            <span>形成决定</span>
            <ArrowRight />
            <span>执行验证</span>
          </div>
        </div>
        <footer>
          <span>企业大脑 + PMO + EngineeringOS</span>
          <small>V0.1.2 · 上下文协作工作空间</small>
        </footer>
      </section>
      <section className="login-form">
        <Badge tone="brand">演示工作空间</Badge>
        <h2>从你的角色开始</h2>
        <p className="muted">
          {LOGIN_ROLES.length} 个演示角色，各自关注，按职责行动。
        </p>
        <div className="role-options">
          {LOGIN_ROLES.map((r) => (
            <button
              key={r}
              className={selected === r ? "selected" : ""}
              onClick={() => setSelected(r)}
              aria-pressed={selected === r}
            >
              <span className="avatar">{PROFILES[r].initials}</span>
              <div>
                <strong>{r}</strong>
                <small>{PROFILES[r].description}</small>
              </div>
              <span className="radio-indicator" />
            </button>
          ))}
        </div>
        <button className="primary enter" onClick={() => onLogin(selected)}>
          以{selected}身份进入 <ArrowRight size={18} />
        </button>
        <p className="login-disclaimer">
          无需密码 · 仅演示身份，不是生产认证
          <br />
          数据、问答及 Agents 执行均为本地模拟。
        </p>
      </section>
    </div>
  );
}
