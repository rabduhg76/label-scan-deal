import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyze, type Result } from "@/lib/gluten";
import { readLabel } from "@/lib/read-label.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gluten Free Deal — Instant Gluten Label Checker" },
      {
        name: "description",
        content:
          "Paste any ingredient list and Gluten Free Deal flags gluten grains, hidden malt and cross-contact warnings in under a second.",
      },
      { property: "og:title", content: "Gluten Free Deal — Instant Gluten Label Checker" },
      {
        property: "og:description",
        content:
          "Paste an ingredient label and get a clear safe, caution or avoid verdict with every risky term explained.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SAMPLE =
  "INGREDIENTS: rice flour, water, sugar, modified starch, yeast, malt extract (barley), salt, natural flavours. May contain traces of oats.";

const BADGE: Record<Result["level"], { label: string; cls: string }> = {
  safe: { label: "SAFE", cls: "bg-brand text-brand-foreground" },
  caution: { label: "CAUTION", cls: "bg-ice text-brand-foreground" },
  unsafe: { label: "AVOID", cls: "bg-danger text-deep" },
};

function Index() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const run = (value: string) => {
    setText(value);
    setResult(value.trim() ? analyze(value) : null);
  };

  const shown =
    result ??
    ({
      level: "safe",
      headline: "Awaiting a label",
      detail: "Paste an ingredient list to get a verdict.",
      confidence: 0,
      findings: [],
    } as Result);
  const badge = BADGE[shown.level];

  return (
    <div className="min-h-screen bg-deep text-white font-body overflow-hidden">
      <div className="relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-ice/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[30rem] h-[30rem] bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(165,216,255,0.08),transparent_45%)]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-6 pb-0">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand grid place-items-center font-display font-bold text-brand-foreground text-lg">
                G
              </div>
              <div className="leading-none">
                <p className="font-display font-bold text-base tracking-tight">Gluten Free Deal</p>
                <p className="text-[11px] text-white/50 tracking-[0.2em] uppercase mt-1">
                  Label Scanner
                </p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
              <a href="#how" className="hover:text-white">
                How it works
              </a>
              <a href="#watchlist" className="hover:text-white">
                Ingredient DB
              </a>
            </nav>
            <a
              href="#scan"
              className="clip-badge bg-brand text-brand-foreground font-display font-bold text-sm px-5 py-2.5"
            >
              Scan now
            </a>
          </header>

          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center py-14 lg:py-20">
            <div id="scan">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-ice mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" /> Real-time ingredient analysis
              </div>
              <h1 className="font-display font-bold text-5xl md:text-6xl leading-[0.95] tracking-tight">
                Read the label.
                <span className="block text-brand">Trust the result.</span>
              </h1>
              <p className="mt-6 text-white/60 text-lg max-w-md leading-relaxed">
                Paste any ingredient list and Gluten Free Deal flags the risky grains, the
                certified-safe picks, and the sneaky cross-contacts in under a second.
              </p>

              <label htmlFor="label-input" className="sr-only">
                Ingredient list
              </label>
              <textarea
                id="label-input"
                value={text}
                onChange={(e) => run(e.target.value)}
                rows={5}
                spellCheck={false}
                placeholder="Paste an ingredient list here…"
                className="mt-8 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm leading-relaxed text-white/90 placeholder:text-white/35 focus:outline-none focus:border-brand/60"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => run(text)}
                  className="clip-scan bg-white text-deep font-display font-bold text-sm px-6 py-3.5"
                >
                  Scan a label
                </button>
                <button
                  onClick={() => run(SAMPLE)}
                  className="clip-scan border border-white/15 bg-white/5 px-6 py-3.5 font-medium text-sm flex items-center gap-2"
                >
                  <span className="text-brand font-bold">+</span> Try a sample label
                </button>
              </div>

              <div className="mt-9 flex items-center gap-6 text-sm">
                <div>
                  <p className="font-display font-bold text-2xl text-brand">35+</p>
                  <p className="text-white/40 text-xs">gluten terms mapped</p>
                </div>
                <div className="w-px h-9 bg-white/10" />
                <div>
                  <p className="font-display font-bold text-2xl text-ice">instant</p>
                  <p className="text-white/40 text-xs">runs in your browser</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="clip-scan relative rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-xl overflow-hidden">
                <div className="scanline" />
                <div className="flex items-center justify-between mb-5">
                  <p className="font-display font-bold text-sm tracking-tight">Label scan</p>
                  <span
                    className={`clip-badge font-display font-bold text-[11px] px-3 py-1 ${badge.cls}`}
                  >
                    {result ? badge.label : "IDLE"}
                  </span>
                </div>

                <p className="font-display font-bold text-2xl tracking-tight">{shown.headline}</p>
                <p className="mt-1.5 text-[13px] text-white/50 leading-snug">{shown.detail}</p>

                <div className="mt-5 space-y-3">
                  {shown.findings.length === 0 && result && (
                    <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                      <span className="w-7 h-7 rounded-md bg-brand/20 grid place-items-center text-brand font-bold text-sm">
                        ✓
                      </span>
                      <div>
                        <p className="text-sm font-semibold">No flagged terms</p>
                        <p className="text-[11px] text-white/40">Nothing on the watch-list matched</p>
                      </div>
                    </div>
                  )}
                  {shown.findings.slice(0, 5).map((f) => (
                    <div
                      key={f.term}
                      className={`flex items-center gap-3 rounded-lg p-3 ${
                        f.level === "unsafe"
                          ? "bg-danger/10 border border-danger/30"
                          : "bg-brand/10 border border-brand/30"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-md grid place-items-center font-bold text-sm ${
                          f.level === "unsafe"
                            ? "bg-danger/25 text-danger"
                            : "bg-brand/25 text-brand"
                        }`}
                      >
                        {f.level === "unsafe" ? "×" : "!"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold capitalize">{f.term}</p>
                        <p className="text-[11px] text-white/50">{f.note}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
                    <span>Gluten-free confidence</span>
                    <span className="text-brand font-bold">{shown.confidence}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${shown.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="clip-badge absolute -bottom-4 -left-4 bg-ice text-brand-foreground font-display font-bold text-xs px-4 py-2.5 rotate-[-4deg]">
                GF Certified
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="how" className="relative pb-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["01", "Paste it", "Drop in any packaged ingredient list."],
              ["02", "Auto-parse", "Every term is matched live to the watch-list."],
              ["03", "Risk flag", "Grains, additives and cross-contacts flagged."],
              ["04", "Verdict", "A clear safe, caution or avoid result."],
            ].map(([n, title, copy]) => (
              <div key={n} className="clip-scan border border-white/15 bg-white/[0.05] p-5">
                <p className="font-display font-bold text-brand text-2xl">{n}</p>
                <p className="mt-3 font-semibold text-sm">{title}</p>
                <p className="mt-1 text-[13px] text-white/50 leading-snug">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="watchlist" className="relative pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">
            Hidden gluten watch-list
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Wheat",
              "Barley",
              "Rye",
              "Malt extract",
              "Semolina",
              "Spelt",
              "Kamut",
              "Seitan",
              "Soy sauce",
              "Brewer's yeast",
              "Modified starch",
              "Dextrin",
              "Oats",
              "Natural flavours",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[13px] text-white/70"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm text-white/50">Gluten Free Deal — clarity for every label.</p>
          <p className="text-xs text-white/30 tracking-[0.2em] uppercase">
            Not medical advice · verify with the manufacturer
          </p>
        </div>
      </footer>
    </div>
  );
}
