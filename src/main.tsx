import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import "./styles.css";
import "./conversation.css";
import "./r2.css";
import "./preview.css";
import "./operations.css";
import "./ontology.css";
import "./eos-materials.css";
import "./conversation-polish.css";
import "./filter-polish.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="empty">
        <h1>页面暂时无法展示</h1>
        <p>
          演示记录仍保存在本地。请刷新重试；若持续出现，请检查浏览器控制台。
        </p>
        <button onClick={() => location.reload()}>刷新页面</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
