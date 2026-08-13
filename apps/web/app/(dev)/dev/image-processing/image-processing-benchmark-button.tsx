"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Checkbox, toastManager } from "@louez/ui";
import { cn } from "@louez/utils";

import { IMAGE_PROCESSING_BENCHMARK_FILTER } from "@/lib/ai/image/benchmark-fixtures";

interface BenchmarkCase {
  id: string;
  label: string;
  description: string;
  previewUrl: string;
}

interface ImageProcessingBenchmarkButtonProps {
  cases: BenchmarkCase[];
}

type BenchmarkState =
  | { status: "idle" }
  | { status: "running"; current: number; total: number; label: string };

export const ImageProcessingBenchmarkButton = ({ cases }: ImageProcessingBenchmarkButtonProps) => {
  const router = useRouter();
  const [state, setState] = useState<BenchmarkState>({ status: "idle" });
  const [enabledCaseIds, setEnabledCaseIds] = useState(() => new Set(cases.map(({ id }) => id)));
  const selectedCases = cases.filter(({ id }) => enabledCaseIds.has(id));
  const isRunning = state.status === "running";

  const setCaseEnabled = (caseId: string, enabled: boolean) => {
    if (isRunning) return;
    setEnabledCaseIds((current) => {
      const next = new Set(current);
      if (enabled) next.add(caseId);
      else next.delete(caseId);
      return next;
    });
  };

  const runBenchmark = async () => {
    if (isRunning || selectedCases.length === 0) return;

    const suiteId = crypto.randomUUID();
    for (const [index, benchmarkCase] of selectedCases.entries()) {
      setState({
        status: "running",
        current: index + 1,
        total: selectedCases.length,
        label: benchmarkCase.label,
      });

      let response: Response;
      try {
        response = await fetch("/api/dev/image-processing/benchmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            suiteId,
            fixtureId: benchmarkCase.id,
            suiteSize: selectedCases.length,
          }),
        });
      } catch {
        setState({ status: "idle" });
        toastManager.add({
          title: `Suite interrompue sur « ${benchmarkCase.label} »`,
          description:
            "La requête réseau n’a pas abouti. Les tests déjà terminés restent visibles.",
          type: "error",
        });
        router.push(
          `/dev/image-processing?store=${IMAGE_PROCESSING_BENCHMARK_FILTER}&suite=${suiteId}`,
        );
        return;
      }

      if (!response.ok) {
        setState({ status: "idle" });
        toastManager.add({
          title: `Suite interrompue sur « ${benchmarkCase.label} »`,
          description: `Le serveur a répondu avec le statut ${response.status}. Les tests déjà terminés restent visibles.`,
          type: "error",
        });
        router.push(
          `/dev/image-processing?store=${IMAGE_PROCESSING_BENCHMARK_FILTER}&suite=${suiteId}`,
        );
        return;
      }
    }

    setState({ status: "idle" });
    toastManager.add({
      title: "Suite de test terminée",
      description: `${selectedCases.length} cas ont exécuté le flow IA complet.`,
      type: "success",
    });
    router.push(
      `/dev/image-processing?store=${IMAGE_PROCESSING_BENCHMARK_FILTER}&suite=${suiteId}`,
    );
  };

  const progressLabel =
    state.status === "running"
      ? `Test ${state.current}/${state.total}`
      : selectedCases.length === 0
        ? "Sélectionnez une image"
        : `Lancer ${selectedCases.length} test${selectedCases.length > 1 ? "s" : ""}`;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="space-y-1">
          <h2 className="font-semibold">Suite de non-régression IA</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Sélectionnez les images, puis exécutez séquentiellement GPT Image, le détourage et la
            standardisation. Aucun crédit boutique n’est débité, mais chaque image activée déclenche
            un appel OpenAI au coût réel.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <Button
            type="button"
            onClick={runBenchmark}
            isPending={isRunning}
            pendingContent={progressLabel}
            disabled={selectedCases.length === 0}
          >
            {progressLabel}
          </Button>
          <p className="min-h-4 text-right text-xs text-muted-foreground" aria-live="polite">
            {state.status === "running"
              ? state.label
              : `${selectedCases.length}/${cases.length} image${cases.length > 1 ? "s" : ""} activée${cases.length > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={isRunning || selectedCases.length === cases.length}
          onClick={() => setEnabledCaseIds(new Set(cases.map(({ id }) => id)))}
        >
          Tout activer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={isRunning || selectedCases.length === 0}
          onClick={() => setEnabledCaseIds(new Set<string>())}
        >
          Tout désactiver
        </Button>
      </div>

      <ul className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cases.map((benchmarkCase) => (
          <li
            key={benchmarkCase.id}
            className={cn(
              "overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow,opacity]",
              enabledCaseIds.has(benchmarkCase.id) ? "border-primary/40 shadow-sm" : "opacity-55",
            )}
          >
            <label
              htmlFor={`benchmark-${benchmarkCase.id}`}
              className={cn("block", isRunning ? "cursor-default" : "cursor-pointer")}
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-muted/60">
                {/* Fixtures can be local or hosted on the public demo bucket. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={benchmarkCase.previewUrl}
                  alt={`Aperçu du cas ${benchmarkCase.label}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="flex items-start gap-2.5 border-t p-3">
                <Checkbox
                  id={`benchmark-${benchmarkCase.id}`}
                  checked={enabledCaseIds.has(benchmarkCase.id)}
                  disabled={isRunning}
                  onCheckedChange={(checked) => setCaseEnabled(benchmarkCase.id, checked === true)}
                  aria-label={`Activer le test ${benchmarkCase.label}`}
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{benchmarkCase.label}</p>
                  <p className="mt-1">{benchmarkCase.description}</p>
                </div>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};
