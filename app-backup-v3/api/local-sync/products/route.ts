import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ManifestFile = {
  index?: number;
  file?: string;
  language?: string;
  products_count?: number;
  compressed?: boolean;
};

type ProductImage = {
  id?: number | string | null;
  src?: string | null;
  url?: string | null;
  alt?: string | null;
  name?: string | null;
  position?: number | null;
};

type NordaceProduct = {
  id?: number | string | null;
  parent_id?: number | string | null;

  name?: string | null;
  slug?: string | null;
  sku?: string | null;

  type?: string | null;
  status?: string | null;
  purchasable?: boolean | null;
  virtual?: boolean | null;

  description?: string | null;
  short_description?: string | null;

  permalink?: string | null;

  price?: string | number | null;
  regular_price?: string | number | null;
  sale_price?: string | number | null;

  stock_status?: string | null;
  stock_quantity?: number | null;
  manage_stock?: boolean | null;
  backorders?: string | null;
  backorders_allowed?: boolean | null;

  featured_image?: string | null;

  images?: ProductImage[] | null;

  variation_ids?: Array<number | string> | null;

  categories?: unknown;
  tags?: unknown;
  attributes?: unknown;
  dimensions?: unknown;

  multi_currency_prices?: unknown;

  created_at?: string | null;
  updated_at?: string | null;
  date_created?: string | null;
  date_modified?: string | null;

  [key: string]: unknown;
};

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getProductsFromPayload(payload: unknown): NordaceProduct[] {
  if (Array.isArray(payload)) {
    return payload as NordaceProduct[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "products" in payload
  ) {
    const products = (payload as { products?: unknown }).products;

    if (Array.isArray(products)) {
      return products as NordaceProduct[];
    }
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    const data = (payload as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return data as NordaceProduct[];
    }

    if (
      data &&
      typeof data === "object" &&
      "products" in data
    ) {
      const products = (
        data as { products?: unknown }
      ).products;

      if (Array.isArray(products)) {
        return products as NordaceProduct[];
      }
    }
  }

  return [];
}

export async function POST(request: NextRequest) {
  const startedAt = new Date().toISOString();

  try {
    // =========================================================
    // LOCAL ONLY
    // =========================================================

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          success: false,
          error: "Product sync is disabled in production.",
        },
        { status: 403 }
      );
    }

    const host = request.headers.get("host") ?? "";

    const isLocal =
      host.startsWith("localhost:") ||
      host.startsWith("127.0.0.1:");

    if (!isLocal) {
      return NextResponse.json(
        {
          success: false,
          error: "Product sync can only run from localhost.",
        },
        { status: 403 }
      );
    }

    // =========================================================
    // CONFIG
    // =========================================================

    const rawBaseUrl =
      process.env.ND_PRODUCT_API_BASE_URL;

    const token =
      process.env.ND_PRODUCT_API_TOKEN;

    if (!rawBaseUrl || !token) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing ND_PRODUCT_API_BASE_URL or ND_PRODUCT_API_TOKEN.",
        },
        { status: 500 }
      );
    }

    const baseUrl = cleanBaseUrl(rawBaseUrl);

    // =========================================================
    // LOAD PRODUCT MANIFEST
    // =========================================================

    console.log("Loading Nordace product manifest...");

    const manifestResponse = await fetch(
      `${baseUrl}/products`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!manifestResponse.ok) {
      const body = await manifestResponse.text();

      throw new Error(
        `Product manifest failed: ${manifestResponse.status} ${body.slice(
          0,
          1000
        )}`
      );
    }

    const manifest = await manifestResponse.json();

    const manifestFiles: ManifestFile[] =
      Array.isArray(manifest?.files)
        ? manifest.files
        : [];

    // =========================================================
    // ENGLISH ONLY
    // =========================================================

    const englishChunks = manifestFiles
      .filter(
        (file) =>
          String(file.language ?? "").toLowerCase() === "en"
      )
      .sort(
        (a, b) =>
          Number(a.index ?? 0) -
          Number(b.index ?? 0)
      );

    if (englishChunks.length === 0) {
      throw new Error(
        "No English product chunks found in Nordace manifest."
      );
    }

    console.log(
      `English chunks found: ${englishChunks.length}`
    );

    console.log(
      `Expected English products: ${englishChunks.reduce(
        (total, file) =>
          total + Number(file.products_count ?? 0),
        0
      )}`
    );

    // =========================================================
    // COUNTERS
    // =========================================================

    let totalProducts = 0;
    let totalImages = 0;
    let totalDuplicateImagesRemoved = 0;
    let chunksProcessed = 0;

    // =========================================================
    // FETCH EACH ENGLISH CHUNK
    // =========================================================

    for (const chunk of englishChunks) {
      const chunkNumber = Number(chunk.index ?? 0);

      console.log(
        `Fetching English product chunk ${chunkNumber}...`
      );

      const chunkUrl =
        `${baseUrl}/products` +
        `?chunk=${chunkNumber}` +
        `&language=en`;

      const chunkResponse = await fetch(chunkUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!chunkResponse.ok) {
        const body = await chunkResponse.text();

        throw new Error(
          `Product chunk ${chunkNumber} failed: ` +
            `${chunkResponse.status} ` +
            body.slice(0, 1000)
        );
      }

      const chunkPayload = await chunkResponse.json();

      const products =
        getProductsFromPayload(chunkPayload);

      console.log(
        `Chunk ${chunkNumber}: ${products.length} products received`
      );

      if (products.length === 0) {
        console.warn(
          `Chunk ${chunkNumber} contained no products.`
        );

        chunksProcessed++;
        continue;
      }

      const syncedAt = new Date().toISOString();

      // =======================================================
      // PRODUCTS
      // =======================================================

      const productRows = products
        .filter(
          (product) =>
            product.id != null &&
            Number.isFinite(Number(product.id))
        )
        .map((product) => {
          const images =
            Array.isArray(product.images)
              ? product.images
              : [];

          const firstImage =
            images.find(
              (image) =>
                Boolean(image?.src || image?.url)
            ) ?? null;

          return {
            id: Number(product.id),

            name: String(
              product.name ??
                `Product ${product.id}`
            ),

            slug:
              product.slug ?? null,

            sku:
              product.sku ?? null,

            status:
              product.status ?? null,

            language: "en",

            description:
              product.description ?? null,

            short_description:
              product.short_description ?? null,

            permalink:
              product.permalink ?? null,

            price:
              product.price != null
                ? String(product.price)
                : null,

            regular_price:
              product.regular_price != null
                ? String(product.regular_price)
                : null,

            sale_price:
              product.sale_price != null
                ? String(product.sale_price)
                : null,

            featured_image:
              product.featured_image ??
              firstImage?.src ??
              firstImage?.url ??
              null,

            metadata: {
              type:
                product.type ?? null,

              parent_id:
                product.parent_id ?? null,

              purchasable:
                product.purchasable ?? null,

              virtual:
                product.virtual ?? null,

              stock_status:
                product.stock_status ?? null,

              stock_quantity:
                product.stock_quantity ?? null,

              manage_stock:
                product.manage_stock ?? null,

              backorders:
                product.backorders ?? null,

              backorders_allowed:
                product.backorders_allowed ??
                null,

              categories:
                product.categories ?? null,

              tags:
                product.tags ?? null,

              attributes:
                product.attributes ?? null,

              dimensions:
                product.dimensions ?? null,

              variation_ids:
                product.variation_ids ?? [],

              multi_currency_prices:
                product.multi_currency_prices ??
                null,
            },

            raw_data: product,

            created_at:
              product.created_at ??
              product.date_created ??
              null,

            updated_at:
              product.updated_at ??
              product.date_modified ??
              null,

            synced_at: syncedAt,
          };
        });

      if (productRows.length > 0) {
        const { error: productError } =
          await supabaseAdmin
            .from("products")
            .upsert(productRows, {
              onConflict: "id",
            });

        if (productError) {
          throw new Error(
            `Product upsert failed on chunk ${chunkNumber}: ` +
              productError.message
          );
        }

        totalProducts += productRows.length;
      }

      // =======================================================
      // PRODUCT IMAGES
      // =======================================================

      const rawImageRows: Array<{
        product_id: number;
        source_id: number | null;
        src: string;
        alt: string | null;
        position: number;
        raw_data: ProductImage;
        synced_at: string;
      }> = [];

      for (const product of products) {
        if (
          product.id == null ||
          !Number.isFinite(Number(product.id))
        ) {
          continue;
        }

        const productId = Number(product.id);

        const images =
          Array.isArray(product.images)
            ? product.images
            : [];

        images.forEach((image, index) => {
          const src =
            image?.src ??
            image?.url ??
            null;

          if (!src) {
            return;
          }

          const normalizedSrc = String(src).trim();

          if (!normalizedSrc) {
            return;
          }

          const parsedImageId =
            image.id != null &&
            Number.isFinite(Number(image.id))
              ? Number(image.id)
              : null;

          rawImageRows.push({
            product_id: productId,

            source_id: parsedImageId,

            src: normalizedSrc,

            alt:
              image.alt ??
              image.name ??
              null,

            position:
              image.position != null &&
              Number.isFinite(
                Number(image.position)
              )
                ? Number(image.position)
                : index,

            raw_data: image,

            synced_at: syncedAt,
          });
        });
      }

      // =======================================================
      // DEDUPLICATE product_id + src
      // =======================================================

      const imageMap = new Map<
        string,
        (typeof rawImageRows)[number]
      >();

      for (const row of rawImageRows) {
        const key = `${row.product_id}::${row.src}`;

        if (!imageMap.has(key)) {
          imageMap.set(key, row);
        }
      }

      const imageRows = Array.from(
        imageMap.values()
      );

      const duplicatesRemoved =
        rawImageRows.length - imageRows.length;

      totalDuplicateImagesRemoved +=
        duplicatesRemoved;

      if (duplicatesRemoved > 0) {
        console.log(
          `Chunk ${chunkNumber}: removed ${duplicatesRemoved} duplicate image rows`
        );
      }

      if (imageRows.length > 0) {
        const { error: imageError } =
          await supabaseAdmin
            .from("product_images")
            .upsert(imageRows, {
              onConflict: "product_id,src",
            });

        if (imageError) {
          throw new Error(
            `Product image upsert failed on chunk ${chunkNumber}: ` +
              imageError.message
          );
        }

        totalImages += imageRows.length;
      }

      chunksProcessed++;

      console.log(
        `Chunk ${chunkNumber} complete: ` +
          `${productRows.length} products, ` +
          `${imageRows.length} unique images`
      );
    }

    // =========================================================
    // SYNC STATE
    // =========================================================

    const finishedAt = new Date().toISOString();

    const { error: syncStateError } =
      await supabaseAdmin
        .from("sync_state")
        .upsert(
          {
            source: "nordace_products",
            status: "completed",

            total_records: totalProducts,
            synced_records: totalProducts,

            last_started_at: startedAt,
            last_completed_at: finishedAt,

            last_error: null,
            updated_at: finishedAt,
          },
          {
            onConflict: "source",
          }
        );

    if (syncStateError) {
      console.warn(
        "Could not update product sync state:",
        syncStateError.message
      );
    }

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,

      language: "en",

      chunksProcessed,

      products: totalProducts,

      images: totalImages,

      duplicateImagesRemoved:
        totalDuplicateImagesRemoved,

      variants: 0,

      note:
        "Variation IDs are preserved in product metadata. Full variant sync will be added separately.",

      message:
        "Nordace English product library synced successfully",

      timestamp: finishedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Product sync error:",
      message
    );

    try {
      await supabaseAdmin
        .from("sync_state")
        .upsert(
          {
            source: "nordace_products",
            status: "error",

            last_started_at: startedAt,

            last_error: message,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "source",
          }
        );
    } catch (stateError) {
      console.error(
        "Product sync state update failed:",
        stateError
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}