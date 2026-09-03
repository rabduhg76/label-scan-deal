import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";

const schema = z.object({
  userEmail: z.string().email().optional(),
  userId: z.string().optional(),
  returnUrl: z.string().url().optional(),
});

function getStripe(): Stripe | null {
  const stripeSecretKey =
    process.env["STRIPE_SECRET_KEY"] ||
    (process.env as any)["VITE_STRIPE_SECRET_KEY"];

  if (!stripeSecretKey) return null;
  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia" as any,
  });
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const stripe = getStripe();
    if (!stripe) {
      return {
        ok: false as const,
        configured: false,
        error: "Stripe Secret Key is not configured in .env yet.",
      };
    }

    try {
      const origin =
        data.returnUrl ||
        process.env["APP_URL"] ||
        "http://localhost:8080";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: data.userEmail,
        client_reference_id: data.userId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Gluten Free Deal — Unlimited Scan History",
                description: "Full access to past ingredient scan history, analysis logs, and saved items.",
              },
              unit_amount: 200, // $2.00 USD
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}?subscription=cancelled`,
      });

      return {
        ok: true as const,
        configured: true,
        url: session.url,
      };
    } catch (err: any) {
      console.error("Stripe checkout session error:", err);
      return {
        ok: false as const,
        configured: true,
        error: err?.message || "Failed to create Stripe checkout session",
      };
    }
  });

const checkSchema = z.object({
  email: z.string().email(),
});

export const checkUserSubscription = createServerFn({ method: "POST" })
  .inputValidator((data) => checkSchema.parse(data))
  .handler(async ({ data }) => {
    const stripe = getStripe();
    if (!stripe) {
      return { ok: false as const, isSubscribed: false, cancelAtPeriodEnd: false, periodEndDate: null as string | null };
    }

    const promoExpiry = getPromoExpiry(data.email);
    if (promoExpiry && promoExpiry > Date.now()) {
      return {
        ok: true as const,
        isSubscribed: true,
        cancelAtPeriodEnd: false,
        periodEndDate: new Date(promoExpiry).toISOString(),
        source: "promo" as const,
      };
    }

    try {
      const customers = await stripe.customers.list({
        email: data.email,
        limit: 5,
      });

      if (customers.data.length === 0) {
        return { ok: true as const, isSubscribed: false, cancelAtPeriodEnd: false, periodEndDate: null as string | null };
      }

      // Check if customer has any active subscriptions (includes cancel_at_period_end ones)
      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 5,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
          return {
            ok: true as const,
            isSubscribed: true,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            periodEndDate: periodEnd,
          };
        }
      }

      return { ok: true as const, isSubscribed: false, cancelAtPeriodEnd: false, periodEndDate: null as string | null };
    } catch (err: any) {
      console.error("Failed to verify Stripe subscription for user", err);
      return { ok: false as const, isSubscribed: false, cancelAtPeriodEnd: false, periodEndDate: null as string | null, error: err?.message };
    }
  });

const cancelSchema = z.object({
  email: z.string().email(),
});

interface PromoGrant {
  email: string;
  expiresAt: number;
}
const PROMO_CODES: Record<string, { durationDays: number }> = {
  "0011": { durationDays: 30 },
};
const promoGrants = new Map<string, PromoGrant>();

export function getPromoExpiry(email: string): number | null {
  const key = email.toLowerCase();
  const grant = promoGrants.get(key);
  if (!grant) return null;
  if (grant.expiresAt <= Date.now()) {
    promoGrants.delete(key);
    return null;
  }
  return grant.expiresAt;
}

const promoSchema = z.object({
  code: z.string().min(1),
  email: z.string().email(),
});

export const redeemPromoCode = createServerFn({ method: "POST" })
  .inputValidator((data) => promoSchema.parse(data))
  .handler(async ({ data }) => {
    const def = PROMO_CODES[data.code.trim()];
    if (!def) {
      return { ok: false as const, error: "Invalid promo code." };
    }
    const expiresAt = Date.now() + def.durationDays * 24 * 60 * 60 * 1000;
    promoGrants.set(data.email.toLowerCase(), { email: data.email.toLowerCase(), expiresAt });
    return {
      ok: true as const,
      expiresAt,
      expiresAtIso: new Date(expiresAt).toISOString(),
      durationDays: def.durationDays,
    };
  });

export const cancelUserSubscription = createServerFn({ method: "POST" })
  .inputValidator((data) => cancelSchema.parse(data))
  .handler(async ({ data }) => {
    const stripe = getStripe();
    if (!stripe) {
      return { ok: false as const, error: "Stripe is not configured." };
    }

    const promoCleared = promoGrants.delete(data.email.toLowerCase());

    try {
      const customers = await stripe.customers.list({
        email: data.email,
        limit: 5,
      });

      if (customers.data.length === 0) {
        if (promoCleared) {
          return { ok: true as const, cancelled: 0, periodEndDate: null as string | null, promoRevoked: true };
        }
        return { ok: false as const, error: "No Stripe customer found for this email." };
      }

      let scheduledCount = 0;
      let periodEndDate: string | null = null;

      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 10,
        });

        for (const sub of subscriptions.data) {
          // Don't cancel immediately — let the user keep access until period end
          await stripe.subscriptions.update(sub.id, {
            cancel_at_period_end: true,
          });
          periodEndDate = new Date(sub.current_period_end * 1000).toISOString();
          scheduledCount++;
        }
      }

      if (scheduledCount === 0) {
        return { ok: false as const, error: "No active subscriptions found to cancel.", periodEndDate: null as string | null };
      }

      return { ok: true as const, cancelled: scheduledCount, periodEndDate, promoRevoked: promoCleared };
    } catch (err: any) {
      console.error("Failed to cancel Stripe subscription", err);
      return { ok: false as const, error: err?.message || "Failed to cancel subscription" };
    }
  });
