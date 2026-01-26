import { create } from "zustand";
import type { Message } from "../types/chat";

interface ChatState {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  isSending: boolean;
  setIsSending: (sending: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  isSending: false,
  setIsSending: (sending) => set({ isSending: sending }),
}));
