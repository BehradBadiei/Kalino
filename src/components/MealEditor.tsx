"use client";

/* eslint-disable @next/next/no-img-element -- User photos are local data URLs and must bypass server-side optimization. */
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Plus, Search, Trash2, Utensils, X } from "lucide-react";
import {
  MEAL_CATEGORIES, faNumber, itemFromFood, mealLabels, parseLocalizedNumber, persianDate,
  scaleNutrition, sumNutrition, todayKey,
  type Food, type MealCategory, type MealEntry, type MealEntryItem,
} from "@/lib/models";
import { PageTitle } from "./ui";

export interface MealSession {
  date: string;
  category: MealCategory;
  editing: MealEntry | null;
  items: MealEntryItem[];
  returnSection: "home" | "foods";
}

export function MealEditor({ session, foods, onSave, onCancel, onCreateFood }: {
  session: MealSession; foods: Food[]; onSave: (entry: MealEntry) => Promise<void>;
  onCancel: () => void; onCreateFood: (category: MealCategory, items: MealEntryItem[]) => void;
}) {
  const [category, setCategory] = useState<MealCategory>(session.category);
  const [items, setItems] = useState<MealEntryItem[]>(session.items);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const images = useMemo(() => new Map(foods.map((food) => [food.id, food.image])), [foods]);
  const matching = useMemo(() => foods.filter((food) =>
    food.name.toLocaleLowerCase("fa-IR").includes(query.trim().toLocaleLowerCase("fa-IR"))
  ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [foods, query]);
  const total = sumNutrition(items.map((item) => scaleNutrition(item.nutritionPerServing,
    item.referenceServingSize > 0 ? item.quantity / item.referenceServingSize : 0)));
  const add = (food: Food) => { setItems((current) => [...current, itemFromFood(food, current.some((item) => item.role === "main") ? "side" : "main")]); setError(""); };
  const changeQuantity = (id: string, input: string) => {
    const quantity = parseLocalizedNumber(input) ?? 0;
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  };
  const changeRole = (id: string, role: "main" | "side") => {
    setItems((current) => {
      if (role === "main") return current.map((item) => ({ ...item, role: item.id === id ? "main" : "side" }));
      const others = current.filter((item) => item.id !== id);
      if (others.length === 0) return current;
      const newMainId = others.find((item) => item.role === "main")?.id ?? others[0].id;
      return current.map((item) => ({ ...item, role: item.id === id ? "side" : item.id === newMainId ? "main" : item.role }));
    });
  };
  const remove = (id: string) => setItems((current) => {
    const remaining = current.filter((item) => item.id !== id);
    if (remaining.length > 0 && !remaining.some((item) => item.role === "main")) remaining[0] = { ...remaining[0], role: "main" };
    return remaining;
  });
  const save = async () => {
    if (savingRef.current) return;
    if (items.length === 0) { setError("حداقل یک غذا برای این وعده انتخاب کن."); return; }
    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 100_000)) {
      setError("مقدار هر غذا باید عددی بزرگ‌تر از صفر باشه."); return;
    }
    const now = new Date().toISOString();
    const entry: MealEntry = {
      id: session.editing?.id ?? crypto.randomUUID(), date: session.date, category, items,
      createdAt: session.editing?.createdAt ?? now, updatedAt: now,
    };
    savingRef.current = true; setSaving(true); setError("");
    try { await onSave(entry); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ثبت وعده ممکن نشد. دوباره تلاش کن."); savingRef.current = false; setSaving(false); }
  };
  return <div className="editor-page meal-editor-page">
    <button type="button" className="back-link" onClick={onCancel}><ArrowRight size={18} /> بازگشت</button>
    <PageTitle eyebrow="ثبت وعده" title={session.editing ? "ویرایش وعده" : "امروز چی خوردی؟"}
      description={`${session.date === todayKey() ? "امروز" : "روز انتخاب‌شده"} · ${persianDate(session.date)}`} />
    <div className="editor-card">
      <div className="field"><label className="field-label" htmlFor="meal-category">این غذا مربوط به کدوم وعده است؟</label>
        <select id="meal-category" className="input select" value={category} onChange={(event) => setCategory(event.target.value as MealCategory)}>{MEAL_CATEGORIES.map((item) => <option key={item} value={item}>{mealLabels[item]}</option>)}</select></div>
      <div className="subsection-heading"><h2>غذاهای این وعده</h2><p className="muted small">برای هر غذا مقدار رو با همون واحدی که تعریف کردی وارد کن.</p></div>
      {items.length === 0 ? <div className="empty-inline">هنوز غذایی انتخاب نکردی. از فهرست پایین اضافه کن.</div> : <div className="selected-foods">{items.map((item) => {
        const nutrition = scaleNutrition(item.nutritionPerServing, item.quantity / item.referenceServingSize);
        const image = images.get(item.foodId);
        return <div className="selected-food" key={item.id}>
          <div className="selected-food-top">{image ? <img src={image} alt="" className="selected-food-image" /> : <span className="selected-food-image selected-food-placeholder"><Utensils size={17} /></span>}
            <div className="selected-food-name"><strong>{item.nameSnapshot}</strong><span>هر {faNumber(item.referenceServingSize, 1)} {item.unit} · {faNumber(item.nutritionPerServing.calories)} کالری</span></div>
            <button type="button" className="icon-button danger-hover" onClick={() => remove(item.id)} aria-label={`حذف ${item.nameSnapshot} از وعده`}><Trash2 size={17} /></button></div>
          <div className="selected-food-bottom"><div className="quantity-wrap"><label htmlFor={`quantity-${item.id}`}>مقدار</label><input id={`quantity-${item.id}`} type="text" inputMode="decimal" className="input quantity-input" value={item.quantity || ""} onChange={(event) => changeQuantity(item.id, event.target.value)} /><span>{item.unit}</span></div>
            <select className="input select role-select" value={item.role} aria-label={`نقش ${item.nameSnapshot}`} onChange={(event) => changeRole(item.id, event.target.value as "main" | "side")}><option value="main">غذای اصلی</option><option value="side">مخلفات</option></select>
            <strong className="item-calorie">{faNumber(nutrition.calories)} <small>کالری</small></strong></div>
        </div>;
      })}</div>}
      <div className="live-summary"><div className="live-summary-main"><span>مجموع وعده</span><strong>{faNumber(total.calories)} <small>کالری</small></strong></div>
        <div className="live-macros"><span>پروتئین <b>{faNumber(total.protein, 1)} گرم</b></span><span>کربوهیدرات <b>{faNumber(total.carbs, 1)} گرم</b></span><span>چربی <b>{faNumber(total.fat, 1)} گرم</b></span></div>
        {items.length > 0 && (total.protein === null || total.carbs === null || total.fat === null) && <small className="muted">مقدار نامشخص یعنی ارزش غذایی بعضی غذاها ثبت نشده است.</small>}</div>
      <div className="library-in-meal"><div className="subsection-heading"><h2>از غذاهای من انتخاب کن</h2><button type="button" className="inline-link" onClick={() => onCreateFood(category, items)}><Plus size={17} /> غذای تازه بساز</button></div>
        <div className="search-wrap"><Search size={18} /><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی غذا یا دستور..." aria-label="جستجوی غذا برای وعده" />{query && <button type="button" className="icon-button" onClick={() => setQuery("")} aria-label="پاک کردن جستجو"><X size={17} /></button>}</div>
        {matching.length === 0 ? <p className="library-empty">{foods.length === 0 ? "هنوز غذایی نداری. اول یک غذا بساز." : "غذایی با این نام پیدا نشد."}</p> :
          <div className="selectable-foods">{matching.map((food) => <div className="selectable-food" key={food.id}>
            {food.image ? <img src={food.image} alt="" /> : <span className="selectable-placeholder"><Utensils size={18} /></span>}
            <div><strong>{food.name}</strong><small>{faNumber(food.nutrition.calories)} کالری / {faNumber(food.servingSize, 1)} {food.unit}{food.kind === "recipe" ? " · دستور غذا" : ""}</small></div>
            <button type="button" className="icon-button add-select" aria-label={`افزودن ${food.name}`} title="افزودن" onClick={() => add(food)}><Plus size={20} /></button>
          </div>)}</div>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button button-primary" onClick={save} disabled={saving}>{saving ? "در حال ثبت..." : session.editing ? "ذخیرهٔ وعده" : "ثبت وعده"}</button>
        <button type="button" className="button button-quiet" onClick={() => { searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); searchRef.current?.focus(); }}>ویرایش انتخاب‌ها</button>
        <button type="button" className="button button-text" onClick={onCancel} disabled={saving}>انصراف</button></div>
    </div>
  </div>;
}
