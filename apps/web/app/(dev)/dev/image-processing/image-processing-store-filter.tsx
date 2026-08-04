"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@louez/ui";

import { IMAGE_PROCESSING_BENCHMARK_FILTER } from "@/lib/ai/image/benchmark-fixtures";

const ALL_STORES_VALUE = "all";

interface ImageProcessingStoreFilterProps {
  stores: { id: string; name: string }[];
  selectedStoreId: string | null;
  allowBenchmark: boolean;
}

export const ImageProcessingStoreFilter = ({
  stores,
  selectedStoreId,
  allowBenchmark,
}: ImageProcessingStoreFilterProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedStoreName =
    selectedStoreId === IMAGE_PROCESSING_BENCHMARK_FILTER
      ? "Suite de test"
      : stores.find((store) => store.id === selectedStoreId)?.name;

  const handleStoreChange = (value: string | null) => {
    if (!value) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("suite");
    if (value === ALL_STORES_VALUE) {
      params.delete("store");
    } else {
      params.set("store", value);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground" htmlFor="image-processing-store">
        Périmètre
      </label>
      <Select value={selectedStoreId ?? ALL_STORES_VALUE} onValueChange={handleStoreChange}>
        <SelectTrigger id="image-processing-store" className="w-full sm:w-72">
          <SelectValue>{selectedStoreName ?? "Toutes les boutiques"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STORES_VALUE} label="Toutes les boutiques">
            Toutes les boutiques
          </SelectItem>
          {allowBenchmark ? (
            <SelectItem value={IMAGE_PROCESSING_BENCHMARK_FILTER} label="Suite de test">
              Suite de test
            </SelectItem>
          ) : null}
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id} label={store.name}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
