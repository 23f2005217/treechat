import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChatMessage } from "../components/ChatMessage";
import { ChatComposer } from "../components/ChatComposer";
import { CheckpointCard } from "../components/CheckpointCard";
import { EmptyState } from "../components/EmptyState";
import { ContextPanel } from "../components/ContextPanel";
import { ForkThreadDialog, type ForkType } from "../components/ForkThreadDialog";
import { ForkInfo } from "../components/ForkInfo";
import { ScrollArea } from "../components/ui/scroll-area";
import { Spinner } from "../components/ui/spinner";
import type { Message, ContextItem } from "../types/chat";
import { useChat } from "../hooks/useChat";
import { useChatStore } from "../store/useChatStore";
import { useThreads } from "../hooks/useThreads";

interface ThreadContext {
  title?: string;
  parentContextId?: string | null;
  parentTitle?: string | null;
  forkType?: string | null;
  forkedFromMessageId?: string | null;
}

export default function ThreadPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { sendMessage, fetchMessages, error } = useChat();
  const { messages, setMessages, isSending } = useChatStore();

  const isValidObjectId = (id: string | undefined) => {
    if (!id) return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(threadId);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isContextPanelCollapsed, setIsContextPanelCollapsed] = useState(false);
  const [hasProcessedInitial, setHasProcessedInitial] = useState(false);
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [forkFromMessageId, setForkFromMessageId] = useState<string | null>(null);
  const [threadContext, setThreadContext] = useState<ThreadContext>({
    title: undefined,
    parentContextId: null,
    parentTitle: null,
    forkType: null,
    forkedFromMessageId: null,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { forkThread } = useThreads();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const message = inputValue.trim();
    setInputValue("");
    setReplyTo(null);

    try {
      const response = await sendMessage({
        message,
        contextId: isValidObjectId(currentThreadId) ? currentThreadId : undefined,
        parentMessageId: replyTo || undefined,
      });

      // Refresh messages to get the latest from server
      if (currentThreadId && isValidObjectId(currentThreadId)) {
        const fetchedMessages = await fetchMessages(currentThreadId);
        setMessages(fetchedMessages);
      } else {
        // If no context, append the new messages locally
        const userMsg: Message = {
          id: Date.now().toString(),
          role: "user",
          content: message,
          timestamp: new Date(),
          parentId: replyTo || undefined,
        };
        const assistantMsg: Message = {
          id: response.message_id,
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
        };
        setMessages([...messages, userMsg, assistantMsg]);
      }
    } catch (e) {
      console.error("Failed to send chat message", e);
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

  const handleForkThread = (messageId?: string) => {
    setForkFromMessageId(messageId || null);
    setForkDialogOpen(true);
  };

  const handleForkConfirm = async (title: string, forkType: ForkType) => {
    if (!currentThreadId || !isValidObjectId(currentThreadId)) {
      console.error("Cannot fork: no valid thread ID");
      return;
    }

    try {
      const newThreadId = await forkThread(
        currentThreadId,
        title,
        forkType,
        forkFromMessageId || undefined
      );
      
      if (newThreadId) {
        navigate(`/thread/${newThreadId}`);
      }
    } catch (e) {
      console.error("Failed to fork thread:", e);
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

  const handleRemoveContextItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/contexts/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`remove context item failed: ${res.status}`);
      setContextItems((prev) => prev.filter(item => item.id !== itemId));
    } catch (e) {
      console.error("Failed to remove context item:", e);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!threadId || !isValidObjectId(threadId)) {
        setMessages([]);
        setCurrentThreadId(undefined);
        setThreadContext({
          title: undefined,
          parentContextId: null,
          parentTitle: null,
          forkType: null,
          forkedFromMessageId: null,
        });
        return;
      }

      try {
        const fetchedMessages = await fetchMessages(threadId);
        setMessages(fetchedMessages);
        setCurrentThreadId(threadId);
        
        // Load context information
        try {
          const contextRes = await fetch(`/api/contexts/${threadId}`);
          if (contextRes.ok) {
            const context = await contextRes.json();
            setThreadContext({
              title: context.title as string | undefined,
              parentContextId: context.parent_context_id as string | null | undefined,
              parentTitle: null,
              forkType: context.fork_type as string | null | undefined,
              forkedFromMessageId: context.forked_from_message_id as string | null | undefined,
            });

            // If this is a fork, fetch parent context to get parent title
            if (context.parent_context_id) {
              try {
                const parentRes = await fetch(`/api/contexts/${context.parent_context_id}`);
                if (parentRes.ok) {
                  const parentContext = await parentRes.json();
                  setThreadContext(prev => ({
                    ...prev,
                    parentTitle: parentContext.title as string | null,
                  }));
                }
              } catch (e) {
                console.error("Failed to load parent context:", e);
              }
            }
          }
        } catch (e) {
          console.error("Failed to load context info:", e);
        }
        
        // Load pinned context items for this thread
        try {
          const contextsRes = await fetch(`/api/contexts/`);
          if (contextsRes.ok) {
            const contexts = await contextsRes.json();
            // Filter for contexts with type "pinned" related to this thread
            const pinnedItems = contexts
              .filter((ctx: { type?: string; _id: string; title?: string; description?: string; summary?: string; created_at?: string | number }) => ctx.type === "pinned")
              .map((ctx: { _id: string; title?: string; description?: string; summary?: string; created_at?: string | number }) => ({
                id: String(ctx._id),
                type: "pinned" as const,
                title: ctx.title || "Pinned",
                content: ctx.description || ctx.summary || "",
                timestamp: new Date(ctx.created_at || Date.now()),
              }));
            setContextItems((prev) => {
              const existing = new Set(prev.map((item: ContextItem) => item.id));
              const newItems = pinnedItems.filter((item: ContextItem) => !existing.has(item.id));
              return [...newItems, ...prev];
            });
          }
        } catch (e) {
          console.error("Failed to load pinned context:", e);
        }
        
        const initialMessage = (location.state as { initialMessage?: string })?.initialMessage;
        if (initialMessage && !hasProcessedInitial && fetchedMessages.length === 0) {
          setHasProcessedInitial(true);
          setInputValue(initialMessage);
          window.history.replaceState({}, document.title);
        }
      } catch (e) {
        console.error(e);
        setMessages([]);
        setCurrentThreadId(undefined);
      }
    };
    load();
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full min-h-0">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 p-6">
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {/* Fork Info Banner */}
            {threadContext.forkType && threadContext.parentTitle && (
              <div className="mb-6">
                <ForkInfo
                  forkType={threadContext.forkType}
                  parentTitle={threadContext.parentTitle}
                  forkedFromMessageId={threadContext.forkedFromMessageId}
                />
              </div>
            )}
            
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
                    <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        <div className="ml-6 pl-4 mt-3 space-y-4 border-l-2 border-gray-200 dark:border-gray-700">
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
            {isSending && (
              <div className="flex items-center gap-3 py-4 text-muted-foreground">
                <Spinner />
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                <span className="font-medium">Error:</span> {error}
              </div>
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
          onForkThread={() => handleForkThread()}
        />
      </div>

        {/* Context Panel */}
       <ContextPanel
         contextItems={contextItems}
         isCollapsed={isContextPanelCollapsed}
         onToggle={() => setIsContextPanelCollapsed(!isContextPanelCollapsed)}
         onRemoveItem={handleRemoveContextItem}
       />

      {/* Fork Thread Dialog */}
      <ForkThreadDialog
        isOpen={forkDialogOpen}
        onClose={() => {
          setForkDialogOpen(false);
          setForkFromMessageId(null);
        }}
        onFork={handleForkConfirm}
        sourceThreadName={threadId ? `Thread ${threadId.slice(0, 8)}...` : "current thread"}
        fromMessage={!!forkFromMessageId}
      />
    </div>
  );
}
