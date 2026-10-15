"use client";

import { useState, type ChangeEvent } from "react";
import {
  Activity as ActivityIcon, ArrowDownToLine, ArrowUpFromLine, ChevronDown, CircleHelp,
  Heart, Info, LockKeyhole, Save, SlidersHorizontal, Trash2, UserRound,
} from "lucide-react";
import {
  ACTIVITIES, DIETS, GOALS, TRACKING_METRICS, activityLabels, dietLabels, faNumber,
  goalLabels, metricLabels, recommendCalories, validNumber,
  type Activity, type AppPreferences, type DailyGoals, type DietaryPreference,
  type GoalType, type TrackingMetric, type UserProfile,
} from "@/lib/models";
import { parseBackup, type BackupFile } from "@/lib/storage";
import { Brand, LabeledInput, PageTitle, type Confirmation } from "./ui";

const inputValue = (value: number | null) => value?.toString() ?? "";
const optionalGoal = (value: string, min: number, max: number, label: string): number | null => {
  if (!value.trim()) return null;
  const number = validNumber(value, min, max);
  if (number === null) throw new Error(`${label} رو به صورت عددی بین ${faNumber(min)} تا ${faNumber(max)} وارد کن یا خالی بذار.`);
  return number;
};

const faq = [
  { question: "چطور یک غذا اضافه کنم؟", answer: "از بخش «غذاها» روی «افزودن غذا» بزن. نام، اندازهٔ وعده و کالری رو وارد کن. عکس و درشت‌مغذی‌ها اختیاری هستن. بعد غذا در کتابخانه‌ات می‌مونه." },
  { question: "چطور دستور غذا بسازم؟", answer: "اول مواد غذایی رو به‌عنوان غذاهای ساده ذخیره کن. موقع افزودن غذای جدید، «دستور غذا» رو انتخاب کن؛ یک غذای اصلی و حداقل یک مخلفات یا مادهٔ اولیه انتخاب کن. مثلاً ۱ پیمانه برنج + ۱۰۰ گرم مرغ. ارزش غذایی از مجموع همان مواد به‌دست می‌آد." },
  { question: "مخلفات رو چطور به وعده اضافه کنم؟", answer: "در «ثبت وعده»، چند غذا انتخاب کن. اولین مورد غذای اصلیه و بقیه مخلفات هستن؛ می‌تونی نقش هر کدوم رو تغییر بدی. یک دستور غذا خودش شامل مواد تشکیل‌دهنده‌اش هست؛ افزودن دستور، اجزاش رو جداگانه به وعده اضافه نمی‌کنه." },
  { question: "کالری و درشت‌مغذی‌ها چطور حساب می‌شن؟", answer: "مقدار ثبت‌شده ÷ اندازهٔ وعدهٔ مرجع × ارزش غذایی همان وعده. عددهای هر غذا و مخلفات جمع می‌شن. درشت‌مغذیِ ثبت‌نشده «نامشخص» می‌مونه، نه صفر. تغییر بعدی غذا، وعده‌های قبلی رو عوض نمی‌کنه." },
  { question: "چطور هدف روزانه رو تغییر بدم؟", answer: "در همین صفحه، بخش «اهداف» رو باز کن و مقدار دلخواه کالری یا درشت‌مغذی‌ها رو وارد کن. پیشنهاد کالری فقط یک تخمین اولیه است و هیچ‌وقت هدف دستی تو رو خودکار عوض نمی‌کنه." },
  { question: "ترجیح غذایی من چه کاری انجام می‌ده؟", answer: "ترجیحت ذخیره می‌شه و در کتابخانهٔ غذاها به یادت می‌آد. کالینو مواد غذایی رو به‌صورت خودکار گیاهی، وگان یا مناسب یک رژیم تشخیص نمی‌ده؛ غذاها و ترکیباتشون رو خودت بررسی کن." },
  { question: "اطلاعاتم کجا ذخیره می‌شه؟", answer: "همهٔ غذاها، عکس‌ها، وعده‌ها و تنظیمات در IndexedDB همین مرورگر ذخیره می‌شن. همگام‌سازی خودکار وجود نداره؛ برای نگهداری نسخهٔ پشتیبان از بخش «مدیریت اطلاعات» فایل JSON بگیر." },
];

