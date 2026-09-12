import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import cors from "@fastify/cors";
import { nanoid } from "nanoid";
import { config } from "./config.js";
import { registerRoomRoutes } from "./rooms/routes.js";
import { registerMediaRoutes } from "./media/routes.js";
import { photosEnabled } from "./media/uploadUrls.js";
import { joinRoom, handleClientMessage, handleDisconnect } from "./rooms/roomManager.js";

const app = Fastify({
  logger: {
    // Query strings carry hostToken/participantId — never let those reach
    // logs verbatim (Fastify's default req serializer logs the full URL).
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url.split("?")[0],
          hostname: request.hostname,
          remoteAddress: request.ip,
        };
      },
    },
  },
});

await app.register(cors, { origin: config.corsOrigin });
await app.register(websocketPlugin);

app.get("/health", async () => ({ ok: true }));
app.get("/config", async () => ({ photosEnabled: photosEnabled() }));

await registerRoomRoutes(app);
await registerMediaRoutes(app);

app.register(async (instance) => {
  instance.get<{
    Params: { roomId: string };
    Querystring: { hostToken?: string; participantId?: string };
  }>(
    "/rooms/:roomId/ws",
    { websocket: true },
    async (socket, request) => {
      const { roomId } = request.params;
      // A missing participantId (non-browser client) just gets a one-off id —
      // it will never collide with a real reconnect, so room_full still
      // applies normally for that connection.
      const participantId = request.query.participantId ?? nanoid();
      const result = await joinRoom(roomId, socket, request.query.hostToken, participantId);

      if (!result.ok) {
        socket.send(JSON.stringify({ type: result.reason }));
        socket.close();
        return;
      }

      const role = result.role;

      socket.on("message", (raw) => {
        void handleClientMessage(roomId, role, raw.toString());
      });

      socket.on("close", () => {
        handleDisconnect(roomId, role, socket);
      });
    },
  );
});

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
