import { config } from "../config.js";
import { incrementRoomCreateRate } from "../rooms/roomStore.js";

/** Returns true if the request is allowed, false if the IP is over the room-creation quota. */
export async function checkRoomCreateRateLimit(ip: string): Promise<boolean> {
  const count = await incrementRoomCreateRate(ip);
  return count <= config.roomCreateRateLimitMax;
}
