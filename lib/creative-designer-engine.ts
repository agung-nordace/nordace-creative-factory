export type CreativeModelInput = {
  id: string;
  name?: string;
  description?: string;
  prompt?: string;
};

export type LandingPageInput = {
  id?: number | null;
  title?: string | null;
  product_name?: string | null;
  language?: string | null;
  market?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  offer?: string | null;
  body_text?: string | null;
  url?: string | null;
};

export type WinningCreativeInput = {
  id?: number | string | null;
  name?: string | null;
  file_url?: string | null;
  thumbnail_url?: string | null;
  optimized_url?: string | null;
  referenceSettings?: {
    composition?: boolean;
    style?: boolean;
    copyStructure?: boolean;
    productAppearance?: boolean;
    strength?: "low" | "medium" | "high";
  } | null;
};

export type ProductReferenceGroup = {
  productId: number | null;
  productName: string | null;
  parentSku: string | null;
  variantId: number | null;
  variantSku: string | null;
  color: string | null;
  references: string[];
};

export type SelectedReferencePack = {
  imageUrls: string[];
  subjectImageRanges: Array<{
    subjectIndex: number;
    startImageIndex: number;
    endImageIndex: number;
    selectedCount: number;
  }>;
  winningImageIndex: number | null;
};

export type DesignerPlan = {
  creativeModelId: string;
  creativeModelName: string;
  conceptName: string;
  variationMode: string;
  archetypeName: string;
  copyArchitecture: string;
  typographyPersonality: string;
  offerTreatment: string;
  requiredSubjectCount: number;
  subjectContract: string;
  strategyBrief: string;
  copyBrief: string;
  designBrief: string;
  finalPrompt: string;
  qaChecklist: string[];
};

type Archetype = {
  name: string;
  visualIdea: string;
  copyArchitecture: string;
  typographyPersonality: string;
  offerTreatment: string;
  mandatoryDesignRules: string;
};

type Playbook = {
  name: string;
  objective: string;
  visualGrammar: string;
  compositionRules: string;
  copyRules: string;
  typographyRules: string;
  productRules: string;
  variationModes: string[];
  archetypes: Archetype[];
};

