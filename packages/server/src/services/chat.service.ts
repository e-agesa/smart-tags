import crypto from "crypto";
import { query, queryOne } from "../config/database";

export interface ChatRoom {
  id: string;
  tag_id: string;
  finder_token: string;
  is_active: boolean;
  created_at: Date;
  closed_at: Date | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_role: "finder" | "owner";
  body: string;
  read_at: Date | null;
  created_at: Date;
}

export async function createChatRoom(tagId: string): Promise<ChatRoom> {
  const finderToken = crypto.randomBytes(32).toString("hex");
  const rows = await query<ChatRoom>(
    `INSERT INTO chat_rooms (tag_id, finder_token)
     VALUES ($1, $2)
     RETURNING *`,
    [tagId, finderToken]
  );
  return rows[0];
}

export async function getChatRoomByToken(
  finderToken: string
): Promise<ChatRoom | null> {
  return queryOne<ChatRoom>(
    `SELECT * FROM chat_rooms WHERE finder_token = $1 AND is_active = TRUE`,
    [finderToken]
  );
}

export async function getChatRoomsForTag(tagId: string): Promise<ChatRoom[]> {
  return query<ChatRoom>(
    `SELECT * FROM chat_rooms WHERE tag_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC`,
    [tagId]
  );
}

export async function addMessage(
  roomId: string,
  senderRole: "finder" | "owner",
  body: string
): Promise<ChatMessage> {
  const rows = await query<ChatMessage>(
    `INSERT INTO chat_messages (room_id, sender_role, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [roomId, senderRole, body]
  );
  return rows[0];
}

export async function getMessages(
  roomId: string,
  limit = 50
): Promise<ChatMessage[]> {
  return query<ChatMessage>(
    `SELECT * FROM chat_messages WHERE room_id = $1
     ORDER BY created_at ASC LIMIT $2`,
    [roomId, limit]
  );
}

export async function closeChatRoom(roomId: string): Promise<void> {
  await query(
    `UPDATE chat_rooms SET is_active = FALSE, closed_at = NOW() WHERE id = $1`,
    [roomId]
  );
}
