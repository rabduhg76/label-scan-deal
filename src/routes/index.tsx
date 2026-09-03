import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { analyze, type Result, ALLERGEN_OPTIONS } from "@/lib/gluten";
import { readLabel } from "@/lib/read-label.functions";
import { UserMenu } from "@/components/auth/UserMenu";
import { ScanHistorySection } from "@/components/ScanHistorySection";
import { saveScanToHistory, type ScanHistoryItem } from "@/lib/history";
import { useAuth } from "@/lib/auth";
import { AccountSettingsModal } from "@/components/AccountSettingsModal";
import { Camera, Sliders, X } from "lucide-react";

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
  const [photo, setPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const { activeAllergens } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (value: string, photoUrl?: string | null) => {
    setText(value);
    if (value.trim()) {
      const res = analyze(value, activeAllergens);
      setResult(res);
      saveScanToHistory(value, res, photoUrl ?? photo);
    } else {
      setResult(null);
    }
  };

  // Re-run analysis if allergen filters change and text exists
  useEffect(() => {
    if (text.trim()) {
      setResult(analyze(text, activeAllergens));
    }
  }, [activeAllergens]);

  const handleSelectScan = (item: ScanHistoryItem) => {
    setText(item.fullText);
    setResult(item.result);
    setPhoto(item.photo || null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function prepareForOcr(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const minDim = Math.min(img.width, img.height);
      const scale = minDim < 1200 ? Math.min(2, 1200 / minDim) : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.filter = "grayscale(1) contrast(1.25) brightness(1.05)";
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function startCamera(): Promise<void> {
  setCameraError(null);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    streamRef.current = stream;
    setCameraOpen(true);
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    });
  } catch (e: any) {
    console.error("[camera]", e);
    setCameraError(
      e?.name === "NotAllowedError"
        ? "Camera access blocked. Allow camera in your browser settings."
        : "Could not access the camera. Try uploading a photo instead."
    );
  }
}

function stopCamera() {
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;
  setCameraOpen(false);
}

async function captureFromCamera(): Promise<void> {
  const video = videoRef.current;
  if (!video) return;
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  stopCamera();
  const file = await (async () => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], "camera.jpg", { type: "image/jpeg" });
  })();
  await onFile(file);
}