const PLAYBOOKS: Record<string, Playbook> = {
  ugc: {
    name: "UGC / Product In Hand",
    objective:
      "Create an authentic, high-performing creator/customer-style ad that feels native and believable while still being art-directed enough to convert.",
    visualGrammar:
      "Photorealistic candid mobile-camera realism, believable hands and posture, practical real-world environment, subtle imperfections, natural depth, realistic skin and materials. It should feel like a strong creator captured it, not like a glossy catalog shoot.",
    compositionRules:
      "Use one clear human action and one instantly readable product moment. Prefer handheld, mirror, POV, packing, airport, commute or home-prep framing. Maintain intentional negative space for short copy. Avoid overly symmetrical studio composition.",
    copyRules:
      "Use creator-native copy. One short hook only, ideally 3-8 words. Optional one-line supporting caption, maximum 8-12 words. Avoid corporate wording, long body copy, fake statistics or generic ad slogans.",
    typographyRules:
      "Typography should look native to the scene or social format: clean, highly legible, intentionally positioned, never covering the product or face. Keep it minimal. No decorative filler text.",
    productRules:
      "The selected product must look like the exact real product. Natural hand interaction is allowed, but critical handles, trim, zippers, hardware and silhouette must remain readable.",
    variationModes: [
      "mirror selfie product proof",
      "airport candid product-in-hand",
      "packing moment on bed",
      "commute or train candid",
      "POV product-in-hand",
      "home-to-airport prep",
    ],
    archetypes: [
      {
        name: "POV confession",
        visualIdea: "A believable phone-shot moment where the product is clearly present and the ad feels like a real creator confession rather than a campaign poster.",
        copyArchitecture: "One native opener such as POV / I finally / nobody told me + one short payoff. Maximum 2 text blocks.",
        typographyPersonality: "Native social caption language, compact, casual, intentionally imperfect but perfectly readable.",
        offerTreatment: "Usually omit the offer. If used, make it a tiny secondary sticker only.",
        mandatoryDesignRules: "Do not build a formal billboard layout. Avoid giant centered headline typography. Keep the product integrated naturally in the captured moment.",
      },
      {
        name: "Creator reaction",
        visualIdea: "Human reaction or discovery moment with the product as visual proof.",
        copyArchitecture: "Short reaction hook + optional one-line observation. No formal subheadline.",
        typographyPersonality: "Creator-native sans serif, small-to-medium scale, anchored to genuine negative space.",
        offerTreatment: "Omit unless the LP is explicitly promotion-led.",
        mandatoryDesignRules: "The copy should feel spoken, not branded. Keep photography dominant.",
      },
      {
        name: "Packing proof",
        visualIdea: "A practical packing/use moment that visually proves the benefit.",
        copyArchitecture: "One specific result-led hook, optionally preceded by POV. Avoid generic 'Travel Smarter' language.",
        typographyPersonality: "Simple bold social overlay with one hierarchy level.",
        offerTreatment: "Secondary at most.",
        mandatoryDesignRules: "Show action, not a posed catalog product. Keep the selected subject count exact.",
      },
      {
        name: "Native diary",
        visualIdea: "A candid travel diary frame, realistic imperfect crop, product naturally in context.",
        copyArchitecture: "One diary-like sentence or time/location-style observation, maximum 10 words.",
        typographyPersonality: "Small editorial/native note styling.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "No promo badge, no corporate headline, no heavy graphic frame.",
      },
    ],
  },
  testimonial: {
    name: "Static Testimonial",
    objective:
      "Create a designed testimonial ad that feels credible, emotional and premium rather than like a generic review template.",
    visualGrammar:
      "Editorial customer-story layout with believable customer photography or contextual lifestyle scene, premium spacing, restrained graphic framing and trustworthy proof cues.",
    compositionRules:
      "Create a clear hierarchy between customer/story, product and quote. Use asymmetrical editorial balance. Keep one protected quote region and one clear product region. The customer and product should feel connected to the story.",
    copyRules:
      "Write a believable first-person testimonial hook, 5-12 words. Add at most one short supporting sentence. Never copy the landing-page headline verbatim. Avoid exaggerated or medically/legally unsupported claims.",
    typographyRules:
      "Use an intentional quote hierarchy: large quote, smaller attribution/proof. Excellent line breaks, generous leading, no tiny text, no collision with product or face.",
    productRules:
      "Product must remain visually authoritative and accurate, not a small random prop.",
    variationModes: [
      "portrait-left quote-right editorial",
      "oversized quote with product anchor",
      "customer travel story",
      "premium magazine testimonial",
      "review-card hybrid",
      "customer photo strip",
    ],
    archetypes: [
      {
        name: "Oversized pull quote",
        visualIdea: "A magazine-like customer story where the quote is the visual headline and the product anchors the composition.",
        copyArchitecture: "Large first-person quote 5-10 words + tiny attribution. No generic campaign headline.",
        typographyPersonality: "Editorial serif or refined display face for the quote, restrained sans serif attribution.",
        offerTreatment: "Usually omit. If present, place as a small corner footnote/badge.",
        mandatoryDesignRules: "Quote must feel like the concept, not a text box pasted over a photo.",
      },
      {
        name: "Customer story card",
        visualIdea: "Designed customer story with a portrait/lifestyle image, one quote, product proof and premium editorial framing.",
        copyArchitecture: "Short quote + one short context line + attribution.",
        typographyPersonality: "Editorial hierarchy with visible contrast between quote and metadata.",
        offerTreatment: "Secondary only.",
        mandatoryDesignRules: "Do not use the same typographic hierarchy as a billboard.",
      },
      {
        name: "Review screenshot hybrid",
        visualIdea: "A polished ad built around a believable review-card or comment UI plus a strong product visual.",
        copyArchitecture: "One review sentence + rating/proof cue + attribution if supplied by context.",
        typographyPersonality: "UI-native body type inside the review card, strong but restrained campaign framing outside.",
        offerTreatment: "Optional separate badge.",
        mandatoryDesignRules: "No fake long paragraphs, no gibberish names, no invented stats.",
      },
      {
        name: "Confessional editorial",
        visualIdea: "Premium candid portrait/product scene with an emotionally specific customer quote.",
        copyArchitecture: "One emotionally specific statement 6-12 words. No support line unless essential.",
        typographyPersonality: "Large editorial quote with generous breathing room.",
        offerTreatment: "No offer by default.",
        mandatoryDesignRules: "Keep it believable and human; avoid corporate slogans.",
      },
    ],
  },
  billboard: {
    name: "Bold Billboard",
    objective:
      "Create a thumb-stopping graphic-design-led ad with one dominant message and one dominant visual idea, similar to a senior designer campaign key visual.",
    visualGrammar:
      "Bold campaign art direction, graphic simplicity, premium negative space, strong scale contrast, clean geometry, deliberate color blocking or striking photographic simplicity. No template feel.",
    compositionRules:
      "One dominant product hero or one dramatic product/scene relationship. One large headline zone. Supporting elements should be sparse and purposeful. The image must read instantly at mobile-feed size.",
    copyRules:
      "Create a punchy headline of 2-6 words derived from the landing-page idea, not copied from the long LP headline. Optional short support line of 4-10 words. Offer may appear if provided. Keep total rendered copy very short.",
    typographyRules:
      "Use confident professional display typography, strong alignment, intentional line breaks and optical spacing. Headline can be large but must never overlap the product. Do not generate filler copy or random microtext.",
    productRules:
      "Product is the hero. Maintain a clean silhouette, accurate shape/color/material and enough surrounding negative space.",
    variationModes: [
      "oversized hero campaign",
      "extreme negative-space poster",
      "airport architecture scale",
      "graphic color-field campaign",
      "single-problem visual metaphor",
      "premium editorial billboard",
    ],
    archetypes: [
      {
        name: "Giant statement",
        visualIdea: "A true campaign poster driven by one extremely short statement and a strong product silhouette.",
        copyArchitecture: "2-4 word headline. Nothing else except optional tiny brand/offer.",
        typographyPersonality: "Oversized display typography with deliberate line breaks, extreme scale contrast and strong negative space.",
        offerTreatment: "Usually omit. Never let a discount badge compete with the headline.",
        mandatoryDesignRules: "One idea only. No generic headline + subheadline + badge stack.",
      },
      {
        name: "Product plus giant number",
        visualIdea: "A bold numeric/offer/benefit visual where one number or short proof element acts as the graphic device.",
        copyArchitecture: "One giant number/proof + 1-4 word descriptor. Optional tiny support.",
        typographyPersonality: "Huge numeric typography or graphic numeral, clean campaign system.",
        offerTreatment: "Use the exact offer only when it is the concept itself.",
        mandatoryDesignRules: "The number must be contextually supported. Do not invent proof or statistics.",
      },
      {
        name: "Editorial headline",
        visualIdea: "Premium magazine-campaign composition with a surprising short editorial line rather than a generic performance slogan.",
        copyArchitecture: "One 4-8 word editorial headline. Optional tiny kicker.",
        typographyPersonality: "Editorial serif/display mix, carefully spaced, premium and intentional.",
        offerTreatment: "Omit or make very small.",
        mandatoryDesignRules: "Avoid promo-template badges and generic geometric clutter.",
      },
      {
        name: "Contrarian poster",
        visualIdea: "A provocative short claim or pattern interrupt paired with a confident product hero.",
        copyArchitecture: "One contrarian 3-7 word statement. No conventional subheadline.",
        typographyPersonality: "Strong display type, asymmetrical hierarchy, high visual confidence.",
        offerTreatment: "No offer unless essential.",
        mandatoryDesignRules: "The copy must come from supported LP/product context and must not fabricate a claim.",
      },
      {
        name: "Offer-led campaign",
        visualIdea: "The exact offer becomes the campaign graphic, but product remains equally premium and recognizable.",
        copyArchitecture: "Exact offer + one short supporting phrase only.",
        typographyPersonality: "Graphic offer treatment with polished brand-like typography, not a generic yellow starburst unless specifically justified.",
        offerTreatment: "Primary. Preserve the exact offer wording.",
        mandatoryDesignRules: "Avoid tacky coupon aesthetics. Make the offer feel art-directed.",
      },
      {
        name: "Visual metaphor billboard",
        visualIdea: "One simple, instantly understandable visual metaphor derived from the consumer tension while the selected product remains literal and accurate.",
        copyArchitecture: "2-6 word hook only.",
        typographyPersonality: "Minimal display typography, secondary to the visual metaphor.",
        offerTreatment: "Omit.",
        mandatoryDesignRules: "Do not distort the product into the metaphor. The metaphor must come from surrounding scene/graphics.",
      },
    ],
  },
  comparison: {
    name: "Comparison",
    objective:
      "Make a product advantage instantly understandable through visual contrast rather than long explanation.",
    visualGrammar:
      "Disciplined comparison design, strong visual symmetry/asymmetry, clear before/after or old/new storytelling, minimal clutter and strong informational hierarchy.",
    compositionRules:
      "Use split frame, left/right, top/bottom or paired states. The preferred solution must be obvious without reading a paragraph. Preserve enough room for short labels only.",
    copyRules:
      "Use one short comparison headline plus very short labels. Example structures: OLD / NEW, BEFORE / AFTER, BULKY / ORGANIZED, CHAOS / READY. Do not fabricate competitor claims.",
    typographyRules:
      "Short labels only. Large enough to read, aligned to the comparison grid, never floating randomly.",
    productRules:
      "Every selected product variant must remain exact. If two selected variants are shown, do not use one as a fake competitor unless the brief explicitly calls for that relationship.",
    variationModes: [
      "before vs after",
      "bulky vs compact",
      "chaos vs organized",
      "old way vs smarter way",
      "travel friction vs ready-to-go",
      "packing-space contrast",
    ],
    archetypes: [
      {
        name: "Old way vs new way",
        visualIdea: "A disciplined two-state story where the left and right sides communicate a behavioral contrast instantly.",
        copyArchitecture: "Two 1-3 word labels + optional 2-5 word verdict. No paragraph.",
        typographyPersonality: "Bold labels aligned to the comparison grid.",
        offerTreatment: "Usually omit.",
        mandatoryDesignRules: "The comparison must be understandable without explanatory body copy.",
      },
      {
        name: "Before / after",
        visualIdea: "A transformation frame with visual continuity between both sides.",
        copyArchitecture: "BEFORE / AFTER or equivalent labels + one short payoff.",
        typographyPersonality: "Simple functional labels, one dominant payoff.",
        offerTreatment: "Small secondary only.",
        mandatoryDesignRules: "Do not imply unsupported transformation or product claim.",
      },
      {
        name: "VS system",
        visualIdea: "A designed versus composition with a central VS device and clearly different states.",
        copyArchitecture: "Short state labels + VS. No long headline.",
        typographyPersonality: "Graphic sports/editorial versus system, highly legible.",
        offerTreatment: "Omit.",
        mandatoryDesignRules: "Do not position one selected variant as an inferior competitor unless context explicitly calls for it.",
      },
      {
        name: "Checklist contrast",
        visualIdea: "Two concise lists or icon rows that compare friction versus resolution.",
        copyArchitecture: "Maximum 3 short bullets per side. Each bullet 1-4 words.",
        typographyPersonality: "Clean information-design typography with strong alignment.",
        offerTreatment: "Optional tiny footer.",
        mandatoryDesignRules: "Only use supported features/benefits. No invented comparison metrics.",
      },
    ],
  },
  review: {
    name: "Review / Social Proof",
    objective:
      "Create a trust-first social-proof ad that looks like a polished designer interpretation of credible customer proof.",
    visualGrammar:
      "Editorial review-card system, believable customer or product visual, restrained rating/proof elements, premium spacing and realistic product photography.",
    compositionRules:
      "Use one dominant product/customer image plus one designed review region. Avoid a wall of tiny text. Keep visual hierarchy clear and mobile-readable.",
    copyRules:
      "Use one short review quote, 5-14 words. Optional attribution and concise proof line. Do not invent specific customer names or statistics unless provided in context.",
    typographyRules:
      "Review typography must feel intentional and credible, with clear quote/attribution hierarchy. No fake UI clutter or gibberish.",
    productRules:
      "Keep product accurate, prominent and visually separated from the review block.",
    variationModes: [
      "premium review card",
      "customer quote over lifestyle",
      "rating plus product hero",
      "editorial social proof",
      "review screenshot hybrid",
      "customer portrait proof",
    ],
    archetypes: [
      {
        name: "Single review card",
        visualIdea: "One credible review card becomes the proof device, supported by a clean product hero.",
        copyArchitecture: "One short quote + rating cue + minimal attribution.",
        typographyPersonality: "Believable review UI typography, restrained campaign labels.",
        offerTreatment: "Secondary only.",
        mandatoryDesignRules: "No wall of reviews, no invented review count, no fake verified badge unless supplied.",
      },
      {
        name: "The reviews are in",
        visualIdea: "A bold proof-led graphic where a short social-proof statement frames the product and one review excerpt.",
        copyArchitecture: "Short proof headline + one 5-12 word quote.",
        typographyPersonality: "Large proof headline, smaller credible review type.",
        offerTreatment: "Optional.",
        mandatoryDesignRules: "Do not fabricate counts or ratings.",
      },
      {
        name: "Rating hero",
        visualIdea: "A product-first layout with a restrained rating/proof motif.",
        copyArchitecture: "Rating/proof cue + one short customer outcome.",
        typographyPersonality: "Premium commerce/editorial blend.",
        offerTreatment: "Optional but never dominant.",
        mandatoryDesignRules: "Only use rating data if actually supplied by context.",
      },
      {
        name: "Customer proof portrait",
        visualIdea: "Human portrait plus selected product plus one believable proof statement.",
        copyArchitecture: "One customer quote + name/role only if supplied.",
        typographyPersonality: "Editorial testimonial hierarchy, clean and human.",
        offerTreatment: "No offer by default.",
        mandatoryDesignRules: "Do not invent a real-person identity.",
      },
    ],
  },
  lifestyle: {
    name: "Lifestyle",
    objective:
      "Show the product naturally integrated into an aspirational but believable real-world situation.",
    visualGrammar:
      "Premium realistic lifestyle photography, natural depth, physically plausible lighting, real environment, believable interaction and editorial polish.",
    compositionRules:
      "Let the environment support the benefit. Product remains a clear commercial focal point. Keep space for a short hook only if useful.",
    copyRules:
      "Use minimal copy, ideally a 2-6 word lifestyle hook. No long paragraphs.",
    typographyRules:
      "Subtle editorial typography only, placed in genuine negative space and never across the product.",
    productRules:
      "Product must be exact and naturally scaled to the person/environment.",
    variationModes: [
      "airport lounge",
      "boarding gate",
      "train terminal",
      "city commute",
      "hotel arrival",
      "weekend travel",
    ],
    archetypes: [
      {
        name: "Editorial travel moment",
        visualIdea: "A premium editorial lifestyle frame where the environment tells the benefit and the product remains unmistakably commercial.",
        copyArchitecture: "2-5 word lifestyle line or no text.",
        typographyPersonality: "Minimal editorial type in genuine negative space.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "The image should not look like a product catalog cutout placed on stock photography.",
      },
      {
        name: "Moment of relief",
        visualIdea: "A believable human moment after a travel friction has been resolved.",
        copyArchitecture: "One short emotional payoff, 3-7 words.",
        typographyPersonality: "Subtle human editorial typography.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "Let body language and environment communicate most of the story.",
      },
      {
        name: "Premium campaign photography",
        visualIdea: "A high-end brand campaign frame with controlled architecture, light and product placement.",
        copyArchitecture: "Optional 2-4 word brand-like line only.",
        typographyPersonality: "Very restrained premium campaign type.",
        offerTreatment: "Tiny footer at most.",
        mandatoryDesignRules: "Avoid overdesigned graphic elements. Photography is the design.",
      },
    ],
  },
  feature: {
    name: "Feature Breakdown",
    objective:
      "Explain a small number of product benefits visually with a clean, high-end educational layout.",
    visualGrammar:
      "Designer infographic/editorial product breakdown, strong hierarchy, restrained callouts, clean product detail emphasis and premium spacing.",
    compositionRules:
      "Use a large product anchor plus 2-4 visually connected feature callouts. Avoid overloading the canvas. Callouts should point to real visible features only.",
    copyRules:
      "Use short feature labels only. Never invent features not present in the LP/product context. No paragraph-length callouts.",
    typographyRules:
      "Clear editorial hierarchy with concise callout labels, consistent alignment and spacing. No microtext.",
    productRules:
      "Preserve exact functional details. Do not move or invent pockets, zippers, straps, hardware or compartments.",
    variationModes: [
      "annotated hero",
      "three-feature editorial",
      "detail close-up system",
      "feature grid",
      "travel-use callouts",
      "organization breakdown",
    ],
    archetypes: [
      {
        name: "Annotated product hero",
        visualIdea: "Large accurate product with a small number of precise callouts pointing to real visible details.",
        copyArchitecture: "2-4 feature labels, each 1-5 words. No separate long headline required.",
        typographyPersonality: "Clean industrial/editorial annotation system.",
        offerTreatment: "Omit.",
        mandatoryDesignRules: "Callout lines must terminate at the actual corresponding feature.",
      },
      {
        name: "Three reasons",
        visualIdea: "A strong product image paired with exactly three compact benefit modules.",
        copyArchitecture: "Short lead-in + exactly 3 benefit labels.",
        typographyPersonality: "Structured editorial information hierarchy.",
        offerTreatment: "Optional footer only.",
        mandatoryDesignRules: "No tiny body copy. Benefits must be supported by context.",
      },
      {
        name: "Detail editorial",
        visualIdea: "One hero plus 2-3 cropped detail windows emphasizing construction or function.",
        copyArchitecture: "Very short detail captions only.",
        typographyPersonality: "Premium product-editorial labels.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "Do not invent or relocate product details in closeups.",
      },
      {
        name: "Feature matrix",
        visualIdea: "A disciplined mini-grid of key benefits around the product.",
        copyArchitecture: "Maximum 4 short labels. No paragraphs.",
        typographyPersonality: "Modern information-design system.",
        offerTreatment: "Optional small footer.",
        mandatoryDesignRules: "Keep the product larger than any individual feature cell.",
      },
    ],
  },
  native: {
    name: "Native Screenshot",
    objective:
      "Create a believable platform-native creative that feels discovered rather than designed as a conventional ad.",
    visualGrammar:
      "Authentic chat/post/comment/note/social screenshot language, believable spacing, realistic native UI rhythm and intentional imperfection.",
    compositionRules:
      "The native content format is the composition. Product proof/image should be integrated naturally, not pasted as a separate catalog tile.",
    copyRules:
      "Use short conversational text that sounds human and contextually relevant. Keep the exchange concise. Never create long fake conversations, gibberish usernames or excessive UI labels.",
    typographyRules:
      "Typography must visually match the chosen native format and remain perfectly readable. Use only the minimum UI text needed for authenticity.",
    productRules:
      "Any product image inside the native format must still match selected references exactly.",
    variationModes: [
      "iMessage-style conversation",
      "social comment proof",
      "notes-app confession",
      "organic post screenshot",
      "review screenshot",
      "DM recommendation",
    ],
    archetypes: [
      {
        name: "Chat reveal",
        visualIdea: "A believable short chat exchange where the final message reveals the product benefit and includes authentic product proof.",
        copyArchitecture: "2-4 short messages total. Conversational punctuation. No ad headline.",
        typographyPersonality: "Native chat UI typography and spacing.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "Keep usernames generic/non-identifying and avoid long fabricated threads.",
      },
      {
        name: "Notes confession",
        visualIdea: "A notes-app style personal discovery with one product photo or embedded proof moment.",
        copyArchitecture: "One short title + 1-3 concise lines, still readable at feed size.",
        typographyPersonality: "Native notes UI treatment.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "Do not turn it into a designed billboard inside a fake app.",
      },
      {
        name: "Comment thread proof",
        visualIdea: "A compact social-comment interaction centered on one believable insight and product image.",
        copyArchitecture: "1 main comment + 1 response maximum.",
        typographyPersonality: "Platform-native comment hierarchy.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "Avoid fake engagement numbers or verified marks unless supplied.",
      },
      {
        name: "Organic post",
        visualIdea: "A believable creator/customer post with product image and a short authentic caption.",
        copyArchitecture: "One short caption, optionally one tiny UI cue.",
        typographyPersonality: "Native social post treatment.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "Should feel discovered in-feed, not like a formal ad template.",
      },
    ],
  },
  demo: {
    name: "Product Demo",
    objective:
      "Show the product solving one concrete use case or functional problem in a visually obvious way.",
    visualGrammar:
      "Clear demonstration photography or designed sequence, realistic hand interaction, useful detail emphasis and conversion-focused clarity.",
    compositionRules:
      "One main action. The product function must be understandable immediately. Avoid trying to demonstrate too many things at once.",
    copyRules:
      "Use one short benefit hook and optional 2-5 word demonstration label. Keep text secondary to the demonstration.",
    typographyRules:
      "Simple utility typography, highly readable and aligned to the action. No decorative text clutter.",
    productRules:
      "The demonstrated feature must exist in the selected product references/context. Do not fabricate functionality.",
    variationModes: [
      "packing demonstration",
      "quick-access demonstration",
      "carry demonstration",
      "organization demonstration",
      "under-seat/cabin context",
      "luggage pairing demonstration",
    ],
    archetypes: [
      {
        name: "One-step proof",
        visualIdea: "One decisive visual action proving one supported feature or use case.",
        copyArchitecture: "2-5 word benefit + optional 1-3 word action label.",
        typographyPersonality: "Utility/editorial labels that support, never dominate, the demonstration.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "The action must be physically plausible and the demonstrated feature must be real.",
      },
      {
        name: "How it works",
        visualIdea: "A simple 2-3 stage visual sequence showing one functional workflow.",
        copyArchitecture: "Maximum 3 tiny step labels, 1-3 words each.",
        typographyPersonality: "Clean instructional design.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "Do not overcrowd. Product identity must remain consistent across stages.",
      },
      {
        name: "Capacity proof",
        visualIdea: "A visually specific packing/capacity demonstration grounded in the supplied product context.",
        copyArchitecture: "One short capacity/organization hook only if supported.",
        typographyPersonality: "Bold utility statement with minimal annotation.",
        offerTreatment: "Optional small footer.",
        mandatoryDesignRules: "Do not fabricate exact quantities unless provided by LP/product context.",
      },
    ],
  },
  problem: {
    name: "Problem → Solution",
    objective:
      "Turn a recognizable consumer pain point into a satisfying resolution centered on the selected product.",
    visualGrammar:
      "Performance-ad storytelling with clear tension and resolution, realistic environment, polished visual hierarchy and strong emotional contrast.",
    compositionRules:
      "Either show one scene with an obvious resolved problem, or a clean two-state problem/solution composition. The solution should feel simpler and more desirable.",
    copyRules:
      "Use one pain-point hook and one short solution line. Do not paste LP headline/body copy. Keep language direct and ad-ready.",
    typographyRules:
      "Headline should establish the problem; support line should resolve it. Keep copy short and visually separated from the product.",
    productRules:
      "Product is the mechanism of resolution, not a decorative prop. Preserve exact variant identity.",
    variationModes: [
      "airport scramble resolved",
      "overpacking resolved",
      "digging-for-items resolved",
      "awkward carry resolved",
      "baggage-fee anxiety resolved",
      "commute clutter resolved",
    ],
    archetypes: [
      {
        name: "Pain headline / visual resolution",
        visualIdea: "A sharp pain-point statement paired with a visually satisfying resolved state centered on the product.",
        copyArchitecture: "3-7 word pain hook + optional 2-5 word resolution line.",
        typographyPersonality: "Strong performance headline with a clearly quieter solution line.",
        offerTreatment: "Optional only after the resolution.",
        mandatoryDesignRules: "Do not rely on a generic split-screen if one strong resolved scene communicates the idea better.",
      },
      {
        name: "Chaos to calm",
        visualIdea: "A designed contrast from visual clutter/friction to an organized product-led resolution.",
        copyArchitecture: "Two very short state labels or one transformation statement.",
        typographyPersonality: "Graphic contrast typography with clean grid logic.",
        offerTreatment: "No offer by default.",
        mandatoryDesignRules: "Keep the selected product(s) exact and do not fabricate competitor products.",
      },
      {
        name: "The thing you stop doing",
        visualIdea: "The creative dramatizes an annoying behavior the customer no longer needs to do.",
        copyArchitecture: "One specific behavior-led hook, ideally 4-8 words.",
        typographyPersonality: "Editorial/performance hybrid, short and confident.",
        offerTreatment: "Optional tiny footer.",
        mandatoryDesignRules: "Avoid vague claims like 'Travel Smarter'; make the behavior concrete.",
      },
      {
        name: "Resolved moment",
        visualIdea: "A believable human scene where the benefit is obvious through relief, organization or ease.",
        copyArchitecture: "One emotional payoff 3-7 words. No support paragraph.",
        typographyPersonality: "Subtle human-centered typography.",
        offerTreatment: "No offer.",
        mandatoryDesignRules: "Let the scene do most of the storytelling.",
      },
    ],
  },
};

