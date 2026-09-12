import type { ChatMessage } from "@syncroom/shared";
import { redis } from "../redisClient.js";
import { config } from "../config.js";

export type RoomRecord = {
  roomId: string;
  hostToken: string;
  createdAt: number;
  hardExpiresAt: number; // fixed cap, independent of activity
};

const roomKey = (roomId: string) => `room:${roomId}`;
const chatKey = (roomId: string) => `room:${roomId}:chat`;
const rateKey = (ip: string) => `room:rate:${ip}`;

export async function saveRoom(record: RoomRecord): Promise<void> {
  const ttlSeconds = Math.ceil(config.roomInactivityTtlMs / 1000);
  await redis.set(roomKey(record.roomId), JSON.stringify(record), "EX", ttlSeconds);
}

export async function getRoom(roomId: string): Promise<RoomRecord | null> {
  const raw = await redis.get(roomKey(roomId));
  if (!raw) return null;
  return JSON.parse(raw) as RoomRecord;
}

export async function touchRoom(roomId: string): Promise<void> {
  const ttlSeconds = Math.ceil(config.roomInactivityTtlMs / 1000);
  await redis.expire(roomKey(roomId), ttlSeconds);
}

export async function deleteRoom(roomId: string): Promise<void> {
  await redis.del(roomKey(roomId), chatKey(roomId));
}

export async function appendChatMessage(roomId: string, message: ChatMessage): Promise<void> {
  const key = chatKey(roomId);
  const ttlSeconds = Math.ceil(config.chatTtlMs / 1000);
  await redis.rpush(key, JSON.stringify(message));
  await redis.expire(key, ttlSeconds);
}

export async function getChatHistory(roomId: string): Promise<ChatMessage[]> {
  const raw = await redis.lrange(chatKey(roomId), 0, -1);
  return raw.map((entry: string) => JSON.parse(entry) as ChatMessage);
}

/** Returns the request count for this IP within the current window (increments by 1). */
export async function incrementRoomCreateRate(ip: string): Promise<number> {
  const key = rateKey(ip);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.pexpire(key, config.roomCreateRateLimitWindowMs);
  }
  return count;
}
