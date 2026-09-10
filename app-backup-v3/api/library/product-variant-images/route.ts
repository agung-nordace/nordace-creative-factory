import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "product-variant-images";
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

type VariantImageRow = {
  id: number;
  variant_id: number;
  variant_sku: string;
  image_url: string;
  label: string | null;
  position: number;
  created_at: string;
};

async function ensureBucket() {
  const { data: buckets, error: listError } =
    await supabaseAdmin.storage.listBuckets();

  if (listError) {
    throw new Error(`Could not list storage buckets: ${listError.message}`);
  }

  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: Array.from(ALLOWED_TYPES),
    });

    if (error) {
      throw new Error(`Could not create ${BUCKET} bucket: ${error.message}`);
    }
  }
}

function extensionFor(file: File) {
  const original = file.name.split(".").pop()?.toLowerCase();
  if (original && /^[a-z0-9]{2,5}$/.test(original)) return original;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/avif") return "avif";
  return "jpg";
}

function storagePathFromPublicUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdRaw = searchParams.get("product_id");
    const variantIdRaw = searchParams.get("variant_id");

    const productId = productIdRaw && Number.isFinite(Number(productIdRaw))
      ? Number(productIdRaw)
      : null;
    const variantId = variantIdRaw && Number.isFinite(Number(variantIdRaw))
      ? Number(variantIdRaw)
      : null;

    if (!productId && !variantId) {
      return NextResponse.json(
        { success: false, error: "Missing product_id or variant_id." },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from("product_variant_images")
      .select(`
        id,
        variant_id,
        variant_sku,
        image_url,
        label,
        position,
        created_at,
        product_variants!inner(parent_product_id)
      `)
      .order("position", { ascending: true })
      .order("id", { ascending: true });

    if (variantId) {
      query = query.eq("variant_id", variantId);
    } else if (productId) {
      query = query.eq("product_variants.parent_product_id", productId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      data: (data ?? []).map((row: any) => ({
        id: row.id,
        variant_id: row.variant_id,
        variant_sku: row.variant_sku,
        image_url: row.image_url,
        label: row.label,
        position: row.position,
        created_at: row.created_at,
      } satisfies VariantImageRow)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload images directly using multipart/form-data.",
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const variantId = Number(formData.get("variant_id"));
    const variantSku = String(formData.get("variant_sku") ?? "").trim();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!Number.isFinite(variantId) || !variantSku || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "variant_id, variant_sku and at least one image file are required.",
        },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `${file.name}: unsupported image type. Use JPG, PNG, WEBP or AVIF.`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `${file.name}: image is larger than 12 MB.`,
          },
          { status: 400 }
        );
      }
    }

    await ensureBucket();

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("product_variant_images")
      .select("position")
      .eq("variant_id", variantId)
      .order("position", { ascending: false })
      .limit(1);

    if (existingError) throw new Error(existingError.message);

    let nextPosition = (existing?.[0]?.position ?? -1) + 1;
    const saved: VariantImageRow[] = [];

    for (const file of files) {
      const extension = extensionFor(file);
      const safeSku = variantSku.replace(/[^a-zA-Z0-9_-]+/g, "-");
      const objectPath = `${safeSku}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(objectPath, bytes, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      const { data: publicData } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(objectPath);

      const imageUrl = publicData.publicUrl;

      const { data, error } = await supabaseAdmin
        .from("product_variant_images")
        .insert({
          variant_id: variantId,
          variant_sku: variantSku,
          image_url: imageUrl,
          label: file.name,
          position: nextPosition,
          updated_at: new Date().toISOString(),
        })
        .select("id, variant_id, variant_sku, image_url, label, position, created_at")
        .single();

      if (error) {
        await supabaseAdmin.storage.from(BUCKET).remove([objectPath]);
        throw new Error(error.message);
      }

      saved.push(data as VariantImageRow);
      nextPosition += 1;
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { success: false, error: "Missing valid image id." },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("product_variant_images")
      .select("image_url")
      .eq("id", id)
      .single();

    if (findError) throw new Error(findError.message);

    const { error } = await supabaseAdmin
      .from("product_variant_images")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    const storagePath = existing?.image_url
      ? storagePathFromPublicUrl(existing.image_url)
      : null;

    if (storagePath) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([storagePath]);

      if (storageError) {
        console.warn("Variant image storage delete warning:", storageError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
