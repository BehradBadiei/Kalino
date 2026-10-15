"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  ACTIVITIES, DIETS, GOALS, TRACKING_METRICS, activityLabels, dietLabels, emptyDraft,
  goalLabels, metricLabels, validNumber, type OnboardingDraft, type TrackingMetric,
} from "@/lib/models";
import { saveDraft } from "@/lib/storage";
import { Brand, LabeledInput } from "./ui";

const questions = [
  { title: "اسمت چیه؟", detail: "دوست داری چطور صدات کنیم؟" },
  { title: "چند سالته؟", detail: "سن رو به سال وارد کن." },
  { title: "قدت چقدره؟", detail: "قدت رو به سانتی‌متر وارد کن." },
  { title: "وزن فعلیت چقدره؟", detail: "وزنت رو به کیلوگرم وارد کن." },
  { title: "هدفت چیه؟", detail: "هدفی رو انتخاب کن که به تو نزدیک‌تره." },
  { title: "میزان فعالیتت چقدره؟", detail: "بیشتر روزهای هفته رو در نظر بگیر." },
  { title: "وزن هدفت چقدره؟", detail: "این سؤال اختیاریه؛ بعداً هم می‌تونی اضافه‌اش کنی." },
  { title: "معمولاً چطور غذا می‌خوری؟", detail: "ترجیحت رو انتخاب کن. هر وقت خواستی قابل تغییره." },
  { title: "دوست داری چه چیزهایی رو دنبال کنی؟", detail: "یک یا چند مورد رو انتخاب کن." },
];