const GLOBAL_REFERENCE_AUTHORITY = `
REFERENCE AUTHORITY — NON-NEGOTIABLE
1. SELECTED PRODUCT REFERENCES are the absolute source of truth for product identity and physical appearance.
2. OPTIONAL WINNING AD is lower-priority inspiration for composition/style/copy structure only when enabled.
3. LANDING PAGE is marketing intelligence and message context, NOT text to paste verbatim.
4. CREATIVE DIRECTION is an additional user instruction and may refine the art direction, but may not override product identity.
`.trim();

const GLOBAL_PRODUCT_FIDELITY = `
PRODUCT FIDELITY — HARD CONSTRAINT
Preserve exact silhouette, proportions, dimensions, fabric/material character, construction, stitching, handles, straps, zippers, zipper pullers, trim, hardware, feet, pockets, logo/patch placement and colorway shown in the selected references.
Do not redesign, simplify, beautify, recolor, merge or substitute the selected product.
Do not invent pockets, straps, handles, hardware, logos or accessories.
No malformed handles, duplicated straps, floating hardware, warped seams, distorted logo patches or impossible geometry.
Every selected subject must remain immediately recognizable as the exact real product/variant represented by its references.
`.trim();

const GLOBAL_GRAPHIC_DESIGN_RULES = `
SENIOR GRAPHIC DESIGN STANDARD
The output must look like a finished static ad designed by a strong senior performance graphic designer, not a raw AI photo and not a generic template.
Design the visual, product placement, copy, typography and graphic system as ONE composition from the beginning.
Use intentional hierarchy, alignment, grid, spacing, negative space, optical balance, scale, rhythm and contrast.
Every decorative element must have a communication purpose.
Avoid generic gradients, random glows, meaningless badges, fake labels, arbitrary shapes, stock-template layouts, tiny microtext and visual clutter.
The product must remain a commercial focal point and must never be accidentally hidden by typography or graphics.
`.trim();

