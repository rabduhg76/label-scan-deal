import React, { useEffect, useState } from "react";
import {
  getScanHistory,
  deleteHistoryItem,
  clearAllHistory,
  type ScanHistoryItem,
} from "@/lib/history";
import { useAuth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  History,
  Trash2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Lock,
  Sparkles,
  CreditCard,
  CheckCircle2,
  X,
} from "lucide-react";

const PAYWALL_DISMISS_KEY = "gfd_paywall_dismissed";

interface ScanHistorySectionProps {
  onSelectScan: (item: ScanHistoryItem) => void;
}

const BADGE_CONFIG: Record<
  string,
  { label: string; badgeCls: string; icon: React.ReactNode }
> = {
  safe: {
    label: "SAFE",
    badgeCls: "bg-brand text-brand-foreground",
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  caution: {
    label: "CAUTION",
    badgeCls: "bg-ice text-brand-foreground",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  unsafe: {
    label: "AVOID",
    badgeCls: "bg-danger text-deep font-bold",
    icon: <AlertOctagon className="w-3 h-3" />,
  },
};

export function ScanHistorySection({ onSelectScan }: ScanHistorySectionProps) {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [paywallDismissed, setPaywallDismissed] = useState(false);

  const { user, isSubscribed, setSubscribed, isVerifyingSub, verifyStripeSubscription } = useAuth();
  const createCheckoutFn = useServerFn(createCheckoutSession);

  const loadHistory = () => {
    setHistory(getScanHistory());
  };

  useEffect(() => {
    setMounted(true);
    loadHistory();
    setPaywallDismissed(
      typeof window !== "undefined" &&
        window.localStorage.getItem(PAYWALL_DISMISS_KEY) === "1"
    );

    // Check for returned success query param in URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("subscription") === "success") {
        setSubscribed(true);
        window.localStorage.removeItem(PAYWALL_DISMISS_KEY);
        setPaywallDismissed(false);
        // Clean URL without refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const handler = () => loadHistory();
    window.addEventListener("gfd_history_updated", handler);
    return () => window.removeEventListener("gfd_history_updated", handler);
  }, []);

  const dismissPaywall = () => {
    setPaywallDismissed(true);
    try {
      window.localStorage.setItem(PAYWALL_DISMISS_KEY, "1");
    } catch {}
  };

  const handleSubscribe = async () => {
    setUpgrading(true);
    setStripeError(null);
    try {
      const res = await createCheckoutFn({
        data: {
          userEmail: user?.email,
          userId: user?.sub,
          returnUrl: window.location.origin,
        },
      });

      if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        setStripeError(
          res.error ||
            "Stripe is not configured. Please add your STRIPE_SECRET_KEY to .env to process real payments."
        );
      }
    } catch (err: any) {
      console.error(err);
      setStripeError("Failed to initiate payment. Please check your Stripe keys.");
    } finally {
      setUpgrading(false);
    }
  };

  if (!mounted || history.length === 0) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <section id="history" className="relative pb-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-brand">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-xl tracking-tight text-white">
                  Recent Scans
                </h2>
                {isSubscribed && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" /> Pro Unlocked
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                Your past ingredient checks ({history.length})
              </p>
            </div>
          </div>
          {isSubscribed && (
            <button
              onClick={() => clearAllHistory()}
              className="text-xs text-white/40 hover:text-danger transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-danger/30 hover:bg-danger/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear history</span>
            </button>
          )}
        </div>

        {/* History content with Paywall Overlay if not subscribed */}
        <div className="relative">
          {!isSubscribed && paywallDismissed && (
            <button
              onClick={() => {
                setPaywallDismissed(false);
                try {
                  window.localStorage.removeItem(PAYWALL_DISMISS_KEY);
                } catch {}
              }}
              className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-brand/15 border border-brand/40 px-3 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand/25 transition-colors"
            >
              <Lock className="w-3 h-3" />
              Unlock History
            </button>
          )}

          {!isSubscribed && paywallDismissed && history.length > 1 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setPaywallDismissed(false);
                  try {
                    window.localStorage.removeItem(PAYWALL_DISMISS_KEY);
                  } catch {}
                }}
                className="inline-flex items-center gap-2 rounded-full bg-brand/15 border border-brand/40 px-4 py-2 text-xs font-semibold text-brand hover:bg-brand/25 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Unlock {history.length - 1} more past scans
              </button>
            </div>
          )}

          {!isSubscribed && !paywallDismissed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-deep/80 backdrop-blur-md rounded-2xl border border-white/15">
              <div className="relative max-w-md w-full text-center p-6 sm:p-8 rounded-2xl bg-white/[0.05] border border-white/20 shadow-2xl backdrop-blur-xl">
                <button
                  onClick={dismissPaywall}
                  aria-label="Dismiss"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand/20 border border-brand/40 grid place-items-center text-brand shadow-lg shadow-brand/20">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-2xl text-white tracking-tight">
                  Unlock Scan History
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-white/70 leading-relaxed">
                  Access your full history of past food label scans, flagged gluten ingredients, and quick-reload anytime.
                </p>

                <div className="my-5 py-3 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-display font-bold text-sm text-white">History Pass</p>
                    <p className="text-[11px] text-white/50">Full scan logs & auto-save</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-2xl text-brand">$2<span className="text-xs text-white/60 font-normal">/mo</span></p>
                  </div>
                </div>

                {stripeError && (
                  <p className="mb-3 text-xs text-danger">{stripeError}</p>
                )}

                <div className="space-y-2.5">
                  <button
                    onClick={handleSubscribe}
                    disabled={upgrading}
                    className="w-full clip-scan bg-brand text-brand-foreground font-display font-bold text-sm py-3 px-6 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-brand/30 disabled:opacity-60"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{upgrading ? "Connecting to Stripe…" : "Subscribe for $2 / month"}</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!user?.email) {
                        setStripeError("Please sign in first so we can verify your subscription.");
                        return;
                      }
                      const hasSub = await verifyStripeSubscription(user.email);
                      if (!hasSub) {
                        setStripeError("No active Stripe subscription found for " + user.email);
                      }
                    }}
                    disabled={isVerifyingSub}
                    className="w-full text-center text-xs text-brand hover:text-white transition-colors py-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-brand/20 hover:bg-brand/10 font-semibold disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>{isVerifyingSub ? "Verifying with Stripe…" : "Already paid? Restore Purchase"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300">
            {history.map((item, idx) => {
              const config = BADGE_CONFIG[item.result.level] || BADGE_CONFIG.safe;
              const lockCard = !isSubscribed && (paywallDismissed ? idx > 0 : true);
              return (
                <div
                  key={item.id}
                  className={`group relative rounded-xl border border-white/10 bg-white/[0.04] p-4.5 transition-all duration-200 flex flex-col justify-between ${
                    lockCard
                      ? "blur-md select-none pointer-events-none opacity-50"
                      : "hover:bg-white/[0.08] hover:border-brand/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-display font-bold tracking-wide ${config.badgeCls}`}
                      >
                        {config.icon}
                        {config.label}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-white/40">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(item.timestamp)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-white/80 font-mono leading-relaxed line-clamp-2 bg-black/20 p-2 rounded-lg border border-white/5 mb-3">
                      {item.snippet}
                    </p>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/50 font-medium">
                        {item.result.headline}
                      </span>
                      {item.result.findings.length > 0 && (
                        <span className="text-danger font-semibold">
                          {item.result.findings.length} flag{item.result.findings.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => onSelectScan(item)}
                      className="text-xs font-semibold text-brand hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <span>Load scan</span>
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoryItem(item.id);
                      }}
                      className="text-white/30 hover:text-danger p-1 transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
