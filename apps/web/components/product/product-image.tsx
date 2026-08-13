"use client";

import { ProductIcon } from "@louez/ui/icons";
import { cn } from "@louez/utils";

import { SharedImage, type SharedImageProps } from "@/components/ui/shared-image";

type ProductImageProps = Omit<SharedImageProps, "fill" | "width" | "height" | "fallbackIcon">;

/**
 * Product visual: fixed 4/3 ratio and product placeholder. Size it through
 * `containerClassName` (`h-12`, `w-full`, …) — the ratio does the rest.
 */
export const ProductImage = ({
  inset = true,
  containerClassName,
  sizes = "96px",
  ...props
}: ProductImageProps) => (
  <SharedImage
    {...props}
    fill
    sizes={sizes}
    inset={inset}
    fallbackIcon={ProductIcon}
    containerClassName={cn("aspect-4/3 rounded-lg", containerClassName)}
  />
);
