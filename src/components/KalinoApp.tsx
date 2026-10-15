"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  dateKey, itemFromFood, mealLabels, recommendCalories, todayKey, validNumber,
  type AppPreferences, type AppSnapshot, type DailyGoals, type Food, type MealCategory,
  type MealEntry, type MealEntryItem, type OnboardingDraft, type UserProfile, type WaterEntry,
} from "@/lib/models";
import {
  clearAll, completeOnboarding, createBackup, loadSnapshot, putFood, putMeal, putWater,
  removeFood, removeMeal, replaceAll, saveGoalsAndProfile, savePreferences, saveProfile,
  type BackupFile,
} from "@/lib/storage";
import { FoodForm } from "./FoodForm";
import { FoodsLibrary } from "./Foods";
import { HomeDashboard } from "./Home";
import { MealEditor, type MealSession } from "./MealEditor";
import { Onboarding } from "./Onboarding";
import { ProgressPage } from "./Progress";
import { SettingsPage } from "./Settings";
import { BottomNav, Brand, ConfirmDialog, type Confirmation, type Section } from "./ui";

type View = Section | "food-form" | "meal-editor";
const emptySnapshot: AppSnapshot = { profile: null, goals: null, preferences: null, foods: [], meals: [], water: [], draft: null };
const defaultGoals: DailyGoals = { calories: null, protein: null, carbs: null, fat: null, waterMl: null, calorieOrigin: "none" };
const defaultPreferences: AppPreferences = { highlighted: ["calories", "protein", "carbs", "fat"] };
function defaultMealCategory(): MealCategory {
  const hour = new Date().getHours();
  return hour < 11 ? "breakfast" : hour < 16 ? "lunch" : hour < 21 ? "dinner" : "snack";
}