const GLOBAL_TEXT_RULES = `
TEXT / TYPOGRAPHY — HARD CONSTRAINT
The final image may include advertising text, but only SHORT copy that you derive from the marketing context according to the selected Creative Model.
DO NOT paste the long landing-page headline or subheadline verbatim.
DO NOT render paragraphs from the landing page.
DO NOT invent filler text, random URLs, fake legal copy, nonsense labels or gibberish.
Spell every rendered word correctly. If a line would be too long or difficult to render cleanly, USE LESS COPY rather than shrinking it or forcing awkward line breaks.
Keep all text fully inside safe margins.
Never cover the product silhouette, handles, zippers, pockets, logo patch, face, hands or other key focal details.
Use professional line breaks and balanced text blocks. No collisions, no orphan words, no text running off-canvas, no tiny unreadable copy.
If an offer is provided, preserve the offer wording exactly.
Use the landing-page language for ad copy unless Creative Direction explicitly requests another language.
`.trim();


const GLOBAL_ANTI_MONOTONY = `
ANTI-MONOTONY / CAMPAIGN-DIVERSITY RULES
Do NOT default every output to the formula: generic headline + subheadline + discount badge + centered product.
Do NOT default to "Travel Smarter", "Travel Better", "Pack Smarter", "Travel Lighter", "More Space. Less Hassle." or similarly generic travel slogans unless that exact wording is explicitly required by Creative Direction.
The selected archetype controls the visual and copy architecture. Respect it.
Some ads should have no offer. Some should have no subheadline. Some should use one giant word/number. Some should be native UI, quote-led, comparison-led, annotation-led or photography-led.
Do not repeat the same badge shape, typeface personality, text position, product scale, camera angle or background logic across a batch unless the Creative Model specifically requires consistency.
Copy should be specific to the actual consumer tension from the LP/product context, not generic category language.
`.trim();

