import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { SmartChatMessage } from "../components/SmartChatMessage";
import { EnhancedChatComposer } from "../components/EnhancedChatComposer";
import { CheckpointCard } from "../components/CheckpointCard";
import { EmptyState } from "../components/EmptyState";
import { ContextPanel } from "../components/ContextPanel";
import { ForkThreadDialog, type ForkType } from "../components/ForkThreadDialog";
import { ForkInfo } from "../components/ForkInfo";
import { UndoToastContainer } from "../components/UndoToast";
import { ScrollArea } from "../components/ui/scroll-area";
import { Spinner } from "../components/ui/spinner";
import type { Message } from "../types/chat";
import { useChat } from "../hooks/useChat";
import { useTaskOperations } from "../hooks/useTaskOperations";
import { useChatStore } from "../store/useChatStore";
import { useThreads } from "../hooks/useThreads";
import type { ParseResult } from "../lib/cli";

// Extended message type to include structured data
interface ExtendedMessage extends Message {
  structuredData?: {
    type: string;
    summary_type: string;
    count: number;
    tasks: Array<{
      id: string;
      icon: string;
      title: string;
      time: string;
      minutes?: number;
      highlight: boolean;
      warning?: string;
    }>;
    suggestions?: string[];
    decay_alerts?: string[];
  };
  responseType?: "text" | "structured_list" | "undoable_action";
  undoToken?: string;
}

