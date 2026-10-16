"use client";

/* eslint-disable @next/next/no-img-element -- User photos are local data URLs and must bypass server-side optimization. */
import { useRef, useState, type ChangeEvent } from "react";
import { ArrowRight, Camera, ImagePlus, Plus, Trash2, X } from "lucide-react";
import {
  FOOD_CATEGORIES, SERVING_UNITS, componentFromFood, faNumber, foodLabels,
  parseLocalizedNumber, recipeNutrition, validNumber,
  type Food, type FoodCategory, type Nutrition, type RecipeComponent, type ServingUnit,
} from "@/lib/models";
import { LabeledInput, PageTitle } from "./ui";

const maybeNumber = (text: string, max: number): number | null | "invalid" =>
  text.trim() === "" ? null : validNumber(text, 0, max) ?? "invalid";

async function readImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("فقط عکس JPG، PNG یا WebP قابل استفاده است.");
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم عکس باید کمتر از ۵ مگابایت باشه.");
  if (file.size === 0) throw new Error("این فایل تصویر خالی است.");
  // Stored as a real data URL in IndexedDB, never as a temporary object URL.
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("پردازش عکس ممکن نشد.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const url = canvas.toDataURL("image/webp", 0.82);
    if (url.length < 8_000_000) return url;
  } catch { /* Older browsers can still keep the original photo. */ }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("خواندن عکس ممکن نشد."));
    reader.onerror = () => reject(new Error("خواندن عکس ممکن نشد."));
    reader.readAsDataURL(file);
  });
}

