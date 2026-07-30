import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Badge, Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@louez/ui";

import {
  isImageProcessingDebugEnabled,
  listImageProcessingDebugRuns,
} from "@/lib/ai/image/debug-artifacts";
import { auth } from "@/lib/auth";
import { getCurrentStore, hasPermission } from "@/lib/store-context";
import { createLoginUrl } from "@/lib/utils/util.url";

export const metadata: Metadata = {
  title: "Traitement des images · Dev",
  robots: {
    index: false,
    follow: false,
  },
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Paris",
});

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 1 : 0)} s`;
}

function formatByteSize(byteSize: number): string {
  if (byteSize < 1024 * 1024) return `${Math.round(byteSize / 1024)} Ko`;
  return `${(byteSize / (1024 * 1024)).toFixed(1)} Mo`;
}

function filenameFromKey(key: string): string {
  return key.split("/").pop() ?? key;
}

const ImageProcessingDevPage = async () => {
  if (!isImageProcessingDebugEnabled()) {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(createLoginUrl("/dev/image-processing"));
  }

  const store = await getCurrentStore();
  if (!store) {
    redirect("/onboarding");
  }
  if (!hasPermission(store.role, "read")) {
    notFound();
  }

  const runs = await listImageProcessingDebugRuns(store.id);

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8">
        <header className="space-y-4 border-b pb-6">
          <Badge variant="pending" className="w-fit">
            Diagnostic privé
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Comparaison du traitement des images
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Les 25 derniers traitements de la boutique « {store.name} ». Chaque colonne montre
              exactement l’image produite à cette étape. Les fichiers sont privés et accessibles
              uniquement aux membres de cette boutique.
            </p>
          </div>
        </header>

        {runs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucun traitement capturé</CardTitle>
              <CardDescription>
                Lancez « Améliorer avec l’IA » ou « Supprimer le fond », puis rechargez cette page.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8">
            {runs.map((run) => (
              <Card key={run.runId} className="overflow-hidden">
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>
                          {run.operation === "enhance"
                            ? "Amélioration avec l’IA"
                            : "Suppression du fond"}
                        </CardTitle>
                        <Badge variant={run.operation === "enhance" ? "progress" : "submitted"}>
                          {run.stages.length} étapes
                        </Badge>
                      </div>
                      <CardDescription>
                        {dateFormatter.format(new Date(run.createdAt))} · durée totale{" "}
                        {formatDuration(run.totalDurationMs)}
                      </CardDescription>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                      <p>Source : {filenameFromKey(run.sourceKey)}</p>
                      <p>Résultat : {filenameFromKey(run.outputKey)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-1 pt-2 text-xs text-muted-foreground">
                    {run.configuration.aiModel ? (
                      <span>
                        IA : {run.configuration.aiModel} · qualité {run.configuration.aiQuality}
                      </span>
                    ) : null}
                    <span>
                      Détourage :{" "}
                      {run.configuration.backgroundRemovalModel === "worker-managed"
                        ? "modèle géré par le worker"
                        : run.configuration.backgroundRemovalModel}
                    </span>
                    <span className="font-mono">Run {run.runId}</span>
                  </div>
                </CardHeader>

                <CardPanel className="p-4 sm:p-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {run.stages.map((stage, index) => (
                      <figure key={stage.id} className="overflow-hidden rounded-xl border bg-card">
                        <div className="flex aspect-[4/3] items-center justify-center bg-muted/60">
                          {/* The browser must send its auth cookie directly to the private route. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/dev/image-processing/${run.runId}/${stage.id}`}
                            alt={`${stage.label} du traitement ${run.runId}`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <figcaption className="space-y-1 border-t px-3 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {index + 1}. {stage.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatByteSize(stage.byteSize)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {stage.contentType}
                            {stage.durationMs === null
                              ? ""
                              : ` · ${formatDuration(stage.durationMs)}`}
                          </p>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </CardPanel>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default ImageProcessingDevPage;
