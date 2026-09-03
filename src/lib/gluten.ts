export type Level = "unsafe" | "caution" | "safe";

export type AllergenCategory =
  | "gluten"
  | "dairy"
  | "soy"
  | "eggs"
  | "peanuts"
  | "tree_nuts"
  | "fish"
  | "shellfish"
  | "sesame";

export interface AllergenConfig {
  id: AllergenCategory;
  name: string;
  description: string;
  enabledByDefault: boolean;
}

export const ALLERGEN_OPTIONS: AllergenConfig[] = [
  {
    id: "gluten",
    name: "Gluten & Wheat",
    description: "Wheat, barley, rye, malt, spelt, oats, cross-contact",
    enabledByDefault: true,
  },
  {
    id: "dairy",
    name: "Dairy & Milk",
    description: "Milk, whey, casein, butter, lactose, milk powder",
    enabledByDefault: false,
  },
  {
    id: "soy",
    name: "Soy",
    description: "Soybeans, soy lecithin, edamame, tofu, tamari",
    enabledByDefault: false,
  },
  {
    id: "eggs",
    name: "Eggs",
    description: "Egg whites, yolk, albumin, egg solids, mayonnaise",
    enabledByDefault: false,
  },
  {
    id: "peanuts",
    name: "Peanuts",
    description: "Peanuts, peanut butter, peanut flour, peanut oil",
    enabledByDefault: false,
  },
  {
    id: "tree_nuts",
    name: "Tree Nuts",
    description: "Almond, cashew, walnut, pecan, hazelnut, pistachio",
    enabledByDefault: false,
  },
  {
    id: "sesame",
    name: "Sesame",
    description: "Sesame seeds, tahini, sesame oil, gingelly",
    enabledByDefault: false,
  },
  {
    id: "shellfish",
    name: "Crustaceans & Shellfish",
    description: "Shrimp, crab, lobster, prawn, oyster, clam",
    enabledByDefault: false,
  },
  {
    id: "fish",
    name: "Fish",
    description: "Salmon, tuna, cod, fish sauce, anchovy, gelatin",
    enabledByDefault: false,
  },
];

type Rule = {
  category: AllergenCategory;
  term: string;
  level: Exclude<Level, "safe">;
  note: string;
};

