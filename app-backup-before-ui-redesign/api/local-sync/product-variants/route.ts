import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import fs from "fs/promises";
import path from "path";

import { parse } from "csv-parse/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CsvRow = {
  id?: string;
  title?: string;
  description?: string;

  link?: string;
  image_link?: string;
  additional_image_link?: string;

  availability?: string;
  availability_date?: string;
  sale_price_effective_date?: string;

  price?: string;
  sale_price?: string;

  product_type?: string;
  google_product_category?: string;

  gtin?: string;
  brand?: string;
  mpn?: string;

  identifier_exists?: string;
  condition?: string;
  is_bundle?: string;

  age_group?: string;
  color?: string;
  gender?: string;
  material?: string;
  pattern?: string;
  size?: string;

  item_group_id?: string;

  shipping?: string;
  size_type?: string;
  size_system?: string;
  shipping_label?: string;

  adult?: string;
  multipack?: string;

  mobile_link?: string;

  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  custom_label_3?: string;
  custom_label_4?: string;

  unit_pricing_measure?: string;
  expiration_date?: string;
  energy_efficiency_class?: string;

  promotion_id?: string;
  adwords_redirect?: string;

  "style[0]"?: string;

  [key: string]: string | undefined;
};

type ProductLookup = {
  id: number;
  sku: string | null;
  name: string | null;
};

function clean(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const result = String(value).trim();

  return result || null;
}

function normalizeSku(value: unknown): string | null {
  const result = clean(value);

  if (!result) {
    return null;
  }

  return result.toUpperCase();
}

function normalizeGroupId(value: unknown): string | null {
  const result = normalizeSku(value);

  return result;
}

/**
 * Preferred:
 *
 * ND1125-GROUP -> ND1125
 * ND1001-GROUP -> ND1001
 *
 * Fallback:
 *
 * ND1125-5 -> ND1125
 * ND1125-50 -> ND1125
 * VOAxxxx-x -> VOAxxxx
 */
function resolveParentSku(row: CsvRow): string | null {
  const groupId = normalizeGroupId(
    row.item_group_id
  );

  if (groupId) {
    const fromGroup = groupId.replace(
      /-GROUP$/i,
      ""
    );

    if (fromGroup) {
      return fromGroup;
    }
  }

  const variantSku = normalizeSku(
    row.id
  );

  if (!variantSku) {
    return null;
  }

  const match = variantSku.match(
    /^(.+?)-[^-]+$/
  );

  if (match?.[1]) {
    return match[1];
  }

  return variantSku;
}

function isBundleRow(
  row: CsvRow,
  parentSku: string | null
): boolean {
  const explicit =
    clean(row.is_bundle)?.toLowerCase();

  if (
    explicit === "yes" ||
    explicit === "true" ||
    explicit === "1"
  ) {
    return true;
  }

  const label4 =
    clean(row.custom_label_4)?.toLowerCase();

  if (
    label4?.includes("bundle")
  ) {
    return true;
  }

  // Nordace convention currently used in Creative Factory:
  // VOA = bundle / set SKU
  if (
    parentSku?.toUpperCase().startsWith(
      "VOA"
    )
  ) {
    return true;
  }

  return false;
}

function chunksOf<T>(
  array: T[],
  size: number
): T[][] {
  const chunks: T[][] = [];

  for (
    let i = 0;
    i < array.length;
    i += size
  ) {
    chunks.push(
      array.slice(i, i + size)
    );
  }

  return chunks;
}