export function SettingsPage({ profile, goals, preferences, onSaveProfile, onSaveGoals, onSavePreferences, onExport, onImport, onDeleteAll, onAskConfirm }: {
  profile: UserProfile; goals: DailyGoals; preferences: AppPreferences;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
  onSaveGoals: (profile: UserProfile, goals: DailyGoals) => Promise<void>;
  onSavePreferences: (profile: UserProfile, preferences: AppPreferences) => Promise<void>;
  onExport: () => void;
  onImport: (backup: BackupFile) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onAskConfirm: (confirmation: Confirmation) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(inputValue(profile.age));
  const [height, setHeight] = useState(inputValue(profile.heightCm));
  const [weight, setWeight] = useState(inputValue(profile.currentWeightKg));
  const [goal, setGoal] = useState<GoalType>(profile.goal);
  const [activity, setActivity] = useState<Activity>(profile.activity);
  const [targetWeight, setTargetWeight] = useState(inputValue(profile.targetWeightKg));
  const [calories, setCalories] = useState(inputValue(goals.calories));
  const [protein, setProtein] = useState(inputValue(goals.protein));
  const [carbs, setCarbs] = useState(inputValue(goals.carbs));
  const [fat, setFat] = useState(inputValue(goals.fat));
  const [waterMl, setWaterMl] = useState(inputValue(goals.waterMl));
  const [calorieOrigin, setCalorieOrigin] = useState(goals.calorieOrigin);
  const [diet, setDiet] = useState<DietaryPreference>(profile.dietaryPreference);
  const [highlighted, setHighlighted] = useState<TrackingMetric[]>(preferences.highlighted);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState<{ section: string; text: string; error?: boolean } | null>(null);
  const recommend = recommendCalories({
    age: profile.age, heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg, activity, goal,
  });
  const result = (section: string, text: string, error = false) => setFeedback({ section, text, error });
  const savePersonal = async () => {
    const years = validNumber(age, 13, 110, true), cm = validNumber(height, 100, 250), kg = validNumber(weight, 25, 400);
    if (!name.trim() || name.trim().length > 60 || years === null || cm === null || kg === null) {
      result("personal", "نام (حداکثر ۶۰ حرف)، سن (۱۳ تا ۱۱۰)، قد (۱۰۰ تا ۲۵۰) و وزن (۲۵ تا ۴۰۰) رو درست وارد کن.", true); return;
    }
    setBusy("personal"); setFeedback(null);
    try {
      await onSaveProfile({ ...profile, name: name.trim(), age: years, heightCm: cm, currentWeightKg: kg, updatedAt: new Date().toISOString() });
      result("personal", "اطلاعات فردی ذخیره شد.");
    } catch (reason) { result("personal", reason instanceof Error ? reason.message : "ذخیره ممکن نشد.", true); }
    finally { setBusy(""); }
  };
  const saveTargets = async () => {
    setBusy("goals"); setFeedback(null);
    try {
      const updatedGoals: DailyGoals = {
        calories: optionalGoal(calories, 500, 10_000, "هدف کالری"),
        protein: optionalGoal(protein, 1, 2000, "هدف پروتئین"),
        carbs: optionalGoal(carbs, 1, 2000, "هدف کربوهیدرات"),
        fat: optionalGoal(fat, 1, 2000, "هدف چربی"),
        waterMl: optionalGoal(waterMl, 100, 20_000, "هدف آب"),
        calorieOrigin: calories.trim() ? calorieOrigin : "none",
      };
      const target = optionalGoal(targetWeight, 25, 400, "وزن هدف");
      await onSaveGoals({ ...profile, goal, activity, targetWeightKg: target, updatedAt: new Date().toISOString() }, updatedGoals);
      result("goals", "هدف‌ها ذخیره شدن.");
    } catch (reason) { result("goals", reason instanceof Error ? reason.message : "ذخیره ممکن نشد.", true); }
    finally { setBusy(""); }
  };
  const saveDiet = async () => {
    if (highlighted.length === 0) { result("diet", "حداقل یک مورد برای دنبال کردن انتخاب کن.", true); return; }
    setBusy("diet"); setFeedback(null);
    try {
      await onSavePreferences({ ...profile, dietaryPreference: diet, updatedAt: new Date().toISOString() }, { highlighted });
      result("diet", "ترجیحات ذخیره شدن.");
    } catch (reason) { result("diet", reason instanceof Error ? reason.message : "ذخیره ممکن نشد.", true); }
    finally { setBusy(""); }
  };
  const toggleHighlight = (metric: TrackingMetric) => setHighlighted((current) => current.includes(metric) ? current.filter((item) => item !== metric) : [...current, metric]);
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (file.size > 150 * 1024 * 1024) { result("data", "حجم فایل پشتیبان خیلی زیاده (حداکثر ۱۵۰ مگابایت).", true); return; }
    try {
      const backup = parseBackup(await file.text());
      onAskConfirm({ title: "بازیابی اطلاعات؟", message: `این پشتیبان شامل ${faNumber(backup.data.foods.length)} غذا و ${faNumber(backup.data.meals.length)} وعده است. تمام اطلاعات فعلی این مرورگر با فایل جایگزین می‌شه. بهتره اول از اطلاعات فعلی خروجی بگیری.`,
        confirmLabel: "جایگزین کردن اطلاعات", onConfirm: () => onImport(backup) });
      setFeedback(null);
    } catch (reason) { result("data", reason instanceof Error ? reason.message : "خواندن فایل ممکن نشد.", true); }
  };
  const deleteAll = () => onAskConfirm({ title: "حذف همهٔ اطلاعات؟", message: "تمام غذاها، عکس‌ها، وعده‌ها، هدف‌ها و اطلاعات فردی از این مرورگر پاک می‌شن. این کار برگشت‌پذیر نیست؛ اگر لازم داری اول فایل پشتیبان بگیر.",
    confirmLabel: "حذف همیشگی", destructive: true, requireText: "حذف", onConfirm: onDeleteAll });
  const notice = (section: string) => feedback?.section === section && <p className={feedback.error ? "form-error" : "form-success"} role="status">{feedback.text}</p>;
  return <div className="settings-page">
    <PageTitle eyebrow="همه‌چیز به انتخاب تو" title="تنظیمات" description="هدف‌ها و اطلاعاتت رو هر وقت خواستی تغییر بده." />
    <section className="settings-section" id="personal"><div className="settings-heading"><span className="settings-icon"><UserRound size={20} /></span><div><h2>اطلاعات فردی</h2><p>اطلاعات پایهٔ خودت</p></div></div>
      <div className="form-grid"><LabeledInput label="نام" value={name} onChange={setName} maxLength={80} required /><LabeledInput label="سن" value={age} onChange={setAge} suffix="سال" inputMode="numeric" required />
        <LabeledInput label="قد" value={height} onChange={setHeight} suffix="سانتی‌متر" inputMode="decimal" required /><LabeledInput label="وزن فعلی" value={weight} onChange={setWeight} suffix="کیلوگرم" inputMode="decimal" required /></div>
      {notice("personal")}<button type="button" className="button button-primary settings-save" onClick={savePersonal} disabled={!!busy}><Save size={17} /> {busy === "personal" ? "در حال ذخیره..." : "ذخیرهٔ اطلاعات"}</button>
    </section>
    <section className="settings-section" id="goals"><div className="settings-heading"><span className="settings-icon"><ActivityIcon size={20} /></span><div><h2>اهداف</h2><p>هدف روزانهٔ خودت رو تنظیم کن</p></div></div>
      <div className="form-grid"><div className="field"><label className="field-label" htmlFor="settings-goal">هدف تو</label><select id="settings-goal" className="input select" value={goal} onChange={(event) => setGoal(event.target.value as GoalType)}>{GOALS.map((item) => <option key={item} value={item}>{goalLabels[item]}</option>)}</select></div>
        <div className="field"><label className="field-label" htmlFor="settings-activity">میزان فعالیت</label><select id="settings-activity" className="input select" value={activity} onChange={(event) => setActivity(event.target.value as Activity)}>{ACTIVITIES.map((item) => <option key={item} value={item}>{activityLabels[item]}</option>)}</select></div>
        <LabeledInput label="وزن هدف (اختیاری)" value={targetWeight} onChange={setTargetWeight} suffix="کیلوگرم" inputMode="decimal" /></div>
      <div className="recommendation"><div><strong>پیشنهاد تقریبی کالری</strong><p>{recommend !== null ? `${faNumber(recommend)} کالری در روز` : "با اطلاعات فعلی، پیشنهاد قابل‌اتکایی نداریم."}</p></div>
        {recommend !== null && <button type="button" className="button button-quiet button-small" onClick={() => { setCalories(String(recommend)); setCalorieOrigin("recommended"); }}>استفاده از پیشنهاد</button>}
        <small>تخمین غیرپزشکی بر پایهٔ معادلهٔ میفلین–سن ژئور با میانگین ثابت‌های آن (چون جنسیت پرسیده نمی‌شود)، ضریب فعالیت و تغییر حدود ۳۰۰ کالری برای کاهش/افزایش وزن؛ فقط برای سن ۱۹ تا ۷۸. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7478086/" target="_blank" rel="noopener noreferrer">منبع معادله</a>. هدف دستی هیچ‌وقت خودکار جایگزین نمی‌شود. برای به‌روزرسانی پیشنهاد پس از تغییر قد یا وزن، اول اطلاعات فردی را ذخیره کن.</small></div>
      <div className="form-grid"><LabeledInput label="هدف روزانهٔ کالری" value={calories} onChange={(value) => { setCalories(value); setCalorieOrigin(value.trim() ? "manual" : "none"); }} suffix="کالری" inputMode="decimal" placeholder="اختیاری" />
        <LabeledInput label="پروتئین روزانه" value={protein} onChange={setProtein} suffix="گرم" inputMode="decimal" placeholder="اختیاری" />
        <LabeledInput label="کربوهیدرات روزانه" value={carbs} onChange={setCarbs} suffix="گرم" inputMode="decimal" placeholder="اختیاری" />
        <LabeledInput label="چربی روزانه" value={fat} onChange={setFat} suffix="گرم" inputMode="decimal" placeholder="اختیاری" />
        <LabeledInput label="آب روزانه" value={waterMl} onChange={setWaterMl} suffix="میلی‌لیتر" inputMode="numeric" placeholder="اختیاری" /></div>
      <p className="field-hint">وضعیت هدف کالری: {calories.trim() ? calorieOrigin === "recommended" ? "انتخاب‌شده از پیشنهاد تقریبی" : "تنظیم‌شده به‌صورت دستی" : "تعیین نشده"}</p>
      {notice("goals")}<button type="button" className="button button-primary settings-save" onClick={saveTargets} disabled={!!busy}><Save size={17} /> {busy === "goals" ? "در حال ذخیره..." : "ذخیرهٔ هدف‌ها"}</button>
    </section>
    <section className="settings-section" id="diet"><div className="settings-heading"><span className="settings-icon"><SlidersHorizontal size={20} /></span><div><h2>ترجیحات غذایی</h2><p>چیزهایی که برای تو مهم‌ترن</p></div></div>
      <div className="field"><label className="field-label" htmlFor="settings-diet">شیوهٔ غذا خوردن</label><select id="settings-diet" className="input select" value={diet} onChange={(event) => setDiet(event.target.value as DietaryPreference)}>{DIETS.map((item) => <option key={item} value={item}>{dietLabels[item]}</option>)}</select></div>
      <div className="field"><span className="field-label">موارد برجسته در خانه</span><div className="tracking-chips">{TRACKING_METRICS.map((metric) => <button type="button" key={metric} className={`filter-chip ${highlighted.includes(metric) ? "active" : ""}`} aria-pressed={highlighted.includes(metric)} onClick={() => toggleHighlight(metric)}>{metricLabels[metric]}</button>)}</div>
        <p className="field-hint">کالری همیشه در خلاصهٔ اصلی نمایش داده می‌شه؛ انتخاب‌ها روی برجسته‌سازی درشت‌مغذی‌ها و نمایش بخش آب اثر می‌ذارن.</p></div>
      {notice("diet")}<button type="button" className="button button-primary settings-save" onClick={saveDiet} disabled={!!busy}><Save size={17} /> {busy === "diet" ? "در حال ذخیره..." : "ذخیرهٔ ترجیحات"}</button>
    </section>
    <section className="settings-section" id="help"><div className="settings-heading"><span className="settings-icon"><CircleHelp size={20} /></span><div><h2>راهنما</h2><p>پاسخ چند سؤال رایج</p></div></div>
      <div className="faq-list">{faq.map((item) => <details key={item.question} className="faq-item"><summary>{item.question}<ChevronDown size={18} /></summary><p>{item.answer}</p></details>)}</div>
    </section>
    <section className="settings-section" id="privacy"><div className="settings-heading"><span className="settings-icon"><LockKeyhole size={20} /></span><div><h2>حریم خصوصی</h2><p>اطلاعاتت دست خودته</p></div></div>
      <ul className="simple-list"><li>برای استفاده هیچ حساب کاربری یا ورود لازم نیست.</li><li>اطلاعات فردی، غذاها، عکس‌ها و وعده‌ها در حافظهٔ همین مرورگر ذخیره می‌شن.</li>
        <li>اطلاعات به‌طور خودکار بین دستگاه‌ها همگام نمی‌شن.</li><li>پاک کردن داده‌های مرورگر یا حذف برنامه ممکنه اطلاعات ذخیره‌شده رو از بین ببره.</li>
        <li>می‌تونی از اطلاعاتت فایل پشتیبان بگیری یا همه‌شون رو پاک کنی.</li></ul>
    </section>
    <section className="settings-section about-section" id="about"><div className="settings-heading"><span className="settings-icon"><Info size={20} /></span><div><h2>درباره کالینو</h2><p>یک همراه ساده برای تغذیهٔ آگاهانه</p></div></div>
      <div className="about-content"><Brand large /><p>کالینو برای ثبت راحت غذاها و دیدن تصویر روشن‌تری از روزهای تو ساخته شده؛ بی‌نیاز از حساب کاربری و پیچیدگی.</p><span className="muted small">نسخهٔ ۱.۰.۰</span></div>
    </section>
    <section className="settings-section" id="data"><div className="settings-heading"><span className="settings-icon"><Heart size={20} /></span><div><h2>مدیریت اطلاعات</h2><p>پشتیبان‌گیری، بازیابی یا پاک کردن</p></div></div>
      <div className="data-action"><div><strong>دریافت پشتیبان</strong><p>همهٔ غذاها، عکس‌ها، وعده‌ها و تنظیمات در یک فایل JSON.</p></div><button type="button" className="button button-quiet" onClick={onExport}><ArrowDownToLine size={17} /> دریافت فایل</button></div>
      <div className="data-action"><div><strong>بازیابی پشتیبان</strong><p>ابتدا فایل بررسی می‌شه و فقط با تأیید تو جایگزین می‌شه.</p></div><label className="button button-quiet" htmlFor="backup-upload"><ArrowUpFromLine size={17} /> انتخاب فایل</label><input className="visually-hidden" id="backup-upload" type="file" accept=".json,application/json" onChange={importFile} /></div>
      <div className="data-action destructive-action"><div><strong>حذف همهٔ اطلاعات</strong><p>فقط پس از تأیید دوباره، همهٔ داده‌های محلی پاک می‌شن.</p></div><button type="button" className="button button-danger-outline" onClick={deleteAll}><Trash2 size={17} /> حذف اطلاعات</button></div>
      {notice("data")}
    </section>
  </div>;
}
