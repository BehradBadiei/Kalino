"use client";

/* eslint-disable @next/next/no-img-element -- The optional official logo is a local asset, not a remote image. */
import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Home, Utensils, ChartNoAxesCombined, Settings2, X } from "lucide-react";
import { faNumber, persianDate, shiftDate, todayKey } from "@/lib/models";

export type Section = "home" | "foods" | "progress" | "settings";

// Put the supplied official logo at public/brand/kalino-logo.png when available.
// Until then, show the brand name as text rather than inventing an alternative symbol.
export function Brand({ large = false }: { large?: boolean }) {
  const [logoAvailable, setLogoAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/brand/kalino-logo.png", { method: "HEAD" })
      .then((response) => { if (alive && response.ok) setLogoAvailable(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <span className={`brand ${large ? "brand-large" : ""}`}>
      {logoAvailable
        ? <img src="/brand/kalino-logo.png" alt="کالینو" onError={() => setLogoAvailable(false)} className="brand-image" />
        : <span className="brand-word">کالینو</span>}
    </span>
  );
}

const NAV_ITEMS = [
  { id: "home", label: "خانه", icon: Home },
  { id: "foods", label: "غذاها", icon: Utensils },
  { id: "progress", label: "پیشرفت", icon: ChartNoAxesCombined },
  { id: "settings", label: "تنظیمات", icon: Settings2 },
] as const;
export function BottomNav({ active, onNavigate }: { active: Section; onNavigate: (section: Section) => void }) {
  return (
    <nav className="bottom-nav" aria-label="بخش‌های اصلی">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`nav-item ${active === id ? "active" : ""}`}
            aria-current={active === id ? "page" : undefined} onClick={() => onNavigate(id)}>
            <Icon size={23} strokeWidth={active === id ? 2.2 : 1.7} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export function DateNavigator({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const previous = shiftDate(date, -1);
  const next = shiftDate(date, 1);
  const short = (key: string) => persianDate(key, { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="date-navigator" aria-label="انتخاب روز">
      <button type="button" className="date-arrow" onClick={() => onChange(previous)} aria-label="روز قبل"><ChevronRight size={20} /></button>
      <button type="button" className="date-adjacent" onClick={() => onChange(previous)} aria-label={`روز قبل، ${short(previous)}`}>
        <span>{persianDate(previous, { weekday: "long" })}</span>
        <small>{persianDate(previous, { day: "numeric", month: "long" })}</small>
      </button>
      <button type="button" className="date-current" onClick={() => onChange(todayKey())}
        title="رفتن به امروز" aria-label={`${short(date)}؛ رفتن به امروز`}>
        <span>{persianDate(date, { weekday: "long" })}{date === todayKey() && <i className="today-dot" />}</span>
        <small>{persianDate(date, { day: "numeric", month: "long" })}</small>
      </button>
      <button type="button" className="date-adjacent" onClick={() => onChange(next)} aria-label={`روز بعد، ${short(next)}`}>
        <span>{persianDate(next, { weekday: "long" })}</span>
        <small>{persianDate(next, { day: "numeric", month: "long" })}</small>
      </button>
      <button type="button" className="date-arrow" onClick={() => onChange(next)} aria-label="روز بعد"><ChevronLeft size={20} /></button>
    </div>
  );
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title-row"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="page-title">{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  const id = useId();
  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label><div className="field-control" data-field-id={id}>{children}</div>{hint && <p className="field-hint">{hint}</p>}{error && <p className="field-error" role="alert">{error}</p>}</div>;
}
export function LabeledInput({ label, value, onChange, placeholder, inputMode, suffix, error, required, maxLength = 120, autoFocus, disabled }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string;
  inputMode?: "decimal" | "numeric" | "text"; suffix?: string; error?: string; required?: boolean;
  maxLength?: number; autoFocus?: boolean; disabled?: boolean;
}) {
  const id = useId();
  return <div className="field"><label className="field-label" htmlFor={id}>{label}{required && <span className="required-mark"> *</span>}</label>
    <div className="input-wrap"><input id={id} className={`input ${error ? "input-error" : ""}`} type="text" dir={inputMode ? "ltr" : "rtl"}
      inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}
      maxLength={maxLength} autoFocus={autoFocus} disabled={disabled} aria-invalid={!!error} />{suffix && <span className="input-suffix">{suffix}</span>}</div>
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}

export interface Confirmation {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  requireText?: string;
  onConfirm: () => Promise<void> | void;
}
export function ConfirmDialog({ confirmation, onClose }: { confirmation: Confirmation; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !working) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, working]);
  const confirm = async () => {
    if (working) return;
    setWorking(true); setError("");
    try { await confirmation.onConfirm(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "انجام این کار ممکن نشد. دوباره تلاش کن."); setWorking(false); }
  };
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) onClose(); }}>
    <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <button type="button" className="icon-button dialog-close" onClick={onClose} disabled={working} aria-label="بستن"><X size={19} /></button>
      <h2 id="confirm-title">{confirmation.title}</h2><p id="confirm-description">{confirmation.message}</p>
      {confirmation.requireText && <LabeledInput label={`برای تأیید، «${confirmation.requireText}» را بنویس`} value={typed} onChange={setTyped} />}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={working} autoFocus>انصراف</button>
        <button type="button" className={`button ${confirmation.destructive ? "button-danger" : "button-primary"}`}
          disabled={working || (!!confirmation.requireText && typed.trim() !== confirmation.requireText)} onClick={confirm}>
          {working ? "در حال انجام..." : confirmation.confirmLabel}
        </button></div>
    </div>
  </div>;
}

export function formatGrams(value: number | null) { return value === null ? "نامشخص" : `${faNumber(value, 1)} گرم`; }
