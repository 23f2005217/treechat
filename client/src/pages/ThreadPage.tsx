import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChatMessage } from "../components/ChatMessage";
import { ChatComposer } from "../components/ChatComposer";
import { CheckpointCard } from "../components/CheckpointCard";
import { EmptyState } from "../components/EmptyState";
import { ContextPanel } from "../components/ContextPanel";
import { ScrollArea } from "../components/ui/scroll-area";
import { mockThread, mockContext } from "../data/mockData";
import type { Message, Thread, ContextItem } from "../types/chat";

export default function ThreadPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();

  // messages are stored as a flat list but may reference parentId to form a tree
  const [messages, setMessages] = useState<Message[]>(mockThread.messages);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(mockThread.id);
  const [contextItems, setContextItems] = useState<ContextItem[]>(mockContext);
  const [inputValue, setInputValue] = useState("");
  // replyTo stores the message id we're replying to (for threaded replies)
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isContextPanelCollapsed, setIsContextPanelCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    setInputValue("");

    // If viewing the mock thread (local), keep previous simulated behavior
    if (!currentThreadId || currentThreadId === mockThread.id) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: inputValue.trim(),
        parentId: replyTo || undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setReplyTo(null);

      // Simulate assistant response after delay
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I've processed your message and updated the context. What would you like to do next?",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsSending(false);
      }, 600);

      return;
    }

    // For server-backed threads, send through the chat endpoint so server creates user+assistant messages
    try {
      const payload = {
        message: inputValue.trim(),
        context_id: currentThreadId,
        parent_message_id: replyTo || undefined,
      };

      const res = await fetch(`/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`chat API error: ${res.status}`);
      }

      // Refresh messages for the context
      const messagesRes = await fetch(`/api/contexts/${currentThreadId}/messages`);
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        const converted: Message[] = data.map((m: any) => ({
          id: String(m.id),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
          parentId: m.parent_id || undefined,
          isCheckpoint: !!m.is_checkpoint,
          summary: m.summary,
        }));
        setMessages(converted);
      }

      setReplyTo(null);
    } catch (e) {
      console.error("Failed to send chat message", e);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Would use toast here: toast.success("Copied to clipboard");
  };

  const handleReply = (messageId: string) => {
    setReplyTo(messageId);
    // focus composer input - not wired to DOM node, user can type
  };

  const handlePinMessage = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    // avoid dupes
    if (contextItems.find((c) => c.content === msg.content && c.type === "pinned")) return;

    // persist pinned context on server as a Context entry
    (async () => {
      try {
        const payload = { title: `Pinned: ${msg.role}`, description: msg.content };
        const res = await fetch(`/api/contexts/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`pin failed: ${res.status}`);
        const created = await res.json();
        const newCtx: ContextItem = {
          id: String(created.id),
          type: "pinned",
          title: created.title,
          content: msg.content,
          timestamp: new Date(created.created_at || Date.now()),
        };
        setContextItems((prev) => [newCtx, ...prev]);
      } catch (e) {
        console.error("Failed to pin message to server", e);
      }
    })();
  };

  const handleForkThread = async (messageId: string) => {
    // create a new server-backed context and copy the subtree of messages into it
    const getSubtree = (rootId: string) => {
      const map: Record<string, Message[]> = {};
      messages.forEach((m) => {
        const pid = m.parentId || "root";
        if (!map[pid]) map[pid] = [];
        map[pid].push(m);
      });

      const collected: Message[] = [];
      const walk = (id: string) => {
        const node = messages.find((m) => m.id === id);
        if (!node) return;
        collected.push(node);
        const children = map[id] || [];
        children.forEach((c) => walk(c.id));
      };
      walk(rootId);
      return collected;
    };

    const subtree = getSubtree(messageId);
    if (subtree.length === 0) return;

    try {
      // prepare messages for bulk import
      const messagesPayload = subtree.map((m) => ({
        old_id: m.id,
        content: m.content,
        role: m.role,
        parent_old_id: m.parentId ?? null,
      }));

      const payload = { title: `Fork from ${messageId}`, messages: messagesPayload };
      const res = await fetch(`/api/contexts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`import failed: ${res.status}`);
      const data = await res.json();
      const newContextId = String(data.context_id || data.id || "");
      if (!newContextId) throw new Error("missing context id from import response");
      navigate(`/thread/${newContextId}`);
    } catch (e) {
      console.error("Failed to fork thread to server", e);
    }
  };

  const handleCreateTask = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    try {
      const payload = { title: msg.content.slice(0, 120) || "New task", description: msg.content };
      const res = await fetch(`/api/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`create task failed: ${res.status}`);
      const created = await res.json();
      const newCtx: ContextItem = {
        id: String(created.id),
        type: "task",
        title: created.title,
        content: created.description || msg.content,
        timestamp: new Date(created.created_at || Date.now()),
      };
      setContextItems((prev) => [newCtx, ...prev]);
    } catch (e) {
      console.error("Failed to create task on server", e);
    }
  };

  // load thread from server if threadId provided
  useEffect(() => {
    const load = async () => {
      if (!threadId) {
        setMessages(mockThread.messages);
        setCurrentThreadId(mockThread.id);
        return;
      }

      try {
        const res = await fetch(`/api/contexts/${threadId}/messages`);
        if (!res.ok) {
          // fallback to mockThread
          setMessages(mockThread.messages);
          setCurrentThreadId(mockThread.id);
          return;
        }

        const data = await res.json();
        // server messages use created_at and roles; convert to local Message shape
        const converted: Message[] = data.map((m: any) => ({
          id: String(m.id),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
          parentId: m.parent_id || undefined,
          isCheckpoint: !!m.is_checkpoint,
          summary: m.summary,
        }));

        setMessages(converted);
        setCurrentThreadId(threadId);
      } catch (e) {
        console.error(e);
        setMessages(mockThread.messages);
        setCurrentThreadId(mockThread.id);
      }
    };
    load();
  }, [threadId]);

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6 pb-4">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              // Render messages as a tree. Find root messages (no parentId) and recursively render replies
              (() => {
                const getChildren = (parentId: string) =>
                  messages
                    .filter((m) => m.parentId === parentId)
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                const renderNode = (message: Message) => {
                  const children = getChildren(message.id);
                  return (
                    <div key={message.id}>
                      {message.isCheckpoint ? (
                        <CheckpointCard
                          summary={message.summary || ""}
                          onContinue={() => {
                            // Handle continue from checkpoint
                          }}
                        />
                      ) : (
                        <ChatMessage
                          {...message}
                          onCopy={handleCopyMessage}
                          onPin={(messageId) => {
                            handlePinMessage(messageId);
                            console.log("pin", messageId);
                          }}
                          onFork={(messageId) => {
                            handleForkThread(messageId);
                            console.log("fork", messageId);
                          }}
                          onCreateTask={(messageId) => {
                            handleCreateTask(messageId);
                            console.log("create task", messageId);
                          }}
                          onReply={handleReply}
                        />
                      )}

                      {children.length > 0 && (
                        <div className="ml-6 border-l-2 border-muted-foreground/20 pl-4 mt-2 space-y-4">
                          {children.map((c) => renderNode(c))}
                        </div>
                      )}
                    </div>
                  );
                };

                const roots = messages
                  .filter((m) => !m.parentId)
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                return roots.map((r) => renderNode(r));
              })()
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Composer */}
        <ChatComposer
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={isSending}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

        {/* Context Panel */}
       <ContextPanel
         contextItems={contextItems}
         isCollapsed={isContextPanelCollapsed}
         onToggle={() => setIsContextPanelCollapsed(!isContextPanelCollapsed)}
       />
    </div>
  );
}
