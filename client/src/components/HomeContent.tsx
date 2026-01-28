import { MessageSquare, Brain, Sparkles, Zap, FolderPlus, GitFork, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useNavigate } from "react-router-dom";
import { useSidebarStore } from "../store/useSidebarStore";
import { useNavigation } from "../hooks/useNavigation";
import { useMemo } from "react";

export function HomeContent() {
  const navigate = useNavigate();
  const { setCreateDialog } = useSidebarStore();
  const { navigateToThread, getRecentThreads } = useNavigation();

  // Get actual recent threads from the sidebar store
  const recentThreads = useMemo(() => getRecentThreads(6), [getRecentThreads]);

  const handleNewChat = () => {
    setCreateDialog({ isOpen: true, parentId: null, type: "thread" });
  };

  const handleNewFolder = () => {
    setCreateDialog({ isOpen: true, parentId: null, type: "folder" });
  };

  const handleRecentChatClick = (threadId: string) => {
    navigateToThread(threadId);
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number | undefined): string => {
    if (!timestamp) return "Unknown";
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to TreeChat
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            AI-powered conversation threads with branching and context management
          </p>
        </header>

        {/* Quick Action Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
          <Card 
            className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group" 
            onClick={handleNewChat}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageSquare className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                New Thread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Start a new conversation to organize your thoughts and ideas
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group" 
            onClick={handleNewFolder}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FolderPlus className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                New Folder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create a folder to organize related threads together
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group sm:col-span-2 lg:col-span-1"
            onClick={() => navigate("/search")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Brain className="h-5 w-5 text-secondary-foreground group-hover:scale-110 transition-transform" />
                Search & Explore
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Search through your conversations and discover insights
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Threads Section */}
        <section className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Threads
            </h2>
          </div>
          
          {recentThreads.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {recentThreads.map((thread) => (
                <Card
                  key={thread.id}
                  className="hover:shadow-md hover:bg-accent/50 transition-all cursor-pointer group"
                  onClick={() => handleRecentChatClick(thread.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      {thread.parentContextId ? (
                        <GitFork className="h-4 w-4 text-accent flex-shrink-0" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate">{thread.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(thread.updatedAt)}
                      </p>
                      {thread.parentTitle && (
                        <span className="text-xs text-accent truncate max-w-[120px]">
                          Fork of {thread.parentTitle}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No threads yet</p>
                <Button onClick={handleNewChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Create your first thread
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Features Section */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Features</h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <GitFork className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium mb-1">Thread Forking</h3>
                <p className="text-sm text-muted-foreground">
                  Branch conversations at any point to explore different directions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium mb-1">AI Task Extraction</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically extract tasks and action items from conversations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <Brain className="h-5 w-5 text-secondary-foreground mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium mb-1">Context Management</h3>
                <p className="text-sm text-muted-foreground">
                  Pin important messages and maintain context across conversations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <Zap className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium mb-1">Smart Organization</h3>
                <p className="text-sm text-muted-foreground">
                  Organize threads into folders and find what you need quickly
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