export const RULES: Rule[] = [
  // Gluten / Wheat
  { category: "gluten", term: "wheat", level: "unsafe", note: "Wheat is a primary gluten grain." },
  { category: "gluten", term: "wholewheat", level: "unsafe", note: "Wheat is a primary gluten grain." },
  { category: "gluten", term: "whole wheat", level: "unsafe", note: "Wheat is a primary gluten grain." },
  { category: "gluten", term: "barley", level: "unsafe", note: "Barley is a gluten grain." },
  { category: "gluten", term: "rye", level: "unsafe", note: "Rye is a gluten grain." },
  { category: "gluten", term: "malt", level: "unsafe", note: "Malt is normally barley-derived." },
  { category: "gluten", term: "malt extract", level: "unsafe", note: "Barley-derived malt carries gluten." },
  { category: "gluten", term: "semolina", level: "unsafe", note: "Semolina is milled durum wheat." },
  { category: "gluten", term: "durum", level: "unsafe", note: "Durum is a wheat variety." },
  { category: "gluten", term: "spelt", level: "unsafe", note: "Spelt is an ancient wheat." },
  { category: "gluten", term: "kamut", level: "unsafe", note: "Kamut is a wheat variety." },
  { category: "gluten", term: "farro", level: "unsafe", note: "Farro is a wheat grain." },
  { category: "gluten", term: "einkorn", level: "unsafe", note: "Einkorn is a wheat species." },
  { category: "gluten", term: "triticale", level: "unsafe", note: "A wheat and rye hybrid." },
  { category: "gluten", term: "seitan", level: "unsafe", note: "Seitan is pure wheat gluten." },
  { category: "gluten", term: "couscous", level: "unsafe", note: "Couscous is made from wheat semolina." },
  { category: "gluten", term: "bulgur", level: "unsafe", note: "Bulgur is cracked wheat." },
  { category: "gluten", term: "graham flour", level: "unsafe", note: "Graham flour is a wheat flour." },
  { category: "gluten", term: "brewer's yeast", level: "unsafe", note: "Usually a barley brewing by-product." },
  { category: "gluten", term: "brewers yeast", level: "unsafe", note: "Usually a barley brewing by-product." },
  { category: "gluten", term: "gluten", level: "unsafe", note: "Gluten is declared outright." },
  { category: "gluten", term: "soy sauce", level: "caution", note: "Most traditional soy sauce contains brewed wheat." },
  { category: "gluten", term: "oats", level: "caution", note: "Oats are safe only when certified gluten-free." },
  { category: "gluten", term: "oat", level: "caution", note: "Oats are safe only when certified gluten-free." },
  { category: "gluten", term: "modified food starch", level: "caution", note: "Source unstated — confirm it isn't wheat." },
  { category: "gluten", term: "modified starch", level: "caution", note: "Source unstated — confirm it isn't wheat." },
  { category: "gluten", term: "dextrin", level: "caution", note: "Dextrin can be wheat-derived." },
  { category: "gluten", term: "natural flavour", level: "caution", note: "Flavour blends can hide barley malt." },
  { category: "gluten", term: "natural flavor", level: "caution", note: "Flavour blends can hide barley malt." },
  { category: "gluten", term: "may contain wheat", level: "caution", note: "Cross-contact warning on the label." },
  { category: "gluten", term: "traces of wheat", level: "caution", note: "Cross-contact warning on the label." },
  { category: "gluten", term: "may contain gluten", level: "caution", note: "Cross-contact warning on the label." },
  { category: "gluten", term: "traces of gluten", level: "caution", note: "Cross-contact warning on the label." },
  { category: "gluten", term: "same facility as wheat", level: "caution", note: "Shared-line cross-contact risk." },
  { category: "gluten", term: "starch", level: "caution", note: "Unqualified starch may be wheat starch." },
  { category: "gluten", term: "hydrolysed vegetable protein", level: "caution", note: "Can be wheat-based." },
  { category: "gluten", term: "hydrolyzed vegetable protein", level: "caution", note: "Can be wheat-based." },

  // Dairy
  { category: "dairy", term: "milk", level: "unsafe", note: "Contains dairy milk." },
  { category: "dairy", term: "whey", level: "unsafe", note: "Whey is a dairy protein." },
  { category: "dairy", term: "casein", level: "unsafe", note: "Casein is a primary milk protein." },
  { category: "dairy", term: "caseinate", level: "unsafe", note: "Milk-derived protein." },
  { category: "dairy", term: "lactose", level: "unsafe", note: "Dairy milk sugar." },
  { category: "dairy", term: "butter", level: "unsafe", note: "Contains milk fat." },
  { category: "dairy", term: "cheese", level: "unsafe", note: "Contains dairy." },
  { category: "dairy", term: "cream", level: "unsafe", note: "Contains dairy cream." },
  { category: "dairy", term: "buttermilk", level: "unsafe", note: "Contains dairy." },
  { category: "dairy", term: "ghee", level: "caution", note: "Clarified butter, may contain trace milk solids." },
  { category: "dairy", term: "may contain milk", level: "caution", note: "Milk cross-contact warning." },

  // Soy
  { category: "soy", term: "soy", level: "unsafe", note: "Soy allergen detected." },
  { category: "soy", term: "soya", level: "unsafe", note: "Soy allergen detected." },
  { category: "soy", term: "soybean", level: "unsafe", note: "Soy allergen detected." },
  { category: "soy", term: "soy lecithin", level: "caution", note: "Soy lecithin derivative." },
  { category: "soy", term: "tofu", level: "unsafe", note: "Soybean curd." },
  { category: "soy", term: "edamame", level: "unsafe", note: "Immature soybeans." },
  { category: "soy", term: "tempeh", level: "unsafe", note: "Fermented soybeans." },
  { category: "soy", term: "may contain soy", level: "caution", note: "Soy cross-contact warning." },

  // Eggs
  { category: "eggs", term: "egg", level: "unsafe", note: "Egg allergen detected." },
  { category: "eggs", term: "eggs", level: "unsafe", note: "Egg allergen detected." },
  { category: "eggs", term: "albumin", level: "unsafe", note: "Egg white protein." },
  { category: "eggs", term: "ovalbumin", level: "unsafe", note: "Egg white protein." },
  { category: "eggs", term: "mayonnaise", level: "unsafe", note: "Standard mayonnaise contains egg." },
  { category: "eggs", term: "may contain egg", level: "caution", note: "Egg cross-contact warning." },

  // Peanuts
  { category: "peanuts", term: "peanut", level: "unsafe", note: "Peanut allergen detected." },
  { category: "peanuts", term: "peanuts", level: "unsafe", note: "Peanut allergen detected." },
  { category: "peanuts", term: "arachis oil", level: "unsafe", note: "Peanut oil derivative." },
  { category: "peanuts", term: "may contain peanut", level: "caution", note: "Peanut cross-contact warning." },

  // Tree Nuts
  { category: "tree_nuts", term: "almond", level: "unsafe", note: "Tree nut allergen." },
  { category: "tree_nuts", term: "cashew", level: "unsafe", note: "Tree nut allergen." },
  { category: "tree_nuts", term: "walnut", level: "unsafe", note: "Tree nut allergen." },
  { category: "tree_nuts", term: "pecan", level: "unsafe", note: "Tree nut allergen." },
  { category: "tree_nuts", term: "pistachio", level: "unsafe", note: "Tree nut allergen." },
  { category: "tree_nuts", term: "hazelnut", level: "unsafe", note: "Tree nut allergen." },
  { category: "tree_nuts", term: "macadamia", level: "unsafe", note: "Tree nut allergen." },
  { category: "tree_nuts", term: "brazil nut", level: "unsafe", note: "Tree nut allergen." },
  { category: "tree_nuts", term: "may contain tree nuts", level: "caution", note: "Tree nut cross-contact warning." },

  // Sesame
  { category: "sesame", term: "sesame", level: "unsafe", note: "Sesame allergen detected." },
  { category: "sesame", term: "tahini", level: "unsafe", note: "Sesame paste." },
  { category: "sesame", term: "gingelly", level: "unsafe", note: "Sesame derivative." },

  // Shellfish
  { category: "shellfish", term: "shrimp", level: "unsafe", note: "Crustacean shellfish." },
  { category: "shellfish", term: "crab", level: "unsafe", note: "Crustacean shellfish." },
  { category: "shellfish", term: "lobster", level: "unsafe", note: "Crustacean shellfish." },
  { category: "shellfish", term: "prawn", level: "unsafe", note: "Crustacean shellfish." },
  { category: "shellfish", term: "oyster", level: "unsafe", note: "Molluscan shellfish." },
  { category: "shellfish", term: "clam", level: "unsafe", note: "Molluscan shellfish." },

  // Fish
  { category: "fish", term: "fish", level: "unsafe", note: "Fish allergen detected." },
  { category: "fish", term: "anchovy", level: "unsafe", note: "Fish derivative." },
  { category: "fish", term: "salmon", level: "unsafe", note: "Fish allergen." },
  { category: "fish", term: "tuna", level: "unsafe", note: "Fish allergen." },
];

