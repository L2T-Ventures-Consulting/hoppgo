export const IMAGE_PROCESSING_BENCHMARK_SCOPE_ID = "_dev-image-benchmark";
export const IMAGE_PROCESSING_BENCHMARK_FILTER = "benchmark";

const FIXTURE_BASE_URL = "https://louez-dev.s3.fr-par.scw.cloud/demo/ar-mor-location/products";

export const IMAGE_PROCESSING_BENCHMARK_CASES = [
  {
    id: "cropped-wing",
    label: "Wing volontairement cropée",
    description: "Valide la conservation du cadrage et l’absence de marges ajoutées.",
    previewUrl: `${FIXTURE_BASE_URL}/wing.jpg`,
    source: { kind: "remote", url: `${FIXTURE_BASE_URL}/wing.jpg` },
  },
  {
    id: "outdoor-tent",
    label: "Tente en extérieur",
    description: "Valide l’isolation sur un arrière-plan naturel et chargé.",
    previewUrl: `${FIXTURE_BASE_URL}/tent4.jpg`,
    source: { kind: "remote", url: `${FIXTURE_BASE_URL}/tent4.jpg` },
  },
  {
    id: "dark-stove",
    label: "Réchaud sombre",
    description: "Valide les contours d’un petit produit sombre et métallique.",
    previewUrl: `${FIXTURE_BASE_URL}/stove.jpg`,
    source: { kind: "remote", url: `${FIXTURE_BASE_URL}/stove.jpg` },
  },
  {
    id: "detailed-gps",
    label: "GPS avec écran et marquages",
    description: "Valide la conservation des détails, boutons, textes et reflets.",
    previewUrl: `${FIXTURE_BASE_URL}/gps.jpg`,
    source: { kind: "remote", url: `${FIXTURE_BASE_URL}/gps.jpg` },
  },
  {
    id: "elongated-kayak",
    label: "Kayak allongé",
    description: "Valide une silhouette large avec des éléments fins et saillants.",
    previewUrl: `${FIXTURE_BASE_URL}/kayak.jpg`,
    source: { kind: "remote", url: `${FIXTURE_BASE_URL}/kayak.jpg` },
  },
  {
    id: "partybox-cropped",
    label: "PartyBox cropée",
    description: "Valide le maintien du zoom et le détourage sous la poignée.",
    previewUrl: "/images/ai-image-benchmark/partybox-cropped.jpg",
    source: {
      kind: "public",
      path: "/images/ai-image-benchmark/partybox-cropped.jpg",
      mimeType: "image/jpeg",
    },
  },
  {
    id: "partybox-detail",
    label: "Détail de PartyBox",
    description: "Valide un cadrage très serré, sombre, avec un accent rouge.",
    previewUrl: "/images/ai-image-benchmark/partybox-detail.webp",
    source: {
      kind: "public",
      path: "/images/ai-image-benchmark/partybox-detail.webp",
      mimeType: "image/webp",
    },
  },
] as const;

export type ImageProcessingBenchmarkCase = (typeof IMAGE_PROCESSING_BENCHMARK_CASES)[number];

export const getImageProcessingBenchmarkCase = (fixtureId: string) =>
  IMAGE_PROCESSING_BENCHMARK_CASES.find((fixture) => fixture.id === fixtureId) ?? null;