useEffect(() => () => stopCamera(), []);

  const onFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("Photo is too large — keep it under 8MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    setPhoto(dataUrl);
    setReading(true);
    setReadingProgress(0);
    try {
      const prepared = await prepareForOcr(dataUrl);
      const { recognize } = await import("tesseract.js");
      const result = await recognize(prepared, "eng", {
        logger: (m) => {
          if (typeof m.progress === "number") {
            setReadingProgress(Math.round(m.progress * 100));
          }
        },
      });
      const text = (result.data.text || "").trim();
      if (!text) {
        setError("No text detected in that photo. Try a clearer, well-lit shot.");
      } else {
        run(text, dataUrl);
      }
    } catch (e: any) {
      console.error("[OCR]", e);
      setError(
        e?.message
          ? `OCR failed: ${e.message}`
          : "Could not read that photo. Try a clearer, well-lit shot."
      );
    } finally {
      setReading(false);
      setReadingProgress(0);
    }
  };

  const shown =
    result ??
    ({
      level: "safe",
      headline: "Awaiting a label",
      detail: "Upload a label photo or paste an ingredient list.",
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
              <a href="#history" className="hover:text-white">
                History
              </a>
              <a href="#watchlist" className="hover:text-white">
                Ingredient DB
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61593979353012"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand transition-colors flex items-center gap-1 text-ice/90"
              >
                Community
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <UserMenu />
              <a
                href="#scan"
                className="clip-badge bg-brand text-brand-foreground font-display font-bold text-sm px-5 py-2.5"
              >
                Scan now
              </a>
            </div>
          </header>

          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center py-14 lg:py-20">
            <div id="scan">
              <div className="flex flex-wrap items-center gap-2 mb-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-ice">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" /> Tracking {activeAllergens.length} Allergen{activeAllergens.length > 1 ? "s" : ""}
                </div>
                <button
                  onClick={() => setSettingsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 hover:bg-brand/20 px-3 py-1 text-[11px] font-semibold text-brand transition-colors"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Customize Allergens</span>
                </button>
              </div>
              <h1 className="font-display font-bold text-5xl md:text-6xl leading-[0.95] tracking-tight">
                Read the label.
                <span className="block text-brand">Trust the result.</span>
              </h1>
              <p className="mt-6 text-white/60 text-lg max-w-md leading-relaxed">
                Upload a photo of the label or paste the ingredient list — Gluten Free Deal reads it
                and flags the risky grains, hidden malt and cross-contacts in seconds.
              </p>

              <div className="relative mt-8">
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
                className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 pr-10 text-sm leading-relaxed text-white/90 placeholder:text-white/35 focus:outline-none focus:border-brand/60"
              />
              {text && (
                <button
                  type="button"
                  onClick={() => {
                    setText("");
                    setResult(null);
                    setPhoto(null);
                  }}
                  aria-label="Clear text"
                  title="Clear"
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full grid place-items-center text-white/40 bg-black/30 hover:bg-black/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={reading}
                  className="clip-scan bg-brand text-brand-foreground font-display font-bold text-sm px-6 py-3.5 disabled:opacity-60"
                >
                  {reading
                  ? `Reading photo… ${readingProgress}%`
                  : "Upload a label photo"}
                </button>
                <button
                  onClick={() => {
                    if (cameraOpen) {
                      stopCamera();
                    } else {
                      void startCamera();
                    }
                  }}
                  disabled={reading}
                  className="clip-scan border border-white/15 bg-white/5 px-6 py-3.5 font-medium text-sm flex items-center gap-2 disabled:opacity-60"
                >
                  <Camera className="w-4 h-4" />
                  {cameraOpen ? "Close camera" : "Use camera"}
                </button>
                <button
                  onClick={() => run(text)}
                  className="clip-scan bg-white text-deep font-display font-bold text-sm px-6 py-3.5"
                >
                  Scan text
                </button>
                <button
                  onClick={() => run(SAMPLE)}
                  className="clip-scan border border-white/15 bg-white/5 px-6 py-3.5 font-medium text-sm flex items-center gap-2"
                >
                  <span className="text-brand font-bold">+</span> Try a sample
                </button>
              </div>

              {error && (
                <p className="mt-3 text-sm text-danger">{error}</p>
              )}

              {photo && (
                <div className="mt-4 flex items-center gap-3">
                  <img
                    src={photo}
                    alt="Uploaded food label"
                    className="h-16 w-16 rounded-lg object-cover border border-white/15"
                  />
                  <button
                    onClick={() => {
                      setPhoto(null);
                      setError(null);
                    }}
                    className="text-xs text-white/50 hover:text-white underline"
                  >
                    Remove photo
                  </button>
                </div>
              )}


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

      <ScanHistorySection onSelectScan={handleSelectScan} />

      <section id="how" className="relative pb-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["01", "Upload or paste", "Snap the label photo or paste the ingredient list."],
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

      <section id="community" className="relative pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-brand/10 p-8 sm:p-10 backdrop-blur-xl">
            <div className="absolute -top-16 -right-16 w-60 h-60 bg-brand/15 rounded-full blur-2xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-brand mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" /> Join the Community
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-white">
                  Connect with Gluten Free Deal on Facebook
                </h2>
                <p className="mt-2.5 text-sm text-white/60 leading-relaxed">
                  Join our community for safe product recommendations, new gluten-free deals, label breakdown discussions, and community updates.
                </p>
              </div>
              <a
                href="https://www.facebook.com/profile.php?id=61593979353012"
                target="_blank"
                rel="noopener noreferrer"
                className="clip-scan inline-flex items-center gap-2.5 bg-brand text-brand-foreground font-display font-bold text-sm px-6 py-3.5 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-brand/20 whitespace-nowrap"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Follow on Facebook</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <p className="text-sm text-white/50">Gluten Free Deal — clarity for every label.</p>
            <a
              href="https://www.facebook.com/profile.php?id=61593979353012"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </a>
          </div>
          <p className="text-xs text-white/30 tracking-[0.2em] uppercase">
            Not medical advice · verify with the manufacturer
          </p>
        </div>
      </footer>

      <AccountSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
      />

      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          role="button"
          onClick={(e) => {
            if (e.target === e.currentTarget) stopCamera();
          }}
        >
          <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-deep shadow-2xl">
            <button
              onClick={stopCamera}
              aria-label="Close camera"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 text-white grid place-items-center hover:bg-black/70"
            >
              <X className="w-4 h-4" />
            </button>
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full aspect-video bg-black object-cover"
            />
            <div className="flex items-center justify-center gap-3 p-4 bg-black/60">
              <button
                onClick={() => void captureFromCamera()}
                className="w-16 h-16 rounded-full bg-white text-deep grid place-items-center shadow-lg ring-4 ring-white/30 hover:scale-105 active:scale-95 transition-transform"
                aria-label="Take photo"
              >
                <Camera className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="text-xs text-danger px-6 max-w-6xl mx-auto">{cameraError}</p>
      )}
    </div>
  );
}
