export interface Workshop {
  id: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: "Drones" | "Robotics" | "AI" | "Fabrication" | "Racing" | "Software";
  categoryAr: string;
  duration: number;
  date: string;
  presenter: string;
  videoUrl: string;
}

export const CATEGORY_COLORS: Record<Workshop["category"], string> = {
  Drones: "var(--cat-drones)",
  Robotics: "var(--cat-robotics)",
  AI: "var(--cat-ai)",
  Fabrication: "var(--cat-fabrication)",
  Racing: "var(--cat-racing)",
  Software: "var(--cat-software)",
};

// Public workshops are sourced exclusively from the database via
// /api/workshops/public. The static array below stays empty so a fresh
// install ships with no fake content; the workshops dashboard is where
// committee leaders publish real recorded sessions.
export const workshops: Workshop[] = [];
