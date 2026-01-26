export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isCheckpoint?: boolean;
  summary?: string;
  // parentId allows messages to form a tree (replies)
  parentId?: string;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
}

export interface ContextItem {
  id: string;
  type: "pinned" | "checkpoint" | "task";
  title: string;
  content: string;
  timestamp: Date;
}

export interface ThreadInfo {
  id: string;
  title: string;
  parentContextId?: string | null;
  parentTitle?: string | null;
  forkType?: string | null;
  forkedFromMessageId?: string | null;
  createdAt: number;
  updatedAt: number;
  children?: ThreadInfo[];
}
