/** Supported message roles */
export type Role = "user" | "assistant" | "system";

/** A single chat message */
export interface Message {
  id: string;
  role: Role;
  content: string;
  tokenCount: number;
  timestamp: number;
}