export async function POST(
  request: NextRequest
) {
  const startedAt =
    new Date().toISOString();

  try {
    // =========================================================
    // LOCAL ONLY
    // =========================================================

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CSV product variant sync is disabled in production.",
        },
        {
          status: 403,
        }
      );
    }

    const host =
      request.headers.get("host") ?? "";

    const isLocal =
      host.startsWith("localhost:") ||
      host.startsWith("127.0.0.1:");

    if (!isLocal) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Product variant sync can only run from localhost.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // CSV PATH
    // =========================================================

    const csvPath = path.join(
      process.cwd(),
      "data",
      "product-ad-list.csv"
    );

    console.log(
      "Reading product variant CSV:",
      csvPath
    );

    let csvText: string;

    try {
      csvText = await fs.readFile(
        csvPath,
        "utf8"
      );
    } catch (error) {
      throw new Error(
        `Could not read CSV at ${csvPath}. ` +
          `Make sure data/product-ad-list.csv exists. ` +
          `${
            error instanceof Error
              ? error.message
              : String(error)
          }`
      );
    }

    // =========================================================
    // PARSE CSV
    // =========================================================

    const records = parse(
      csvText,
      {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: true,
        relax_quotes: true,
        trim: true,
      }
    ) as CsvRow[];

    console.log(
      `CSV rows parsed: ${records.length}`
    );

    if (records.length === 0) {
      throw new Error(
        "CSV contains no data rows."
      );
    }

    // =========================================================
    // LOAD PARENT PRODUCTS
    // =========================================================

    const {
      data: productData,
      error: productsError,
    } = await supabaseAdmin
      .from("products")
      .select("id, sku, name")
      .not("sku", "is", null);

    if (productsError) {
      throw new Error(
        `Could not load parent products: ${productsError.message}`
      );
    }

    const products =
      (productData ?? []) as ProductLookup[];

    console.log(
      `Parent products loaded from Supabase: ${products.length}`
    );

    const productBySku =
      new Map<
        string,
        ProductLookup
      >();

    for (const product of products) {
      const sku =
        normalizeSku(product.sku);

      if (!sku) {
        continue;
      }

      productBySku.set(
        sku,
        product
      );
    }

    // =========================================================
    // BUILD VARIANT ROWS
    // =========================================================

    const variantRows: Array<{
      parent_product_id: number | null;
      parent_sku: string;
      item_group_id: string | null;

      variant_sku: string;
      product_name: string;

      color: string | null;
      size: string | null;

      image_url: string | null;
      additional_image_url: string | null;

      product_url: string | null;

      availability: string | null;

      price: string | null;
      sale_price: string | null;

      is_bundle: boolean;

      raw_data: CsvRow;

      synced_at: string;
      updated_at: string;
    }> = [];

    let skippedNoSku = 0;
    let skippedParentRows = 0;
    let unmatchedParents = 0;

    const unmatchedParentSkus =
      new Set<string>();

    for (const row of records) {
      const variantSku =
        normalizeSku(row.id);

      if (!variantSku) {
        skippedNoSku++;
        continue;
      }

      const parentSku =
        resolveParentSku(row);

      if (!parentSku) {
        skippedNoSku++;
        continue;
      }

      const color =
        clean(row.color);

      const size =
        clean(row.size);

      const itemGroupId =
        normalizeGroupId(
          row.item_group_id
        );

      /**
       * Parent CSV rows look like:
       *
       * ND1125
       * item_group_id = ND1125-GROUP
       * color = empty
       *
       * Actual variant:
       *
       * ND1125-5
       * color = Beige
       *
       * We do NOT put parent rows into product_variants.
       */
      const looksLikeParent =
        variantSku === parentSku;

      if (looksLikeParent) {
        skippedParentRows++;
        continue;
      }

      const parentProduct =
        productBySku.get(
          parentSku
        );

      if (!parentProduct) {
        unmatchedParents++;

        unmatchedParentSkus.add(
          parentSku
        );
      }

      variantRows.push({
        parent_product_id:
          parentProduct?.id ??
          null,

        parent_sku:
          parentSku,

        item_group_id:
          itemGroupId,

        variant_sku:
          variantSku,

        product_name:
          clean(row.title) ??
          parentProduct?.name ??
          variantSku,

        color,

        size,

        image_url:
          clean(row.image_link),

        additional_image_url:
          clean(
            row.additional_image_link
          ),

        product_url:
          clean(row.link) ??
          clean(row.mobile_link),

        availability:
          clean(row.availability),

        price:
          clean(row.price),

        sale_price:
          clean(row.sale_price),

        is_bundle:
          isBundleRow(
            row,
            parentSku
          ),

        raw_data:
          row,

        synced_at:
          startedAt,

        updated_at:
          startedAt,
      });
    }

    // =========================================================
    // DEDUPLICATE BY VARIANT SKU
    // =========================================================

    const variantMap =
      new Map<
        string,
        (typeof variantRows)[number]
      >();

    for (const row of variantRows) {
      variantMap.set(
        row.variant_sku,
        row
      );
    }

    const uniqueVariants =
      Array.from(
        variantMap.values()
      );

    const duplicatesRemoved =
      variantRows.length -
      uniqueVariants.length;

    console.log(
      `Variant rows ready: ${uniqueVariants.length}`
    );

    console.log(
      `CSV parent rows skipped: ${skippedParentRows}`
    );

    console.log(
      `Rows without SKU skipped: ${skippedNoSku}`
    );

    console.log(
      `Duplicate variant SKUs removed: ${duplicatesRemoved}`
    );

    console.log(
      `Variants without matched parent product: ${unmatchedParents}`
    );

    // =========================================================
    // UPSERT IN BATCHES
    // =========================================================

    let totalSynced = 0;

    const batches =
      chunksOf(
        uniqueVariants,
        300
      );

    for (
      let index = 0;
      index < batches.length;
      index++
    ) {
      const batch =
        batches[index];

      console.log(
        `Upserting variant batch ${
          index + 1
        }/${batches.length}: ${
          batch.length
        } rows`
      );

      const { error } =
        await supabaseAdmin
          .from(
            "product_variants"
          )
          .upsert(
            batch,
            {
              onConflict:
                "variant_sku",
            }
          );

      if (error) {
        throw new Error(
          `Variant batch ${
            index + 1
          } failed: ${error.message}`
        );
      }

      totalSynced +=
        batch.length;
    }

    // =========================================================
    // SYNC STATE
    // =========================================================

    const finishedAt =
      new Date().toISOString();

    try {
      await supabaseAdmin
        .from("sync_state")
        .upsert(
          {
            source:
              "nordace_product_variants_csv",

            status:
              "completed",

            total_records:
              uniqueVariants.length,

            synced_records:
              totalSynced,

            last_started_at:
              startedAt,

            last_completed_at:
              finishedAt,

            last_error:
              null,

            updated_at:
              finishedAt,
          },
          {
            onConflict:
              "source",
          }
        );
    } catch (error) {
      console.warn(
        "Variant sync state warning:",
        error
      );
    }

    // =========================================================
    // SAMPLE
    // =========================================================

    const sample =
      uniqueVariants
        .slice(0, 10)
        .map((variant) => ({
          parent_sku:
            variant.parent_sku,

          variant_sku:
            variant.variant_sku,

          color:
            variant.color,

          size:
            variant.size,

          image_url:
            variant.image_url,

          parent_product_id:
            variant.parent_product_id,
        }));

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,

      csvRows:
        records.length,

      parentProductsLoaded:
        products.length,

      parentRowsSkipped:
        skippedParentRows,

      rowsWithoutSkuSkipped:
        skippedNoSku,

      duplicateVariantsRemoved:
        duplicatesRemoved,

      variantsFound:
        uniqueVariants.length,

      variantsSynced:
        totalSynced,

      variantsMatchedToProducts:
        uniqueVariants.filter(
          (variant) =>
            variant.parent_product_id !=
            null
        ).length,

      variantsWithoutParent:
        uniqueVariants.filter(
          (variant) =>
            variant.parent_product_id ==
            null
        ).length,

      unmatchedParentSkus:
        Array.from(
          unmatchedParentSkus
        ).slice(0, 100),

      sample,

      message:
        "Nordace product variants synced successfully from CSV.",

      timestamp:
        finishedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Product variant CSV sync error:",
      message
    );

    try {
      await supabaseAdmin
        .from("sync_state")
        .upsert(
          {
            source:
              "nordace_product_variants_csv",

            status:
              "error",

            last_started_at:
              startedAt,

            last_error:
              message,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "source",
          }
        );
    } catch {
      // Do not mask original error.
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}