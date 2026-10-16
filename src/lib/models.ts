export const MEAL_CATEGORIES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];
export const FOOD_CATEGORIES = [...MEAL_CATEGORIES, "drink", "side", "other"] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];
export const SERVING_UNITS = ["عدد", "پیمانه", "گرم", "میلی‌لیتر", "برش", "قاشق غذاخوری", "قاشق چای‌خوری", "واحد سفارشی"] as const;
export type ServingUnit = (typeof SERVING_UNITS)[number];
export const GOALS = ["lose", "maintain", "gain", "track"] as const;
export type GoalType = (typeof GOALS)[number];
export const ACTIVITIES = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type Activity = (typeof ACTIVITIES)[number];
export const DIETS = ["none", "vegetarian", "vegan", "mediterranean", "low_carb", "other"] as const;
export type DietaryPreference = (typeof DIETS)[number];
export const TRACKING_METRICS = ["calories", "protein", "carbs", "fat", "water"] as const;
export type TrackingMetric = (typeof TRACKING_METRICS)[number];

export const mealLabels: Record<MealCategory, string> = {
  breakfast: "صبحانه", lunch: "ناهار", dinner: "شام", snack: "میان‌وعده",
};
export const foodLabels: Record<FoodCategory, string> = {
  ...mealLabels, drink: "نوشیدنی", side: "مخلفات", other: "سایر",
};
export const goalLabels: Record<GoalType, string> = {
  lose: "کاهش وزن", maintain: "حفظ وزن", gain: "افزایش وزن", track: "فقط ثبت غذا",
};
export const activityLabels: Record<Activity, string> = {
  sedentary: "کم‌تحرک", light: "فعالیت سبک", moderate: "فعالیت متوسط", active: "فعالیت زیاد", very_active: "فعالیت خیلی زیاد",
};
export const dietLabels: Record<DietaryPreference, string> = {
  none: "بدون محدودیت خاص", vegetarian: "گیاه‌خواری", vegan: "وگان", mediterranean: "رژیم مدیترانه‌ای", low_carb: "کم‌کربوهیدرات", other: "سایر ترجیحات",
};
export const metricLabels: Record<TrackingMetric, string> = {
  calories: "کالری", protein: "پروتئین", carbs: "کربوهیدرات", fat: "چربی", water: "آب",
};

export interface Nutrition {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}
export type NutritionKey = keyof Nutrition;
export const NUTRIENTS: NutritionKey[] = ["calories", "protein", "carbs", "fat"];

export interface UserProfile {
  name: string;
  age: number | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  goal: GoalType;
  activity: Activity;
  targetWeightKg: number | null;
  dietaryPreference: DietaryPreference;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
}
export interface DailyGoals {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  waterMl: number | null;
  calorieOrigin: "recommended" | "manual" | "none";
}
export interface AppPreferences {
  highlighted: TrackingMetric[];
}
export interface RecipeComponent {
  id: string;
  foodId: string;
  nameSnapshot: string;
  quantity: number;
  unit: ServingUnit;
  referenceServingSize: number;
  nutritionPerServing: Nutrition;
  role: "main" | "side";
}
export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  kind: "food" | "recipe";
  nutrition: Nutrition;
  servingSize: number;
  unit: ServingUnit;
  weightGrams: number | null;
  description: string;
  image: string | null;
  recipeComponents: RecipeComponent[];
  createdAt: string;
  updatedAt: string;
}
export interface MealEntryItem {
  id: string;
  foodId: string;
  nameSnapshot: string;
  quantity: number;
  unit: ServingUnit;
  referenceServingSize: number;
  nutritionPerServing: Nutrition;
  role: "main" | "side";
}
export interface MealEntry {
  id: string;
  date: string; // Local Gregorian YYYY-MM-DD; displayed as Persian calendar.
  category: MealCategory;
  items: MealEntryItem[];
  createdAt: string;
  updatedAt: string;
}
export interface WaterEntry {
  date: string;
  amountMl: number;
  updatedAt: string;
}
export interface OnboardingDraft {
  step: number;
  name: string;
  age: string;
  heightCm: string;
  currentWeightKg: string;
  goal: GoalType | null;
  activity: Activity | null;
  targetWeightKg: string;
  dietaryPreference: DietaryPreference | null;
  highlighted: TrackingMetric[];
}
export const emptyDraft: OnboardingDraft = {
  step: 0, name: "", age: "", heightCm: "", currentWeightKg: "", goal: null,
  activity: null, targetWeightKg: "", dietaryPreference: null,
  highlighted: ["calories", "protein", "carbs", "fat"],
};
export interface AppSnapshot {
  profile: UserProfile | null;
  goals: DailyGoals | null;
  preferences: AppPreferences | null;
  foods: Food[];
  meals: MealEntry[];
  water: WaterEntry[];
  draft: OnboardingDraft | null;
}

