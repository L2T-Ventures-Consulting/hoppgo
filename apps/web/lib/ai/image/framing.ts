export const PRODUCT_IMAGE_FRAMING_MODES = ["recenter", "preserve"] as const;

export type ProductImageFramingMode = (typeof PRODUCT_IMAGE_FRAMING_MODES)[number];
