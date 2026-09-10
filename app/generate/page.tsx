"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProductImage = {
  src: string;
  alt?: string | null;
  position?: number | null;
  source_id?: number | null;
};

type Product = {
  id: number;
  name: string;
  sku?: string | null;
  product_kind?: string | null;
  featured_image?: string | null;
  product_images?: ProductImage[];
  metadata?: Record<string, any> | null;
};

type ProductOption = {
  id: number;
  name: string;
  sku?: string | null;
  kind?: string | null;
};

type ProductVariant = {
  id: number;
  parent_product_id: number | null;
  parent_sku: string;
  item_group_id?: string | null;
  variant_sku: string;
  product_name: string;
  color?: string | null;
  size?: string | null;
  image_url?: string | null;
  additional_image_url?: string | null;
  product_url?: string | null;
  availability?: string | null;
  price?: string | null;
  sale_price?: string | null;
  is_bundle?: boolean | null;
  synced_at?: string | null;
};

type VariantAdditionalImage = {
  id: number;
  variant_id: number;
  variant_sku: string;
  image_url: string;
  label?: string | null;
  position?: number | null;
  created_at?: string | null;
};

type ProductSlot = {
  key: string;
  productId: string;
  search: string;
  product: Product | null;
  variants: ProductVariant[];
  selectedVariantIds: string[];
  variantImages: VariantAdditionalImage[];
  loading: boolean;
  variantsLoading: boolean;
  imagesLoading: boolean;
  error: string;
};

type LandingPage = {
  id: number;
  url: string;
  title: string | null;
  slug: string | null;
  product_id: number | null;
  product_name: string | null;
  language: string | null;
  market: string | null;
  headline: string | null;
  subheadline: string | null;
  offer: string | null;
  body_text?: string | null;
};

type Creative = {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  file_url?: string | null;
  thumbnail_url?: string | null;
  optimized_url?: string | null;
  width?: number | null;
  height?: number | null;
  sprint_id?: number | null;
  team_id?: number | null;
};

type CreativeModel = {
  id: string;
  name: string;
  description: string;
  prompt: string;
};

type UploadTarget = {
  slotKey: string;
  variantId: number;
  variantSku: string;
} | null;

type GenerationJob = {
  id: number;
  run_id: number;
  job_index: number;
  status: string;
  prediction_id?: string | null;
  creative_model_id?: string | null;
  creative_model_name?: string | null;
  prompt?: string | null;
  output_url?: string | null;
  output_urls?: string[] | null;
  final_output_url?: string | null;
  art_plate_url?: string | null;
  rendered_text?: Record<string, any> | null;
  typography_status?: string | null;
  typography_qa?: {
    valid?: boolean;
    errors?: string[];
  } | null;
  provider_request?: Record<string, any> | null;
  product_references?: any[] | null;
  error?: string | null;
};

type GenerationProgress = {
  total: number;
  completed: number;
  failed: number;
  processing: number;
};

type SavedCreativeAsset = {
  id: number;
  generation_job_id: number;
  generation_run_id: number;
  title: string | null;
  creative_model_id: string | null;
  creative_model_name: string | null;
  archetype_name: string | null;
  concept_name: string | null;
  ratio: string | null;
  product_summary: string | null;
  image_url: string;
  metadata?: Record<string, any> | null;
};

type GenerateWorkspaceSnapshot = {
  version: 1;
  productSlots: ProductSlot[];
  selectedLandingPageId: string;
  useLandingPageContext: boolean;
  creativeSearch: string;
  selectedCreativeId: string;
  referenceComposition: boolean;
  referenceStyle: boolean;
  referenceCopyStructure: boolean;
  referenceProductAppearance: boolean;
  referenceStrength: "low" | "medium" | "high";
  creativeModels: string[];
  outputCount: number;
  ratio: string;
  creativeDirection: string;
  savedAt: string;
};

const GENERATE_WORKSPACE_KEY = "ndCreativeFactory.generateWorkspace.v1";


const CREATIVE_MODELS: CreativeModel[] = [
  { id: "ugc", name: "UGC / Product In Hand", description: "Natural-looking creator or customer-style product visual.", prompt: "Create an authentic UGC-style ad with the real product naturally held or used by a believable customer/creator. Prioritize candid realism, human context, natural framing and a non-studio feel while keeping the product exact." },
  { id: "testimonial", name: "Static Testimonial", description: "Customer quote, review or story-led static ad.", prompt: "Create a static testimonial ad led by a believable customer quote or short story. Use strong readable hierarchy, credible review styling and the real product as the visual anchor. Keep the layout conversion-focused rather than overly polished." },
  { id: "billboard", name: "Bold Billboard", description: "Large hook with strong product-first composition.", prompt: "Create a bold billboard-style ad with one dominant hook, strong product-first composition, minimal clutter and immediate readability. The real product should be large, clear and visually authoritative." },
  { id: "comparison", name: "Comparison", description: "Before/after, old vs new, problem vs solution.", prompt: "Create a clear comparison ad showing an old-vs-new, problem-vs-solution or before-vs-after contrast. Make the distinction instantly understandable while preserving the selected product exactly." },
  { id: "review", name: "Review / Social Proof", description: "Review card, rating, user proof and credibility.", prompt: "Create a social-proof ad using a review/rating/customer-proof visual system. Emphasize credibility, legibility and trust signals while keeping the real product prominent and accurate." },
  { id: "lifestyle", name: "Lifestyle", description: "Product naturally used in a real-life environment.", prompt: "Create a premium realistic lifestyle ad showing the real product naturally used in a relevant real-world environment. Prioritize believable lighting, context and product integration instead of a catalog-like pose." },
  { id: "feature", name: "Feature Breakdown", description: "Feature-led educational visual with clear hierarchy.", prompt: "Create a feature-breakdown ad that explains a small number of important product benefits visually with clean hierarchy, callouts and product-detail emphasis. Keep claims grounded in provided context." },
  { id: "native", name: "Native Screenshot", description: "Chat, post, comment or platform-native creative style.", prompt: "Create a platform-native ad that feels like a real screenshot, chat, post, comment, review or organic social content. Preserve natural UI-like hierarchy and believable imperfection while keeping the product reference accurate." },
  { id: "demo", name: "Product Demo", description: "Shows the product solving a specific problem.", prompt: "Create a product-demo ad that visually shows the selected product solving one concrete use case or problem. Make the demonstration obvious, functional and easy to understand at a glance." },
  { id: "problem", name: "Problem → Solution", description: "Starts with a pain point and resolves it with the product.", prompt: "Create a problem-to-solution ad that begins with a recognizable pain point and resolves it clearly with the selected product. Use a strong narrative transition and keep the solution visually product-led." },
];

const OUTPUT_COUNTS = [1, 4, 8, 12, 16];
const RATIOS = [
  { id: "1:1", label: "1:1", description: "Square" },
  { id: "4:5", label: "4:5", description: "Meta Feed" },
  { id: "1.91:1", label: "1.91:1", description: "Landscape" },
  { id: "9:16", label: "9:16", description: "Stories / Reels" },
];

function makeSlot(): ProductSlot {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    productId: "",
    search: "",
    product: null,
    variants: [],
    selectedVariantIds: [],
    variantImages: [],
    loading: false,
    variantsLoading: false,
    imagesLoading: false,
    error: "",
  };
}

