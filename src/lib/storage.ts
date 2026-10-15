import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  ACTIVITIES, DIETS, FOOD_CATEGORIES, GOALS, MEAL_CATEGORIES, SERVING_UNITS, TRACKING_METRICS,
  dateFromKey, dateKey,
  type AppPreferences, type AppSnapshot, type DailyGoals, type Food, type MealEntry,
  type Nutrition, type OnboardingDraft, type RecipeComponent, type UserProfile, type WaterEntry,
} from "./models";

interface KalinoDB extends DBSchema {
  profile: { key: string; value: UserProfile };
  goals: { key: string; value: DailyGoals };
  preferences: { key: string; value: AppPreferences };
  foods: { key: string; value: Food };
  meals: { key: string; value: MealEntry };
  water: { key: string; value: WaterEntry };
  onboarding: { key: string; value: OnboardingDraft };
}
const STORES = ["profile", "goals", "preferences", "foods", "meals", "water", "onboarding"] as const;
let databasePromise: Promise<IDBPDatabase<KalinoDB>> | null = null;
const database = (): Promise<IDBPDatabase<KalinoDB>> => {
  if (!databasePromise) databasePromise = openDB<KalinoDB>("kalino-local-v1", 1, {
    upgrade(db) {
      for (const store of STORES) if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
    },
    terminated() { databasePromise = null; },
  }).catch((error: unknown) => { databasePromise = null; throw error; });
  return databasePromise;
};

export async function loadSnapshot(): Promise<AppSnapshot> {
  const db = await database();
  const [profile, goals, preferences, foods, meals, water, draft] = await Promise.all([
    db.get("profile", "main"), db.get("goals", "main"), db.get("preferences", "main"),
    db.getAll("foods"), db.getAll("meals"), db.getAll("water"), db.get("onboarding", "main"),
  ]);
  return { profile: profile ?? null, goals: goals ?? null, preferences: preferences ?? null,
    foods, meals, water, draft: draft ?? null };
}
export async function saveDraft(draft: OnboardingDraft) { await (await database()).put("onboarding", draft, "main"); }
export async function completeOnboarding(profile: UserProfile, goals: DailyGoals, preferences: AppPreferences) {
  const db = await database();
  const tx = db.transaction(["profile", "goals", "preferences", "onboarding"], "readwrite");
  tx.objectStore("profile").put(profile, "main");
  tx.objectStore("goals").put(goals, "main");
  tx.objectStore("preferences").put(preferences, "main");
  tx.objectStore("onboarding").clear();
  await tx.done;
}
export async function saveProfile(profile: UserProfile) { await (await database()).put("profile", profile, "main"); }
export async function saveGoalsAndProfile(goals: DailyGoals, profile: UserProfile) {
  const db = await database();
  const tx = db.transaction(["goals", "profile"], "readwrite");
  tx.objectStore("goals").put(goals, "main");
  tx.objectStore("profile").put(profile, "main");
  await tx.done;
}
export async function savePreferences(preferences: AppPreferences, profile: UserProfile) {
  const db = await database();
  const tx = db.transaction(["preferences", "profile"], "readwrite");
  tx.objectStore("preferences").put(preferences, "main");
  tx.objectStore("profile").put(profile, "main");
  await tx.done;
}
export async function putFood(food: Food) { await (await database()).put("foods", food, food.id); }
export async function removeFood(id: string) { await (await database()).delete("foods", id); }
export async function putMeal(meal: MealEntry) { await (await database()).put("meals", meal, meal.id); }
export async function removeMeal(id: string) { await (await database()).delete("meals", id); }
export async function putWater(entry: WaterEntry) { await (await database()).put("water", entry, entry.date); }

