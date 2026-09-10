import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

// ============================================================
// GET LANDING PAGES
// ============================================================

export async function GET(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    // ========================================================
    // PAGINATION
    // ========================================================

    const page = Math.max(
      Number(
        searchParams.get(
          "page"
        ) || "1"
      ),
      1
    );

    const limit =
      Math.min(
        Math.max(
          Number(
            searchParams.get(
              "limit"
            ) || "24"
          ),
          1
        ),
        100
      );

    const offset =
      (page - 1) *
      limit;

    // ========================================================
    // SEARCH
    // ========================================================

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    // ========================================================
    // PRODUCT FILTER
    // ========================================================

    const productIdParam =
      searchParams
        .get("product_id")
        ?.trim() || "";

    let productId:
      number | null =
      null;

    if (
      productIdParam !==
      ""
    ) {
      const parsed =
        Number(
          productIdParam
        );

      if (
        !Number.isFinite(
          parsed
        )
      ) {
        return NextResponse.json(
          {
            success:
              false,

            error:
              "Invalid product_id filter.",
          },
          {
            status: 400,
          }
        );
      }

      productId =
        parsed;
    }

    // ========================================================
    // BUILD QUERY
    // ========================================================

    let query =
      supabaseAdmin
        .from(
          "landing_pages"
        )
        .select(
          `
            id,
            url,
            slug,
            title,
            product_id,
            product_name,
            language,
            market,
            status,
            headline,
            subheadline,
            offer,
            body_text,
            metadata,
            analyzed_at,
            created_at,
            updated_at
          `,
          {
            count:
              "exact",
          }
        );

    // ========================================================
    // STRICT PRODUCT FILTER
    // ========================================================

    if (
      productId !==
      null
    ) {
      console.log(
        "Filtering landing pages by product_id:",
        productId
      );

      query =
        query.eq(
          "product_id",
          productId
        );
    }

    // ========================================================
    // TEXT SEARCH
    // ========================================================

    if (search) {
      const safeSearch =
        search
          .replace(
            /,/g,
            " "
          )
          .trim();

      query =
        query.or(
          [
            `title.ilike.%${safeSearch}%`,
            `product_name.ilike.%${safeSearch}%`,
            `headline.ilike.%${safeSearch}%`,
            `slug.ilike.%${safeSearch}%`,
            `url.ilike.%${safeSearch}%`,
          ].join(",")
        );
    }

    // ========================================================
    // ORDER + PAGINATION
    // ========================================================

    query =
      query
        .order(
          "updated_at",
          {
            ascending:
              false,
          }
        )
        .range(
          offset,
          offset +
            limit -
            1
        );

    const {
      data,
      error,
      count,
    } =
      await query;

    if (error) {
      console.error(
        "Landing page library query error:",
        error
      );

      throw new Error(
        error.message
      );
    }

    const total =
      count ?? 0;

    const pages =
      Math.max(
        Math.ceil(
          total /
            limit
        ),
        1
      );

    // ========================================================
    // DEBUG LOG
    // ========================================================

    console.log(
      "Landing page library result:",
      {
        productId,
        search,
        total,
        returned:
          data?.length ??
          0,
      }
    );

    return NextResponse.json(
      {
        success:
          true,

        data:
          data ?? [],

        filters: {
          search:
            search ||
            null,

          product_id:
            productId,
        },

        pagination: {
          page,

          limit,

          total,

          pages,

          hasNextPage:
            page <
            pages,

          hasPreviousPage:
            page >
            1,
        },
      }
    );
  } catch (
    error
  ) {
    const message =
      error instanceof
      Error
        ? error.message
        : String(
            error
          );

    console.error(
      "Landing Pages API fatal error:",
      message
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          message,
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// PATCH PRODUCT ASSIGNMENT
// ============================================================

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const landingPageId =
      Number(
        body?.landingPageId
      );

    if (
      !Number.isFinite(
        landingPageId
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Invalid landing page ID.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // CLEAR PRODUCT
    // ========================================================

    if (
      body?.productId ===
        null ||
      body?.productId ===
        ""
    ) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            "landing_pages"
          )
          .update({
            product_id:
              null,

            product_name:
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            landingPageId
          )
          .select("*")
          .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      return NextResponse.json(
        {
          success:
            true,

          landingPage:
            data,
        }
      );
    }

    // ========================================================
    // PRODUCT ID
    // ========================================================

    const productId =
      Number(
        body?.productId
      );

    if (
      !Number.isFinite(
        productId
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Invalid product ID.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // GET PRODUCT
    // ========================================================

    const {
      data:
        product,
      error:
        productError,
    } =
      await supabaseAdmin
        .from(
          "products"
        )
        .select(
          `
            id,
            name,
            sku
          `
        )
        .eq(
          "id",
          productId
        )
        .single();

    if (
      productError ||
      !product
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Selected product was not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // UPDATE LANDING PAGE
    // ========================================================

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "landing_pages"
        )
        .update({
          product_id:
            product.id,

          product_name:
            product.name,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          landingPageId
        )
        .select("*")
        .single();

    if (error) {
      throw new Error(
        error.message
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        landingPage:
          data,

        product: {
          id:
            product.id,

          name:
            product.name,

          sku:
            product.sku,
        },
      }
    );
  } catch (
    error
  ) {
    const message =
      error instanceof
      Error
        ? error.message
        : String(
            error
          );

    return NextResponse.json(
      {
        success:
          false,

        error:
          message,
      },
      {
        status: 500,
      }
    );
  }
}