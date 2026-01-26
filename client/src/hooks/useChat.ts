import { useState } from "react";
import axios from "axios";
import { useChatStore } from "../store/useChatStore";
import type { Message } from "../types/chat";

interface SendMessageParams {
  message: string;
  contextId?: string;
  parentMessageId?: string;
}

interface ChatResponse {
  response: string;
  message_id: string;
  extracted_entities: any[];
  created_tasks: string[];
}

export function useChat() {
  const [error, setError] = useState<string | null>(null);
  
  const { addMessage, setIsSending } = useChatStore();

  const sendMessage = async (params: SendMessageParams) => {
    setError(null);
    setIsSending(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: params.message.trim(),
      parentId: params.parentMessageId,
      timestamp: new Date(),
    };

    addMessage(userMessage);

    try {
      const response = await axios.post<ChatResponse>("/api/chat/", {
        message: params.message.trim(),
        context_id: params.contextId,
        parent_message_id: params.parentMessageId,
      });

      const assistantMessage: Message = {
        id: response.data.message_id,
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
        parentId: userMessage.id,
      };

      addMessage(assistantMessage);
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const fetchMessages = async (contextId: string): Promise<Message[]> => {
    try {
      const response = await axios.get(`/api/contexts/${contextId}/messages`);
      return response.data.map((m: any) => ({
        id: String(m._id),
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
        parentId: m.parent_id || undefined,
        isCheckpoint: !!m.is_checkpoint,
        summary: m.summary,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch messages";
      setError(errorMessage);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return [];
      }
      throw err;
    }
  };

  return {
    sendMessage,
    fetchMessages,
    error,
  };
}