const GLOBAL_QA = [
  "Exact required product/variant count is visible",
  "Every selected variant appears exactly once unless the concept explicitly requires a paired duplicate and the prompt allows it",
  "No selected subject is omitted",
  "No unselected product/color is added",
  "No merged or hybrid colorway",
  "Product silhouette and construction match references",
  "No malformed handles, straps, zippers, hardware, pockets or logo placement",
  "Rendered text is short, correctly spelled and fully readable",
  "No text overlaps the product or important human features",
  "No LP headline/body copied verbatim as a giant paragraph",
  "Professional spacing, alignment, hierarchy and negative space",
  "No filler text, gibberish, fake URLs or meaningless labels",
  "Composition reads clearly at mobile-feed size",
];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function boundedText(value: unknown, maxChars: number) {
  const text = normalizeWhitespace(clean(value));
  if (!text) return "";
  return text.slice(0, maxChars);
}

export function getCreativePlaybook(modelId: string) {
  return PLAYBOOKS[modelId] ?? PLAYBOOKS.billboard;
}

export function selectReferencePack(args: {
  productGroups: ProductReferenceGroup[];
  winningImage?: string | null;
  maxImages?: number;
}): SelectedReferencePack {
  const maxImages = Math.max(1, Math.min(16, args.maxImages ?? 16));
  const subjectCount = Math.max(1, args.productGroups.length);

  // Too many similar refs can confuse an edit model. Keep a balanced budget per selected subject.
  const reservedForWinning = args.winningImage ? 1 : 0;
  const productBudget = Math.max(subjectCount, maxImages - reservedForWinning);
  const perSubject =
    subjectCount === 1
      ? Math.min(7, productBudget)
      : Math.max(2, Math.min(4, Math.floor(productBudget / subjectCount)));

  const imageUrls: string[] = [];
  const subjectImageRanges: SelectedReferencePack["subjectImageRanges"] = [];

  args.productGroups.forEach((group, subjectIndex) => {
    const unique = Array.from(
      new Set((group.references ?? []).map((url) => clean(url)).filter(Boolean))
    );

    const chosen = unique.slice(0, perSubject);
    const start = imageUrls.length + 1;
    imageUrls.push(...chosen);
    const end = imageUrls.length;

    subjectImageRanges.push({
      subjectIndex,
      startImageIndex: start,
      endImageIndex: end,
      selectedCount: chosen.length,
    });
  });

  let winningImageIndex: number | null = null;
  const winningImage = clean(args.winningImage);
  if (winningImage && imageUrls.length < maxImages) {
    imageUrls.push(winningImage);
    winningImageIndex = imageUrls.length;
  }

  return {
    imageUrls: imageUrls.slice(0, maxImages),
    subjectImageRanges,
    winningImageIndex,
  };
}

