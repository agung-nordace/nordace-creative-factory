import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ProductKind = "single" | "bundle" | "all";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(
      Number(searchParams.get("page") || "1"),
      1
    );

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || "24"), 1),
      100
    );

    const search = searchParams.get("search")?.trim() || "";

    const requestedKind = searchParams.get("kind") || "single";

    const kind: ProductKind =
      requestedKind === "bundle" ||
      requestedKind === "all" ||
      requestedKind === "single"
        ? requestedKind
        : "single";

    const offset = (page - 1) * limit;

    // =========================================================
    // MAIN PRODUCT QUERY
    // =========================================================

    let query = supabaseAdmin
      .from("products")
      .select(
        `
          id,
          name,
          slug,
          sku,
          status,
          language,
          description,
          short_description,
          permalink,
          price,
          regular_price,
          sale_price,
          featured_image,
          metadata,
          created_at,
          updated_at,
          synced_at,
          product_images (
            source_id,
            src,
            alt,
            position
          )
        `,
        {
          count: "exact",
        }
      )
      .eq("language", "en");

    // =========================================================
    // PRODUCT TYPE
    //
    // ND...  = SINGLE PRODUCT
    // VOA... = BUNDLE
    // =========================================================

    if (kind === "single") {
      query = query.ilike("sku", "ND%");
    }

    if (kind === "bundle") {
      query = query.ilike("sku", "VOA%");
    }

    // =========================================================
    // SEARCH
    // Name + SKU + Slug
    // =========================================================

    if (search) {
      const safeSearch = search
        .replace(/,/g, " ")
        .trim();

      query = query.or(
        `name.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%,slug.ilike.%${safeSearch}%`
      );
    }

    query = query
      .order("name", {
        ascending: true,
      })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Products library error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    // =========================================================
    // SORT PRODUCT IMAGES
    // =========================================================

    const products = (data ?? []).map((product: any) => {
      const images = Array.isArray(product.product_images)
        ? [...product.product_images].sort(
            (a, b) =>
              Number(a.position ?? 0) -
              Number(b.position ?? 0)
          )
        : [];

      return {
        ...product,
        product_images: images,
        product_kind:
          String(product.sku || "")
            .toUpperCase()
            .startsWith("VOA")
            ? "bundle"
            : String(product.sku || "")
                  .toUpperCase()
                  .startsWith("ND")
              ? "single"
              : "other",
      };
    });

    const total = count ?? 0;

    const pages = Math.max(
      Math.ceil(total / limit),
      1
    );

    // =========================================================
    // COUNTS
    // =========================================================

    const [
      singleCountResult,
      bundleCountResult,
      allCountResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("language", "en")
        .ilike("sku", "ND%"),

      supabaseAdmin
        .from("products")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("language", "en")
        .ilike("sku", "VOA%"),

      supabaseAdmin
        .from("products")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("language", "en"),
    ]);

    return NextResponse.json({
      success: true,

      data: products,

      kind,

      counts: {
        single: singleCountResult.count ?? 0,
        bundle: bundleCountResult.count ?? 0,
        all: allCountResult.count ?? 0,
      },

      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page < pages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Products API fatal error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}