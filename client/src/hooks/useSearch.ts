import { useState, useCallback, useRef } from "react";
import axios from "axios";

export interface SearchResult {
  id: string;
  title?: string;
  content?: string;
  description?: string;
  role?: string;
  domain?: string;
  urgency?: string;
  completed?: boolean;
  due_date?: string;
  due_fuzzy?: string;
  tags?: string[];
  context_id?: string;
  parent_id?: string;
  parent_context_id?: string;
  fork_type?: string;
  summary?: string;
  score: number;
  match_type: "task" | "message" | "context";
  created_at: string;
  updated_at?: string;
}

export interface SearchResponse {
  tasks: SearchResult[];
  messages: SearchResult[];
  contexts: SearchResult[];
  total: number;
  query: string;
}

interface UseSearchReturn {
  results: SearchResponse | null;
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  suggestions: string[];
  fetchSuggestions: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Use ref to track abort controller for cancelling previous requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<SearchResponse>("/api/search/", {
        params: { q: query.trim() },
        signal: abortController.signal,
      });

      // Only update if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setResults(response.data);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        // Request was cancelled, ignore
        return;
      }

      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.detail || err.message
        : err instanceof Error
          ? err.message
          : "Search failed";

      setError(errorMessage);
      console.error("Search failed:", err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // Cancel previous suggestions request
    if (suggestionsAbortRef.current) {
      suggestionsAbortRef.current.abort();
    }

    const abortController = new AbortController();
    suggestionsAbortRef.current = abortController;

    try {
      const response = await axios.get<string[]>("/api/search/suggestions", {
        params: { q: query.trim() },
        signal: abortController.signal,
      });

      if (!abortController.signal.aborted) {
        setSuggestions(response.data);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        return;
      }
      console.error("Failed to fetch suggestions:", err);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setSuggestions([]);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    suggestions,
    fetchSuggestions,
    clearResults,
  };
}
