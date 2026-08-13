"use client";

import type { ReactNode } from "react";

import { useSortable } from "@dnd-kit/react/sortable";
import { useTranslations } from "next-intl";

import { cn } from "@louez/utils";

interface ProductImageSortableItemProps {
  children: ReactNode;
  index: number;
  preview: string;
}

export const ProductImageSortableItem = ({
  children,
  index,
  preview,
}: ProductImageSortableItemProps) => {
  const t = useTranslations("dashboard.products");
  const { ref, isDragging, isDropping } = useSortable({
    id: preview,
    index,
    transition: {
      duration: 160,
      easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      idle: false,
    },
  });

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t("reorder")}
      className={cn(
        "group bg-muted/20 relative aspect-4/3 w-full max-w-[calc(50%-6px)] cursor-grab overflow-hidden rounded-lg border sm:max-w-48",
        (isDragging || isDropping) && "z-20 cursor-grabbing shadow-lg ring-2 ring-ring/25",
      )}
    >
      {children}
    </div>
  );
};
