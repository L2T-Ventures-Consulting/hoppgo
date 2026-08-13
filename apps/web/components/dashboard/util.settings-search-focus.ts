import { normalizeSettingsSearchText } from "./util.settings-search";

export const SETTINGS_SEARCH_QUERY_PARAM = "settingsSearch";
export const SETTINGS_SEARCH_ITEM_PARAM = "settingsItem";

export const SETTINGS_SEARCH_TEXT_CLASSES = [
  "-mx-1",
  "rounded-sm",
  "bg-primary/15",
  "px-1",
  "transition-colors",
  "duration-500",
];

export const SETTINGS_SEARCH_CONTAINER_CLASSES = [
  "ring-2",
  "ring-primary/50",
  "ring-offset-4",
  "ring-offset-background",
  "transition-shadow",
  "duration-500",
];

type SettingsSearchCandidate = {
  element: HTMLElement;
  normalizedText: string;
  priority: number;
};

export type SettingsSearchTargets = {
  containers: HTMLElement[];
  scrollTarget: HTMLElement;
  textElements: HTMLElement[];
};

export const applySettingsSearchHighlight = (targets: SettingsSearchTargets) => {
  targets.textElements.forEach((element) => {
    element.dataset.settingsSearchMatch = "true";
    element.classList.add(...SETTINGS_SEARCH_TEXT_CLASSES);
  });

  targets.containers.forEach((container) => {
    container.dataset.settingsSearchFocus = "true";
    container.classList.add(...SETTINGS_SEARCH_CONTAINER_CLASSES);
  });
};

export const removeSettingsSearchHighlight = (targets: SettingsSearchTargets) => {
  targets.textElements.forEach((element) => {
    delete element.dataset.settingsSearchMatch;
    element.classList.remove(...SETTINGS_SEARCH_TEXT_CLASSES);
  });

  targets.containers.forEach((container) => {
    delete container.dataset.settingsSearchFocus;
    container.classList.remove(...SETTINGS_SEARCH_CONTAINER_CLASSES);
  });
};

export const removeSettingsSearchParamsFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete(SETTINGS_SEARCH_QUERY_PARAM);
  url.searchParams.delete(SETTINGS_SEARCH_ITEM_PARAM);

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
};

const IGNORED_TAGS = new Set(["OPTION", "NOSCRIPT", "PATH", "SCRIPT", "STYLE", "SVG"]);
const PRIORITY_TAGS = new Set(["H1", "H2", "H3", "H4", "LABEL", "LEGEND", "P"]);

const getSearchCandidates = (root: HTMLElement): SettingsSearchCandidate[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const candidates: SettingsSearchCandidate[] = [];
  const seenElements = new Set<HTMLElement>();

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const element = node.parentElement;
    const text = node.textContent?.trim() ?? "";

    if (
      !element ||
      !text ||
      seenElements.has(element) ||
      IGNORED_TAGS.has(element.tagName) ||
      element.closest("[hidden], [aria-hidden='true'], [data-settings-search-ignore], nav") ||
      element.getClientRects().length === 0
    ) {
      continue;
    }

    const normalizedText = normalizeSettingsSearchText(element.textContent ?? text);
    if (!normalizedText) {
      continue;
    }

    seenElements.add(element);
    candidates.push({
      element,
      normalizedText,
      priority: PRIORITY_TAGS.has(element.tagName) ? 0 : 1,
    });
  }

  return candidates;
};

const sortCandidates = (left: SettingsSearchCandidate, right: SettingsSearchCandidate): number => {
  return left.priority - right.priority || left.normalizedText.length - right.normalizedText.length;
};

const resolveContainers = (elements: HTMLElement[]): HTMLElement[] => {
  const containers = elements.map(
    (element) =>
      element.closest<HTMLElement>(
        "[data-settings-search-target], [data-slot='card'], section, fieldset",
      ) ?? element,
  );

  return [...new Set(containers)].slice(0, 3);
};

export const findSettingsSearchTargets = (
  root: HTMLElement,
  query: string,
): SettingsSearchTargets | null => {
  const normalizedQuery = normalizeSettingsSearchText(query);
  if (!normalizedQuery) {
    return null;
  }

  const candidates = getSearchCandidates(root);
  const fullQueryMatch = candidates
    .filter((candidate) => candidate.normalizedText.includes(normalizedQuery))
    .sort(sortCandidates)[0];

  const textElements = fullQueryMatch
    ? [fullQueryMatch.element]
    : normalizedQuery
        .split(/\s+/)
        .map(
          (token) =>
            candidates
              .filter((candidate) => candidate.normalizedText.includes(token))
              .sort(sortCandidates)[0]?.element,
        )
        .filter((element): element is HTMLElement => element !== undefined)
        .filter((element, index, elements) => elements.indexOf(element) === index)
        .slice(0, 4);

  if (textElements.length === 0) {
    return null;
  }

  const containers = resolveContainers(textElements);

  return {
    containers,
    scrollTarget: containers[0] ?? textElements[0],
    textElements,
  };
};

export const buildSettingsSearchHref = ({
  href,
  itemId,
  query,
}: {
  href: string;
  itemId: string;
  query: string;
}): string => {
  const url = new URL(href, "https://louez.local");
  url.searchParams.set(SETTINGS_SEARCH_QUERY_PARAM, query.trim().slice(0, 200));
  url.searchParams.set(SETTINGS_SEARCH_ITEM_PARAM, itemId);

  return `${url.pathname}${url.search}${url.hash}`;
};