export default function ThreadPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { sendMessage, fetchMessages } = useChat();
  const {
    completeTask,
    rescheduleTask,
    bulkReschedule,
    undoAction,
    undoToasts,
    dismissUndoToast,
  } = useTaskOperations();
  const messages = useChatStore((state) => state.messages);
  const isSending = useChatStore((state) => state.isSending);
  const contextItems = useChatStore((state) => state.contextItems);
  const addContextItem = useChatStore((state) => state.addContextItem);
  const removeContextItem = useChatStore((state) => state.removeContextItem);
  const threadContext = useChatStore((state) => state.threadContext);
  const setThreadContext = useChatStore((state) => state.setThreadContext);
  const replyTo = useChatStore((state) => state.replyTo);
  const setReplyTo = useChatStore((state) => state.setReplyTo);
  const { forkThread, createThread } = useThreads();

  // Check if this is a new thread (not yet created in backend)
  const isNewThread = !threadId || threadId === "new";

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
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Handle CLI command execution
  const handleCommand = useCallback(async (parsed: ParseResult) => {
    if (!parsed.type || !parsed.action) return;

    // Create a command execution message
    const commandMsg: ExtendedMessage = {
      id: `cmd-${Date.now()}`,
      role: "system",
      content: `Executing: ${parsed.raw}`,
      timestamp: new Date(),
    };
    useChatStore.getState().addMessage(commandMsg);

    try {
      let response: ExtendedMessage;

      switch (parsed.type) {
        case "task":
          response = await handleTaskCommand(parsed);
          break;
        case "reminder":
          response = await handleReminderCommand(parsed);
          break;
        case "event":
          response = await handleEventCommand(parsed);
          break;
        default:
          response = {
            id: `resp-${Date.now()}`,
            role: "assistant",
            content: `Unknown command type: ${parsed.type}`,
            timestamp: new Date(),
          };
      }

      useChatStore.getState().addMessage(response);
    } catch (error) {
      const errorMsg: ExtendedMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error executing command: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      useChatStore.getState().addMessage(errorMsg);
    }
  }, []);

  // Task command handler
  const handleTaskCommand = async (parsed: ParseResult): Promise<ExtendedMessage> => {
    const { action, args } = parsed;
    const title = args.title || args.t || "";

    switch (action) {
      case "create":
      case "add": {
        const payload = {
          title: title || "New task",
          description: args.description || "",
          scheduled_time: args.time || args.t,
          estimated_minutes: args.duration ? parseInt(args.duration) : undefined,
          priority: args.priority || args.p || "medium",
        };
        
        const res = await fetch("/api/tasks/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
        const created = await res.json();
        
        // Add to context
        addContextItem({
          id: String(created.id),
          type: "task",
          title: created.title,
          content: created.description || "",
          timestamp: new Date(created.created_at || Date.now()),
        });

        return {
          id: `task-created-${Date.now()}`,
          role: "assistant",
          content: `✅ Task created: "${created.title}"`,
          timestamp: new Date(),
          structuredData: {
            type: "task_list",
            summary_type: "created",
            count: 1,
            tasks: [{
              id: String(created.id),
              icon: "📋",
              title: created.title,
              time: created.scheduled_time || "No due date",
              minutes: created.estimated_minutes,
              highlight: created.priority === "high",
              warning: created.warning,
            }],
          },
          responseType: "structured_list",
        };
      }

      case "list": {
        const res = await fetch("/api/tasks/");
        if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
        const tasks = await res.json();
        
        return {
          id: `task-list-${Date.now()}`,
          role: "assistant",
          content: tasks.length > 0
            ? `Found ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`
            : "No tasks found",
          timestamp: new Date(),
          structuredData: {
            type: "task_list",
            summary_type: args.filter || "all",
            count: tasks.length,
            tasks: tasks.map((t: { id: string; title: string; scheduled_time?: string; estimated_minutes?: number; priority?: string; warning?: string }) => ({
              id: String(t.id),
              icon: "📋",
              title: t.title,
              time: t.scheduled_time || "No due date",
              minutes: t.estimated_minutes,
              highlight: t.priority === "high",
              warning: t.warning,
            })),
          },
          responseType: "structured_list",
        };
      }

      case "complete":
      case "done": {
        const taskId = args.id || "";
        if (!taskId) throw new Error("Task ID required");
        
        await completeTask(taskId, title || "Task");
        
        return {
          id: `task-complete-${Date.now()}`,
          role: "assistant",
          content: `✅ Task completed`,
          timestamp: new Date(),
        };
      }

      case "delete": {
        const taskId = args.id || "";
        if (!taskId) throw new Error("Task ID required");
        
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        });
        
        if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
        
        return {
          id: `task-delete-${Date.now()}`,
          role: "assistant",
          content: `🗑️ Task deleted`,
          timestamp: new Date(),
        };
      }

      default:
        return {
          id: `task-unknown-${Date.now()}`,
          role: "assistant",
          content: `Unknown task action: ${action}`,
          timestamp: new Date(),
        };
    }
  };

  // Reminder command handler
  const handleReminderCommand = async (parsed: ParseResult): Promise<ExtendedMessage> => {
    const { action, args } = parsed;
    const title = args.title || "";

    switch (action) {
      case "create":
      case "add": {
        const payload = {
          title: title || "New reminder",
          reminder_time: args.time || args.t,
          repeat_pattern: args.repeat || args.r || "none",
        };
        
        const res = await fetch("/api/reminders/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) throw new Error(`Failed to create reminder: ${res.status}`);
        const created = await res.json();

        return {
          id: `reminder-created-${Date.now()}`,
          role: "assistant",
          content: `🔔 Reminder set: "${created.title}" for ${created.reminder_time}`,
          timestamp: new Date(),
        };
      }

      case "list": {
        const res = await fetch("/api/reminders/");
        if (!res.ok) throw new Error(`Failed to fetch reminders: ${res.status}`);
        const reminders = await res.json();
        
        return {
          id: `reminder-list-${Date.now()}`,
          role: "assistant",
          content: reminders.length > 0
            ? `You have ${reminders.length} reminder${reminders.length !== 1 ? 's' : ''}`
            : "No reminders set",
          timestamp: new Date(),
        };
      }

      case "delete": {
        const reminderId = args.id || "";
        if (!reminderId) throw new Error("Reminder ID required");
        
        const res = await fetch(`/api/reminders/${reminderId}`, {
          method: "DELETE",
        });
        
        if (!res.ok) throw new Error(`Failed to delete reminder: ${res.status}`);
        
        return {
          id: `reminder-delete-${Date.now()}`,
          role: "assistant",
          content: `🗑️ Reminder deleted`,
          timestamp: new Date(),
        };
      }

      default:
        return {
          id: `reminder-unknown-${Date.now()}`,
          role: "assistant",
          content: `Unknown reminder action: ${action}`,
          timestamp: new Date(),
        };
    }
  };

  // Event command handler (placeholder)
  const handleEventCommand = async (parsed: ParseResult): Promise<ExtendedMessage> => {
    return {
      id: `event-${Date.now()}`,
      role: "assistant",
      content: `📅 Event commands coming soon!`,
      timestamp: new Date(),
    };
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;

    // Check if this is a CLI command
    if (inputValue.trim().startsWith("@")) {
      // Let the composer handle it via onCommand
      return;
    }

    const message = inputValue.trim();
    const parentMessageId = replyTo || undefined;
    
    // Clear input immediately for better UX
    setInputValue("");
    setReplyTo(null);

    // Create optimistic user message
    const tempUserMsgId = `temp-${Date.now()}`;
    const userMsg: ExtendedMessage = {
      id: tempUserMsgId,
      role: "user",
      content: message,
      timestamp: new Date(),
      parentId: parentMessageId,
    };

    // Add optimistic user message
    useChatStore.getState().addMessage(userMsg);

    try {
      const response = await sendMessage({
        message,
        contextId: isValidObjectId(currentThreadId) ? currentThreadId : undefined,
        parentMessageId,
      });

      // Create assistant message with structured data if present
      const assistantMsg: ExtendedMessage = {
        id: response.message_id,
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        parentId: tempUserMsgId,
        structuredData: response.structured_data,
        responseType: response.response_type as "text" | "structured_list" | "undoable_action",
        undoToken: response.undo_token,
      };

      // Fetch fresh messages from server to get correct IDs
      if (currentThreadId && isValidObjectId(currentThreadId)) {
        const fetchedMessages = await fetchMessages(currentThreadId);
        useChatStore.getState().setMessages(fetchedMessages);
      } else {
        // For new threads without context, update with response
        useChatStore.getState().addMessage(assistantMsg);
      }
    } catch (e) {
      console.error("Failed to send chat message", e);
      // Remove optimistic message on error
      useChatStore.setState((state) => ({
        messages: state.messages.filter(m => m.id !== tempUserMsgId)
      }));
      // Restore input value so user can retry
      setInputValue(message);
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

    // Check if already pinned by content to avoid duplicates
    if (contextItems.find((c) => c.content === msg.content && c.type === "pinned")) {
      console.log("Message already pinned");
      return;
    }

    (async () => {
      try {
        // Create a proper title from message content (truncated)
        const title = msg.content.length > 50 
          ? `Pinned: ${msg.content.slice(0, 50)}...` 
          : `Pinned: ${msg.content}`;
        
        // Add to local state immediately for better UX
        const tempId = `temp-pin-${Date.now()}`;
        const newCtx = {
          id: tempId,
          type: "pinned" as const,
          title: title,
          content: msg.content,
          timestamp: new Date(),
        };
        addContextItem(newCtx);
        
        // Note: In a full implementation, you would save pinned messages to a separate collection
        // For now, we store them in local state only
        console.log("Message pinned successfully");
      } catch (e) {
        console.error("Failed to pin message", e);
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
      // Remove from local state immediately
      removeContextItem(itemId);
      
      // If it's a temp item, no need to call backend
      if (itemId.startsWith('temp-')) {
        return;
      }
      
      // For persisted items, attempt to delete from backend
      const res = await fetch(`/api/contexts/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.warn(`Failed to remove context item from server: ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to remove context item:", e);
    }
  }, [removeContextItem]);

  useEffect(() => {
    // Use ref to track if we're already loading to prevent duplicate calls
    let isCancelled = false;
    
    const load = async () => {
      // Clear messages immediately when thread changes to show loading state
      useChatStore.getState().setMessages([]);
      setIsLoading(true);

      if (!threadId || !isValidObjectId(threadId)) {
        useChatStore.getState().setMessages([]);
        useChatStore.getState().setContextItems([]);
        setCurrentThreadId(undefined);
        setIsLoading(false);
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
        
        // Check if component unmounted or threadId changed during fetch
        if (isCancelled) return;
        
        useChatStore.getState().setMessages(fetchedMessages);
        setCurrentThreadId(threadId);
        
        try {
          const contextRes = await fetch(`/api/contexts/${threadId}`);
          if (isCancelled) return;
          
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
                if (isCancelled) return;
                
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
        if (isCancelled) return;
        console.error(e);
        useChatStore.getState().setMessages([]);
        setCurrentThreadId(undefined);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    
    load();
    
    // Cleanup function to cancel pending operations
    return () => {
      isCancelled = true;
    };
  }, [threadId, isValidObjectId, fetchMessages, location.state, hasProcessedInitial, setThreadContext]);

  // Listen for empty state action events
  useEffect(() => {
    const handleEmptyStateAction = (e: CustomEvent<string>) => {
      setInputValue(e.detail);
      // Auto-send after a short delay
      setTimeout(() => {
        handleSendMessage();
      }, 100);
    };

    window.addEventListener('emptyStateAction', handleEmptyStateAction as EventListener);
    return () => {
      window.removeEventListener('emptyStateAction', handleEmptyStateAction as EventListener);
    };
  }, [handleSendMessage]);

  const messageTree = useMemo(() => {
    if (messages.length === 0) return null;

    const getChildren = (parentId: string) =>
      messages
        .filter((m) => m.parentId === parentId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const renderNode = (message: ExtendedMessage): React.ReactNode => {
      const children = getChildren(message.id);
      return (
        <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {message.isCheckpoint ? (
            <CheckpointCard
              summary={message.summary || ""}
              onContinue={() => {}}
            />
          ) : (
            <SmartChatMessage
              id={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              structuredData={message.structuredData}
              responseType={message.responseType}
              undoToken={message.undoToken}
              onCompleteTask={completeTask}
              onRescheduleTask={rescheduleTask}
              onUndo={undoAction}
              onTaskClick={(task) => {
                // Could open task detail modal
                console.log("Task clicked:", task);
              }}
            />
          )}

          {children.length > 0 && (
            <div className="ml-3 sm:ml-6 pl-2 sm:pl-4 mt-3 space-y-3 sm:space-y-4 border-l-2 border-border">
              {children.map((c) => renderNode(c as ExtendedMessage))}
            </div>
          )}
        </div>
      );
    };

    const roots = messages
      .filter((m) => !m.parentId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return roots.map((r) => renderNode(r as ExtendedMessage));
  }, [messages, completeTask, rescheduleTask, undoAction]);

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
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Spinner className="h-8 w-8 mb-4" />
                <span className="text-sm">Loading conversation...</span>
              </div>
            ) : messages.length === 0 ? (
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

        <EnhancedChatComposer
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onCommand={handleCommand}
          disabled={isSending}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      {/* Context Panel - hidden on mobile, collapsible on desktop */}
      <ContextPanel
        contextItems={contextItems}
        isCollapsed={isContextPanelCollapsed}
        onToggle={() => setIsContextPanelCollapsed(!isContextPanelCollapsed)}
        onRemoveItem={handleRemoveContextItem}
      />

      {/* Undo Toast Container */}
      <UndoToastContainer
        toasts={undoToasts}
        onUndo={undoAction}
        onDismiss={dismissUndoToast}
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
