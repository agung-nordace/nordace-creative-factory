export type CreativeTextSpec = {
  headline?: string | null;
  subheadline?: string | null;
  offer?: string | null;
  cta?: string | null;
  proof?: string | null;
  attribution?: string | null;
};

export type TextBlockRole =
  | "headline"
  | "subheadline"
  | "offer"
  | "cta"
  | "proof"
  | "attribution";

export type TextBlockLayout = {
  role: TextBlockRole;
  text: string;
  x: number;
  y: number;
  width: number;
  maxHeight: number;
  fontSize: number;
  minFontSize: number;
  fontWeight: number;
  lineHeight: number;
  align: "left" | "center" | "right";
  uppercase?: boolean;
  letterSpacing?: number;
};

export type DesignerLayoutPlan = {
  width: number;
  height: number;
  safeMargin: number;

  // Product no-text zone. The compositor will NEVER place text here.
  productZone: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  blocks: TextBlockLayout[];
};

function clampText(value?: string | null) {
  return String(value ?? "").trim();
}

function ratioToSize(ratio: string) {
  switch (ratio) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "1.91:1":
      return { width: 1536, height: 804 };
    case "9:16":
      return { width: 1024, height: 1792 };
    case "4:5":
    default:
      return { width: 1024, height: 1280 };
  }
}

function pushIf(
  blocks: TextBlockLayout[],
  role: TextBlockRole,
  text: string,
  layout: Omit<TextBlockLayout, "role" | "text">
) {
  if (!text) return;
  blocks.push({ role, text, ...layout });
}

