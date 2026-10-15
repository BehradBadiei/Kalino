"use client";

/* eslint-disable @next/next/no-img-element -- User photos are local data URLs and must bypass server-side optimization. */
import { useState } from "react";
import {
  Apple, ArrowUpLeft, ChevronLeft, Droplets, Flame, Moon, Pencil,
  Plus, Sunrise, Sun, Target, Trash2, Utensils,
} from "lucide-react";
import {
  MEAL_CATEGORIES, dailyNutrition, faNumber, mealLabels, mealNutrition, persianDate,
  parseLocalizedNumber, scaleNutrition, sumNutrition, todayKey,
  type AppPreferences, type DailyGoals, type Food, type MealCategory, type MealEntry,
  type Nutrition, type UserProfile, type WaterEntry,
} from "@/lib/models";
import { Brand, DateNavigator, formatGrams } from "./ui";

const mealIcons = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snack: Apple };
const macroInfo = [
  { key: "protein", title: "پروتئین", icon: Utensils },
  { key: "carbs", title: "کربوهیدرات", icon: ArrowUpLeft },
  { key: "fat", title: "چربی", icon: Droplets },
] as const;

export function CalorieSummary({ consumed, target, onConfigure }: { consumed: number | null; target: number | null; onConfigure: () => void }) {
  const remaining = target === null || consumed === null ? null : Math.max(0, target - consumed);
  const over = target !== null && consumed !== null && consumed > target ? consumed - target : 0;
  const circumference = 2 * Math.PI * 69;
  const percent = target && consumed !== null ? Math.min(consumed / target, 1) : 0;
  return <section className="calorie-card" aria-label="خلاصه کالری روز">
    <div className="calorie-copy"><div className="calorie-caption"><Flame size={17} /> هدف روزانه</div>
      {target !== null ? <><div className="calorie-target"><strong>{faNumber(target)}</strong><span>کالری</span></div>
        <p className={`calorie-remaining ${over ? "over" : ""}`}>
          {consumed === null ? "کالری بعضی غذاها نامشخص است" : over ? `${faNumber(over)} کالری بیش از هدف` : `${faNumber(remaining)} کالری باقی‌مانده`}
        </p></>
        : <><p className="calorie-no-goal">هنوز هدف روزانه‌ای نداری.</p><button type="button" className="inline-link" onClick={onConfigure}>تنظیم هدف <ChevronLeft size={16} /></button></>}
    </div>
    <div className="progress-ring" role="img" aria-label={target ? `${faNumber(consumed)} از ${faNumber(target)} کالری` : `${faNumber(consumed)} کالری مصرف‌شده`}>
      <svg viewBox="0 0 180 180" aria-hidden="true"><circle className="ring-track" cx="90" cy="90" r="69" /><circle className="ring-fill" cx="90" cy="90" r="69" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent)} /></svg>
      <div className="ring-label"><strong>{faNumber(consumed)}</strong><span>{target !== null ? `از ${faNumber(target)}` : "مصرف‌شده"}</span><small>کالری</small></div>
    </div>
  </section>;
}

export function MacroCards({ totals, goals, highlighted }: { totals: Nutrition; goals: DailyGoals | null; highlighted: AppPreferences["highlighted"] }) {
  return <div className="macro-grid" aria-label="درشت‌مغذی‌ها">{macroInfo.map(({ key, title, icon: Icon }) => {
    const value = totals[key];
    const goal = goals?.[key] ?? null;
    const active = highlighted.includes(key);
    const width = value !== null && goal ? Math.min(100, (value / goal) * 100) : 0;
    return <div key={key} className={`macro-card ${active ? "macro-highlight" : ""}`}>
      <div className="macro-heading"><span>{title}</span><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></div>
      <div className="macro-value">{formatGrams(value)}</div>
      <div className="macro-goal">{goal !== null ? `از ${faNumber(goal, 1)} گرم` : "هدف تعیین نشده"}</div>
      <div className="macro-track" role="progressbar" aria-label={title} aria-valuenow={value ?? undefined} aria-valuemax={goal ?? undefined}><div style={{ width: `${width}%` }} /></div>
      {value === null && <span className="macro-missing">اطلاعات بعضی غذاها ناقص است</span>}
    </div>;
  })}</div>;
}

export function MealSection({ category, entries, foods, onAdd, onEdit, onDelete }: {
  category: MealCategory; entries: MealEntry[]; foods: Food[];
  onAdd: () => void; onEdit: (entry: MealEntry) => void; onDelete: (entry: MealEntry) => void;
}) {
  const Icon = mealIcons[category];
  const subtotal = sumNutrition(entries.map(mealNutrition)).calories;
  const images = new Map(foods.map((food) => [food.id, food.image]));
  return <div className="meal-section">
    <div className="meal-section-heading"><div className="meal-heading-name"><span className="meal-icon"><Icon size={22} strokeWidth={1.8} /></span>
      <div><h3>{mealLabels[category]}</h3>{entries.length > 0 && <span className="muted small">{faNumber(subtotal)} کالری</span>}</div></div>
      <button type="button" className="button button-mini" onClick={onAdd}><Plus size={17} /> افزودن غذا</button>
    </div>
    {entries.length === 0 ? <p className="meal-empty">هنوز چیزی ثبت نکردی.</p> :
      <div className="logged-meals">{entries.map((entry) => <div className="logged-entry" key={entry.id}>
        <div className="logged-items">{entry.items.map((item) => {
          const image = images.get(item.foodId);
          const calories = scaleNutrition(item.nutritionPerServing, item.quantity / item.referenceServingSize).calories;
          return <div key={item.id} className="logged-item">
            {image ? <img className="logged-thumbnail" src={image} alt="" /> : <span className="logged-thumbnail logged-placeholder"><Utensils size={17} /></span>}
            <div className="logged-name"><span>{item.nameSnapshot}</span><small>{faNumber(item.quantity, 1)} {item.unit}{item.role === "side" ? " · مخلفات" : ""}</small></div>
            <span className="logged-calories">{faNumber(calories)} <small>کالری</small></span>
          </div>;
        })}</div>
        <div className="logged-actions"><span className="muted small">مجموع وعده: {faNumber(mealNutrition(entry).calories)} کالری</span>
          <div><button type="button" className="icon-button" onClick={() => onEdit(entry)} aria-label={`ویرایش ${mealLabels[category]}`} title="ویرایش"><Pencil size={16} /></button>
            <button type="button" className="icon-button danger-hover" onClick={() => onDelete(entry)} aria-label={`حذف ${mealLabels[category]}`} title="حذف"><Trash2 size={16} /></button></div>
        </div>
      </div>)}</div>}
  </div>;
}

