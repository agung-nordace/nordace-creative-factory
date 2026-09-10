import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(`
        id,
        name,
        sku,
        language,
        status
      `)
      .eq("language", "en")
      .order("name", {
        ascending: true,
      })
      .limit(1000);

    if (error) {
      throw new Error(error.message);
    }

    const products = (data ?? [])
      .filter((product) => product.id != null && product.name)
      .map((product) => {
        const sku = String(product.sku ?? "").trim();

        let kind: "single" | "bundle" | "other" = "other";

        if (sku.toUpperCase().startsWith("ND")) {
          kind = "single";
        } else if (sku.toUpperCase().startsWith("VOA")) {
          kind = "bundle";
        }

        return {
          id: Number(product.id),
          name: String(product.name),
          sku: product.sku ?? null,
          status: product.status ?? null,
          kind,
        };
      });

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}