export function buildCreativeTextLayout(args: {
  ratio: string;
  creativeModelId: string;
  text: CreativeTextSpec;
}): DesignerLayoutPlan {
  const { width, height } = ratioToSize(args.ratio);
  const margin = Math.round(Math.min(width, height) * 0.055);

  const headline = clampText(args.text.headline);
  const subheadline = clampText(args.text.subheadline);
  const offer = clampText(args.text.offer);
  const cta = clampText(args.text.cta);
  const proof = clampText(args.text.proof);
  const attribution = clampText(args.text.attribution);

  const blocks: TextBlockLayout[] = [];
  const model = args.creativeModelId || "billboard";

  if (model === "ugc" || model === "lifestyle" || model === "demo") {
    // Photo-first layouts: preserve a large central/right product zone.
    const productZone = {
      x: Math.round(width * 0.34),
      y: Math.round(height * 0.12),
      width: Math.round(width * 0.60),
      height: Math.round(height * 0.76),
    };

    pushIf(blocks, "headline", headline, {
      x: margin,
      y: margin,
      width: Math.round(width * 0.30),
      maxHeight: Math.round(height * 0.28),
      fontSize: Math.round(width * 0.047),
      minFontSize: 28,
      fontWeight: 800,
      lineHeight: 1.02,
      align: "left",
    });

    pushIf(blocks, "subheadline", subheadline, {
      x: margin,
      y: Math.round(height * 0.34),
      width: Math.round(width * 0.28),
      maxHeight: Math.round(height * 0.18),
      fontSize: Math.round(width * 0.024),
      minFontSize: 20,
      fontWeight: 500,
      lineHeight: 1.22,
      align: "left",
    });

    pushIf(blocks, "offer", offer, {
      x: margin,
      y: Math.round(height * 0.70),
      width: Math.round(width * 0.28),
      maxHeight: Math.round(height * 0.10),
      fontSize: Math.round(width * 0.024),
      minFontSize: 19,
      fontWeight: 800,
      lineHeight: 1.10,
      align: "left",
    });

    pushIf(blocks, "cta", cta, {
      x: margin,
      y: Math.round(height * 0.82),
      width: Math.round(width * 0.26),
      maxHeight: Math.round(height * 0.08),
      fontSize: Math.round(width * 0.021),
      minFontSize: 18,
      fontWeight: 800,
      lineHeight: 1.0,
      align: "left",
    });

    return { width, height, safeMargin: margin, productZone, blocks };
  }

  if (model === "comparison") {
    const productZone = {
      x: Math.round(width * 0.12),
      y: Math.round(height * 0.28),
      width: Math.round(width * 0.76),
      height: Math.round(height * 0.58),
    };

    pushIf(blocks, "headline", headline, {
      x: margin,
      y: margin,
      width: width - margin * 2,
      maxHeight: Math.round(height * 0.16),
      fontSize: Math.round(width * 0.052),
      minFontSize: 30,
      fontWeight: 850,
      lineHeight: 1.0,
      align: "center",
    });

    pushIf(blocks, "subheadline", subheadline, {
      x: Math.round(width * 0.18),
      y: Math.round(height * 0.18),
      width: Math.round(width * 0.64),
      maxHeight: Math.round(height * 0.09),
      fontSize: Math.round(width * 0.024),
      minFontSize: 19,
      fontWeight: 500,
      lineHeight: 1.18,
      align: "center",
    });

    pushIf(blocks, "cta", cta, {
      x: Math.round(width * 0.35),
      y: Math.round(height * 0.90),
      width: Math.round(width * 0.30),
      maxHeight: Math.round(height * 0.06),
      fontSize: Math.round(width * 0.022),
      minFontSize: 18,
      fontWeight: 800,
      lineHeight: 1.0,
      align: "center",
    });

    return { width, height, safeMargin: margin, productZone, blocks };
  }

  if (model === "testimonial" || model === "review" || model === "native") {
    const productZone = {
      x: Math.round(width * 0.50),
      y: Math.round(height * 0.16),
      width: Math.round(width * 0.44),
      height: Math.round(height * 0.70),
    };

    pushIf(blocks, "headline", headline, {
      x: margin,
      y: margin,
      width: Math.round(width * 0.40),
      maxHeight: Math.round(height * 0.19),
      fontSize: Math.round(width * 0.045),
      minFontSize: 28,
      fontWeight: 800,
      lineHeight: 1.02,
      align: "left",
    });

    pushIf(blocks, "proof", proof || subheadline, {
      x: margin,
      y: Math.round(height * 0.30),
      width: Math.round(width * 0.40),
      maxHeight: Math.round(height * 0.30),
      fontSize: Math.round(width * 0.025),
      minFontSize: 19,
      fontWeight: 600,
      lineHeight: 1.23,
      align: "left",
    });

    pushIf(blocks, "attribution", attribution, {
      x: margin,
      y: Math.round(height * 0.64),
      width: Math.round(width * 0.38),
      maxHeight: Math.round(height * 0.08),
      fontSize: Math.round(width * 0.020),
      minFontSize: 17,
      fontWeight: 700,
      lineHeight: 1.10,
      align: "left",
    });

    pushIf(blocks, "cta", cta, {
      x: margin,
      y: Math.round(height * 0.80),
      width: Math.round(width * 0.34),
      maxHeight: Math.round(height * 0.08),
      fontSize: Math.round(width * 0.022),
      minFontSize: 18,
      fontWeight: 800,
      lineHeight: 1.0,
      align: "left",
    });

    return { width, height, safeMargin: margin, productZone, blocks };
  }

  if (model === "feature") {
    const productZone = {
      x: Math.round(width * 0.44),
      y: Math.round(height * 0.22),
      width: Math.round(width * 0.50),
      height: Math.round(height * 0.64),
    };

    pushIf(blocks, "headline", headline, {
      x: margin,
      y: margin,
      width: Math.round(width * 0.80),
      maxHeight: Math.round(height * 0.15),
      fontSize: Math.round(width * 0.047),
      minFontSize: 28,
      fontWeight: 850,
      lineHeight: 1.0,
      align: "left",
    });

    pushIf(blocks, "subheadline", subheadline, {
      x: margin,
      y: Math.round(height * 0.23),
      width: Math.round(width * 0.34),
      maxHeight: Math.round(height * 0.35),
      fontSize: Math.round(width * 0.023),
      minFontSize: 18,
      fontWeight: 600,
      lineHeight: 1.22,
      align: "left",
    });

    pushIf(blocks, "offer", offer, {
      x: margin,
      y: Math.round(height * 0.67),
      width: Math.round(width * 0.34),
      maxHeight: Math.round(height * 0.10),
      fontSize: Math.round(width * 0.022),
      minFontSize: 18,
      fontWeight: 800,
      lineHeight: 1.0,
      align: "left",
    });

    pushIf(blocks, "cta", cta, {
      x: margin,
      y: Math.round(height * 0.81),
      width: Math.round(width * 0.30),
      maxHeight: Math.round(height * 0.08),
      fontSize: Math.round(width * 0.021),
      minFontSize: 18,
      fontWeight: 800,
      lineHeight: 1.0,
      align: "left",
    });

    return { width, height, safeMargin: margin, productZone, blocks };
  }

  // BILLBOARD / PROBLEM-SOLUTION default
  const productZone = {
    x: Math.round(width * 0.43),
    y: Math.round(height * 0.16),
    width: Math.round(width * 0.51),
    height: Math.round(height * 0.70),
  };

  pushIf(blocks, "headline", headline, {
    x: margin,
    y: margin,
    width: Math.round(width * 0.36),
    maxHeight: Math.round(height * 0.34),
    fontSize: Math.round(width * 0.058),
    minFontSize: 32,
    fontWeight: 900,
    lineHeight: 0.98,
    align: "left",
  });

  pushIf(blocks, "subheadline", subheadline, {
    x: margin,
    y: Math.round(height * 0.43),
    width: Math.round(width * 0.34),
    maxHeight: Math.round(height * 0.18),
    fontSize: Math.round(width * 0.024),
    minFontSize: 19,
    fontWeight: 550,
    lineHeight: 1.20,
    align: "left",
  });

  pushIf(blocks, "offer", offer, {
    x: margin,
    y: Math.round(height * 0.68),
    width: Math.round(width * 0.32),
    maxHeight: Math.round(height * 0.09),
    fontSize: Math.round(width * 0.025),
    minFontSize: 20,
    fontWeight: 850,
    lineHeight: 1.0,
    align: "left",
  });

  pushIf(blocks, "cta", cta, {
    x: margin,
    y: Math.round(height * 0.81),
    width: Math.round(width * 0.29),
    maxHeight: Math.round(height * 0.08),
    fontSize: Math.round(width * 0.022),
    minFontSize: 18,
    fontWeight: 800,
    lineHeight: 1.0,
    align: "left",
  });

  return { width, height, safeMargin: margin, productZone, blocks };
}

export function rectanglesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

export function validateLayout(plan: DesignerLayoutPlan) {
  const errors: string[] = [];

  for (const block of plan.blocks) {
    const rect = {
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.maxHeight,
    };

    if (rect.x < plan.safeMargin * 0.5) {
      errors.push(`${block.role}: too close to left edge`);
    }

    if (rect.y < plan.safeMargin * 0.5) {
      errors.push(`${block.role}: too close to top edge`);
    }

    if (rect.x + rect.width > plan.width - plan.safeMargin * 0.5) {
      errors.push(`${block.role}: exceeds right safe area`);
    }

    if (rect.y + rect.height > plan.height - plan.safeMargin * 0.5) {
      errors.push(`${block.role}: exceeds bottom safe area`);
    }

    if (rectanglesOverlap(rect, plan.productZone)) {
      errors.push(`${block.role}: collides with protected product zone`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
