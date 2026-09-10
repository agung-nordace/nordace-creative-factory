import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const productIdRaw =
      searchParams.get("product_id");

    const parentSkuRaw =
      searchParams.get("parent_sku");

    const productId =
      productIdRaw &&
      Number.isFinite(Number(productIdRaw))
        ? Number(productIdRaw)
        : null;

    const parentSku =
      parentSkuRaw?.trim().toUpperCase() || null;

    if (!productId && !parentSku) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing product_id or parent_sku.",
        },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from("product_variants")
      .select(
        `
        id,
        parent_product_id,
        parent_sku,
        item_group_id,
        variant_sku,
        product_name,
        color,
        size,
        image_url,
        additional_image_url,
        product_url,
        availability,
        price,
        sale_price,
        is_bundle,
        synced_at
      `
      )
      .order("color", {
        ascending: true,
        nullsFirst: false,
      });

    if (productId) {
      query = query.eq(
        "parent_product_id",
        productId
      );
    } else if (parentSku) {
      query = query.eq(
        "parent_sku",
        parentSku
      );
    }

    const { data, error } =
      await query;

    if (error) {
      throw new Error(
        error.message
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Product variants API error:",
      message
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}