export function Onboarding({ initialDraft, onFinish }: {
  initialDraft: OnboardingDraft | null;
  onFinish: (draft: OnboardingDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft ?? emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const order = draft.goal === "track" ? [0, 1, 2, 3, 4, 5, 7, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const currentIndex = Math.max(0, order.indexOf(draft.step));
  const step = order[currentIndex];
  useEffect(() => {
    const timer = window.setTimeout(() => { saveDraft(draft).catch(() => setError("ذخیرهٔ پیشرفت ممکن نشد. فضای مرورگر رو بررسی کن.")); }, 250);
    return () => window.clearTimeout(timer);
  }, [draft]);
  const update = (changes: Partial<OnboardingDraft>) => { setDraft((current) => ({ ...current, ...changes })); setError(""); };
  const back = async () => {
    if (currentIndex === 0 || saving) return;
    const previous = { ...draft, step: order[currentIndex - 1] };
    setDraft(previous); setError("");
    try { await saveDraft(previous); } catch { setError("ذخیرهٔ پیشرفت ممکن نشد."); }
  };
  const validate = () => {
    if (step === 0 && !draft.name.trim()) return "لطفاً اسمت رو وارد کن.";
    if (step === 0 && draft.name.trim().length > 60) return "اسمت باید کوتاه‌تر از ۶۰ حرف باشه.";
    if (step === 1 && validNumber(draft.age, 13, 110, true) === null) return "لطفاً سنت رو به صورت عددی بین ۱۳ تا ۱۱۰ سال وارد کن.";
    if (step === 2 && validNumber(draft.heightCm, 100, 250) === null) return "لطفاً قدت رو بین ۱۰۰ تا ۲۵۰ سانتی‌متر وارد کن.";
    if (step === 3 && validNumber(draft.currentWeightKg, 25, 400) === null) return "لطفاً وزنت رو بین ۲۵ تا ۴۰۰ کیلوگرم وارد کن.";
    if (step === 4 && !draft.goal) return "لطفاً یک هدف انتخاب کن.";
    if (step === 5 && !draft.activity) return "لطفاً میزان فعالیتت رو انتخاب کن.";
    if (step === 6 && draft.targetWeightKg.trim() && validNumber(draft.targetWeightKg, 25, 400) === null) return "وزن هدف باید بین ۲۵ تا ۴۰۰ کیلوگرم باشه.";
    if (step === 7 && !draft.dietaryPreference) return "لطفاً یک ترجیح غذایی انتخاب کن.";
    if (step === 8 && draft.highlighted.length === 0) return "حداقل یک مورد رو انتخاب کن.";
    return "";
  };
  const next = async (skip = false) => {
    if (saving) return;
    const validationError = skip && step === 6 ? "" : validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError("");
    try {
      const changed = skip ? { ...draft, targetWeightKg: "" } : draft;
      if (currentIndex === order.length - 1) await onFinish(changed);
      else {
        const updated = { ...changed, step: order[currentIndex + 1] };
        await saveDraft(updated); setDraft(updated);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ذخیره‌سازی ممکن نشد. دوباره تلاش کن."); }
    finally { setSaving(false); }
  };
  const toggleMetric = (metric: TrackingMetric) => update({ highlighted: draft.highlighted.includes(metric)
    ? draft.highlighted.filter((item) => item !== metric) : [...draft.highlighted, metric] });

  return <main className="onboarding-shell">
    <div className="onboarding-top"><Brand /><span className="muted small">شروعی ساده، برای هر روز</span></div>
    <div className="onboarding-content">
      <div className="onboarding-progress"><span>آشنایی با تو</span><span>مرحلهٔ {new Intl.NumberFormat("fa-IR").format(currentIndex + 1)} از {new Intl.NumberFormat("fa-IR").format(order.length)}</span></div>
      <div className="progress-track"><div style={{ width: `${((currentIndex + 1) / order.length) * 100}%` }} /></div>
      <button type="button" className={`back-link ${currentIndex === 0 ? "invisible" : ""}`} onClick={back} disabled={saving}>
        <ArrowRight size={18} /> بازگشت
      </button>
      <div className="onboarding-question" key={step}>
        <p className="eyebrow">کالینو، همراه روزهای تو</p>
        <h1>{questions[step].title}</h1><p className="muted">{questions[step].detail}</p>
        <div className="onboarding-answer">
          {step === 0 && <LabeledInput label="نام یا نام مستعار" value={draft.name} onChange={(name) => update({ name })} placeholder="مثلاً آرو" required autoFocus maxLength={80} />}
          {step === 1 && <LabeledInput label="سن" value={draft.age} onChange={(age) => update({ age })} placeholder="مثلاً ۲۸" suffix="سال" inputMode="numeric" required />}
          {step === 2 && <LabeledInput label="قد" value={draft.heightCm} onChange={(heightCm) => update({ heightCm })} placeholder="مثلاً ۱۷۰" suffix="سانتی‌متر" inputMode="decimal" required />}
          {step === 3 && <LabeledInput label="وزن فعلی" value={draft.currentWeightKg} onChange={(currentWeightKg) => update({ currentWeightKg })} placeholder="مثلاً ۷۲" suffix="کیلوگرم" inputMode="decimal" required />}
          {step === 4 && <div className="choice-list">{GOALS.map((goal) => <button type="button" key={goal} className={`choice ${draft.goal === goal ? "selected" : ""}`} onClick={() => update({ goal, targetWeightKg: goal === "track" ? "" : draft.targetWeightKg })}><span>{goalLabels[goal]}</span>{draft.goal === goal && <Check size={19} />}</button>)}</div>}
          {step === 5 && <div className="choice-list">{ACTIVITIES.map((activity) => <button type="button" key={activity} className={`choice ${draft.activity === activity ? "selected" : ""}`} onClick={() => update({ activity })}><span>{activityLabels[activity]}</span>{draft.activity === activity && <Check size={19} />}</button>)}</div>}
          {step === 6 && <LabeledInput label="وزن هدف (اختیاری)" value={draft.targetWeightKg} onChange={(targetWeightKg) => update({ targetWeightKg })} placeholder="مثلاً ۶۸" suffix="کیلوگرم" inputMode="decimal" />}
          {step === 7 && <div className="choice-list">{DIETS.map((dietaryPreference) => <button type="button" key={dietaryPreference} className={`choice ${draft.dietaryPreference === dietaryPreference ? "selected" : ""}`} onClick={() => update({ dietaryPreference })}><span>{dietLabels[dietaryPreference]}</span>{draft.dietaryPreference === dietaryPreference && <Check size={19} />}</button>)}</div>}
          {step === 8 && <div className="choice-list">{TRACKING_METRICS.map((metric) => <button type="button" key={metric} className={`choice ${draft.highlighted.includes(metric) ? "selected" : ""}`} onClick={() => toggleMetric(metric)}><span>{metricLabels[metric]}</span><span className={`check-box ${draft.highlighted.includes(metric) ? "checked" : ""}`}>{draft.highlighted.includes(metric) && <Check size={14} />}</span></button>)}</div>}
          {error && <p className="field-error onboarding-error" role="alert">{error}</p>}
        </div>
      </div>
      <div className="onboarding-actions"><button type="button" className="button button-primary button-wide" onClick={() => next()} disabled={saving}>
        {saving ? "در حال ذخیره..." : currentIndex === order.length - 1 ? "شروع کالینو" : "ادامه"}<ArrowLeft size={19} />
      </button>{step === 6 && <button type="button" className="button button-text" onClick={() => next(true)} disabled={saving}>فعلاً رد می‌کنم</button>}</div>
    </div>
    <p className="onboarding-footnote">بدون حساب کاربری · اطلاعاتت روی همین دستگاه می‌مونه</p>
  </main>;
}
