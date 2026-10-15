"use client";

/* eslint-disable @next/next/no-img-element -- User photos are local data URLs and must bypass server-side optimization. */
import { useMemo, useState } from "react";
import { Copy, Pencil, Plus, Search, Trash2, Utensils, X } from "lucide-react";
import { FOOD_CATEGORIES, dietLabels, faNumber, foodLabels, type DietaryPreference, type Food, type FoodCategory } from "@/lib/models";
import { PageTitle } from "./ui";

const normalize = (value: string) => value.trim().toLocaleLowerCase("fa-IR").replace(/ي/g, "ی").replace(/ك/g, "ک");

export function FoodsLibrary({ foods, dietaryPreference, onNew, onEdit, onDuplicate, onDelete, onAddToMeal }: {
  foods: Food[]; dietaryPreference: DietaryPreference; onNew: () => void; onEdit: (food: Food) => void;
  onDuplicate: (food: Food) => void; onDelete: (food: Food) => void; onAddToMeal: (food: Food) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FoodCategory | "all">("all");
  const filtered = useMemo(() => foods.filter((food) =>
    (category === "all" || food.category === category) &&
    (!query.trim() || normalize(food.name).includes(normalize(query)) || normalize(food.description).includes(normalize(query)))
  ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [foods, query, category]);
  return <div className="foods-page">
    <PageTitle eyebrow="کتابخانهٔ شخصی" title="غذاهای من" description="غذاها و دستورهایی که خودت ساخته‌ای، همیشه همین‌جا هستن."
      action={<button type="button" className="button button-primary add-food-top" onClick={onNew}><Plus size={19} /> افزودن غذا</button>} />
    {dietaryPreference !== "none" && <p className="diet-context">ترجیح غذایی تو: <strong>{dietLabels[dietaryPreference]}</strong> <span>· دسته‌بندی رژیمی غذاها خودکار نیست.</span></p>}
    <div className="search-wrap"><Search size={19} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در غذاها..." aria-label="جستجو در غذاها" />
      {query && <button type="button" className="icon-button" onClick={() => setQuery("")} aria-label="پاک کردن جستجو"><X size={17} /></button>}</div>
    <div className="filter-scroll" role="group" aria-label="فیلتر دسته‌بندی">
      <button type="button" className={`filter-chip ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")}>همه</button>
      {FOOD_CATEGORIES.map((item) => <button type="button" key={item} className={`filter-chip ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{foodLabels[item]}</button>)}
    </div>
    <p className="result-count">{faNumber(filtered.length)} غذا{query || category !== "all" ? " پیدا شد" : " در کتابخانه"}</p>
    {filtered.length === 0 ? <div className="empty-state"><span className="empty-symbol"><Utensils size={26} strokeWidth={1.5} /></span>
      <h2>{foods.length === 0 ? "کتابخانه‌ات هنوز خالیه" : "غذایی پیدا نشد"}</h2>
      <p>{foods.length === 0 ? "اولین غذات رو با مقدار کالری و اندازهٔ وعده بساز؛ بعد می‌تونی در وعده‌هات ثبتش کنی." : "نام یا دسته‌بندی دیگه‌ای رو امتحان کن."}</p>
      {foods.length === 0 && <button type="button" className="button button-primary" onClick={onNew}><Plus size={18} /> افزودن اولین غذا</button>}
    </div> : <div className="food-list">{filtered.map((food) => <FoodCard key={food.id} food={food} onEdit={() => onEdit(food)} onDuplicate={() => onDuplicate(food)} onDelete={() => onDelete(food)} onAdd={() => onAddToMeal(food)} />)}</div>}
  </div>;
}

export function FoodCard({ food, onEdit, onDuplicate, onDelete, onAdd }: {
  food: Food; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onAdd: () => void;
}) {
  return <article className="food-card"><div className="food-card-main">
    {food.image ? <img className="food-thumbnail" src={food.image} alt="" /> : <div className="food-thumbnail food-placeholder"><Utensils size={22} strokeWidth={1.5} /></div>}
    <div className="food-info"><div className="food-title-row"><h2>{food.name}</h2>{food.kind === "recipe" && <span className="type-badge">دستور غذا</span>}</div>
      <p>{foodLabels[food.category]} · هر {faNumber(food.servingSize, 1)} {food.unit}{food.weightGrams !== null ? ` · ${faNumber(food.weightGrams, 1)} گرم` : ""}</p>
      <span className="food-macros">پروتئین {faNumber(food.nutrition.protein, 1)} · کربوهیدرات {faNumber(food.nutrition.carbs, 1)} · چربی {faNumber(food.nutrition.fat, 1)}</span>
    </div><div className="food-calories"><strong>{faNumber(food.nutrition.calories)}</strong><small>کالری</small></div>
  </div>
    <div className="food-actions"><button type="button" className="button button-small button-quiet" onClick={onAdd}><Plus size={17} /> ثبت در وعده</button>
      <div className="food-action-icons"><button type="button" className="icon-button" onClick={onEdit} aria-label={`ویرایش ${food.name}`} title="ویرایش"><Pencil size={17} /></button>
        <button type="button" className="icon-button" onClick={onDuplicate} aria-label={`تکثیر ${food.name}`} title="تکثیر"><Copy size={17} /></button>
        <button type="button" className="icon-button danger-hover" onClick={onDelete} aria-label={`حذف ${food.name}`} title="حذف"><Trash2 size={17} /></button></div></div>
  </article>;
}