// Keep full numeric precision while summing; format/round only when displaying values.
export function scaleNutrition(nutrition: Nutrition, factor: number): Nutrition {
  return {
    calories: nutrition.calories === null ? null : nutrition.calories * factor,
    protein: nutrition.protein === null ? null : nutrition.protein * factor,
    carbs: nutrition.carbs === null ? null : nutrition.carbs * factor,
    fat: nutrition.fat === null ? null : nutrition.fat * factor,
  };
}
// Unknown values remain unknown. In particular, an omitted macro is never silently zero.
export function sumNutrition(values: Nutrition[]): Nutrition {
  const sum = (key: NutritionKey) => values.some((value) => value[key] === null)
    ? null
    : values.reduce((total, value) => total + (value[key] ?? 0), 0);
  return { calories: sum("calories"), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat") };
}
export function mealNutrition(entry: MealEntry): Nutrition {
  return sumNutrition(entry.items.map((item) => scaleNutrition(item.nutritionPerServing, item.quantity / item.referenceServingSize)));
}
export function dailyNutrition(meals: MealEntry[], date: string): Nutrition {
  return sumNutrition(meals.filter((entry) => entry.date === date).map(mealNutrition));
}
export function recipeNutrition(components: RecipeComponent[]): Nutrition {
  return sumNutrition(components.map((component) => scaleNutrition(component.nutritionPerServing, component.quantity / component.referenceServingSize)));
}
export function itemFromFood(food: Food, role: "main" | "side" = "main"): MealEntryItem {
  return {
    id: crypto.randomUUID(), foodId: food.id, nameSnapshot: food.name,
    quantity: food.servingSize, unit: food.unit, referenceServingSize: food.servingSize,
    nutritionPerServing: { ...food.nutrition }, role,
  };
}
export function componentFromFood(food: Food, role: "main" | "side"): RecipeComponent {
  return {
    id: crypto.randomUUID(), foodId: food.id, nameSnapshot: food.name,
    quantity: food.servingSize, unit: food.unit, referenceServingSize: food.servingSize,
    nutritionPerServing: { ...food.nutrition }, role,
  };
}

// Mifflin–St Jeor: 10W + 6.25H − 5A + 5 (male) or −161 (female).
// As sex is not collected, use the midpoint of those constants (−78) as a rough,
// non-clinical estimate. Multiply by activity; adjust +/-300 kcal for weight goals.
// The source equation was studied in adults; do not estimate outside ages 19–78.
export function recommendCalories(profile: Pick<UserProfile, "age" | "heightCm" | "currentWeightKg" | "activity" | "goal">): number | null {
  const { age, heightCm: height, currentWeightKg: weight, activity, goal } = profile;
  if (age === null || height === null || weight === null || age < 19 || age > 78 || height < 100 || weight < 25) return null;
  const factors: Record<Activity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const adjustment = goal === "lose" ? -300 : goal === "gain" ? 300 : 0;
  const estimate = (10 * weight + 6.25 * height - 5 * age - 78) * factors[activity] + adjustment;
  return Number.isFinite(estimate) ? Math.round(Math.max(1200, estimate) / 50) * 50 : null;
}

export const faNumber = (value: number | null | undefined, maximumFractionDigits = 0) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "نامشخص"
    : new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
export function parseLocalizedNumber(value: string): number | null {
  const english = value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٫،]/g, ".").replace(/\s/g, "");
  if (!english || !/^\d+(\.\d+)?$/.test(english)) return null;
  const result = Number(english);
  return Number.isFinite(result) ? result : null;
}
export function validNumber(value: string, min: number, max: number, integer = false): number | null {
  const number = parseLocalizedNumber(value);
  return number !== null && number >= min && number <= max && (!integer || Number.isInteger(number)) ? number : null;
}

export function todayKey(): string { return dateKey(new Date()); }
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
export function shiftDate(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}
export function persianDate(key: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", options ?? { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dateFromKey(key));
}
export function startOfWeek(key: string): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() - ((date.getDay() + 1) % 7)); // Saturday
  return dateKey(date);
}
