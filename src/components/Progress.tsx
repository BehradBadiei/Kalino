"use client";

import { BarChart3, CalendarDays, Utensils } from "lucide-react";
import {
  dailyNutrition, faNumber, mealNutrition, persianDate, shiftDate, startOfWeek, todayKey,
  type DailyGoals, type MealEntry,
} from "@/lib/models";
import { DateNavigator, PageTitle, formatGrams } from "./ui";

const weekdays = ["یک", "دو", "سه", "چهار", "پنج", "جمعه", "شنبه"];

export function ProgressChart({ meals, target, date, onSelectDate }: {
  meals: MealEntry[]; target: number | null; date: string; onSelectDate: (date: string) => void;
}) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDate(weekStart, index);
    const dayMeals = meals.filter((meal) => meal.date === key);
    return { key, meals: dayMeals, hasRecords: dayMeals.length > 0, calories: dailyNutrition(meals, key).calories ?? 0 };
  });
  const maximum = Math.max(100, target ?? 0, ...days.map((day) => day.calories)) * 1.17;
  const total = days.reduce((sum, day) => sum + day.calories, 0);
  const recorded = days.filter((day) => day.hasRecords).length;
  const selected = days.find((day) => day.key === date) ?? days[0];
  return <section className="chart-card">
    <div className="chart-header"><div><h2>نمای هفتگی</h2><p className="muted small">{persianDate(weekStart, { day: "numeric", month: "long" })} تا {persianDate(days[6].key, { day: "numeric", month: "long" })}</p></div>
      <span className="chart-legend"><i /> کالری مصرفی</span></div>
    <div className="chart-plot" role="group" aria-label="نمودار هفت روز کالری">
      {target !== null && target > 0 && <div className="chart-target-line" style={{ bottom: `${(target / maximum) * 100}%` }}><span>هدف {faNumber(target)}</span></div>}
      <div className="chart-columns">{days.map((day) => {
        const height = day.calories / maximum * 100;
        return <button key={day.key} type="button" className={`chart-column ${date === day.key ? "selected" : ""}`} onClick={() => onSelectDate(day.key)}
          aria-label={`${persianDate(day.key)}؛ ${day.hasRecords ? `${faNumber(day.calories)} کالری` : "بدون ثبت"}`} aria-pressed={date === day.key}>
          {day.hasRecords && <span className="chart-bar-number" style={{ bottom: `min(calc(${height}% + 9px), calc(100% - 22px))` }}>{faNumber(day.calories)}</span>}
          {day.hasRecords && day.calories > 0 && <span className="chart-bar" style={{ height: `${Math.max(height, 2)}%` }} />}
          {day.hasRecords && day.calories === 0 && <span className="chart-zero" title="وعده ثبت‌شده با صفر کالری" />}
          {!day.hasRecords && <span className="chart-no-record" title="وعده‌ای ثبت نشده" />}
        </button>;
      })}</div>
    </div>
    <div className="chart-labels">{days.map((day) => <button type="button" key={day.key} onClick={() => onSelectDate(day.key)} className={date === day.key ? "selected" : ""}><span>{weekdays[new Date(`${day.key}T12:00:00`).getDay()]}</span><small>{persianDate(day.key, { day: "numeric" })}</small></button>)}</div>
    {recorded === 0 && <p className="chart-empty">این هفته هنوز وعده‌ای ثبت نشده است.</p>}
    <div className="selected-day"><CalendarDays size={18} /><div><strong>{persianDate(selected.key)}</strong><span>{selected.hasRecords ? `${faNumber(selected.calories)} کالری · ${faNumber(selected.meals.length)} وعده` : "هنوز وعده‌ای ثبت نشده"}</span></div></div>
    <div className="week-stats"><div><strong>{faNumber(total)}</strong><span>مجموع هفته · کالری</span></div><div><strong>{faNumber(total / 7)}</strong><span>میانگین هر روز · کالری</span></div><div><strong>{faNumber(recorded)}</strong><span>روز با وعدهٔ ثبت‌شده</span></div></div>
    <p className="chart-note">خط‌چین یعنی بدون ثبت؛ دایرهٔ توخالی یعنی وعده با صفر کالری.</p>
  </section>;
}

export function ProgressPage({ date, onDateChange, meals, goals }: {
  date: string; onDateChange: (date: string) => void; meals: MealEntry[]; goals: DailyGoals | null;
}) {
  const totals = dailyNutrition(meals, date);
  const entries = meals.filter((entry) => entry.date === date);
  const today = date === todayKey();
  return <div className="progress-page">
    <PageTitle eyebrow="با ریتم خودت پیش برو" title="پیشرفت" description="نگاهی ساده به روزها و وعده‌هایی که ثبت کردی." />
    <DateNavigator date={date} onChange={onDateChange} />
    <section className="progress-daily"><div className="section-heading"><h2>خلاصهٔ {today ? "امروز" : "این روز"}</h2><span className="muted small"><Utensils size={14} /> {faNumber(entries.length)} وعده</span></div>
      <div className="progress-kcal"><div><span className="muted small">کالری مصرف‌شده</span><strong>{faNumber(totals.calories)} <small>کالری</small></strong></div><div><span className="muted small">هدف روزانه</span><strong>{goals?.calories !== null && goals?.calories !== undefined ? faNumber(goals.calories) : "تعیین نشده"}</strong></div></div>
      <div className="progress-macros"><div><span>پروتئین</span><strong>{formatGrams(totals.protein)}</strong></div><div><span>کربوهیدرات</span><strong>{formatGrams(totals.carbs)}</strong></div><div><span>چربی</span><strong>{formatGrams(totals.fat)}</strong></div></div>
      {entries.length === 0 && <p className="muted small no-day-data">برای این روز هنوز وعده‌ای ثبت نکردی.</p>}
    </section>
    <ProgressChart meals={meals} target={goals?.calories ?? null} date={date} onSelectDate={onDateChange} />
    <p className="progress-footnote"><BarChart3 size={16} /> همهٔ عددها از وعده‌های ذخیره‌شدهٔ خودت محاسبه می‌شن.</p>
  </div>;
}
