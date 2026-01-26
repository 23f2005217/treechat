import { MessageSquare, Brain, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useNavigate } from "react-router-dom";
import { useSidebarStore } from "../store/useSidebarStore";
import { useNavigation } from "../hooks/useNavigation";
import { Spinner } from "./ui/spinner";
import { useState } from "react";

interface RecentChat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  icon: LucideIcon;
}

const mockRecentChats: RecentChat[] = [
  {
    id: "1",
    title: "College Planning",
    lastMessage: "What classes should I take next semester?",
    timestamp: "2 hours ago",
    icon: MessageSquare,
  },
  {
    id: "2",
    title: "AI Project Ideas",
    lastMessage: "I need help brainstorming features",
    timestamp: "Yesterday",
    icon: Sparkles,
  },
  {
    id: "3",
    title: "Household Tasks",
    lastMessage: "Added 3 new tasks for this week",
    timestamp: "3 days ago",
    icon: Zap,
  },
];

export function HomeContent() {
  const navigate = useNavigate();
  const { setCreateDialog } = useSidebarStore();
  const { navigateToThread } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleNewChat = () => {
    setCreateDialog({ isOpen: true, parentId: null, type: "thread" });
  };

  const handleStartProject = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate("/thread/new");
    }, 500);
  };

  const handleRecentChatClick = (chatId: string) => {
    navigateToThread(chatId);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Welcome to TreeChat
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered task and context management
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleNewChat}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                New Thread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Start a new conversation to organize your thoughts and ideas
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleStartProject}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <Sparkles className="h-5 w-5 text-purple-500" />
                )}
                Start Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create a new project workspace with AI assistance
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-green-500" />
                AI Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Explore AI-powered task extraction and organization
              </p>
            </CardContent>
          </Card>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockRecentChats.map((chat) => {
              const Icon = chat.icon || MessageSquare;
              return (
                <Card
                  key={chat.id}
                  className="hover:shadow-md hover:bg-accent/50 transition-all cursor-pointer"
                  onClick={() => handleRecentChatClick(chat.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {chat.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {chat.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground">{chat.timestamp}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleNewChat}>
              <MessageSquare className="h-4 w-4 mr-2" />
              New Thread
            </Button>
            <Button variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              View Tasks
            </Button>
            <Button variant="outline">
              <Brain className="h-4 w-4 mr-2" />
              Browse Projects
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
