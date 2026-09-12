import type { FastifyInstance } from "fastify";
import { createRoom } from "./roomManager.js";
import { checkRoomCreateRateLimit } from "../security/rateLimit.js";

export async function registerRoomRoutes(app: FastifyInstance): Promise<void> {
  app.post("/rooms", async (request, reply) => {
    const ip = request.ip;
    const allowed = await checkRoomCreateRateLimit(ip);
    if (!allowed) {
      return reply.code(429).send({ error: "rate_limited" });
    }

    const room = await createRoom();
    return room;
  });
}