export interface BackupFile {
  app: "kalino";
  version: 1;
  exportedAt: string;
  data: AppSnapshot;
}
export function createBackup(data: AppSnapshot): BackupFile {
  return { app: "kalino", version: 1, exportedAt: new Date().toISOString(), data };
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 500): value is string => typeof value === "string" && value.length <= max;
const id = (value: unknown): value is string => text(value, 150) && value.length > 0;
const number = (value: unknown, min = 0, max = 1_000_000): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const nullableNumber = (value: unknown, min = 0, max = 1_000_000) => value === null || number(value, min, max);
const oneOf = <T extends string>(value: unknown, values: readonly T[]): value is T => typeof value === "string" && values.includes(value as T);
const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(dateFromKey(value)) === value;
const timestamp = (value: unknown): value is string => text(value, 60) && !Number.isNaN(Date.parse(value));
const validNutrition = (value: unknown, requireCalories = false): value is Nutrition =>
  object(value) && nullableNumber(value.calories) && (!requireCalories || number(value.calories)) &&
  nullableNumber(value.protein) && nullableNumber(value.carbs) && nullableNumber(value.fat);
const validImage = (value: unknown) => value === null ||
  (text(value, 8_000_000) && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value));
const validComponent = (value: unknown): value is RecipeComponent => object(value) && id(value.id) && id(value.foodId) &&
  text(value.nameSnapshot, 120) && number(value.quantity, 0.001, 100_000) &&
  oneOf(value.unit, SERVING_UNITS) && number(value.referenceServingSize, 0.001, 100_000) &&
  validNutrition(value.nutritionPerServing, true) && oneOf(value.role, ["main", "side"] as const);
const validFood = (value: unknown): value is Food => object(value) && id(value.id) &&
  text(value.name, 120) && value.name.trim().length > 0 && oneOf(value.category, FOOD_CATEGORIES) &&
  oneOf(value.kind, ["food", "recipe"] as const) && validNutrition(value.nutrition, true) &&
  number(value.servingSize, 0.001, 100_000) && oneOf(value.unit, SERVING_UNITS) &&
  nullableNumber(value.weightGrams) && text(value.description, 1000) && validImage(value.image) &&
  Array.isArray(value.recipeComponents) && value.recipeComponents.length <= 200 && value.recipeComponents.every(validComponent) &&
  timestamp(value.createdAt) && timestamp(value.updatedAt);
const validMealItem = (value: unknown) => object(value) && id(value.id) && id(value.foodId) &&
  text(value.nameSnapshot, 120) && number(value.quantity, 0.001, 100_000) &&
  number(value.referenceServingSize, 0.001, 100_000) && oneOf(value.unit, SERVING_UNITS) &&
  validNutrition(value.nutritionPerServing, true) && oneOf(value.role, ["main", "side"] as const);
const validMeal = (value: unknown): value is MealEntry => object(value) && id(value.id) && validDate(value.date) &&
  oneOf(value.category, MEAL_CATEGORIES) && Array.isArray(value.items) &&
  value.items.length > 0 && value.items.length <= 200 && value.items.every(validMealItem) &&
  timestamp(value.createdAt) && timestamp(value.updatedAt);
const validProfile = (value: unknown): value is UserProfile => object(value) && text(value.name, 80) &&
  value.name.trim().length > 0 && nullableNumber(value.age, 13, 110) &&
  nullableNumber(value.heightCm, 100, 250) && nullableNumber(value.currentWeightKg, 25, 400) &&
  oneOf(value.goal, GOALS) && oneOf(value.activity, ACTIVITIES) &&
  nullableNumber(value.targetWeightKg, 25, 400) && oneOf(value.dietaryPreference, DIETS) &&
  timestamp(value.createdAt) && timestamp(value.updatedAt) && value.onboardingCompleted === true;
const validGoals = (value: unknown): value is DailyGoals => object(value) &&
  nullableNumber(value.calories, 0, 20_000) && nullableNumber(value.protein, 0, 2_000) &&
  nullableNumber(value.carbs, 0, 2_000) && nullableNumber(value.fat, 0, 2_000) &&
  nullableNumber(value.waterMl, 0, 20_000) && oneOf(value.calorieOrigin, ["recommended", "manual", "none"] as const);