export type Finding = {
  category: AllergenCategory;
  term: string;
  level: Exclude<Level, "safe">;
  note: string;
};

export type Result = {
  level: Level;
  headline: string;
  detail: string;
  confidence: number;
  findings: Finding[];
};

export function analyze(
  input: string,
  activeAllergens: AllergenCategory[] = ["gluten"]
): Result {
  const text = input.toLowerCase();
  const certifiedGf = /certified gluten[- ]free|gluten[- ]free oats/.test(text);

  const activeCategories = new Set(activeAllergens.length > 0 ? activeAllergens : ["gluten"]);
  const activeRules = RULES.filter((r) => activeCategories.has(r.category));

  const seen = new Set<string>();
  const findings: Finding[] = [];

  for (const rule of activeRules) {
    if (!text.includes(rule.term)) continue;
    if (certifiedGf && rule.category === "gluten" && (rule.term === "oat" || rule.term === "oats")) {
      continue;
    }
    // skip narrower duplicates already covered by a longer matched term
    if ([...seen].some((t) => t.includes(rule.term) || rule.term.includes(t))) continue;
    seen.add(rule.term);
    findings.push(rule);
  }

  const unsafe = findings.filter((f) => f.level === "unsafe");
  const caution = findings.filter((f) => f.level === "caution");

  if (unsafe.length) {
    const categoriesFound = Array.from(new Set(unsafe.map((u) => u.category))).join(", ");
    return {
      level: "unsafe",
      headline: `Contains ${categoriesFound}`,
      detail: `${unsafe.length} allergen term${unsafe.length > 1 ? "s" : ""} flagged. Put this one back.`,
      confidence: 4,
      findings,
    };
  }
  if (caution.length) {
    return {
      level: "caution",
      headline: "May contain allergens",
      detail: "No outright prohibited grain/allergen, but flagged terms need checking with manufacturer.",
      confidence: 62,
      findings,
    };
  }
  return {
    level: "safe",
    headline: "All clear for selected allergens",
    detail: "No tracked allergens or hidden risky terms detected in this label.",
    confidence: 96,
    findings,
  };
}
