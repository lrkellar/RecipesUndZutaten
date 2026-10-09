export interface IngredientRow {
  group: string;
  quantity: number | null;
  unit: string;
  name: string;
  prep: string;
  optional: boolean;
}

export interface StepRow {
  text: string;
  timer_seconds: number | null;
  temperature: string;
}

export interface ToolRow {
  name: string;
  spec: string;
  optional: boolean;
}

/** Everything that counts as "primary instructions" and is snapshotted per version. */
export interface VersionContent {
  description: string;
  source_url: string;
  source_text: string;
  needs_review: boolean;
  yield_text: string;
  active_min: number | null;
  passive_min: number | null;
  total_min: number | null;
  course: string;
  cuisine: string;
  tags: string[];
  tips: string;
  storage: string;
  ingredients: IngredientRow[];
  steps: StepRow[];
  tools: ToolRow[];
}

export interface RecipeSummary {
  id: number;
  name: string;
  dish: string;
  label: string;
  status: string;
  total_min: number | null;
}

export interface VersionInfo {
  id: number;
  label: string;
  saved_at: string;
  parent_version_id: number | null;
}

export interface RecipeDetail {
  id: number;
  name: string;
  dish: string;
  status: string;
  currentVersionId: number;
  label: string;
  content: VersionContent;
  versions: VersionInfo[];
}

export function emptyContent(): VersionContent {
  return {
    description: '', source_url: '', source_text: '', needs_review: false,
    yield_text: '', active_min: null, passive_min: null, total_min: null,
    course: '', cuisine: '', tags: [], tips: '', storage: '',
    ingredients: [{ group: '', quantity: null, unit: '', name: '', prep: '', optional: false }],
    steps: [{ text: '', timer_seconds: null, temperature: '' }],
    tools: []
  };
}
