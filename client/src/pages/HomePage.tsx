import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, MessageSquare, Folder, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { useThreads } from "../hooks/useThreads";

const HomePage = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { createThread } = useThreads();

  const handleQuickStart = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const threadId = await createThread(input.trim().slice(0, 50) || "New Thread");
      if (threadId) {
        navigate(`/thread/${threadId}`, { state: { initialMessage: input.trim() } });
      }
    } catch (error) {
      console.error("Error creating thread:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewThread = async () => {
    setLoading(true);
    try {
      const threadId = await createThread("New Thread");
      if (threadId) {
        navigate(`/thread/${threadId}`);
      }
    } catch (error) {
      console.error("Error creating thread:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Welcome to TreeChat</h1>
            <p className="text-lg text-muted-foreground">
              Your AI-powered task management assistant with branching conversations
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickStart()}
                placeholder="Start a new conversation..."
                className="flex-1 bg-background border rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <Button onClick={handleQuickStart} disabled={loading || !input.trim()} size="lg">
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleNewThread} disabled={loading} className="gap-2">
                <MessageSquare className="w-4 h-4" />
                New Thread
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Branching Conversations"
              description="Fork conversations at any point to explore different directions"
            />
            <FeatureCard
              icon={<Folder className="w-6 h-6" />}
              title="Organized Threads"
              description="Keep your conversations organized in folders"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI-Powered"
              description="Get intelligent responses and task extraction"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-primary">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default HomePage;
