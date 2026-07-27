"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronsUpDown } from "lucide-react";

import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@louez/ui";
import { cn } from "@louez/utils";

import { ProductImage } from "@/components/product/product-image";

export interface ProductAddComboboxProduct {
  id: string;
  name: string;
  images?: string[] | null;
}

interface ProductAddComboboxProps {
  products: ProductAddComboboxProduct[];
  availableQuantityByProduct: Map<string, number>;
  onAddProduct: (productId: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  unavailableLabel: string;
  availableLabel: string;
  disabled?: boolean;
  /** Return false to keep the popover closed (e.g. a prerequisite is missing). */
  onBeforeOpen?: () => boolean;
}

export function ProductAddCombobox({
  products,
  availableQuantityByProduct,
  onAddProduct,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  unavailableLabel,
  availableLabel,
  disabled = false,
  onBeforeOpen,
}: ProductAddComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // The default CommandInput autoFocus fires before the popover is anchored,
  // making the browser scroll to the not-yet-positioned popup. Focus manually
  // once open, with preventScroll so the page never jumps.
  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && onBeforeOpen && !onBeforeOpen()) {
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="group h-9 w-fit justify-between"
          />
        }
      >
        <span className="w-full min-w-0 flex-1 justify-start gap-2">
          <span className="truncate">{placeholder}</span>
        </span>
        <ChevronsUpDown
          data-slot="icon"
          className="size-4 opacity-70 transition-opacity group-hover:opacity-100"
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0 pt-1 sm:w-90 *:p-0"
        align="end"
      >
        <Command open items={filteredProducts} filter={null}>
          <CommandInput
            ref={searchInputRef}
            autoFocus={false}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <CommandEmpty>{emptyLabel}</CommandEmpty>
          <CommandList className="max-h-80 not-empty:pt-0">
            <CommandGroup>
              {filteredProducts.map((product) => {
                const remaining = availableQuantityByProduct.get(product.id);
                const isUnavailable = remaining !== undefined && remaining <= 0;

                return (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onClick={() => {
                      // Keep the popover open so several products can be
                      // added in a row; Escape or an outside click closes it.
                      onAddProduct(product.id);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-2"
                  >
                    <ProductImage
                      src={product.images?.[0]}
                      alt=""
                      sizes="32px"
                      className={cn(isUnavailable && "opacity-40")}
                      containerClassName="w-8 shrink-0 rounded-md"
                    />

                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        isUnavailable && "text-muted-foreground",
                      )}
                    >
                      {product.name}
                    </span>
                    {isUnavailable ? (
                      <Badge variant="pending" size="default">
                        {unavailableLabel}
                      </Badge>
                    ) : (
                      remaining !== undefined && (
                        <Badge variant="expired" className="tabular-nums">
                          {remaining} {availableLabel}
                        </Badge>
                      )
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
