import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  barcode: z.string().trim().min(6).max(20),
});

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  allergens?: string;
  traces?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_text_en?: string;
  product?: {
    ingredients_text?: string;
    allergens?: string;
    traces?: string;
    allergens_tags?: string[];
    traces_tags?: string[];
  };
}

interface OpenFoodFactsResponse {
  status?: number;
  status_verbose?: string;
  product?: OpenFoodFactsProduct;
}

export const lookupBarcode = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const barcode = data.barcode.replace(/[^0-9]/g, "");
    if (barcode.length < 6) {
      return { ok: false as const, error: "Invalid barcode." };
    }

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
        {
          headers: {
            "User-Agent": "GlutenFreeDeal/1.0 (label-scan-deal)",
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) {
        return {
          ok: false as const,
          error: `Open Food Facts lookup failed (${res.status}).`,
        };
      }

      const json = (await res.json()) as OpenFoodFactsResponse;

      if (!json.status || json.status !== 1 || !json.product) {
        return {
          ok: false as const,
          error: "No product found for that barcode.",
        };
      }

      const p = json.product;
      const ingredients =
        p.ingredients_text_en ||
        p.ingredients_text ||
        p.product?.ingredients_text ||
        "";
      const allergens =
        [p.allergens, p.product?.allergens].filter(Boolean).join(" ") || undefined;
      const traces =
        [p.traces, p.product?.traces].filter(Boolean).join(" ") || undefined;
      const allergenTags = p.allergens_tags || p.product?.allergens_tags || [];
      const traceTags = p.traces_tags || p.product?.traces_tags || [];

      const parts: string[] = [];
      if (p.product_name) parts.push(`Product: ${p.product_name}`);
      if (p.brands) parts.push(`Brand: ${p.brands}`);
      if (ingredients) parts.push(`\nINGREDIENTS: ${ingredients}`);
      if (allergens) parts.push(`ALLERGENS: ${allergens}`);
      if (traces) parts.push(`MAY CONTAIN: ${traces}`);

      const text = parts.join("\n").trim();

      if (!text) {
        return {
          ok: false as const,
          error: "Product found but no ingredient information available.",
        };
      }

      return {
        ok: true as const,
        text,
        productName: p.product_name,
        brand: p.brands,
        allergens: allergenTags,
        traces: traceTags,
      };
    } catch (e: any) {
      console.error("lookupBarcode error", e);
      return {
        ok: false as const,
        error: e?.message || "Failed to contact Open Food Facts.",
      };
    }
  });