import MiniSearch, {
  type SearchResult as MiniSearchResult,
} from "minisearch";
import { type SkillGraph, type SkillNode } from "../graph/schema.js";
import { tokenize, unique } from "../shared/strings.js";

export const SEARCH_PROVIDER_NAMES = ["bm25", "lexical", "semantic", "hybrid"] as const;
export type SearchProviderName = (typeof SEARCH_PROVIDER_NAMES)[number];

export type SearchSkillsOptions = {
  limit?: number;
  provider?: SearchProviderName;
};

export type SearchResult = {
  node: SkillNode;
  score: number;
  reason: string;
  provider: SearchProviderName;
  matchedFields: string[];
  matchedTerms: string[];
  sourceProviders?: SearchProviderName[];
};

export type SearchProvider = {
  name: SearchProviderName;
  search(graph: SkillGraph, query: string, limit: number): SearchResult[];
};

export function searchSkills(
  graph: SkillGraph,
  query: string,
  options: number | SearchSkillsOptions = {},
): SearchResult[] {
  const normalized = normalizeSearchOptions(options);
  return providerFor(normalized.provider).search(
    graph,
    query,
    normalized.limit,
  );
}

function normalizeSearchOptions(
  options: number | SearchSkillsOptions,
): Required<SearchSkillsOptions> {
  if (typeof options === "number") {
    return {
      limit: options,
      provider: "bm25",
    };
  }

  return {
    limit: options.limit ?? 10,
    provider: options.provider ?? "bm25",
  };
}

function providerFor(provider: SearchProviderName): SearchProvider {
  if (provider === "lexical") {
    return lexicalSearchProvider;
  }
  if (provider === "semantic") {
    return semanticSearchProvider;
  }
  if (provider === "hybrid") {
    return hybridSearchProvider;
  }
  return bm25SearchProvider;
}

const lexicalSearchProvider: SearchProvider = {
  name: "lexical",
  search(graph, query, limit) {
    const queryTerms = tokenize(query);

    return graph.nodes
      .map((node) => scoreNodeLexically(node, queryTerms))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id))
      .slice(0, limit);
  },
};

const bm25SearchProvider: SearchProvider = {
  name: "bm25",
  search(graph, query, limit) {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) {
      return [];
    }

    const documents = graph.nodes.map(nodeToSearchDocument);
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const index = new MiniSearch<SearchDocument>({
      idField: "id",
      fields: [...SEARCH_FIELDS],
      storeFields: ["id"],
      tokenize: (text) => tokenize(text),
    });

    index.addAll(documents);

    return index
      .search(query, {
        boost: {
          id: 6,
          name: 6,
          title: 5,
          tags: 4,
          capabilities: 3,
          description: 1.5,
          source: 0.25,
        },
        combineWith: "OR",
        prefix: (term) => term.length > 3,
      })
      .map((result) => resultToBm25SearchResult(result, nodeById))
      .filter((result): result is SearchResult => Boolean(result))
      .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id))
      .slice(0, limit);
  },
};

const semanticSearchProvider: SearchProvider = {
  name: "semantic",
  search() {
    throw new Error(
      "Semantic search requires a saved embedding index. Run `skillgraph embeddings index` first.",
    );
  },
};

const hybridSearchProvider: SearchProvider = {
  name: "hybrid",
  search(graph, query, limit) {
    const windowSize = Math.max(limit, 20);
    const sources = [
      bm25SearchProvider.search(graph, query, windowSize),
      lexicalSearchProvider.search(graph, query, windowSize),
    ];
    return fuseSearchResults(sources, limit);
  },
};

