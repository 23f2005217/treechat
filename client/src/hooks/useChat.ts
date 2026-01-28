import { useState, useCallback } from "react";
import axios from "axios";
import { useChatStore } from "../store/useChatStore";
import type { Message } from "../types/chat";

interface SendMessageParams {
  message: string;
  contextId?: string;
  parentMessageId?: string;
  optimistic?: boolean; // Whether to add messages optimistically
}

interface ChatResponse {
  response: string;
  message_id: string;
  extracted_entities: any[];
  created_tasks: string[];
}

export function useChat() {
  const [error, setError] = useState<string | null>(null);
  
  const { setIsSending } = useChatStore();

  const sendMessage = useCallback(async (params: SendMessageParams): Promise<ChatResponse> => {
    setError(null);
    setIsSending(true);

    try {
      const response = await axios.post<ChatResponse>("/api/chat/", {
        message: params.message.trim(),
        context_id: params.contextId,
        parent_message_id: params.parentMessageId,
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = axios.isAxiosError(err) 
        ? err.response?.data?.detail || err.message 
        : err instanceof Error 
          ? err.message 
          : "Failed to send message";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [setIsSending]);

  const fetchMessages = useCallback(async (contextId: string): Promise<Message[]> => {
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
      const errorMessage = axios.isAxiosError(err) 
        ? err.response?.data?.detail || err.message 
        : err instanceof Error 
          ? err.message 
          : "Failed to fetch messages";
      setError(errorMessage);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return [];
      }
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const tagMessageAsTask = useCallback(async (messageId: string, tag: string): Promise<void> => {
    try {
      await axios.post(`/api/messages/${messageId}/tag`, {
        tag: tag,
      });
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.detail || err.message
        : err instanceof Error
          ? err.message
          : "Failed to tag message";
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    sendMessage,
    fetchMessages,
    tagMessageAsTask,
    error,
    clearError,
  };
}