function buildSubjectContract(
  groups: ProductReferenceGroup[],
  pack: SelectedReferencePack
) {
  const count = groups.length;

  const subjects = groups
    .map((group, index) => {
      const range = pack.subjectImageRanges[index];
      const images = range?.selectedCount
        ? `Input images ${range.startImageIndex}-${range.endImageIndex}`
        : "No usable reference images";

      return [
        `SUBJECT ${index + 1}`,
        `Product: ${group.productName || "Selected product"}`,
        group.parentSku ? `Parent SKU: ${group.parentSku}` : null,
        group.variantSku ? `Variant SKU: ${group.variantSku}` : null,
        group.color ? `Exact variant/color: ${group.color}` : null,
        `Reference ownership: ${images} belong ONLY to SUBJECT ${index + 1}.`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const countRules =
    count === 1
      ? `The final image must show EXACTLY ONE commercial product subject in total: SUBJECT 1. Do not add a second bag/product, background duplicate, alternate colorway, miniature duplicate, reflection duplicate or decorative copy of the product.`
      : `The final image must show EXACTLY ${count} commercial product subjects in total: SUBJECT 1 through SUBJECT ${count}. Every selected subject must be visibly present ONCE. Do not omit one. Do not add an extra product. Do not duplicate one selected variant to substitute for another. Do not merge two colors/products into a hybrid object.`;

  return `
PRODUCT COUNT CONTRACT — ABSOLUTE
Selected product/color locks: ${count}
${countRules}

${subjects}
`.trim();
}

function buildLandingIntelligence(lp?: LandingPageInput | null) {
  if (!lp) {
    return `No landing page selected. Derive the advertising idea from the product, Creative Model and Creative Direction only. Keep copy minimal if there is not enough marketing context.`;
  }

  const parts = [
    lp.product_name ? `LP product: ${boundedText(lp.product_name, 160)}` : null,
    lp.language ? `LP language: ${boundedText(lp.language, 40)}` : null,
    lp.market ? `LP market: ${boundedText(lp.market, 80)}` : null,
    lp.offer ? `EXACT offer if used: ${boundedText(lp.offer, 80)}` : null,
    lp.title ? `Page/title context: ${boundedText(lp.title, 260)}` : null,
    lp.headline ? `Long-form LP headline (context only, DO NOT paste verbatim): ${boundedText(lp.headline, 700)}` : null,
    lp.subheadline ? `LP subheadline/context (context only): ${boundedText(lp.subheadline, 700)}` : null,
    lp.body_text ? `LP body / marketing intelligence excerpt: ${boundedText(lp.body_text, 5000)}` : null,
  ].filter(Boolean);

  return `${parts.join("\n")}

Interpret this LP as source material. Extract the consumer tension, desire, strongest benefit, proof, offer and emotional angle internally. Then create SHORT ad copy specifically for the selected Creative Model. Do not turn the LP headline into the ad headline by truncating it.`;
}

function buildWinningRules(
  winning: WinningCreativeInput | null | undefined,
  pack: SelectedReferencePack
) {
  if (!winning || !pack.winningImageIndex) {
    return `No winning-ad reference is present. Invent the layout and visual system from the Creative Model playbook, product references, LP intelligence and Creative Direction.`;
  }

  const settings = winning.referenceSettings;
  return [
    `Input image ${pack.winningImageIndex} is the OPTIONAL WINNING AD reference. It is NOT a product reference.`,
    settings?.composition
      ? "You may borrow its composition logic, spacing or focal hierarchy."
      : "Do not deliberately copy its composition.",
    settings?.style
      ? "You may borrow its broad visual style language."
      : "Do not deliberately copy its visual style.",
    settings?.copyStructure
      ? "You may borrow its copy-hierarchy structure, but write fresh copy from the current LP/product context."
      : "Do not copy its copy structure.",
    settings?.productAppearance
      ? "Product-appearance influence is enabled ONLY if it does not conflict with selected product references."
      : "Completely ignore the product appearance shown in the winning ad.",
    `Reference strength: ${settings?.strength || "medium"}.`,
    "The selected product references always have higher authority than this winning ad.",
  ].join("\n");
}

function buildCopyBrief(
  playbook: Playbook,
  archetype: Archetype,
  lp?: LandingPageInput | null
) {
  const language =
    clean(lp?.language) ||
    "the language implied by Creative Direction / marketing context";
  const offer = clean(lp?.offer);

  return `
PERFORMANCE COPYWRITER BRIEF
Write the on-image copy specifically for this Creative Model AND this archetype.

CREATIVE MODEL COPY RULES
${playbook.copyRules}

ARCHETYPE COPY ARCHITECTURE
${archetype.copyArchitecture}

LANGUAGE
Use ${language} for rendered copy.

OFFER
${offer ? `Available LP offer: ${offer}. If shown, preserve it EXACTLY.` : "No LP offer is available."}
Archetype offer treatment: ${archetype.offerTreatment}

COPY QUALITY
- Do NOT mechanically reuse the LP headline.
- Do NOT truncate the LP headline and call that ad copy.
- Do NOT fall back to generic travel slogans.
- Make the hook specific to the pain point, behavior, proof, benefit or emotional tension that is actually supported by the LP/product context.
- Prefer surprising, human, specific language over broad brand language.
- Follow the archetype's required number and type of text blocks.
- If the archetype is native/chat/review-led, do not add a separate billboard headline.
- If the archetype is photography-led, text may be extremely minimal or absent.
- If the archetype is giant-statement-led, do not add unnecessary support lines.
- If the offer is not part of the chosen concept, OMIT it.
- Never invent a statistic, rating, testimonial identity or unsupported product claim.
`.trim();
}

function buildDesignBrief(
  playbook: Playbook,
  archetype: Archetype,
  mode: string,
  ratio: string,
  requiredSubjectCount: number
) {
  const subjectComposition =
    requiredSubjectCount === 1
      ? `There is exactly 1 required product subject. Build a single-product composition with one clear commercial focal point. Do not create a second bag/product as a decorative duplicate.`
      : `There are exactly ${requiredSubjectCount} required product subjects. Build a deliberate multi-subject composition where ALL ${requiredSubjectCount} selected subjects are clearly visible, individually recognizable and visually balanced. Do not let one subject hide another.`;

  return `
SENIOR GRAPHIC DESIGN DIRECTOR BRIEF
Creative format: ${playbook.name}
Variation mode: ${mode}
Chosen archetype: ${archetype.name}

OBJECTIVE
${playbook.objective}

VISUAL GRAMMAR
${playbook.visualGrammar}

ARCHETYPE VISUAL IDEA
${archetype.visualIdea}

BASE COMPOSITION RULES
${playbook.compositionRules}

PRODUCT-COUNT-AWARE COMPOSITION
${subjectComposition}

ARCHETYPE TYPOGRAPHY PERSONALITY
${archetype.typographyPersonality}

BASE TYPOGRAPHY RULES
${playbook.typographyRules}

PRODUCT TREATMENT
${playbook.productRules}

ARCHETYPE-SPECIFIC HARD RULES
${archetype.mandatoryDesignRules}

OUTPUT ASPECT RATIO
${ratio}

Design the photography/rendering, typography, product placement, graphic elements and negative space together as ONE finished composition.
Do not make a good photo first and then paste text over it.
Do not reuse a generic performance-ad template.
`.trim();
}

export function buildDesignerPlan(args: {
  index: number;
  creativeModel: CreativeModelInput;
  productGroups: ProductReferenceGroup[];
  referencePack: SelectedReferencePack;
  landingPage?: LandingPageInput | null;
  winningCreative?: WinningCreativeInput | null;
  creativeDirection?: string | null;
  ratio: string;
}): DesignerPlan {
  const {
    index,
    creativeModel,
    productGroups,
    referencePack,
    landingPage,
    winningCreative,
    creativeDirection,
    ratio,
  } = args;

  const playbook = getCreativePlaybook(creativeModel.id);
  const mode = playbook.variationModes[index % playbook.variationModes.length];
  const archetype =
    playbook.archetypes[index % playbook.archetypes.length];
  const subjectContract = buildSubjectContract(productGroups, referencePack);
  const strategyBrief = `
CREATIVE STRATEGIST
Build one clear advertising idea from the product truth + landing-page intelligence + selected creative format.
Do not merely illustrate the LP headline.
Do not make a generic product photo with text placed on top.
Choose one primary consumer tension or benefit and express it visually.
The concept must feel intentionally art-directed and meaningfully different from other variations.
`.trim();
  const copyBrief = buildCopyBrief(playbook, archetype, landingPage);
  const designBrief = buildDesignBrief(playbook, archetype, mode, ratio, productGroups.length);

  const finalPrompt = `
You are the senior creative team responsible for producing ONE finished, production-ready static performance ad.
Act simultaneously as a Creative Strategist, Performance Copywriter, Art Director and Senior Graphic Designer.
Do not output a raw photo. Do not output a blank art plate. The image itself must be the finished designed advertisement.

${GLOBAL_REFERENCE_AUTHORITY}

${subjectContract}

${GLOBAL_PRODUCT_FIDELITY}

${strategyBrief}

CHOSEN CREATIVE ARCHETYPE
${archetype.name}
${archetype.visualIdea}

${GLOBAL_ANTI_MONOTONY}

LANDING PAGE / MARKETING INTELLIGENCE
${buildLandingIntelligence(landingPage)}

${copyBrief}

${designBrief}

WINNING AD
${buildWinningRules(winningCreative, referencePack)}

USER CREATIVE DIRECTION
${clean(creativeDirection) || "No additional direction supplied. Use the playbook and LP intelligence."}

${GLOBAL_GRAPHIC_DESIGN_RULES}

${GLOBAL_TEXT_RULES}

FINAL EXECUTION RULES
- Produce exactly ONE final ad image.
- Respect the PRODUCT COUNT CONTRACT exactly.
- The final composition must feel like a professional graphic designer intentionally designed every element.
- Keep the selected products faithful to their exact references.
- Keep copy concise and specific to the Creative Model.
- If text accuracy or layout would be compromised by too much copy, render LESS text.
- No random text, no accidental duplicate product, no unselected color, no extra bag/product.
- No text may obscure the selected product(s).
- Avoid generic AI-ad aesthetics and obvious template composition.
- Ensure strong mobile-feed readability at first glance.
- Make variation ${index + 1} distinct in concept/composition while obeying all product and copy constraints.

PRE-FLIGHT SELF-CHECK BEFORE FINALIZING
${GLOBAL_QA.map((item) => `- ${item}`).join("\n")}

Only finalize the image after mentally checking every item above.
`.trim();

  return {
    creativeModelId: creativeModel.id,
    creativeModelName: playbook.name,
    conceptName: `${playbook.name} — ${archetype.name}`,
    variationMode: mode,
    archetypeName: archetype.name,
    copyArchitecture: archetype.copyArchitecture,
    typographyPersonality: archetype.typographyPersonality,
    offerTreatment: archetype.offerTreatment,
    requiredSubjectCount: productGroups.length,
    subjectContract,
    strategyBrief,
    copyBrief,
    designBrief,
    finalPrompt,
    qaChecklist: GLOBAL_QA,
  };
}
