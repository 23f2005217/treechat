import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2, MessageSquare, CheckSquare, Folder, Calendar, Tag, GitFork } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { useSearch, type SearchResult } from "../hooks/useSearch";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { results, isLoading, error, search, suggestions, fetchSuggestions, clearResults } = useSearch();

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      search(debouncedQuery);
    } else {
      clearResults();
    }
  }, [debouncedQuery, search, clearResults]);

  // Fetch suggestions as user types
  useEffect(() => {
    if (query.trim().length >= 2) {
      fetchSuggestions(query);
    }
  }, [query, fetchSuggestions]);

  const handleClear = useCallback(() => {
    setQuery("");
    clearResults();
  }, [clearResults]);

  const handleResultClick = useCallback((result: SearchResult) => {
    switch (result.match_type) {
      case "context":
        navigate(`/thread/${result.id}`);
        break;
      case "message":
        if (result.context_id) {
          navigate(`/thread/${result.context_id}`);
        }
        break;
      case "task":
        // Could navigate to a task detail page or show a modal
        console.log("Task clicked:", result);
        break;
    }
  }, [navigate]);

  const getResultIcon = (result: SearchResult) => {
    switch (result.match_type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "task":
        return <CheckSquare className="h-4 w-4" />;
      case "context":
        return result.fork_type ? <GitFork className="h-4 w-4" /> : <Folder className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getResultColor = (result: SearchResult) => {
    switch (result.match_type) {
      case "message":
        return "bg-primary/10 text-primary";
      case "task":
        return result.completed 
          ? "bg-accent/10 text-accent-foreground"
          : "bg-secondary/10 text-secondary-foreground";
      case "context":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
    });
  };

  const highlightMatch = (text: string | undefined, query: string) => {
    if (!text || !query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto p-4 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground">
          Search across messages, threads, and tasks with fuzzy matching
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for messages, threads, tasks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 py-6 text-lg"
          autoFocus
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && query.trim().length >= 2 && !results && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setQuery(suggestion.replace("tag:", ""))}
              >
                {suggestion.startsWith("tag:") ? (
                  <>
                    <Tag className="h-3 w-3 mr-1" />
                    {suggestion.replace("tag:", "")}
                  </>
                ) : (
                  suggestion
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Searching...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => search(query)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Results */}
      {results && !isLoading && (
        <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-6 pb-6">
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Found {results.total} results</span>
              {results.tasks.length > 0 && (
                <Badge variant="secondary">{results.tasks.length} tasks</Badge>
              )}
              {results.messages.length > 0 && (
                <Badge variant="secondary">{results.messages.length} messages</Badge>
              )}
              {results.contexts.length > 0 && (
                <Badge variant="secondary">{results.contexts.length} threads</Badge>
              )}
            </div>

            {/* No Results */}
            {results.total === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">No results found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search terms
                </p>
              </div>
            )}

            {/* Tasks Section */}
            {results.tasks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Tasks
                </h2>
                <div className="grid gap-3">
                  {results.tasks.map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleResultClick(task)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getResultColor(task)}`}>
                            {getResultIcon(task)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {highlightMatch(task.title, results.query)}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {highlightMatch(task.description, results.query)}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {task.domain}
                              </Badge>
                              {task.urgency && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    task.urgency === "high" || task.urgency === "critical"
                                      ? "border-red-500 text-red-600"
                                      : ""
                                  }`}
                                >
                                  {task.urgency}
                                </Badge>
                              )}
                              {task.due_fuzzy && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {task.due_fuzzy}
                                </span>
                              )}
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {task.tags.slice(0, 3).map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px]">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">
                                Score: {task.score}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Messages Section */}
            {results.messages.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </h2>
                <div className="grid gap-3">
                  {results.messages.map((message) => (
                    <Card
                      key={message.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleResultClick(message)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getResultColor(message)}`}>
                            {getResultIcon(message)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {message.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-3">
                              {highlightMatch(message.content, results.query)}
                            </p>
                            <span className="text-xs text-muted-foreground mt-2 block">
                              Score: {message.score}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Contexts (Threads) Section */}
            {results.contexts.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Threads
                </h2>
                <div className="grid gap-3">
                  {results.contexts.map((context) => (
                    <Card
                      key={context.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleResultClick(context)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getResultColor(context)}`}>
                            {getResultIcon(context)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {highlightMatch(context.title, results.query)}
                            </h3>
                            {context.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {highlightMatch(context.description, results.query)}
                              </p>
                            )}
                            {context.summary && !context.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {highlightMatch(context.summary, results.query)}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {context.fork_type && (
                                <Badge variant="outline" className="text-xs">
                                  Fork: {context.fork_type}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Updated {formatDate(context.updated_at)}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                Score: {context.score}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
