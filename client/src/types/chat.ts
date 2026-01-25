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
