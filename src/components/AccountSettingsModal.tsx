import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ALLERGEN_OPTIONS, AllergenCategory } from "@/lib/gluten";
import { createCheckoutSession, cancelUserSubscription, redeemPromoCode } from "@/lib/stripe.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  CreditCard,
  Crown,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

interface AccountSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsModal({ open, onOpenChange }: AccountSettingsModalProps) {
  const {
    user,
    isSubscribed,
    setSubscribed,
    activeAllergens,
    toggleAllergen,
    isVerifyingSub,
    verifyStripeSubscription,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<"allergens" | "subscription">("allergens");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const createCheckoutFn = useServerFn(createCheckoutSession);
  const cancelSubFn = useServerFn(cancelUserSubscription);
  const redeemPromoFn = useServerFn(redeemPromoCode);

  const handleStripeSubscribe = async () => {
    setLoadingCheckout(true);
    setErrorMsg(null);
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
        setErrorMsg(
          res.error ||
            "Stripe is not configured. Please add your STRIPE_SECRET_KEY to .env to process real payments."
        );
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to start checkout. Please check Stripe configuration.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-deep/95 border-white/15 text-white backdrop-blur-2xl max-w-xl sm:rounded-2xl z-50 p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand/20 border border-brand/40 grid place-items-center text-brand">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-display font-bold text-xl text-white tracking-tight">
                Account & Preferences
              </DialogTitle>
              <DialogDescription className="text-xs text-white/50">
                Manage your allergen filters and history subscription
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 mt-4">
          <button
            onClick={() => setActiveTab("allergens")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "allergens"
                ? "bg-brand text-brand-foreground"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Target Allergens ({activeAllergens.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "subscription"
                ? "bg-brand text-brand-foreground"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Subscription {isSubscribed ? "• Pro" : "• Free"}</span>
          </button>
        </div>

        {/* Tab Content: Allergens */}
        {activeTab === "allergens" && (
          <div className="py-3 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 leading-relaxed">
              Select which allergens and ingredients you want Gluten Free Deal to automatically flag when scanning food labels.
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              {ALLERGEN_OPTIONS.map((item) => {
                const checked = activeAllergens.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleAllergen(item.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      checked
                        ? "border-brand bg-brand/10 shadow-sm shadow-brand/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07] opacity-75"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md mt-0.5 grid place-items-center shrink-0 text-xs font-bold transition-colors ${
                        checked
                          ? "bg-brand text-brand-foreground"
                          : "border border-white/25 bg-black/20 text-transparent"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <p className={`font-semibold text-xs ${checked ? "text-brand" : "text-white"}`}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-white/50 leading-tight mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Content: Subscription */}
        {activeTab === "subscription" && (
          <div className="py-4 space-y-5">
            {isSubscribed ? (
              <div className="p-5 rounded-2xl bg-brand/10 border border-brand/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand text-brand-foreground grid place-items-center font-bold">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-white">
                        Gluten Free Deal Pro Active
                      </h4>
                      <p className="text-[11px] text-brand font-medium">
                        $2.00 / month • Unlimited Scan History Unlocked
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  You have full unlimited access to past food label scans, allergen logs, and instant reload across devices.
                </p>

                {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={async () => {
                      if (!user?.email) return;
                      setCancelling(true);
                      setErrorMsg(null);
                      try {
                        const res = await cancelSubFn({ data: { email: user.email } });
                        if (res.ok) {
                          setSubscribed(false);
                        } else {
                          setErrorMsg(res.error || "Failed to cancel subscription.");
                        }
                      } catch (err: any) {
                        setErrorMsg(err?.message || "Something went wrong.");
                      } finally {
                        setCancelling(false);
                      }
                    }}
                    disabled={cancelling}
                    className="text-xs text-white/40 hover:text-danger flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{cancelling ? "Cancelling…" : "Cancel subscription"}</span>
                  </button>
                  <span className="text-[11px] text-white/40">Renews monthly</span>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white/5 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-display font-bold text-base text-white">
                      Free Plan
                    </h4>
                    <p className="text-xs text-white/50">
                      Standard real-time label scanner
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-bold">
                    CURRENT
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.04] border border-brand/20 flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-sm text-brand">History Pro Pass</p>
                    <p className="text-[11px] text-white/50">Unlimited past scans & auto-save</p>
                  </div>
                  <p className="font-display font-bold text-xl text-white">
                    $2<span className="text-xs text-white/50 font-normal">/mo</span>
                  </p>
                </div>

                {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}

                <div className="space-y-2">
                  <button
                    onClick={handleStripeSubscribe}
                    disabled={loadingCheckout}
                    className="w-full clip-scan bg-brand text-brand-foreground font-display font-bold text-xs py-3 px-6 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{loadingCheckout ? "Opening Stripe…" : "Upgrade for $2 / month"}</span>
                  </button>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Promo code"
                      autoComplete="off"
                      className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand/60"
                    />
                    <button
                      onClick={async () => {
                        if (!user?.email) {
                          setErrorMsg("Please sign in with your Google account first.");
                          return;
                        }
                        if (!promoInput.trim()) return;
                        setRedeeming(true);
                        setPromoMsg(null);
                        setErrorMsg(null);
                        try {
                          const res = await redeemPromoFn({
                            data: { code: promoInput.trim(), email: user.email },
                          });
                          if (res.ok) {
                            setPromoMsg(
                              `Code accepted — Pro active for ${res.durationDays} days.`
                            );
                            setPromoInput("");
                            await verifyStripeSubscription(user.email);
                            onOpenChange(false);
                          } else {
                            setPromoMsg(res.error || "Invalid promo code.");
                          }
                        } catch (err: any) {
                          setPromoMsg(err?.message || "Failed to redeem code.");
                        } finally {
                          setRedeeming(false);
                        }
                      }}
                      disabled={redeeming || !promoInput.trim()}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-brand/20 text-brand border border-brand/40 hover:bg-brand/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {redeeming ? "…" : "Apply"}
                    </button>
                  </div>
                  {promoMsg && (
                    <p className="text-[11px] text-white/60 leading-relaxed">{promoMsg}</p>
                  )}
                  <button
                    onClick={async () => {
                      if (!user?.email) {
                        setErrorMsg("Please sign in with your Google account first.");
                        return;
                      }
                      const hasSub = await verifyStripeSubscription(user.email);
                      if (hasSub) {
                        onOpenChange(false);
                      } else {
                        setErrorMsg("No active Stripe subscription found for " + user.email);
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
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