export function FoodForm({ foods, initial, onSave, onCancel }: {
  foods: Food[]; initial?: Food | null; onSave: (food: Food) => Promise<void>; onCancel: () => void;
}) {
  const [kind, setKind] = useState<Food["kind"]>(initial?.kind ?? "food");
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<FoodCategory>(initial?.category ?? "other");
  const [calories, setCalories] = useState(initial?.nutrition.calories?.toString() ?? "");
  const [protein, setProtein] = useState(initial?.nutrition.protein?.toString() ?? "");
  const [carbs, setCarbs] = useState(initial?.nutrition.carbs?.toString() ?? "");
  const [fat, setFat] = useState(initial?.nutrition.fat?.toString() ?? "");
  const [servingSize, setServingSize] = useState(initial?.servingSize.toString() ?? "1");
  const [unit, setUnit] = useState<ServingUnit>(initial?.unit ?? "عدد");
  const [weightGrams, setWeightGrams] = useState(initial?.weightGrams?.toString() ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const [components, setComponents] = useState<RecipeComponent[]>(initial?.recipeComponents ?? []);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const availableFoods = foods.filter((food) => food.kind === "food" && food.id !== initial?.id);
  const main = components.find((component) => component.role === "main");
  const sides = components.filter((component) => component.role === "side");
  const computed = recipeNutrition(components);
  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    try { setImage(await readImage(file)); }
    catch (reason) { setPhotoError(reason instanceof Error ? reason.message : "بارگذاری عکس ممکن نشد."); }
  };
  const updateComponent = (id: string, value: string) => {
    const quantity = parseLocalizedNumber(value) ?? 0;
    setComponents((current) => current.map((component) => component.id === id ? { ...component, quantity } : component));
  };
  const selectMain = (id: string) => {
    const food = availableFoods.find((item) => item.id === id);
    if (food) setComponents((current) => [componentFromFood(food, "main"), ...current.filter((item) => item.role === "side")]);
  };
  const addSide = (id: string) => {
    const food = availableFoods.find((item) => item.id === id);
    if (food) setComponents((current) => [...current, componentFromFood(food, "side")]);
  };
  const save = async () => {
    if (savingRef.current) return;
    setError("");
    if (!name.trim() || name.trim().length > 100) { setError("نام غذا رو وارد کن (حداکثر ۱۰۰ حرف)."); return; }
    const serving = validNumber(servingSize, 0.001, 100_000);
    if (serving === null) { setError("اندازهٔ وعده باید عددی بزرگ‌تر از صفر باشه."); return; }
    const weight = weightGrams.trim() ? validNumber(weightGrams, 0.001, 100_000) : null;
    if (weightGrams.trim() && weight === null) { setError("وزن هر وعده رو به گرم و با عدد معتبر وارد کن."); return; }
    if (description.length > 1000) { setError("توضیحات باید کوتاه‌تر از ۱۰۰۰ حرف باشه."); return; }
    let nutrition: Nutrition;
    if (kind === "recipe") {
      if (!main || sides.length < 1) { setError("برای دستور غذا، یک غذای اصلی و حداقل یک مخلفات یا مادهٔ اولیه اضافه کن."); return; }
      if (components.some((component) => component.quantity <= 0 || component.quantity > 100_000)) { setError("مقدار هر جزء باید بزرگ‌تر از صفر باشه."); return; }
      nutrition = recipeNutrition(components);
    } else {
      const kcal = validNumber(calories, 0, 20_000);
      const macros = [maybeNumber(protein, 2000), maybeNumber(carbs, 2000), maybeNumber(fat, 2000)];
      if (kcal === null) { setError("کالری هر وعده رو به صورت عددی بین ۰ تا ۲۰۰۰۰ وارد کن."); return; }
      if (macros.includes("invalid")) { setError("درشت‌مغذی‌ها باید عددی مثبت باشن؛ موارد نامشخص رو خالی بذار."); return; }
      nutrition = { calories: kcal, protein: macros[0] as number | null, carbs: macros[1] as number | null, fat: macros[2] as number | null };
    }
    if (nutrition.calories === null) { setError("کالری مواد اولیه مشخص نیست."); return; }
    const now = new Date().toISOString();
    const food: Food = {
      id: initial?.id ?? crypto.randomUUID(), name: name.trim(), category, kind, nutrition,
      servingSize: serving, unit, weightGrams: weight, description: description.trim(), image,
      recipeComponents: kind === "recipe" ? components : [], createdAt: initial?.createdAt ?? now, updatedAt: now,
    };
    savingRef.current = true; setSaving(true);
    try { await onSave(food); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ذخیرهٔ غذا ممکن نشد. دوباره تلاش کن."); savingRef.current = false; setSaving(false); }
  };
  return <div className="editor-page">
    <button type="button" className="back-link" onClick={onCancel}><ArrowRight size={18} /> بازگشت به {initial ? "غذاها" : "قبل"}</button>
    <PageTitle eyebrow="کتابخانهٔ شخصی" title={initial ? "ویرایش غذا" : "غذای جدید"} description="اطلاعات هر وعده رو یک بار ثبت کن و هر زمان خواستی ازش استفاده کن." />
    <div className="editor-card">
      <div className="segmented" role="group" aria-label="نوع غذا"><button type="button" className={kind === "food" ? "selected" : ""} onClick={() => { setKind("food"); setError(""); }}>غذای ساده</button>
        <button type="button" className={kind === "recipe" ? "selected" : ""} onClick={() => { setKind("recipe"); if (!initial) { setUnit("واحد سفارشی"); setServingSize("1"); } setError(""); }}>دستور غذا</button></div>
      <div className="form-grid">
        <LabeledInput label="نام غذا" value={name} onChange={setName} placeholder={kind === "recipe" ? "مثلاً بشقاب مرغ و برنج" : "مثلاً برنج پخته"} required maxLength={110} />
        <div className="field"><label className="field-label" htmlFor="food-category">دسته‌بندی</label><select id="food-category" className="input select" value={category} onChange={(event) => setCategory(event.target.value as FoodCategory)}>{FOOD_CATEGORIES.map((item) => <option key={item} value={item}>{foodLabels[item]}</option>)}</select></div>
      </div>

      <div className="photo-area"><div className="photo-preview">{image ? <img src={image} alt="پیش‌نمایش عکس غذا" /> : <ImagePlus size={28} strokeWidth={1.5} aria-hidden="true" />}</div>
        <div className="photo-details"><strong>عکس غذا <span className="muted small">(اختیاری)</span></strong><p className="muted small">JPG، PNG یا WebP · حداکثر ۵ مگابایت</p>
          <div className="photo-actions"><label className="button button-quiet button-small" htmlFor="photo-file"><ImagePlus size={16} /> {image ? "جایگزین کردن" : "انتخاب عکس"}</label><input id="photo-file" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} />
            <label className="button button-quiet button-small" htmlFor="photo-camera"><Camera size={16} /> دوربین</label><input id="photo-camera" className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={handleImage} />
            {image && <button type="button" className="button button-text button-small" onClick={() => setImage(null)}><Trash2 size={16} /> حذف عکس</button>}
          </div>{photoError && <p className="field-error" role="alert">{photoError}</p>}</div></div>

      {kind === "recipe" ? <div className="recipe-builder"><div className="subsection-heading"><h2>مواد تشکیل‌دهنده</h2><p className="muted small">کالری هر ماده از کتابخانهٔ غذاهای ساده محاسبه می‌شه.</p></div>
        {availableFoods.length === 0 && components.length === 0 ? <div className="empty-inline">اول چند غذای ساده بساز؛ بعد می‌تونی اون‌ها رو به دستور غذا اضافه کنی.</div> : <>
          <div className="field"><label className="field-label" htmlFor="recipe-main">غذای اصلی <span className="required-mark">*</span></label>
            <select id="recipe-main" className="input select" value={main?.foodId ?? ""} onChange={(event) => selectMain(event.target.value)}>
              <option value="">انتخاب غذای اصلی</option>
              {main && !availableFoods.some((item) => item.id === main.foodId) && <option value={main.foodId}>{main.nameSnapshot} (در کتابخانه نیست)</option>}
              {availableFoods.map((food) => <option key={food.id} value={food.id}>{food.name} · {faNumber(food.nutrition.calories)} کالری / {faNumber(food.servingSize, 1)} {food.unit}</option>)}
            </select></div>
          {main && <ComponentRow component={main} onQuantity={updateComponent} />}
          <div className="field"><label className="field-label" htmlFor="recipe-side">مخلفات یا مواد اولیه <span className="required-mark">*</span></label>
            <select id="recipe-side" className="input select" value="" onChange={(event) => addSide(event.target.value)}><option value="">+ افزودن از غذاهای من</option>
              {availableFoods.map((food) => <option key={food.id} value={food.id}>{food.name} · {faNumber(food.nutrition.calories)} کالری / {faNumber(food.servingSize, 1)} {food.unit}</option>)}
            </select></div>
          {sides.map((component) => <ComponentRow key={component.id} component={component} onQuantity={updateComponent} onRemove={() => setComponents((current) => current.filter((item) => item.id !== component.id))} />)}
          <p className="field-hint">مواد اولیه با مقادیر زمان ساخت ذخیره می‌شن. برای به‌روزرسانی یک ماده، حذفش کن و دوباره اضافه کن.</p>
          <div className="recipe-totals"><strong>ارزش غذایی این دستور</strong><div><span>{faNumber(computed.calories)} <small>کالری</small></span><span>{faNumber(computed.protein, 1)} <small>پروتئین</small></span><span>{faNumber(computed.carbs, 1)} <small>کربوهیدرات</small></span><span>{faNumber(computed.fat, 1)} <small>چربی</small></span></div></div>
        </>}</div> : <div className="nutrition-form"><div className="subsection-heading"><h2>ارزش غذایی هر وعده</h2><p className="muted small">اگر مقدار درشت‌مغذی رو نمی‌دونی، خالی بذار؛ صفر حساب نمی‌شه.</p></div>
        <div className="form-grid nutrition-grid"><LabeledInput label="کالری" value={calories} onChange={setCalories} inputMode="decimal" suffix="کالری" placeholder="مثلاً ۱۸۰" required />
          <LabeledInput label="پروتئین" value={protein} onChange={setProtein} inputMode="decimal" suffix="گرم" placeholder="اختیاری" />
          <LabeledInput label="کربوهیدرات" value={carbs} onChange={setCarbs} inputMode="decimal" suffix="گرم" placeholder="اختیاری" />
          <LabeledInput label="چربی" value={fat} onChange={setFat} inputMode="decimal" suffix="گرم" placeholder="اختیاری" /></div></div>}

      <div className="subsection-heading"><h2>اندازهٔ وعده</h2><p className="muted small">ارزش غذایی بالا برای این اندازه تعریف می‌شه؛ مقدار مصرف بعداً نسبت به همین اندازه حساب می‌شه.</p></div>
      <div className="form-grid"><LabeledInput label="اندازهٔ وعده" value={servingSize} onChange={setServingSize} inputMode="decimal" placeholder="مثلاً ۱ یا ۱۰۰" required />
        <div className="field"><label className="field-label" htmlFor="food-unit">واحد اندازه‌گیری</label><select id="food-unit" className="input select" value={unit} onChange={(event) => setUnit(event.target.value as ServingUnit)}>{SERVING_UNITS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <LabeledInput label="وزن هر وعده (اختیاری)" value={weightGrams} onChange={setWeightGrams} inputMode="decimal" suffix="گرم" placeholder="در صورت نیاز" /></div>
      <div className="field"><label className="field-label" htmlFor="food-description">توضیحات (اختیاری)</label><textarea id="food-description" className="input textarea" value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} placeholder="مثلاً دستور پخت یا نام برند" /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button button-primary" onClick={save} disabled={saving}>{saving ? "در حال ذخیره..." : initial ? "ذخیرهٔ تغییرات" : "ذخیرهٔ غذا"}</button>
        <button type="button" className="button button-quiet" onClick={onCancel} disabled={saving}>انصراف</button></div>
    </div>
  </div>;
}

function ComponentRow({ component, onQuantity, onRemove }: { component: RecipeComponent; onQuantity: (id: string, value: string) => void; onRemove?: () => void }) {
  return <div className="component-row"><div><strong>{component.nameSnapshot}</strong><small className="muted">{component.role === "main" ? "غذای اصلی" : "مخلفات"} · هر {faNumber(component.referenceServingSize, 1)} {component.unit}: {faNumber(component.nutritionPerServing.calories)} کالری</small></div>
    <div className="component-controls"><input type="text" inputMode="decimal" className="input quantity-input" aria-label={`مقدار ${component.nameSnapshot}`} value={component.quantity || ""} onChange={(event) => onQuantity(component.id, event.target.value)} /><span className="muted small">{component.unit}</span>
      {onRemove && <button type="button" className="icon-button danger-hover" onClick={onRemove} aria-label={`حذف ${component.nameSnapshot}`}><X size={17} /></button>}</div></div>;
}