export function fuseSearchResults(
  sources: SearchResult[][],
  limit: number,
): SearchResult[] {
  const fused = new Map<string, SearchResult & {
    sourceProviders: SearchProviderName[];
  }>();

  for (const results of sources) {
    results.forEach((result, index) => {
      const existing = fused.get(result.node.id);
      const rankScore = 100 / (60 + index + 1);
      if (!existing) {
        fused.set(result.node.id, {
          ...result,
          score: rankScore,
          provider: "hybrid",
          reason: "",
          sourceProviders: [result.provider],
        });
        return;
      }

      existing.score += rankScore;
      existing.matchedFields = unique([
        ...existing.matchedFields,
        ...result.matchedFields,
      ]).sort();
      existing.matchedTerms = unique([
        ...existing.matchedTerms,
        ...result.matchedTerms,
      ]).sort();
      existing.sourceProviders = unique([
        ...existing.sourceProviders,
        result.provider,
      ]) as SearchProviderName[];
    });
  }

  return [...fused.values()]
    .map((result) => ({
      ...result,
      sourceProviders: sortSourceProviders(result.sourceProviders),
      reason: `Hybrid reciprocal rank fusion from ${sortSourceProviders(result.sourceProviders).join(", ")} matched ${result.matchedFields.join(", ")} for ${result.matchedTerms.join(", ")}`,
    }))
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id))
    .slice(0, limit);
}

function scoreNodeLexically(node: SkillNode, queryTerms: string[]): SearchResult {
  const fields = {
    id: tokenize(node.id),
    name: tokenize(node.name),
    title: tokenize(node.title ?? ""),
    description: tokenize(node.description),
    tags: node.tags.flatMap(tokenize),
    capabilities: node.capabilities.flatMap(tokenize),
  };
  const matched = new Set<string>();
  const matchedFields = new Set<string>();
  let score = 0;

  for (const term of queryTerms) {
    if (matches(fields.id, term) || matches(fields.name, term)) {
      score += 8;
      matched.add(term);
      matchedFields.add("name");
    }
    if (matches(fields.title, term)) {
      score += 6;
      matched.add(term);
      matchedFields.add("title");
    }
    if (matches(fields.tags, term)) {
      score += 5;
      matched.add(term);
      matchedFields.add("tags");
    }
    if (matches(fields.capabilities, term)) {
      score += 4;
      matched.add(term);
      matchedFields.add("capabilities");
    }
    if (matches(fields.description, term)) {
      score += 2;
      matched.add(term);
      matchedFields.add("description");
    }
  }

  if (matched.size > 0 && node.status.installed) {
    score += 1;
  }

  return {
    node,
    score,
    reason:
      matched.size > 0
        ? `Lexical match on ${[...matchedFields].sort().join(", ")} for ${[...matched].sort().join(", ")}`
        : "No lexical match",
    provider: "lexical",
    matchedFields: [...matchedFields].sort(),
    matchedTerms: [...matched].sort(),
  };
}

function matches(values: string[], term: string): boolean {
  return values.some((value) => value === term || value.includes(term));
}

const SEARCH_FIELDS = [
  "id",
  "name",
  "title",
  "description",
  "tags",
  "capabilities",
  "source",
] as const;

type SearchField = (typeof SEARCH_FIELDS)[number];

type SearchDocument = Record<SearchField, string> & {
  id: string;
};

function nodeToSearchDocument(node: SkillNode): SearchDocument {
  return {
    id: node.id,
    name: node.name,
    title: node.title ?? "",
    description: node.description,
    tags: node.tags.join(" "),
    capabilities: node.capabilities.join(" "),
    source: [
      node.kind,
      node.source.type,
      node.source.repository,
      node.source.url,
      node.source.path,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function resultToBm25SearchResult(
  result: MiniSearchResult,
  nodeById: Map<string, SkillNode>,
): SearchResult | undefined {
  const node = nodeById.get(String(result.id));
  if (!node) {
    return undefined;
  }

  const matchedFields = unique(Object.values(result.match).flat()).sort();
  const matchedTerms = [...result.queryTerms].sort();
  const installedBonus = node.status.installed ? 0.1 : 0;

  return {
    node,
    score: result.score + installedBonus,
    reason: `BM25 matched ${matchedFields.join(", ")} for ${matchedTerms.join(", ")}`,
    provider: "bm25",
    matchedFields,
    matchedTerms,
  };
}

function sortSourceProviders(providers: SearchProviderName[]): SearchProviderName[] {
  const order = new Map<SearchProviderName, number>([
    ["bm25", 0],
    ["lexical", 1],
    ["semantic", 2],
    ["hybrid", 3],
  ]);
  return [...providers].sort(
    (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99),
  );
}
