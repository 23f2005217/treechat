import { create } from "zustand";
import type { Message, ContextItem } from "../types/chat";

interface ThreadContextInfo {
  title?: string;
  parentContextId?: string | null;
  parentTitle?: string | null;
  forkType?: string | null;
  forkedFromMessageId?: string | null;
}

interface ChatState {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  isSending: boolean;
  setIsSending: (sending: boolean) => void;
  
  contextItems: ContextItem[];
  setContextItems: (items: ContextItem[]) => void;
  addContextItem: (item: ContextItem) => void;
  removeContextItem: (itemId: string) => void;
  
  threadContext: ThreadContextInfo;
  setThreadContext: (context: ThreadContextInfo) => void;
  updateThreadContext: (updates: Partial<ThreadContextInfo>) => void;
  
  replyTo: string | null;
  setReplyTo: (messageId: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  isSending: false,
  setIsSending: (sending) => set({ isSending: sending }),
  
  contextItems: [],
  setContextItems: (items) => set({ contextItems: items }),
  addContextItem: (item) => set((state) => ({ contextItems: [item, ...state.contextItems] })),
  removeContextItem: (itemId) => set((state) => ({ 
    contextItems: state.contextItems.filter(item => item.id !== itemId) 
  })),
  
  threadContext: {
    title: undefined,
    parentContextId: null,
    parentTitle: null,
    forkType: null,
    forkedFromMessageId: null,
  },
  setThreadContext: (context) => set({ threadContext: context }),
  updateThreadContext: (updates) => set((state) => ({ 
    threadContext: { ...state.threadContext, ...updates } 
  })),
  
  replyTo: null,
  setReplyTo: (messageId) => set({ replyTo: messageId }),
}));
