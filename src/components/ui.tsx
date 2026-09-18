import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock3,
} from "lucide-react";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "brand";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function BrainMark() {
  return (
    <span className="brain-mark">
      <Sparkles size={19} />
    </span>
  );
}
export function Panel({
  title,
  caption,
  action,
  children,
  className = "",
}: {
  title?: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-heading">
          <div>
            <h2>{title}</h2>
            {caption && <p className="muted">{caption}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <CheckCircle2 size={32} />
      <h3>{title}</h3>
      <p>{body}</p>
      {children}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "wide" : ""}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="关闭面板" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Stat({
  label,
  value,
  note,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  note: string;
  tone?: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
export function ActionLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function StatusIcon({ state }: { state: "good" | "bad" | "warn" }) {
  return state === "good" ? (
    <CheckCircle2 size={16} />
  ) : state === "bad" ? (
    <AlertTriangle size={16} />
  ) : (
    <Clock3 size={16} />
  );
}
