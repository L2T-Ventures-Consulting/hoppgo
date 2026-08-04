const getMessageValue = (messages: unknown, path: string): unknown => {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (typeof value !== "object" || value === null || !(segment in value)) {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, messages);
};

const collectMessageStrings = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value];
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.values(value).flatMap(collectMessageStrings);
};

export const getMessageText = (messages: unknown, path: string): string => {
  const value = getMessageValue(messages, path);
  return typeof value === "string" ? value : "";
};

export const getSearchableMessageText = (messages: unknown, paths: string[]): string => {
  return paths.flatMap((path) => collectMessageStrings(getMessageValue(messages, path))).join(" ");
};

export const normalizeSettingsSearchText = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
};

export const getSettingsSearchScore = ({
  content,
  description,
  label,
  query,
}: {
  content: string;
  description: string;
  label: string;
  query: string;
}): number | null => {
  const normalizedQuery = normalizeSettingsSearchText(query);
  if (!normalizedQuery) {
    return null;
  }

  const tokens = normalizedQuery.split(/\s+/);
  const normalizedLabel = normalizeSettingsSearchText(label);
  const normalizedDescription = normalizeSettingsSearchText(description);
  const normalizedContent = normalizeSettingsSearchText(content);
  const searchableText = `${normalizedLabel} ${normalizedDescription} ${normalizedContent}`;

  if (!tokens.every((token) => searchableText.includes(token))) {
    return null;
  }

  if (normalizedLabel === normalizedQuery) return 0;
  if (normalizedLabel.startsWith(normalizedQuery)) return 1;
  if (normalizedLabel.includes(normalizedQuery)) return 2;
  if (normalizedDescription.includes(normalizedQuery)) return 3;
  return 4;
};
