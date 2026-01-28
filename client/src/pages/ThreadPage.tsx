import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import type { Message } from "../types/chat";
import { useChat } from "../hooks/useChat";
import { useChatStore } from "../store/useChatStore";
import { useThreads } from "../hooks/useThreads";

export default function ThreadPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { sendMessage, fetchMessages } = useChat();
  const messages = useChatStore((state) => state.messages);
  const isSending = useChatStore((state) => state.isSending);
  const contextItems = useChatStore((state) => state.contextItems);
  const addContextItem = useChatStore((state) => state.addContextItem);
  const removeContextItem = useChatStore((state) => state.removeContextItem);
  const threadContext = useChatStore((state) => state.threadContext);
  const setThreadContext = useChatStore((state) => state.setThreadContext);
  const replyTo = useChatStore((state) => state.replyTo);
  const setReplyTo = useChatStore((state) => state.setReplyTo);
  const { forkThread } = useThreads();

  const isValidObjectId = useCallback((id: string | undefined) => {
    if (!id) return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
  }, []);

  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(threadId);
  const [inputValue, setInputValue] = useState("");
  const [isContextPanelCollapsed, setIsContextPanelCollapsed] = useState(false);
  const [hasProcessedInitial, setHasProcessedInitial] = useState(false);
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [forkFromMessageId, setForkFromMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialLoad = useRef(false);
  const prevThreadIdRef = useRef<string | undefined>(undefined);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0 && prevThreadIdRef.current === threadId) {
      scrollToBottom();
    }
    prevThreadIdRef.current = threadId;
  }, [messages.length, threadId, scrollToBottom]);

  const handleSendMessage = useCallback(async () => {
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

      if (currentThreadId && isValidObjectId(currentThreadId)) {
        const fetchedMessages = await fetchMessages(currentThreadId);
        useChatStore.getState().setMessages(fetchedMessages);
      } else {
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
        useChatStore.setState((state) => ({
          messages: [...state.messages, userMsg, assistantMsg]
        }));
      }
    } catch (e) {
      console.error("Failed to send chat message", e);
    }
  }, [inputValue, isSending, currentThreadId, replyTo, sendMessage, isValidObjectId, fetchMessages, setReplyTo]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleReply = useCallback((messageId: string) => {
    setReplyTo(messageId);
  }, [setReplyTo]);

  const handlePinMessage = useCallback((messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    if (contextItems.find((c) => c.content === msg.content && c.type === "pinned")) return;

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
        const newCtx = {
          id: String(created.id),
          type: "pinned" as const,
          title: created.title,
          content: msg.content,
          timestamp: new Date(created.created_at || Date.now()),
        };
        addContextItem(newCtx);
      } catch (e) {
        console.error("Failed to pin message to server", e);
      }
    })();
  }, [messages, contextItems, addContextItem]);

  const handleForkThread = useCallback((messageId?: string) => {
    setForkFromMessageId(messageId || null);
    setForkDialogOpen(true);
  }, []);

  const handleForkConfirm = useCallback(async (title: string, forkType: ForkType) => {
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
  }, [currentThreadId, forkFromMessageId, forkThread, isValidObjectId, navigate]);

  const handleCreateTask = useCallback(async (messageId: string) => {
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
      const newCtx = {
        id: String(created.id),
        type: "task" as const,
        title: created.title,
        content: created.description || msg.content,
        timestamp: new Date(created.created_at || Date.now()),
      };
      addContextItem(newCtx);
    } catch (e) {
      console.error("Failed to create task on server", e);
    }
  }, [messages, addContextItem]);

  const handleRemoveContextItem = useCallback(async (itemId: string) => {
    try {
      const res = await fetch(`/api/contexts/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`remove context item failed: ${res.status}`);
      removeContextItem(itemId);
    } catch (e) {
      console.error("Failed to remove context item:", e);
    }
  }, [removeContextItem]);

  useEffect(() => {
    const load = async () => {
      if (!threadId || !isValidObjectId(threadId)) {
        useChatStore.getState().setMessages([]);
        useChatStore.getState().setContextItems([]);
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
        useChatStore.getState().setMessages(fetchedMessages);
        setCurrentThreadId(threadId);
        
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

            if (context.parent_context_id) {
              try {
                const parentRes = await fetch(`/api/contexts/${context.parent_context_id}`);
                if (parentRes.ok) {
                  const parentContext = await parentRes.json();
                  useChatStore.getState().updateThreadContext({
                    parentTitle: parentContext.title as string | null,
                  });
                }
              } catch (e) {
                console.error("Failed to load parent context:", e);
              }
            }
          }
        } catch (e) {
          console.error("Failed to load context info:", e);
        }
        
        const initialMessage = (location.state as { initialMessage?: string })?.initialMessage;
        if (initialMessage && !hasProcessedInitial && fetchedMessages.length === 0) {
          setHasProcessedInitial(true);
          setInputValue(initialMessage);
          window.history.replaceState({}, document.title);
        }
      } catch (e) {
        console.error(e);
        useChatStore.getState().setMessages([]);
        setCurrentThreadId(undefined);
      }
    };
    
    if (!hasInitialLoad.current || prevThreadIdRef.current !== threadId) {
      load();
      hasInitialLoad.current = true;
      prevThreadIdRef.current = threadId;
    }
  }, [threadId, isValidObjectId, fetchMessages, location.state, hasProcessedInitial, setThreadContext]);

  const messageTree = useMemo(() => {
    if (messages.length === 0) return null;

    const getChildren = (parentId: string) =>
      messages
        .filter((m) => m.parentId === parentId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const renderNode = (message: Message): React.ReactNode => {
      const children = getChildren(message.id);
      return (
        <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {message.isCheckpoint ? (
            <CheckpointCard
              summary={message.summary || ""}
              onContinue={() => {}}
            />
          ) : (
            <ChatMessage
              {...message}
              onCopy={handleCopyMessage}
              onPin={handlePinMessage}
              onFork={handleForkThread}
              onCreateTask={handleCreateTask}
              onReply={handleReply}
            />
          )}

          {children.length > 0 && (
            <div className="ml-3 sm:ml-6 pl-2 sm:pl-4 mt-3 space-y-3 sm:space-y-4 border-l-2 border-gray-200 dark:border-gray-700">
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
  }, [messages, handleCopyMessage, handlePinMessage, handleForkThread, handleCreateTask, handleReply]);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      <div className="flex-1 flex flex-col min-h-0 lg:min-h-auto">
        <ScrollArea className="flex-1 min-h-0 p-3 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-4 px-0 sm:px-0">
            {threadContext.forkType && threadContext.parentTitle && (
              <div className="mb-4 sm:mb-6">
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
              messageTree
            )}
            {isSending && (
              <div className="flex items-center gap-3 py-4 text-muted-foreground">
                <Spinner />
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

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

      {/* Context Panel - hidden on mobile, collapsible on desktop */}
      <ContextPanel
        contextItems={contextItems}
        isCollapsed={isContextPanelCollapsed}
        onToggle={() => setIsContextPanelCollapsed(!isContextPanelCollapsed)}
        onRemoveItem={handleRemoveContextItem}
      />

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
