import React, { useState, useEffect } from "react";
import axios from "axios";
import { Send, Plus, ChevronRight, ChevronDown, MessageSquare, CheckSquare, Settings as SettingsIcon, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  content: string;
  role: string;
  parent_id?: string;
  children_ids: string[];
  created_at: string;
}

const HomePage = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await axios.get("/api/messages/");
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post("/api/chat/", { message: input });
      setInput("");
      fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(m => !m.parent_id).map((msg) => (
          <ChatMessage key={msg.id} message={msg} allMessages={messages} />
        ))}
      </div>
      
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your task or message..."
            className="flex-1 bg-background border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button onClick={handleSend} disabled={loading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ChatMessage = ({ message, allMessages }: { message: Message; allMessages: Message[] }) => {
  const [expanded, setExpanded] = useState(true);
  const children = allMessages.filter(m => m.parent_id === message.id);

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(
        "p-3 rounded-lg max-w-[80%]",
        message.role === "user" ? "bg-primary text-primary-foreground self-end" : "bg-muted self-start"
      )}>
        <div className="flex items-center gap-2 mb-1">
          {children.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="hover:bg-black/10 rounded">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <span className="text-xs opacity-70 uppercase tracking-wider font-bold">{message.role}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      
      {expanded && children.length > 0 && (
        <div className="ml-6 border-l-2 border-muted-foreground/20 pl-4 space-y-4 mt-2">
          {children.map(child => (
            <ChatMessage key={child.id} message={child} allMessages={allMessages} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
