export type Level = "unsafe" | "caution" | "safe";

type Rule = { term: string; level: Exclude<Level, "safe">; note: string };

export const RULES: Rule[] = [
  { term: "wheat", level: "unsafe", note: "Wheat is a primary gluten grain." },
  { term: "wholewheat", level: "unsafe", note: "Wheat is a primary gluten grain." },
  { term: "whole wheat", level: "unsafe", note: "Wheat is a primary gluten grain." },
  { term: "barley", level: "unsafe", note: "Barley is a gluten grain." },
  { term: "rye", level: "unsafe", note: "Rye is a gluten grain." },
  { term: "malt", level: "unsafe", note: "Malt is normally barley-derived." },
  { term: "malt extract", level: "unsafe", note: "Barley-derived malt carries gluten." },
  { term: "semolina", level: "unsafe", note: "Semolina is milled durum wheat." },
  { term: "durum", level: "unsafe", note: "Durum is a wheat variety." },
  { term: "spelt", level: "unsafe", note: "Spelt is an ancient wheat." },
  { term: "kamut", level: "unsafe", note: "Kamut is a wheat variety." },
  { term: "farro", level: "unsafe", note: "Farro is a wheat grain." },
  { term: "einkorn", level: "unsafe", note: "Einkorn is a wheat species." },
  { term: "triticale", level: "unsafe", note: "A wheat and rye hybrid." },
  { term: "seitan", level: "unsafe", note: "Seitan is pure wheat gluten." },
  { term: "couscous", level: "unsafe", note: "Couscous is made from wheat semolina." },
  { term: "bulgur", level: "unsafe", note: "Bulgur is cracked wheat." },
  { term: "graham flour", level: "unsafe", note: "Graham flour is a wheat flour." },
  { term: "brewer's yeast", level: "unsafe", note: "Usually a barley brewing by-product." },
  { term: "brewers yeast", level: "unsafe", note: "Usually a barley brewing by-product." },
  { term: "gluten", level: "unsafe", note: "Gluten is declared outright." },
  { term: "soy sauce", level: "caution", note: "Most soy sauce is brewed with wheat." },
  { term: "oats", level: "caution", note: "Oats are safe only when certified gluten-free." },
  { term: "oat", level: "caution", note: "Oats are safe only when certified gluten-free." },
  { term: "modified food starch", level: "caution", note: "Source unstated — confirm it isn't wheat." },
  { term: "modified starch", level: "caution", note: "Source unstated — confirm it isn't wheat." },
  { term: "dextrin", level: "caution", note: "Dextrin can be wheat-derived." },
  { term: "natural flavour", level: "caution", note: "Flavour blends can hide barley malt." },
  { term: "natural flavor", level: "caution", note: "Flavour blends can hide barley malt." },
  { term: "may contain", level: "caution", note: "Cross-contact warning on the label." },
  { term: "traces of", level: "caution", note: "Cross-contact warning on the label." },
  { term: "same facility", level: "caution", note: "Shared-line cross-contact risk." },
  { term: "starch", level: "caution", note: "Unqualified starch may be wheat starch." },
  { term: "hydrolysed vegetable protein", level: "caution", note: "Can be wheat-based." },
  { term: "hydrolyzed vegetable protein", level: "caution", note: "Can be wheat-based." },
];

export type Finding = { term: string; level: Exclude<Level, "safe">; note: string };

export type Result = {
  level: Level;
  headline: string;
  detail: string;
  confidence: number;
  findings: Finding[];
};

export function analyze(input: string): Result {
  const text = input.toLowerCase();
  const certified = /certified gluten[- ]free|gluten[- ]free oats/.test(text);

  const seen = new Set<string>();
  const findings: Finding[] = [];

  for (const rule of RULES) {
    if (!text.includes(rule.term)) continue;
    if (certified && (rule.term === "oat" || rule.term === "oats")) continue;
    // skip narrower duplicates already covered by a longer matched term
    if ([...seen].some((t) => t.includes(rule.term) || rule.term.includes(t))) continue;
    seen.add(rule.term);
    findings.push(rule);
  }

  const unsafe = findings.filter((f) => f.level === "unsafe");
  const caution = findings.filter((f) => f.level === "caution");

  if (unsafe.length) {
    return {
      level: "unsafe",
      headline: "Contains gluten",
      detail: `${unsafe.length} gluten source${unsafe.length > 1 ? "s" : ""} found. Put this one back.`,
      confidence: 4,
      findings,
    };
  }
  if (caution.length) {
    return {
      level: "caution",
      headline: "May contain gluten",
      detail: "No outright gluten grain, but some terms need checking with the manufacturer.",
      confidence: 62,
      findings,
    };
  }
  return {
    level: "safe",
    headline: "Looks gluten free",
    detail: "No known gluten grains or hidden-gluten terms detected in this label.",
    confidence: 96,
    findings,
  };
}