function WaterTracker({ entry, goal, onChange, date }: { entry?: WaterEntry; goal: number | null; onChange: (delta: number) => Promise<void>; date: string }) {
  const [amount, setAmount] = useState("250");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = entry?.amountMl ?? 0;
  const parsed = parseLocalizedNumber(amount);
  const valid = parsed !== null && Number.isInteger(parsed) && parsed > 0 && parsed <= 5000;
  const adjust = async (delta: number) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await onChange(delta); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ذخیرهٔ آب ممکن نشد."); }
    finally { setBusy(false); }
  };
  return <section className="water-card"><div className="water-top"><div><h2><Droplets size={19} /> آب {date === todayKey() ? "امروز" : "این روز"}</h2><p className="muted small">{faNumber(current)} میلی‌لیتر{goal !== null ? ` از ${faNumber(goal)} میلی‌لیتر` : " · هدفی تعیین نشده"}</p></div>
    <div className="water-controls"><button type="button" className="button button-quiet" disabled={busy || !valid || current === 0} onClick={() => adjust(-Math.min(current, parsed ?? 250))} aria-label="کم کردن آب">−</button>
      <input aria-label="مقدار آب به میلی‌لیتر" className="water-input" type="text" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <button type="button" className="button button-mini" disabled={busy || !valid} onClick={() => adjust(parsed ?? 0)} aria-label="افزودن آب">+ افزودن</button></div></div>
    {goal !== null && goal > 0 && <div className="water-progress"><div style={{ width: `${Math.min(100, current / goal * 100)}%` }} /></div>}
    <small className="muted">مقدار به میلی‌لیتر · حداکثر ۵۰۰۰ در هر بار</small>
    {amount.trim() && !valid && <p className="field-error">مقدار صحیح بین ۱ و ۵۰۰۰ میلی‌لیتر وارد کن.</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </section>;
}

export function HomeDashboard({ profile, goals, preferences, foods, meals, water, date, onDateChange, onAddMeal, onEditMeal, onDeleteMeal, onNavigate, onWaterChange }: {
  profile: UserProfile; goals: DailyGoals | null; preferences: AppPreferences; foods: Food[]; meals: MealEntry[]; water: WaterEntry[];
  date: string; onDateChange: (date: string) => void;
  onAddMeal: (category: MealCategory) => void; onEditMeal: (meal: MealEntry) => void; onDeleteMeal: (meal: MealEntry) => void;
  onNavigate: (section: "foods" | "settings" | "meal") => void;
  onWaterChange: (date: string, delta: number) => Promise<void>;
}) {
  const entries = meals.filter((entry) => entry.date === date);
  const totals = dailyNutrition(meals, date);
  return <div className="home-page">
    <header className="home-header"><div><p className="greeting">سلام، {profile.name} <span aria-hidden="true">👋</span></p>
      <p className="header-date">{persianDate(date)}{date === todayKey() && <span className="today-label">امروز</span>}</p></div><Brand /></header>
    <DateNavigator date={date} onChange={onDateChange} />
    <CalorieSummary consumed={totals.calories} target={goals?.calories ?? null} onConfigure={() => onNavigate("settings")} />
    <MacroCards totals={totals} goals={goals} highlighted={preferences.highlighted} />
    <section className="meals-panel"><div className="section-heading"><h2>وعده‌های {date === todayKey() ? "امروز" : "این روز"}</h2><span className="muted small">{faNumber(entries.length)} وعده ثبت‌شده</span></div>
      <div className="meal-list">{MEAL_CATEGORIES.map((category) => <MealSection key={category} category={category}
        entries={entries.filter((entry) => entry.category === category)} foods={foods}
        onAdd={() => onAddMeal(category)} onEdit={onEditMeal} onDelete={onDeleteMeal} />)}</div>
    </section>
    <section className="quick-section"><h2>عملیات سریع</h2><div className="quick-grid">
      <button type="button" className="quick-card" onClick={() => onNavigate("meal")}><span className="quick-icon"><Plus size={21} /></span><span>ثبت غذا</span><ChevronLeft size={18} /></button>
      <button type="button" className="quick-card" onClick={() => onNavigate("foods")}><span className="quick-icon"><Utensils size={20} /></span><span>مشاهده غذاها</span><ChevronLeft size={18} /></button>
      <button type="button" className="quick-card" onClick={() => onNavigate("settings")}><span className="quick-icon"><Target size={20} /></span><span>تنظیم هدف روزانه</span><ChevronLeft size={18} /></button>
    </div></section>
    {preferences.highlighted.includes("water") && <WaterTracker key={date} date={date} entry={water.find((item) => item.date === date)} goal={goals?.waterMl ?? null} onChange={(delta) => onWaterChange(date, delta)} />}
  </div>;
}