const validPrefs = (value: unknown): value is AppPreferences => object(value) &&
  Array.isArray(value.highlighted) && value.highlighted.length <= 5 &&
  value.highlighted.every((metric: unknown) => oneOf(metric, TRACKING_METRICS));
const validDraft = (value: unknown): value is OnboardingDraft => object(value) &&
  number(value.step, 0, 8) && Number.isInteger(value.step) &&
  text(value.name, 80) && text(value.age, 20) && text(value.heightCm, 20) &&
  text(value.currentWeightKg, 20) && text(value.targetWeightKg, 20) &&
  (value.goal === null || oneOf(value.goal, GOALS)) && (value.activity === null || oneOf(value.activity, ACTIVITIES)) &&
  (value.dietaryPreference === null || oneOf(value.dietaryPreference, DIETS)) &&
  Array.isArray(value.highlighted) && value.highlighted.length <= 5 &&
  value.highlighted.every((metric: unknown) => oneOf(metric, TRACKING_METRICS));
const validWater = (value: unknown): value is WaterEntry => object(value) && validDate(value.date) &&
  number(value.amountMl, 0, 100_000) && timestamp(value.updatedAt);
const unique = <T>(values: T[], getKey: (value: T) => string) => new Set(values.map(getKey)).size === values.length;

export function parseBackup(json: string): BackupFile {
  let value: unknown;
  try { value = JSON.parse(json); } catch { throw new Error("این فایل JSON معتبر نیست."); }
  if (!object(value) || value.app !== "kalino" || value.version !== 1 || !object(value.data)) {
    throw new Error("این فایل پشتیبان کالینو نیست یا نسخهٔ آن پشتیبانی نمی‌شود.");
  }
  const data = value.data;
  if (!timestamp(value.exportedAt) ||
    !(data.profile === null || validProfile(data.profile)) ||
    !(data.goals === null || validGoals(data.goals)) ||
    !(data.preferences === null || validPrefs(data.preferences)) ||
    !(data.draft === null || validDraft(data.draft)) ||
    !Array.isArray(data.foods) || data.foods.length > 10_000 || !data.foods.every(validFood) || !unique(data.foods as Food[], (v) => v.id) ||
    !Array.isArray(data.meals) || data.meals.length > 50_000 || !data.meals.every(validMeal) || !unique(data.meals as MealEntry[], (v) => v.id) ||
    !Array.isArray(data.water) || data.water.length > 50_000 || !data.water.every(validWater) || !unique(data.water as WaterEntry[], (v) => v.date)) {
    throw new Error("ساختار فایل پشتیبان معتبر نیست. هیچ داده‌ای جایگزین نشد.");
  }
  return value as unknown as BackupFile;
}

export async function replaceAll(data: AppSnapshot): Promise<void> {
  const db = await database();
  const tx = db.transaction(STORES, "readwrite");
  for (const store of STORES) tx.objectStore(store).clear();
  if (data.profile) tx.objectStore("profile").put(data.profile, "main");
  if (data.goals) tx.objectStore("goals").put(data.goals, "main");
  if (data.preferences) tx.objectStore("preferences").put(data.preferences, "main");
  if (data.draft) tx.objectStore("onboarding").put(data.draft, "main");
  for (const food of data.foods) tx.objectStore("foods").put(food, food.id);
  for (const meal of data.meals) tx.objectStore("meals").put(meal, meal.id);
  for (const entry of data.water) tx.objectStore("water").put(entry, entry.date);
  await tx.done;
}
export async function clearAll(): Promise<void> {
  const db = await database();
  const tx = db.transaction(STORES, "readwrite");
  for (const store of STORES) tx.objectStore(store).clear();
  await tx.done;
}
