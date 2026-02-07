
export interface Recipe {
  title: string;
  ingredients: string[];
  steps: string[];
  tips?: string;
}

export interface RecipeState {
  loading: boolean;
  content: string;
  image: string | null;
  error: string | null;
}