export default function GeneratePage() {
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productSlots, setProductSlots] = useState<ProductSlot[]>([makeSlot()]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [selectedLandingPageId, setSelectedLandingPageId] = useState("");
  const [useLandingPageContext, setUseLandingPageContext] = useState(true);
  const [lpLoading, setLpLoading] = useState(false);

  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [creativeSearch, setCreativeSearch] = useState("");
  const [selectedCreativeId, setSelectedCreativeId] = useState("");
  const [creativeLoading, setCreativeLoading] = useState(false);
  const [creativeLoadNote, setCreativeLoadNote] = useState("");

  const [referenceComposition, setReferenceComposition] = useState(true);
  const [referenceStyle, setReferenceStyle] = useState(true);
  const [referenceCopyStructure, setReferenceCopyStructure] = useState(false);
  const [referenceProductAppearance, setReferenceProductAppearance] = useState(false);
  const [referenceStrength, setReferenceStrength] = useState<"low" | "medium" | "high">("medium");

  const [creativeModels, setCreativeModels] = useState<string[]>([
    "ugc", "testimonial", "billboard", "comparison", "review", "lifestyle", "feature", "native",
  ]);
  const [outputCount, setOutputCount] = useState(1);
  const [ratio, setRatio] = useState("4:5");
  const [creativeDirection, setCreativeDirection] = useState("");
  const [previewGenerated, setPreviewGenerated] = useState(false);

  const [generationRunId, setGenerationRunId] = useState<number | null>(null);
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
  });
  const [generationState, setGenerationState] = useState<
    "idle" | "submitting" | "processing" | "completed" | "failed"
  >("idle");
  const [generationError, setGenerationError] = useState("");
  const [savedAssetsByJobId, setSavedAssetsByJobId] = useState<
    Record<number, SavedCreativeAsset>
  >({});

  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);

  // Generation results are session-local only.
  // Refreshing /generate starts with a clean results area while preserving
  // product/LP/model form selections.
  useEffect(() => {
    setGenerationRunId(null);
    setGenerationJobs([]);
    setGenerationProgress(null);
    setGenerationState("idle");
    setGenerationError("");
    setPreviewGenerated(false);
    setSavedAssetsByJobId({});
  }, []);

  const [uploadTarget, setUploadTarget] = useState<UploadTarget>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Restore the Generate workspace after navigating to Library and back.
  // This includes the selected products/colors, LP, winning ad settings,
  // creative models, output settings, direction and the last generation run.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GENERATE_WORKSPACE_KEY);

      if (raw) {
        const saved = JSON.parse(raw) as Partial<GenerateWorkspaceSnapshot>;

        if (
          Array.isArray(saved.productSlots) &&
          saved.productSlots.length > 0
        ) {
          setProductSlots(
            saved.productSlots.map((slot) => ({
              ...slot,
              loading: false,
              variantsLoading: false,
              imagesLoading: false,
              error: "",
            }))
          );
        }

        if (typeof saved.selectedLandingPageId === "string") {
          setSelectedLandingPageId(saved.selectedLandingPageId);
        }

        if (typeof saved.useLandingPageContext === "boolean") {
          setUseLandingPageContext(saved.useLandingPageContext);
        }

        if (typeof saved.creativeSearch === "string") {
          setCreativeSearch(saved.creativeSearch);
        }

        if (typeof saved.selectedCreativeId === "string") {
          setSelectedCreativeId(saved.selectedCreativeId);
        }

        if (typeof saved.referenceComposition === "boolean") {
          setReferenceComposition(saved.referenceComposition);
        }

        if (typeof saved.referenceStyle === "boolean") {
          setReferenceStyle(saved.referenceStyle);
        }

        if (typeof saved.referenceCopyStructure === "boolean") {
          setReferenceCopyStructure(saved.referenceCopyStructure);
        }

        if (typeof saved.referenceProductAppearance === "boolean") {
          setReferenceProductAppearance(saved.referenceProductAppearance);
        }

        if (
          saved.referenceStrength === "low" ||
          saved.referenceStrength === "medium" ||
          saved.referenceStrength === "high"
        ) {
          setReferenceStrength(saved.referenceStrength);
        }

        if (
          Array.isArray(saved.creativeModels) &&
          saved.creativeModels.length > 0
        ) {
          setCreativeModels(saved.creativeModels);
        }

        if (
          typeof saved.outputCount === "number" &&
          [1, 4, 8, 12, 16].includes(saved.outputCount)
        ) {
          setOutputCount(saved.outputCount);
        }

        if (
          typeof saved.ratio === "string" &&
          ["1:1", "4:5", "1.91:1", "9:16"].includes(saved.ratio)
        ) {
          setRatio(saved.ratio);
        }

        if (typeof saved.creativeDirection === "string") {
          setCreativeDirection(saved.creativeDirection);
        }
      }
    } catch (error) {
      console.error("Could not restore Generate workspace:", error);
    } finally {
      setWorkspaceHydrated(true);
    }
  }, []);

  // Persist the current Generate workspace so navigation does not wipe it.
  useEffect(() => {
    if (!workspaceHydrated) return;

    const snapshot: GenerateWorkspaceSnapshot = {
      version: 1,
      productSlots: productSlots.map((slot) => ({
        ...slot,
        loading: false,
        variantsLoading: false,
        imagesLoading: false,
        error: "",
      })),
      selectedLandingPageId,
      useLandingPageContext,
      creativeSearch,
      selectedCreativeId,
      referenceComposition,
      referenceStyle,
      referenceCopyStructure,
      referenceProductAppearance,
      referenceStrength,
      creativeModels,
      outputCount,
      ratio,
      creativeDirection,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        GENERATE_WORKSPACE_KEY,
        JSON.stringify(snapshot)
      );
    } catch (error) {
      console.error("Could not save Generate workspace:", error);
    }
  }, [
    workspaceHydrated,
    productSlots,
    selectedLandingPageId,
    useLandingPageContext,
    creativeSearch,
    selectedCreativeId,
    referenceComposition,
    referenceStyle,
    referenceCopyStructure,
    referenceProductAppearance,
    referenceStrength,
    creativeModels,
    outputCount,
    ratio,
    creativeDirection,
  ]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/library/product-options", { cache: "no-store" });
        const result = await response.json();
        if (response.ok && result.success) setProductOptions(result.data ?? []);
      } catch (error) {
        console.error("Product options error:", error);
      }
    })();
  }, []);

  useEffect(() => {
    async function loadAllCreatives() {
      setCreativeLoading(true);
      setCreativeLoadNote("Loading winning ads...");

      const limit = 100;
      const maxPages = 50;
      const map = new Map<number, Creative>();
      let stoppedEarly = false;

      try {
        for (let page = 1; page <= maxPages; page++) {
          try {
            const response = await fetch(
              `/api/library/creatives?page=${page}&limit=${limit}`,
              { cache: "no-store" }
            );

            const result = await response.json();

            if (!response.ok || !result?.success) {
              stoppedEarly = true;

              const message =
                typeof result?.error === "string"
                  ? result.error
                  : result?.error?.message
                    ? String(result.error.message)
                    : `Creative page ${page} could not be loaded`;

              console.warn(
                `Winning-ad library stopped at page ${page}: ${message}`
              );

              break;
            }

            const batch = Array.isArray(result.data)
              ? (result.data as Creative[])
              : [];

            batch.forEach((creative) =>
              map.set(creative.id, creative)
            );

            setCreativeLoadNote(
              `${map.size} winning ads loaded...`
            );

            const explicitTotal = Number(
              result.total ??
              result.pagination?.total ??
              result.meta?.total ??
              NaN
            );

            if (
              Number.isFinite(explicitTotal) &&
              map.size >= explicitTotal
            ) {
              break;
            }

            if (batch.length < limit) {
              break;
            }
          } catch (pageError) {
            stoppedEarly = true;

            console.warn(
              `Winning-ad page ${page} skipped:`,
              pageError instanceof Error
                ? pageError.message
                : String(pageError)
            );

            break;
          }
        }

        const all = Array.from(map.values());
        setCreatives(all);

        if (all.length === 0) {
          setCreativeLoadNote(
            "Winning ads are optional — none could be loaded right now."
          );
        } else if (stoppedEarly) {
          setCreativeLoadNote(
            `${all.length} winning ads loaded · partial library`
          );
        } else {
          setCreativeLoadNote(
            `${all.length} winning ads loaded`
          );
        }
      } finally {
        setCreativeLoading(false);
      }
    }

    loadAllCreatives();
  }, []);

  const primarySlot = productSlots.find((slot) => slot.productId) ?? productSlots[0];
  const primaryProductId = primarySlot?.productId ?? "";

  useEffect(() => {
    if (!primaryProductId) {
      setLandingPages([]);
      setSelectedLandingPageId("");
      return;
    }

    (async () => {
      setLpLoading(true);
      try {
        const response = await fetch(`/api/library/landing-pages?page=1&limit=100&product_id=${encodeURIComponent(primaryProductId)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Failed to load landing pages.");
        const rows = Array.isArray(result.data) ? result.data : [];
        setLandingPages(rows);
        setSelectedLandingPageId((current) => rows.some((lp: LandingPage) => String(lp.id) === current) ? current : "");
      } catch (error) {
        console.error("Landing page load error:", error);
        setLandingPages([]);
      } finally {
        setLpLoading(false);
      }
    })();
  }, [primaryProductId]);

  function patchSlot(key: string, patch: Partial<ProductSlot>) {
    setProductSlots((current) => current.map((slot) => slot.key === key ? { ...slot, ...patch } : slot));
  }

  async function selectProduct(slotKey: string, productId: string) {
    patchSlot(slotKey, {
      productId,
      product: null,
      variants: [],
      selectedVariantIds: [],
      variantImages: [],
      loading: Boolean(productId),
      variantsLoading: Boolean(productId),
      imagesLoading: Boolean(productId),
      error: "",
    });
    setPreviewGenerated(false);
    if (!productId) return;

    try {
      const option = productOptions.find((product) => String(product.id) === productId);
      if (!option) throw new Error("Selected product was not found in Product Library.");
      const search = option.sku || option.name;

      const [productResponse, variantsResponse, imagesResponse] = await Promise.all([
        fetch(`/api/library/products?kind=all&page=1&limit=100&search=${encodeURIComponent(search)}`, { cache: "no-store" }),
        fetch(`/api/library/product-variants?product_id=${encodeURIComponent(productId)}`, { cache: "no-store" }),
        fetch(`/api/library/product-variant-images?product_id=${encodeURIComponent(productId)}`, { cache: "no-store" }),
      ]);

      const [productResult, variantsResult, imagesResult] = await Promise.all([
        productResponse.json(), variantsResponse.json(), imagesResponse.json(),
      ]);

      if (!productResponse.ok || !productResult.success) throw new Error(productResult.error || "Could not load product detail.");
      if (!variantsResponse.ok || !variantsResult.success) throw new Error(variantsResult.error || "Could not load product variants.");

      const exact = (productResult.data ?? []).find((product: Product) => Number(product.id) === Number(productId));
      if (!exact) throw new Error("Exact selected product detail was not returned.");

      const variants = Array.isArray(variantsResult.data) ? (variantsResult.data as ProductVariant[]) : [];
      const variantImages = imagesResponse.ok && imagesResult.success && Array.isArray(imagesResult.data)
        ? (imagesResult.data as VariantAdditionalImage[])
        : [];

      const preferred = variants.find((variant) => /beige/i.test(String(variant.color ?? ""))) ?? variants[0];
      patchSlot(slotKey, {
        product: exact,
        variants,
        variantImages,
        selectedVariantIds: preferred ? [String(preferred.id)] : [],
        loading: false,
        variantsLoading: false,
        imagesLoading: false,
      });
    } catch (error) {
      patchSlot(slotKey, {
        loading: false,
        variantsLoading: false,
        imagesLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function toggleVariant(slotKey: string, variantId: string) {
    setProductSlots((current) => current.map((slot) => {
      if (slot.key !== slotKey) return slot;
      const exists = slot.selectedVariantIds.includes(variantId);
      return {
        ...slot,
        selectedVariantIds: exists
          ? slot.selectedVariantIds.filter((id) => id !== variantId)
          : [...slot.selectedVariantIds, variantId],
      };
    }));
    setPreviewGenerated(false);
  }

  function addProductSlot() {
    setProductSlots((current) => [...current, makeSlot()]);
    setPreviewGenerated(false);
  }

  function removeProductSlot(slotKey: string) {
    setProductSlots((current) => current.length === 1 ? current : current.filter((slot) => slot.key !== slotKey));
    setPreviewGenerated(false);
  }

  function beginUpload(slotKey: string, variant: ProductVariant) {
    setUploadTarget({ slotKey, variantId: variant.id, variantSku: variant.variant_sku });
    setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function uploadVariantImages(files: FileList) {
    if (!uploadTarget || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("variant_id", String(uploadTarget.variantId));
      formData.append("variant_sku", uploadTarget.variantSku);
      Array.from(files).filter((file) => file.type.startsWith("image/")).forEach((file) => formData.append("files", file));

      const response = await fetch("/api/library/product-variant-images", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to upload images.");
      const uploaded: VariantAdditionalImage[] = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];

      setProductSlots((current) => current.map((slot) => {
        if (slot.key !== uploadTarget.slotKey) return slot;
        const map = new Map(slot.variantImages.map((image) => [image.id, image]));
        uploaded.forEach((image) => map.set(image.id, image));
        return { ...slot, variantImages: Array.from(map.values()) };
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeVariantImage(slotKey: string, imageId: number) {
    try {
      const response = await fetch(`/api/library/product-variant-images?id=${encodeURIComponent(String(imageId))}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to remove image.");
      setProductSlots((current) => current.map((slot) => slot.key === slotKey
        ? { ...slot, variantImages: slot.variantImages.filter((image) => image.id !== imageId) }
        : slot));
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  const filteredCreatives = useMemo(() => {
    const q = creativeSearch.trim().toLowerCase();
    if (!q) return creatives;
    return creatives.filter((creative) => [creative.name, creative.description, creative.type]
      .filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [creatives, creativeSearch]);

  const selectedCreative = useMemo(() => creatives.find((creative) => String(creative.id) === selectedCreativeId) ?? null, [creatives, selectedCreativeId]);
  const selectedLandingPage = useMemo(() => landingPages.find((lp) => String(lp.id) === selectedLandingPageId) ?? null, [landingPages, selectedLandingPageId]);

  const productReferenceGroups = useMemo(() => {
    return productSlots.flatMap((slot) => {
      if (!slot.product) return [];
      return slot.selectedVariantIds.flatMap((variantId) => {
        const variant = slot.variants.find((item) => String(item.id) === variantId);
        if (!variant) return [];
        const saved = slot.variantImages.filter((image) => image.variant_id === variant.id);
        const refs = Array.from(new Set([
          ...(variant.image_url ? [variant.image_url] : []),
          ...saved.map((image) => image.image_url),
        ].filter(Boolean)));
        return [{
          productId: slot.product.id,
          productName: slot.product.name,
          parentSku: slot.product.sku ?? null,
          variantId: variant.id,
          variantSku: variant.variant_sku,
          color: variant.color ?? null,
          primaryReference: variant.image_url ?? null,
          references: refs,
        }];
      });
    });
  }, [productSlots]);

  const allProductReferenceUrls = useMemo(() => Array.from(new Set(productReferenceGroups.flatMap((group) => group.references))), [productReferenceGroups]);

  const canGenerate = productReferenceGroups.length > 0 && allProductReferenceUrls.length > 0 && creativeModels.length > 0;

  const variationPlan = useMemo(() => Array.from({ length: outputCount }, (_, index) => {
    const id = creativeModels[index % Math.max(creativeModels.length, 1)];
    return CREATIVE_MODELS.find((model) => model.id === id) ?? CREATIVE_MODELS[0];
  }), [creativeModels, outputCount]);

  function toggleCreativeModel(id: string) {
    setCreativeModels((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setPreviewGenerated(false);
  }

  function buildGenerationProducts() {
    return productSlots
      .filter((slot) => slot.product)
      .map((slot) => {
        const selectedVariants = slot.variants.filter((variant) =>
          slot.selectedVariantIds.includes(String(variant.id))
        );

        return {
          productId: slot.product?.id ?? null,
          productName: slot.product?.name ?? null,
          parentSku: slot.product?.sku ?? null,
          variants: selectedVariants.map((variant) => {
            const savedUrls = slot.variantImages
              .filter((image) => image.variant_id === variant.id)
              .map((image) => image.image_url)
              .filter(Boolean);

            const references = Array.from(
              new Set(
                [
                  variant.image_url,
                  ...savedUrls,
                ].filter(Boolean) as string[]
              )
            );

            return {
              variantId: variant.id,
              variantSku: variant.variant_sku,
              color: variant.color ?? null,
              productName: slot.product?.name ?? variant.product_name,
              parentSku: slot.product?.sku ?? variant.parent_sku,
              references,
            };
          }),
        };
      })
      .filter((product) => product.variants.length > 0);
  }


  function getJobProductIdentity(job: GenerationJob) {
    const groups = Array.isArray(job.product_references)
      ? job.product_references
      : [];

    const names = Array.from(
      new Set(
        groups
          .map((group: any) =>
            String(group?.productName || group?.product_name || "").trim()
          )
          .filter(Boolean)
      )
    );

    const skus = Array.from(
      new Set(
        groups
          .map((group: any) =>
            String(group?.parentSku || group?.parent_sku || group?.sku || "").trim()
          )
          .filter(Boolean)
      )
    );

    const keys = Array.from(
      new Set(
        groups
          .map((group: any) => {
            const sku = String(
              group?.parentSku || group?.parent_sku || group?.sku || ""
            ).trim();

            const name = String(
              group?.productName || group?.product_name || ""
            ).trim();

            return sku || name.toLowerCase().replace(/\s+/g, "-");
          })
          .filter(Boolean)
      )
    );

    const summary =
      names.length > 0
        ? names.join(" + ")
        : skus.length > 0
          ? skus.join(" + ")
          : null;

    return { names, skus, keys, summary };
  }

  async function persistCompletedAssets(jobs: GenerationJob[]) {
    const ready = jobs.filter(
      (job) =>
        job.status === "completed" &&
        Boolean(job.output_url) &&
        !savedAssetsByJobId[job.id]
    );

    if (!ready.length) return;

    for (const job of ready) {
      try {
        const designerPlan =
          job.provider_request?._designer_plan || {};

        const productIdentity = getJobProductIdentity(job);

        const response = await fetch(
          "/api/library/generated-creatives",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              generation_job_id: job.id,
              generation_run_id: job.run_id,
              title:
                designerPlan.conceptName ||
                job.creative_model_name ||
                `Creative ${job.job_index + 1}`,
              creative_model_id:
                job.creative_model_id || null,
              creative_model_name:
                job.creative_model_name || null,
              archetype_name:
                designerPlan.archetypeName || null,
              concept_name:
                designerPlan.conceptName || null,
              ratio: job.ratio || null,
              product_summary:
                productIdentity.summary ||
                designerPlan.productSummary ||
                null,
              product_keys: productIdentity.keys,
              product_names: productIdentity.names,
              product_skus: productIdentity.skus,
              image_url: job.output_url,
              prompt: job.prompt || null,
              metadata: {
                designer_plan: designerPlan,
                rendered_text: job.rendered_text || null,
              },
            }),
          }
        );

        const result = await response.json();

        if (response.ok && result.success && result.asset) {
          setSavedAssetsByJobId((current) => ({
            ...current,
            [job.id]: result.asset,
          }));
        }
      } catch (error) {
        console.error(
          `Could not persist generated creative for job ${job.id}:`,
          error
        );
      }
    }
  }

  async function refreshGeneration(runId: number) {
    const response = await fetch(
      `/api/generate/status?run_id=${encodeURIComponent(String(runId))}`,
      {
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Failed to refresh generation status."
      );
    }

    const jobs = Array.isArray(result.jobs)
      ? (result.jobs as GenerationJob[])
      : [];

    setGenerationJobs(jobs);

    await persistCompletedAssets(jobs);

    setGenerationProgress({
      total: Number(result.progress?.total ?? jobs.length ?? 0),
      completed: Number(result.progress?.completed ?? 0),
      failed: Number(result.progress?.failed ?? 0),
      processing: Number(result.progress?.processing ?? 0),
    });

    const terminalJobs = jobs.filter((job) =>
      ["completed", "failed"].includes(job.status)
    );

    if (jobs.length > 0 && terminalJobs.length === jobs.length) {
      const successful = jobs.filter((job) => job.status === "completed");
      setGenerationState(successful.length > 0 ? "completed" : "failed");
      return true;
    }

    setGenerationState("processing");
    return false;
  }

  async function generatePreview() {
    if (!canGenerate || generationState === "submitting") return;

    setGenerationError("");
    setGenerationJobs([]);
    setGenerationRunId(null);
    setGenerationProgress({
      total: outputCount,
      completed: 0,
      failed: 0,
      processing: outputCount,
    });
    setPreviewGenerated(true);
    setGenerationState("submitting");

    const products = buildGenerationProducts();

    const payload = {
      products,
      landingPage:
        useLandingPageContext
          ? selectedLandingPage
          : null,
      winningCreative: selectedCreative
        ? {
            ...selectedCreative,
            referenceSettings: {
              composition: referenceComposition,
              style: referenceStyle,
              copyStructure: referenceCopyStructure,
              productAppearance: referenceProductAppearance,
              strength: referenceStrength,
            },
          }
        : null,
      creativeModels: creativeModels
        .map((id) =>
          CREATIVE_MODELS.find((model) => model.id === id)
        )
        .filter(Boolean),
      outputCount,
      ratio,
      creativeDirection,
    };

    localStorage.setItem(
      "generationDraft",
      JSON.stringify(payload)
    );

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Generation could not be submitted."
        );
      }

      const runId = Number(result.runId);

      if (!Number.isFinite(runId)) {
        throw new Error(
          "Generation started but no run ID was returned."
        );
      }

      setGenerationRunId(runId);
      setGenerationState("processing");

      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      setGenerationError(message);
      setGenerationState("failed");
    }
  }

  useEffect(() => {
    if (
      !generationRunId ||
      generationState !== "processing"
    ) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;

      try {
        const finished = await refreshGeneration(
          generationRunId
        );

        if (!cancelled && !finished) {
          timer = setTimeout(poll, 2200);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        if (!cancelled) {
          setGenerationError(message);
          timer = setTimeout(poll, 3500);
        }
      }
    }

    poll();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [generationRunId, generationState]);

  function filteredProductsForSlot(slot: ProductSlot) {
    const q = slot.search.trim().toLowerCase();
    if (!q) return productOptions;
    return productOptions.filter((product) => `${product.name} ${product.sku ?? ""}`.toLowerCase().includes(q));
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark">N</div><div><div className="brandName">ND Creative</div><div className="brandSub">Factory</div></div></div>
        <div className="navLabel">WORKSPACE</div>
        <nav className="nav">
          <button onClick={() => (window.location.href = "/")}>⌂ <span>Dashboard</span></button>
          <button>▧ <span>Images</span></button>
          <button onClick={() => (window.location.href = "/products")}>□ <span>Products</span></button>
          <button onClick={() => (window.location.href = "/landing-pages")}>▤ <span>Landing Pages</span></button>
          <button>⌘ <span>Workflows</span></button>
          <button className="active">✦ <span>Generate</span></button>
          <button onClick={() => (window.location.href = "/generated-library")}>▣ <span>Library</span></button>
          <button>◷ <span>Jobs</span></button>
        </nav>
        <div className="sidebarBottom"><button>⚙ <span>Settings</span></button></div>
      </aside>

      <main className="main">
        <header className="pageHeader">
          <div className="pageHeaderTop">
            <div>
              <div className="eyebrow">CREATIVE FACTORY</div>
              <h1>Generate Variations</h1>
              <p>Build multiple creative concepts from product references, landing-page context and optional winning ads.</p>
            </div>

            <div className="pageHeaderActions">
              <button
                type="button"
                className="libraryHeaderButton"
                onClick={() => {
                  window.location.href = "/generated-library";
                }}
              >
                ▣ Creative Library
              </button>

              <button
                type="button"
                className="clearWorkspaceButton"
                onClick={() => {
                  localStorage.removeItem(GENERATE_WORKSPACE_KEY);
                  window.location.href = "/generate";
                }}
              >
                Clear Workspace
              </button>
            </div>
          </div>
        </header>

        <section className="section">
          <div className="sectionHeader">
            <div className="step">1</div>
            <div><h2>Product References</h2><p>Select one or more products and one or more colors. Every selected color becomes a locked product reference.</p></div>
            <span className="required">REQUIRED</span>
          </div>
          <div className="sectionBody">
            <div className="productImageOnlyNotice">
              <strong>Clear product images only</strong>
              <span>Use clean, accurate product-only references. Avoid models, lifestyle scenes, text overlays, collages, or unrelated objects in these product-lock images.</span>
            </div>

            <input ref={fileInputRef} className="hiddenFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => event.target.files && uploadVariantImages(event.target.files)} />

            <div className="productSlots">
              {productSlots.map((slot, slotIndex) => (
                <div className="productSlot" key={slot.key}>
                  <div className="productSlotHeader">
                    <div><span className="slotKicker">PRODUCT {slotIndex + 1}</span><h3>{slot.product?.name || "Choose a product"}</h3></div>
                    {productSlots.length > 1 && <button className="dangerGhost" type="button" onClick={() => removeProductSlot(slot.key)}>Remove Product</button>}
                  </div>

                  <div className="twoColumns">
                    <div><label>SEARCH PRODUCT</label><input className="input" value={slot.search} onChange={(e) => patchSlot(slot.key, { search: e.target.value })} placeholder="Search product name or SKU..." /></div>
                    <div><label>SELECT PRODUCT</label><select className="input" value={slot.productId} onChange={(e) => selectProduct(slot.key, e.target.value)}>
                      <option value="">Select a product...</option>
                      {filteredProductsForSlot(slot).map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` — ${product.sku}` : ""}</option>)}
                    </select></div>
                  </div>

                  {(slot.loading || slot.variantsLoading) && <div className="statusBox">Loading product and color variants...</div>}
                  {slot.error && <div className="errorBox">{slot.error}</div>}

                  {slot.product && !slot.variantsLoading && (
                    <>
                      <div className="selectionSummary">
                        <div><span>SELECTED PRODUCT</span><strong>{slot.product.name}</strong><small>{slot.product.sku || "No SKU"}</small></div>
                        <div className="summaryMetric"><strong>{slot.selectedVariantIds.length}</strong><span>colors selected</span></div>
                      </div>

                      {slot.variants.length > 0 ? (
                        <div className="variantGrid">
                          {slot.variants.map((variant) => {
                            const active = slot.selectedVariantIds.includes(String(variant.id));
                            const saved = slot.variantImages.filter((image) => image.variant_id === variant.id);
                            return (
                              <div className={active ? "variantCard active" : "variantCard"} key={variant.id}>
                                <button className="variantSelect" type="button" onClick={() => toggleVariant(slot.key, String(variant.id))}>
                                  <div className="variantThumb">{variant.image_url ? <img src={variant.image_url} alt={`${slot.product?.name} ${variant.color ?? variant.variant_sku}`} /> : <span>No image</span>}</div>
                                  <div className="variantMeta"><strong>{variant.color || "Default"}</strong><span>{variant.variant_sku}</span><small>{saved.length} saved image{saved.length === 1 ? "" : "s"}</small></div>
                                  <span className="variantCheck">{active ? "✓" : ""}</span>
                                </button>
                                <button className="addImagesButton" type="button" onClick={() => beginUpload(slot.key, variant)} disabled={uploading}>+ Add Images</button>
                                {saved.length > 0 && (
                                  <div className="savedImagesMini">
                                    {saved.map((image) => <div className="savedImageMini" key={image.id}><img src={image.image_url} alt="Saved product reference" /><button type="button" onClick={() => removeVariantImage(slot.key, image.id)}>×</button></div>)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : <div className="statusBox">No official variants found for this product.</div>}
                    </>
                  )}
                </div>
              ))}
            </div>

            <button className="addProductButton" type="button" onClick={addProductSlot}>+ Add Another Product</button>

            <div className="productRule"><strong>Product Lock:</strong> all selected color variants and their saved clear product images are sent together as authoritative product references. This allows a generation to use two or more products or multiple colors in the same creative.</div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader"><div className="step">2</div><div><h2>Landing Page</h2><p>Align messaging with the landing page for the first selected product.</p></div><span className="optional">OPTIONAL</span></div>
          <div className="sectionBody">
            {!primaryProductId ? <div className="statusBox">Select your first product to load matching landing pages.</div> : <>
              <label>TARGET LANDING PAGE</label>
              <select className="input" value={selectedLandingPageId} onChange={(e) => setSelectedLandingPageId(e.target.value)} disabled={lpLoading}>
                <option value="">{lpLoading ? "Loading landing pages..." : "No landing page / Creative only"}</option>
                {landingPages.map((lp) => <option key={lp.id} value={lp.id}>{lp.title || lp.headline || lp.slug}</option>)}
              </select>
              {selectedLandingPage && <div className="contextCard">
                <div className="contextTop"><div><span>LP CONTEXT</span><strong>{selectedLandingPage.title || selectedLandingPage.headline}</strong></div><label className="switchRow"><input type="checkbox" checked={useLandingPageContext} onChange={(e) => setUseLandingPageContext(e.target.checked)} /> Use context</label></div>
                <div className="contextGrid"><div><span>Product</span><strong>{selectedLandingPage.product_name || "—"}</strong></div><div><span>Language</span><strong>{selectedLandingPage.language?.toUpperCase() || "—"}</strong></div><div><span>Market</span><strong>{selectedLandingPage.market || "—"}</strong></div><div><span>Offer</span><strong>{selectedLandingPage.offer || "—"}</strong></div></div>
                <div className="lpHeadline"><span>HEADLINE</span><strong>{selectedLandingPage.headline || "—"}</strong>{selectedLandingPage.subheadline && <p>{selectedLandingPage.subheadline}</p>}</div>
              </div>}
            </>}
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader"><div className="step">3</div><div><h2>Winning Ad Reference</h2><p>Winning Ad is optional. Search available creatives and use one only when you want composition/style inspiration; generation still works without it.</p></div><span className="optional">OPTIONAL</span></div>
          <div className="sectionBody">
            <div className="creativeStatus">{creativeLoading ? "Loading creative library..." : creativeLoadNote}</div>
            <div className="twoColumns">
              <div><label>SEARCH WINNING ADS</label><input className="input" value={creativeSearch} onChange={(e) => setCreativeSearch(e.target.value)} placeholder="Search name, type or description..." /></div>
              <div><label>SELECT WINNING AD ({filteredCreatives.length} MATCHES)</label><select className="input" value={selectedCreativeId} onChange={(e) => setSelectedCreativeId(e.target.value)} disabled={creativeLoading}>
                <option value="">No winning ad reference</option>
                {filteredCreatives.map((creative) => <option key={creative.id} value={creative.id}>{creative.name}</option>)}
              </select></div>
            </div>

            {selectedCreative && <div className="winningCard">
              <div className="winningPreview">{selectedCreative.optimized_url || selectedCreative.thumbnail_url || selectedCreative.file_url ? <img src={selectedCreative.optimized_url || selectedCreative.thumbnail_url || selectedCreative.file_url || ""} alt={selectedCreative.name} /> : <div>No preview</div>}</div>
              <div className="winningSettings"><span className="miniLabel">REFERENCE SETTINGS</span><h3>{selectedCreative.name}</h3>
                <div className="checkGrid">
                  <label><input type="checkbox" checked={referenceComposition} onChange={(e) => setReferenceComposition(e.target.checked)} /> Composition</label>
                  <label><input type="checkbox" checked={referenceStyle} onChange={(e) => setReferenceStyle(e.target.checked)} /> Visual Style</label>
                  <label><input type="checkbox" checked={referenceCopyStructure} onChange={(e) => setReferenceCopyStructure(e.target.checked)} /> Copy Structure</label>
                  <label><input type="checkbox" checked={referenceProductAppearance} onChange={(e) => setReferenceProductAppearance(e.target.checked)} /> Product Appearance</label>
                </div>
                <div className="strength"><label>REFERENCE STRENGTH</label><div className="segmented">{(["low", "medium", "high"] as const).map((item) => <button key={item} type="button" className={referenceStrength === item ? "active" : ""} onClick={() => setReferenceStrength(item)}>{item}</button>)}</div></div>
                <div className="warning">Keep Product Appearance OFF unless you intentionally want the winning ad's product appearance. Selected Product Lock images remain the source of truth.</div>
              </div>
            </div>}
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader"><div className="step">4</div><div><h2>Creative Models</h2><p>Select the concept types the planner is allowed to use. Every model has its own prompt focus below.</p></div><div className="selectedCount">{creativeModels.length} selected</div></div>
          <div className="sectionBody">
            <div className="distributionNote">
              <strong>How distribution works</strong>
              <span><b>Number of Variations = total images for the whole run</b>, not images per Creative Model. Example: 4 variations + 10 selected models = 4 total outputs using the first 4 selected models in this run. 16 variations + 10 selected models = all 10 models get one output, then 6 models repeat for a second distinct concept.</span>
            </div>
            <div className="modelGrid">{CREATIVE_MODELS.map((model) => {
              const active = creativeModels.includes(model.id);
              return <button type="button" key={model.id} className={active ? "model active" : "model"} onClick={() => toggleCreativeModel(model.id)}><div className="modelCheck">{active ? "✓" : ""}</div><strong>{model.name}</strong><p>{model.description}</p><div className="modelPrompt"><span>PROMPT FOCUS</span>{model.prompt}</div></button>;
            })}</div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader"><div className="step">5</div><div><h2>Output Settings</h2><p>Choose quantity and final aspect ratio.</p></div></div>
          <div className="sectionBody">
            <div className="settingsGrid">
              <div><label>NUMBER OF VARIATIONS</label><div className="choiceRow">{OUTPUT_COUNTS.map((count) => <button type="button" key={count} className={outputCount === count ? "choice active" : "choice"} onClick={() => setOutputCount(count)}>{count}</button>)}</div><p className="settingHelp">This is the <b>total number of generated images</b> across all selected Creative Models.</p></div>
              <div><label>ASPECT RATIO</label><div className="ratioRow">{RATIOS.map((item) => <button type="button" key={item.id} className={ratio === item.id ? "ratio active" : "ratio"} onClick={() => setRatio(item.id)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div></div>
            </div>
            <div className="runPlan">
              <div><strong>Run plan</strong><span>{outputCount} total image{outputCount === 1 ? "" : "s"} across {creativeModels.length} selected Creative Model{creativeModels.length === 1 ? "" : "s"}.</span></div>
              <div className="planChips">{variationPlan.map((model, index) => <span key={`${model.id}-${index}`}>#{index + 1} {model.name}</span>)}</div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader"><div className="step">6</div><div><h2>Creative Direction</h2><p>Add optional instructions for the run.</p></div><span className="optional">OPTIONAL</span></div>
          <div className="sectionBody"><textarea className="textarea" value={creativeDirection} onChange={(e) => setCreativeDirection(e.target.value)} placeholder="Example: mature European traveler, airport setting, harsh midday sunlight, realistic photography..." /></div>
        </section>

        <div className="generateBar"><div><strong>{outputCount} variations</strong><span>{productReferenceGroups.length} selected product/color locks • {allProductReferenceUrls.length} reference images • {creativeModels.length} creative models • {ratio}</span></div><button disabled={!canGenerate || generationState === "submitting" || generationState === "processing"} onClick={generatePreview}>{generationState === "submitting" ? "Submitting..." : generationState === "processing" ? "Generating..." : `✦ Generate ${outputCount} Variation${outputCount === 1 ? "" : "s"}`}</button></div>
        {!canGenerate && <div className="validation">Select at least one product color with an official image and at least one creative model.</div>}

        {previewGenerated && (
          <section className="results">
            <div className="resultsHeader">
              <div>
                <div className="eyebrow">
                  {generationState === "completed"
                    ? "GENERATION COMPLETE"
                    : generationState === "failed"
                      ? "GENERATION ISSUE"
                      : "GENERATING CREATIVE CAMPAIGN"}
                </div>

                <h2>
                  {outputCount} Variation{outputCount === 1 ? "" : "s"}
                </h2>

                <p>
                  {generationState === "submitting"
                    ? "Submitting designer briefs to AtlasCloud..."
                    : generationState === "processing"
                      ? "Generating finished designer-style creatives with product-lock, layout and typography in one render..."
                      : generationState === "completed"
                        ? "Final creatives are ready."
                        : "Generation stopped before every creative could be completed."}
                </p>
              </div>

              <span
                className={
                  generationState === "completed"
                    ? "liveBadge completed"
                    : generationState === "failed"
                      ? "liveBadge failed"
                      : "liveBadge"
                }
              >
                {generationState.toUpperCase()}
              </span>
            </div>

            {generationRunId && (
              <div className="runMeta">
                <span>RUN #{generationRunId}</span>
                <span>
                  {generationProgress.completed} provider completed
                </span>
                <span>
                  {generationProgress.failed} failed
                </span>
              </div>
            )}

            {(generationState === "submitting" ||
              generationState === "processing") && (
              <div className="progressWrap">
                <div className="progressTop">
                  <strong>Production progress</strong>
                  <span>
                    {
                      generationJobs.filter(
                        (job) => job.status === "completed" && Boolean(job.output_url)
                      ).length
                    }
                    /{outputCount} finished creatives ready
                  </span>
                </div>

                <div className="progressTrack">
                  <div
                    className="progressFill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          4,
                          (generationJobs.filter(
                            (job) =>
                              job.status === "completed" && Boolean(job.output_url)
                          ).length /
                            Math.max(outputCount, 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {generationError && (
              <div className="generationError">
                <strong>Generation message</strong>
                <span>{generationError}</span>
              </div>
            )}

            <div className="resultsGrid">
              {variationPlan.map((model, index) => {
                const job =
                  generationJobs.find(
                    (item) => item.job_index === index
                  ) ?? null;

                const finalUrl = job?.output_url || null;

                const previewUrl = finalUrl
                  ? `/api/generate/image?url=${encodeURIComponent(finalUrl)}`
                  : null;

                const openFinalUrl = finalUrl
                  ? `/api/generate/image?url=${encodeURIComponent(finalUrl)}`
                  : null;

                const downloadUrl = finalUrl
                  ? `/api/generate/image?download=1&url=${encodeURIComponent(finalUrl)}`
                  : null;

                const conceptName =
                  job?.provider_request?._designer_plan?.conceptName ||
                  model.name;

                const subjectCount =
                  job?.provider_request?._designer_plan?.requiredSubjectCount ||
                  productReferenceGroups.length;

                const statusLabel =
                  finalUrl && job?.status === "completed"
                    ? "Final Ready"
                    : job?.status === "failed"
                      ? "Failed"
                      : job?.status === "processing"
                        ? "Generating"
                        : generationState === "submitting"
                          ? "Submitting"
                          : "Queued";

                return (
                  <div
                    className="resultCard"
                    key={`${model.id}-${index}`}
                  >
                    <div className="resultMedia">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={`Variation ${index + 1} ${model.name}`}
                        />
                      ) : (
                        <div className="resultPlaceholder">
                          <span>
                            VARIATION {index + 1}
                          </span>

                          <strong>
                            {model.name}
                          </strong>

                          <p>
                            {job?.status === "failed"
                              ? job.error ||
                                "Generation failed."
                              : "Designer brief queued for generation."}
                          </p>
                        </div>
                      )}

                      <span
                        className={
                          finalUrl
                            ? "resultStatus done"
                            : job?.status === "failed"
                              ? "resultStatus failed"
                              : "resultStatus"
                        }
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="resultInfo">
                      <div>
                        <strong>
                          {conceptName}
                        </strong>

                        <span>
                          {model.name} • {ratio} • {subjectCount} required product{subjectCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>

                    {finalUrl && openFinalUrl && downloadUrl && (
                      <div className="resultActionsStack">
                        <div className="resultActionsTop">
                          {job && savedAssetsByJobId[job.id] ? (
                            <a
                              className="resultActionButton"
                              href={`/edit-creative?asset_id=${savedAssetsByJobId[job.id].id}`}
                            >
                              ✎ Edit
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="resultActionButton"
                              disabled
                            >
                              ✎ Edit
                            </button>
                          )}

                          <a
                            className="resultActionButton"
                            href={downloadUrl}
                          >
                            ↓ Download
                          </a>
                        </div>

                        {job && savedAssetsByJobId[job.id] ? (
                          <a
                            className="resultActionButton wide"
                            href={`/repurpose?asset_id=${savedAssetsByJobId[job.id].id}`}
                          >
                            ✣ Repurpose sizes
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="resultActionButton wide"
                            disabled
                          >
                            ✣ Repurpose sizes
                          </button>
                        )}

                        <button
                          type="button"
                          className="resultActionButton wide mutedPending"
                          title="Editor workflow will be connected next."
                          disabled
                        >
                          ➤ Send to Editor <span>⌄</span>
                        </button>

                        {job && savedAssetsByJobId[job.id] ? (
                          <a
                            className="resultActionButton wide libraryReady"
                            href={`/generated-library?asset_id=${savedAssetsByJobId[job.id].id}`}
                          >
                            ▣ View in Library
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="resultActionButton wide"
                            disabled
                          >
                            Saving to Library...
                          </button>
                        )}

                        <a
                          className="resultPreviewLink"
                          href={openFinalUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open full preview ↗
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>

      <style jsx>{`
        * { box-sizing: border-box; }
        .app { min-height:100vh; display:flex; background:#f6f7f9; color:#111827; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; font-size:15px; line-height:1.45; }
        button,input,select,textarea { font:inherit; }
        button { cursor:pointer; }
        .sidebar { width:230px; position:fixed; inset:0 auto 0 0; padding:22px 14px; background:#111827; color:white; display:flex; flex-direction:column; z-index:20; }
        .brand { display:flex; gap:11px; align-items:center; padding:0 9px 25px; }
        .brandMark { width:36px; height:36px; display:grid; place-items:center; border-radius:9px; background:#2563eb; font-weight:800; font-size:16px; }
        .brandName { font-size:16px; font-weight:800; }.brandSub { color:#9ca3af; font-size:13px; }
        .navLabel { padding:0 11px 9px; font-size:11px; color:#94a3b8; font-weight:800; letter-spacing:.08em; }
        .nav { display:flex; flex-direction:column; gap:4px; }.nav button,.sidebarBottom button { border:0; width:100%; padding:12px; background:transparent; color:#cbd5e1; text-align:left; border-radius:8px; display:flex; gap:10px; align-items:center; font-size:14px; }.nav button:hover,.sidebarBottom button:hover { background:#1f2937; color:white; }.nav button.active { background:#1d4ed8; color:white; }.sidebarBottom { margin-top:auto; }
        .main { margin-left:230px; width:calc(100% - 230px); max-width:1650px; padding:34px 38px 110px; }
        .pageHeader { margin-bottom:25px; }.eyebrow,.miniLabel { color:#2563eb; font-size:11px; font-weight:900; letter-spacing:.09em; }.pageHeader h1 { margin:5px 0 7px; font-size:32px; letter-spacing:-.035em; }.pageHeader p { margin:0; color:#64748b; font-size:15px; }
        .section { background:white; border:1px solid #d7dce4; border-radius:12px; margin-bottom:18px; overflow:hidden; }.sectionHeader { display:flex; align-items:flex-start; gap:13px; padding:19px 21px; border-bottom:1px solid #edf0f3; }.step { flex:0 0 32px; width:32px; height:32px; border-radius:50%; background:#2563eb; color:white; display:grid; place-items:center; font-size:14px; font-weight:900; }.sectionHeader h2 { margin:0; font-size:19px; }.sectionHeader p { margin:5px 0 0; font-size:13px; color:#64748b; }.required,.optional,.selectedCount { margin-left:auto; padding:6px 9px; border-radius:999px; font-size:10px; font-weight:900; }.required { background:#eff6ff; color:#2563eb; }.optional { background:#f1f5f9; color:#64748b; }.selectedCount { background:#dcfce7; color:#166534; }.sectionBody { padding:21px; }
        label { display:block; color:#475569; margin-bottom:8px; font-size:12px; font-weight:900; letter-spacing:.05em; }.twoColumns { display:grid; grid-template-columns:1fr 1fr; gap:14px; }.input { width:100%; min-height:46px; border:1px solid #cbd5e1; border-radius:8px; padding:0 13px; background:white; outline:none; font-size:14px; }.input:focus,.textarea:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.08); }
        .productImageOnlyNotice { margin-bottom:18px; padding:13px 15px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:8px; color:#1e3a8a; }.productImageOnlyNotice strong,.productImageOnlyNotice span { display:block; }.productImageOnlyNotice strong { font-size:14px; margin-bottom:3px; }.productImageOnlyNotice span { font-size:13px; }
        .productSlots { display:grid; gap:18px; }.productSlot { border:1px solid #dbe3ee; border-radius:10px; padding:18px; background:#fff; }.productSlotHeader { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:15px; }.slotKicker { color:#2563eb; font-size:11px; font-weight:900; letter-spacing:.08em; }.productSlotHeader h3 { margin:3px 0 0; font-size:18px; }.dangerGhost { border:1px solid #fecaca; color:#b91c1c; background:#fff; border-radius:7px; padding:8px 11px; font-size:12px; font-weight:700; }.statusBox,.errorBox { margin-top:13px; border-radius:8px; padding:12px 14px; font-size:13px; }.statusBox { border:1px dashed #cbd5e1; color:#64748b; }.errorBox { border:1px solid #fecaca; background:#fef2f2; color:#b91c1c; }
        .selectionSummary { display:flex; align-items:flex-end; justify-content:space-between; gap:15px; padding:15px 0 12px; border-bottom:1px solid #edf0f3; }.selectionSummary span,.selectionSummary strong,.selectionSummary small { display:block; }.selectionSummary span { color:#94a3b8; font-size:10px; font-weight:900; letter-spacing:.07em; }.selectionSummary strong { font-size:17px; margin-top:3px; }.selectionSummary small { color:#2563eb; font-size:12px; margin-top:2px; }.summaryMetric { text-align:right; }.summaryMetric strong { font-size:22px; }.summaryMetric span { color:#64748b; letter-spacing:0; font-size:11px; }
        .variantGrid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:14px; }.variantCard { border:1px solid #dbe3ee; border-radius:9px; padding:8px; background:white; min-width:0; }.variantCard.active { border-color:#2563eb; background:#f4f8ff; box-shadow:0 0 0 1px rgba(37,99,235,.1); }.variantSelect { width:100%; border:0; background:transparent; padding:0; display:grid; grid-template-columns:58px minmax(0,1fr) 24px; gap:9px; align-items:center; text-align:left; }.variantThumb { width:58px; height:58px; border-radius:7px; background:#f8fafc; overflow:hidden; display:grid; place-items:center; font-size:10px; color:#94a3b8; }.variantThumb img { width:100%; height:100%; object-fit:contain; }.variantMeta { min-width:0; }.variantMeta strong,.variantMeta span,.variantMeta small { display:block; }.variantMeta strong { font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.variantMeta span { color:#64748b; font-size:12px; margin-top:2px; }.variantMeta small { color:#2563eb; font-size:11px; margin-top:2px; }.variantCheck { width:22px; height:22px; border-radius:50%; border:1px solid #cbd5e1; display:grid; place-items:center; color:white; font-size:12px; font-weight:900; }.variantCard.active .variantCheck { background:#2563eb; border-color:#2563eb; }.addImagesButton { margin-top:8px; width:100%; border:1px solid #bfdbfe; background:#eff6ff; color:#1d4ed8; border-radius:6px; padding:7px; font-size:12px; font-weight:800; }.savedImagesMini { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }.savedImageMini { width:48px; height:48px; position:relative; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; }.savedImageMini img { width:100%; height:100%; object-fit:contain; }.savedImageMini button { position:absolute; right:2px; top:2px; width:17px; height:17px; border:0; border-radius:50%; background:#0f172a; color:white; padding:0; line-height:17px; font-size:11px; }.hiddenFile { display:none; }
        .addProductButton { margin-top:16px; border:1px solid #2563eb; background:white; color:#1d4ed8; border-radius:8px; padding:10px 15px; font-size:13px; font-weight:850; }.productRule { margin-top:16px; padding:13px 15px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; color:#1e3a8a; font-size:13px; line-height:1.55; }
        .contextCard,.winningCard { margin-top:15px; border:1px solid #d7dce4; border-radius:9px; overflow:hidden; }.contextTop { display:flex; justify-content:space-between; gap:20px; padding:14px 16px; border-bottom:1px solid #edf0f3; }.contextTop span { color:#94a3b8; font-size:10px; font-weight:900; letter-spacing:.07em; }.contextTop strong { display:block; margin-top:4px; font-size:14px; }.switchRow { display:flex; align-items:center; gap:7px; color:#334155; font-size:13px; letter-spacing:0; }.contextGrid { display:grid; grid-template-columns:repeat(4,1fr); padding:15px 16px; gap:14px; }.contextGrid span { display:block; color:#94a3b8; font-size:10px; font-weight:800; }.contextGrid strong { display:block; margin-top:4px; font-size:13px; }.lpHeadline { margin:0 16px 16px; padding:13px; background:#f8fafc; border-radius:7px; }.lpHeadline span { color:#94a3b8; font-size:10px; font-weight:900; }.lpHeadline strong { display:block; margin-top:5px; font-size:14px; }.lpHeadline p { color:#64748b; font-size:13px; margin:5px 0 0; }
        .creativeStatus { margin-bottom:10px; font-size:12px; color:#64748b; font-weight:700; }.winningCard { display:grid; grid-template-columns:290px 1fr; }.winningPreview { min-height:290px; background:#f8fafc; display:grid; place-items:center; border-right:1px solid #edf0f3; }.winningPreview img { width:100%; height:100%; max-height:390px; object-fit:contain; }.winningSettings { padding:18px; }.winningSettings h3 { margin:5px 0 16px; font-size:17px; }.checkGrid { display:grid; grid-template-columns:1fr 1fr; gap:11px; }.checkGrid label { display:flex; align-items:center; gap:8px; color:#334155; font-size:13px; letter-spacing:0; margin:0; }.strength { margin-top:18px; }.segmented { display:flex; gap:7px; }.segmented button { border:1px solid #cbd5e1; background:white; padding:8px 13px; border-radius:6px; text-transform:capitalize; font-size:13px; }.segmented button.active { border-color:#2563eb; background:#eff6ff; color:#2563eb; }.warning { margin-top:15px; color:#92400e; background:#fffbeb; border:1px solid #fde68a; padding:10px 12px; border-radius:6px; font-size:12px; line-height:1.5; }
        .modelGrid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }.model { border:1px solid #d7dce4; background:white; border-radius:8px; padding:13px; text-align:left; min-height:132px; }.model.active { border-color:#2563eb; background:#f8fbff; }.modelCheck { width:22px; height:22px; border-radius:5px; border:1px solid #cbd5e1; display:grid; place-items:center; color:white; margin-bottom:10px; font-size:11px; }.model.active .modelCheck { background:#2563eb; border-color:#2563eb; }.model strong { display:block; font-size:13px; }.model p { color:#64748b; font-size:12px; line-height:1.45; margin:6px 0 0; }
        .modelPrompt { margin-top:10px; padding-top:10px; border-top:1px solid #dbe4f0; font-size:11px; line-height:1.5; color:#475569; text-align:left; }
        .modelPrompt span { display:block; margin-bottom:4px; color:#2563eb; font-size:10px; font-weight:800; letter-spacing:.08em; }
        .distributionNote { margin-bottom:16px; padding:14px 16px; border:1px solid #bfdbfe; border-radius:10px; background:#eff6ff; display:flex; flex-direction:column; gap:5px; }
        .distributionNote strong { font-size:14px; color:#1e3a8a; }
        .distributionNote span { font-size:13px; line-height:1.55; color:#334155; }
        .settingHelp { margin:8px 0 0; font-size:13px; color:#64748b; line-height:1.5; }
        .runPlan { margin-top:18px; padding:15px 16px; border:1px solid #dbe4f0; border-radius:10px; background:#f8fafc; display:flex; flex-direction:column; gap:12px; }
        .runPlan > div:first-child { display:flex; flex-direction:column; gap:3px; }
        .runPlan > div:first-child strong { font-size:14px; }
        .runPlan > div:first-child span { font-size:13px; color:#64748b; }
        .planChips { display:flex; flex-wrap:wrap; gap:7px; }
        .planChips span { padding:6px 9px; border:1px solid #bfdbfe; border-radius:999px; background:white; color:#1d4ed8; font-size:12px; font-weight:700; }
        .pageHeaderTop { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
        .pageHeaderActions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .libraryHeaderButton { border:1px solid #bfdbfe; background:#eff6ff; color:#1d4ed8; border-radius:8px; padding:9px 12px; font-size:12px; font-weight:850; cursor:pointer; }
        .libraryHeaderButton:hover { border-color:#93c5fd; background:#dbeafe; }
        .clearWorkspaceButton { border:1px solid #cbd5e1; background:white; color:#475569; border-radius:8px; padding:9px 12px; font-size:12px; font-weight:800; cursor:pointer; }
        .clearWorkspaceButton:hover { border-color:#94a3b8; color:#0f172a; }
        .settingsGrid { display:grid; grid-template-columns:1fr 1fr; gap:26px; }.choiceRow,.ratioRow { display:flex; flex-wrap:wrap; gap:8px; }.choice,.ratio { border:1px solid #cbd5e1; background:white; border-radius:7px; }.choice { width:68px; height:48px; font-weight:800; }.choice.active,.ratio.active { border-color:#2563eb; background:#eff6ff; color:#2563eb; }.ratio { min-width:115px; padding:8px 13px; text-align:left; }.ratio strong,.ratio span { display:block; }.ratio strong { font-size:14px; }.ratio span { font-size:11px; color:#64748b; margin-top:2px; }.textarea { width:100%; min-height:135px; resize:vertical; padding:13px; border:1px solid #cbd5e1; border-radius:8px; outline:none; line-height:1.55; font-size:14px; }
        .generateBar { margin-top:22px; background:#111827; color:white; border-radius:11px; padding:17px 18px; display:flex; align-items:center; justify-content:space-between; gap:20px; position:sticky; bottom:14px; z-index:10; box-shadow:0 12px 30px rgba(15,23,42,.18); }.generateBar strong,.generateBar span { display:block; }.generateBar strong { font-size:15px; }.generateBar span { margin-top:3px; color:#cbd5e1; font-size:12px; }.generateBar button { border:0; border-radius:7px; background:#2563eb; color:white; padding:12px 20px; font-weight:800; font-size:14px; }.generateBar button:disabled { background:#475569; cursor:not-allowed; }.validation { margin-top:9px; text-align:right; color:#64748b; font-size:12px; }
        .results { margin-top:35px; }.resultsHeader { display:flex; justify-content:space-between; gap:20px; margin-bottom:17px; }.resultsHeader h2 { margin:4px 0; font-size:27px; }.resultsHeader p { margin:0; color:#64748b; font-size:14px; line-height:1.5; }
        .liveBadge { height:fit-content; padding:7px 10px; background:#eff6ff; color:#1d4ed8; border-radius:999px; font-size:10px; font-weight:900; }.liveBadge.completed { background:#dcfce7; color:#166534; }.liveBadge.failed { background:#fee2e2; color:#b91c1c; }
        .runMeta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:13px; }.runMeta span { padding:6px 9px; border-radius:999px; background:#f1f5f9; color:#475569; font-size:11px; font-weight:800; }
        .progressWrap { margin-bottom:16px; padding:14px 16px; background:white; border:1px solid #dbe3ee; border-radius:10px; }.progressTop { display:flex; justify-content:space-between; gap:15px; margin-bottom:9px; }.progressTop strong { font-size:13px; }.progressTop span { font-size:12px; color:#64748b; }.progressTrack { height:9px; border-radius:999px; background:#e2e8f0; overflow:hidden; }.progressFill { height:100%; border-radius:999px; background:#2563eb; transition:width .35s ease; }
        .generationError { margin-bottom:16px; padding:13px 15px; border:1px solid #fecaca; background:#fef2f2; border-radius:9px; color:#991b1b; }.generationError strong,.generationError span { display:block; }.generationError strong { font-size:13px; }.generationError span { margin-top:3px; font-size:12px; line-height:1.45; }
        .resultsGrid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }.resultCard { background:white; border:1px solid #d7dce4; border-radius:10px; overflow:hidden; }.resultMedia { min-height:280px; background:#f1f5f9; position:relative; display:grid; place-items:center; overflow:hidden; }.resultMedia > img { width:100%; height:auto; aspect-ratio:1/1; max-height:520px; object-fit:contain; display:block; background:#f8fafc; }.resultPlaceholder { min-height:280px; width:100%; background:linear-gradient(135deg,#f1f5f9,#e2e8f0); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:20px; }.resultPlaceholder span { color:#64748b; font-size:10px; font-weight:900; }.resultPlaceholder strong { margin-top:8px; font-size:16px; }.resultPlaceholder p { color:#94a3b8; font-size:12px; line-height:1.45; max-width:240px; }
        .resultStatus { position:absolute; left:9px; top:9px; padding:5px 8px; border-radius:999px; background:rgba(15,23,42,.88); color:white; font-size:10px; font-weight:850; backdrop-filter:blur(6px); }.resultStatus.done { background:rgba(22,101,52,.92); }.resultStatus.failed { background:rgba(185,28,28,.92); }
        .resultInfo { padding:12px 13px; display:flex; justify-content:space-between; }.resultInfo strong,.resultInfo span { display:block; }.resultInfo strong { font-size:13px; }.resultInfo span { color:#64748b; font-size:11px; margin-top:3px; }.qaWarning { margin:0 12px 12px; padding:9px 10px; border-radius:7px; background:#fffbeb; border:1px solid #fde68a; color:#92400e; font-size:11px; line-height:1.45; }.resultActionsStack { padding:0 12px 12px; display:grid; gap:7px; }
        .resultActionsTop { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
        .resultActionButton { min-height:34px; display:flex; align-items:center; justify-content:center; gap:6px; width:100%; text-decoration:none; border:1px solid #cbd5e1; color:#334155; background:#fff; border-radius:7px; padding:8px 10px; font-size:11px; font-weight:800; cursor:pointer; }
        .resultActionButton:hover:not(:disabled) { border-color:#93c5fd; background:#eff6ff; color:#1d4ed8; }
        .resultActionButton.wide { justify-content:center; }
        .resultActionButton.wide span { margin-left:auto; }
        .resultActionButton:disabled,.resultActionButton.mutedPending { cursor:not-allowed; opacity:.52; background:#f8fafc; }
        .resultActionButton.libraryReady { border-color:#bbf7d0; background:#f0fdf4; color:#166534; }
        .resultPreviewLink { display:block; text-align:center; padding-top:3px; color:#64748b; font-size:10px; font-weight:750; text-decoration:none; }
        .resultPreviewLink:hover { color:#1d4ed8; }
        @media(max-width:1280px){.variantGrid{grid-template-columns:repeat(3,1fr)}.modelGrid{grid-template-columns:repeat(3,1fr)}.resultsGrid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:980px){.twoColumns,.settingsGrid{grid-template-columns:1fr}.variantGrid{grid-template-columns:repeat(2,1fr)}.winningCard{grid-template-columns:1fr}.winningPreview{border-right:0;border-bottom:1px solid #edf0f3}.contextGrid{grid-template-columns:1fr 1fr}.resultsGrid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:760px){.sidebar{display:none}.main{margin-left:0;width:100%;padding:22px 15px 95px}.variantGrid,.modelGrid,.resultsGrid{grid-template-columns:1fr}.generateBar{flex-direction:column;align-items:stretch}.generateBar button{width:100%}.productSlotHeader{align-items:flex-start}.contextGrid{grid-template-columns:1fr}.app{font-size:16px}}
      `}</style>
    </div>
  );
}