export default function KalinoApp() {
  const [stage, setStage] = useState<"loading" | "onboarding" | "ready" | "error">("loading");
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);
  const [view, setView] = useState<View>("home");
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [mealSession, setMealSession] = useState<MealSession | null>(null);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [foodFormReturn, setFoodFormReturn] = useState<"foods" | "meal">("foods");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const { profile, goals, preferences, foods, meals, water } = snapshot;

  const handleLoaded = useCallback((loaded: AppSnapshot) => {
    setSnapshot(loaded);
    setStage(loaded.profile?.onboardingCompleted ? "ready" : "onboarding");
  }, []);
  const handleLoadError = useCallback(() => {
    setLoadError("دسترسی به حافظهٔ مرورگر ممکن نشد. برای ذخیرهٔ اطلاعات، فضای ذخیره‌سازی این مرورگر رو فعال کن و دوباره تلاش کن.");
    setStage("error");
  }, []);
  useEffect(() => {
    let active = true;
    loadSnapshot().then((loaded) => { if (active) handleLoaded(loaded); }, () => { if (active) handleLoadError(); });
    return () => { active = false; };
  }, [handleLoaded, handleLoadError]);
  const retryLoad = async () => {
    setStage("loading");
    try { handleLoaded(await loadSnapshot()); } catch { handleLoadError(); }
  };
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(""), 3800); return () => window.clearTimeout(timer); } }, [toast]);
  const notify = (message: string) => setToast(message);
  const go = (section: Section) => { setView(section); window.scrollTo({ top: 0, behavior: "auto" }); };
  const goToGoals = () => { go("settings"); window.setTimeout(() => document.getElementById("goals")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  const finishOnboarding = async (draft: OnboardingDraft) => {
    const age = validNumber(draft.age, 13, 110, true);
    const heightCm = validNumber(draft.heightCm, 100, 250);
    const currentWeightKg = validNumber(draft.currentWeightKg, 25, 400);
    if (!draft.name.trim() || age === null || heightCm === null || currentWeightKg === null || !draft.goal || !draft.activity || !draft.dietaryPreference || !draft.highlighted.length) {
      throw new Error("بعضی پاسخ‌ها کامل نیستن. لطفاً سؤال‌ها رو بررسی کن.");
    }
    const targetWeightKg = draft.targetWeightKg.trim() ? validNumber(draft.targetWeightKg, 25, 400) : null;
    if (draft.targetWeightKg.trim() && targetWeightKg === null) throw new Error("وزن هدف معتبر نیست.");
    const now = new Date().toISOString();
    const nextProfile: UserProfile = { name: draft.name.trim(), age, heightCm, currentWeightKg,
      goal: draft.goal, activity: draft.activity, targetWeightKg, dietaryPreference: draft.dietaryPreference,
      createdAt: now, updatedAt: now, onboardingCompleted: true };
    const recommended = draft.goal === "track" ? null : recommendCalories(nextProfile);
    const nextGoals: DailyGoals = { ...defaultGoals, calories: recommended, calorieOrigin: recommended !== null ? "recommended" : "none" };
    const nextPreferences: AppPreferences = { highlighted: draft.highlighted };
    await completeOnboarding(nextProfile, nextGoals, nextPreferences);
    setSnapshot((current) => ({ ...current, profile: nextProfile, goals: nextGoals, preferences: nextPreferences, draft: null }));
    setSelectedDate(todayKey()); setStage("ready"); go("home");
  };
  const openMeal = (category: MealCategory = defaultMealCategory(), food?: Food, returnSection: "home" | "foods" = "home") => {
    setMealSession({ date: selectedDate, category, editing: null, items: food ? [itemFromFood(food)] : [], returnSection });
    setView("meal-editor"); window.scrollTo(0, 0);
  };
  const editMeal = (entry: MealEntry) => {
    setMealSession({ date: entry.date, category: entry.category, editing: entry, items: entry.items, returnSection: "home" });
    setView("meal-editor"); window.scrollTo(0, 0);
  };
  const saveMeal = async (entry: MealEntry) => {
    await putMeal(entry);
    setSnapshot((current) => ({ ...current, meals: [...current.meals.filter((meal) => meal.id !== entry.id), entry] }));
    setSelectedDate(entry.date); setMealSession(null); go("home"); notify("وعده با موفقیت ذخیره شد.");
  };
  const deleteMeal = (entry: MealEntry) => setConfirmation({ title: "این وعده حذف بشه؟", message: `وعدهٔ ${mealLabels[entry.category]} و همهٔ غذاهای داخلش از این روز حذف می‌شن.`,
    confirmLabel: "حذف وعده", destructive: true, onConfirm: async () => {
      await removeMeal(entry.id);
      setSnapshot((current) => ({ ...current, meals: current.meals.filter((meal) => meal.id !== entry.id) })); notify("وعده حذف شد.");
    } });
  const openFoodForm = (initial?: Food | null) => { setEditingFood(initial ?? null); setFoodFormReturn("foods"); setView("food-form"); window.scrollTo(0, 0); };
  const newFoodFromMeal = (category: MealCategory, items: MealEntryItem[]) => {
    setMealSession((current) => current ? { ...current, category, items } : current);
    setEditingFood(null); setFoodFormReturn("meal"); setView("food-form"); window.scrollTo(0, 0);
  };
  const saveFood = async (food: Food) => {
    await putFood(food);
    setSnapshot((current) => ({ ...current, foods: [...current.foods.filter((item) => item.id !== food.id), food] }));
    if (foodFormReturn === "meal") {
      setMealSession((current) => current ? { ...current, items: [...current.items, itemFromFood(food, current.items.some((item) => item.role === "main") ? "side" : "main")] } : current);
      setView("meal-editor");
    } else go("foods");
    notify(editingFood ? "غذا ویرایش شد." : "غذا به کتابخانه اضافه شد.");
  };
  const duplicateFood = async (food: Food) => {
    try {
      const now = new Date().toISOString();
      const copy: Food = { ...food, id: crypto.randomUUID(), name: `${food.name} (نسخه)`, createdAt: now, updatedAt: now,
        recipeComponents: food.recipeComponents.map((component) => ({ ...component, id: crypto.randomUUID() })) };
      await putFood(copy); setSnapshot((current) => ({ ...current, foods: [...current.foods, copy] })); notify("یک نسخه از غذا ساخته شد.");
    } catch { notify("ساخت نسخه ممکن نشد. فضای مرورگر رو بررسی کن."); }
  };
  const deleteFood = (food: Food) => setConfirmation({ title: "این غذا حذف بشه؟", message: `«${food.name}» از کتابخانه پاک می‌شه. وعده‌های قدیمی با ارزش غذایی ذخیره‌شده‌شون باقی می‌مونن.`,
    confirmLabel: "حذف غذا", destructive: true, onConfirm: async () => {
      await removeFood(food.id);
      setSnapshot((current) => ({ ...current, foods: current.foods.filter((item) => item.id !== food.id) })); notify("غذا از کتابخانه حذف شد.");
    } });
  const changeWater = async (date: string, delta: number) => {
    const existing = snapshot.water.find((item) => item.date === date);
    const amountMl = Math.max(0, (existing?.amountMl ?? 0) + delta);
    if (amountMl > 100_000) throw new Error("مقدار آب این روز بیش از حد مجاز است.");
    const entry: WaterEntry = { date, amountMl, updatedAt: new Date().toISOString() };
    await putWater(entry);
    setSnapshot((current) => ({ ...current, water: [...current.water.filter((item) => item.date !== date), entry] }));
  };
  const updateProfile = async (updated: UserProfile) => { await saveProfile(updated); setSnapshot((current) => ({ ...current, profile: updated })); };
  const updateGoals = async (updatedProfile: UserProfile, updatedGoals: DailyGoals) => {
    await saveGoalsAndProfile(updatedGoals, updatedProfile);
    setSnapshot((current) => ({ ...current, profile: updatedProfile, goals: updatedGoals }));
  };
  const updatePreferences = async (updatedProfile: UserProfile, updatedPreferences: AppPreferences) => {
    await savePreferences(updatedPreferences, updatedProfile);
    setSnapshot((current) => ({ ...current, profile: updatedProfile, preferences: updatedPreferences }));
  };
  const exportBackup = () => {
    try {
      const blob = new Blob([JSON.stringify(createBackup(snapshot), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `kalino-backup-${dateKey(new Date())}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      notify("فایل پشتیبان آمادهٔ دانلود است.");
    } catch { notify("ساخت فایل پشتیبان ممکن نشد."); }
  };
  const importBackup = async (backup: BackupFile) => {
    await replaceAll(backup.data);
    const restored = await loadSnapshot();
    setSnapshot(restored); setSelectedDate(todayKey()); setMealSession(null); setStage(restored.profile ? "ready" : "onboarding"); go("home");
    notify("اطلاعات پشتیبان بازیابی شد.");
  };
  const deleteEverything = async () => {
    await clearAll(); setSnapshot(emptySnapshot); setMealSession(null); setSelectedDate(todayKey()); setView("home"); setStage("onboarding");
  };

  if (stage === "loading") return <div className="splash-screen"><div className="splash-inner"><Brand large /><p>تغذیهٔ آگاهانه، زندگی متعادل</p><span className="splash-line" /></div></div>;
  if (stage === "error") return <div className="storage-error"><Brand large /><p>{loadError}</p><button className="button button-primary" type="button" onClick={() => void retryLoad()}><ArrowRight size={18} /> دوباره تلاش کن</button></div>;
  if (stage === "onboarding") return <Onboarding initialDraft={snapshot.draft} onFinish={finishOnboarding} />;
  if (!profile) return null;
  const activeSection: Section = view === "food-form" ? foodFormReturn === "meal" ? "home" : "foods" : view === "meal-editor" ? mealSession?.returnSection ?? "home" : view;
  return <div className="app-shell"><main className="app-content" id="main-content">
    {view === "home" && <HomeDashboard profile={profile} goals={goals} preferences={preferences ?? defaultPreferences} foods={foods} meals={meals} water={water} date={selectedDate}
      onDateChange={setSelectedDate} onAddMeal={(category) => openMeal(category)} onEditMeal={editMeal} onDeleteMeal={deleteMeal} onWaterChange={changeWater}
      onNavigate={(destination) => { if (destination === "meal") openMeal(); else if (destination === "settings") goToGoals(); else go("foods"); }} />}
    {view === "foods" && <FoodsLibrary foods={foods} dietaryPreference={profile.dietaryPreference} onNew={() => openFoodForm()} onEdit={openFoodForm} onDuplicate={duplicateFood} onDelete={deleteFood}
      onAddToMeal={(food) => openMeal(food.category === "breakfast" || food.category === "lunch" || food.category === "dinner" || food.category === "snack" ? food.category : defaultMealCategory(), food, "foods")} />}
    {view === "progress" && <ProgressPage date={selectedDate} onDateChange={setSelectedDate} meals={meals} goals={goals} />}
    {view === "settings" && <SettingsPage profile={profile} goals={goals ?? defaultGoals} preferences={preferences ?? defaultPreferences}
      onSaveProfile={updateProfile} onSaveGoals={updateGoals} onSavePreferences={updatePreferences}
      onExport={exportBackup} onImport={importBackup} onDeleteAll={deleteEverything} onAskConfirm={setConfirmation} />}
    {view === "food-form" && <FoodForm key={editingFood?.id ?? `new-${foodFormReturn}`} foods={foods} initial={editingFood} onSave={saveFood}
      onCancel={() => { if (foodFormReturn === "meal" && mealSession) setView("meal-editor"); else go("foods"); }} />}
    {view === "meal-editor" && mealSession && <MealEditor key={`${mealSession.editing?.id ?? "new"}-${mealSession.items.map((item) => item.id).join("-")}`} session={mealSession} foods={foods} onSave={saveMeal}
      onCancel={() => go(mealSession.returnSection)} onCreateFood={newFoodFromMeal} />}
  </main><BottomNav active={activeSection} onNavigate={go} />
    {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
