import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import type { PhotoRequestUploadResponse } from "@syncroom/shared";
import { config } from "../config.js";
import { resolveRole, otherRole, roomExists, getRuntimeForBroadcast } from "../rooms/roomManager.js";
import { createUploadUrl, createDownloadUrl, objectKeyFor, photosEnabled } from "./uploadUrls.js";
import { moderatePhoto } from "./moderation.js";

export async function registerMediaRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { roomId: string }; Body: { hostToken?: string } }>(
    "/rooms/:roomId/photos",
    async (request, reply) => {
      const { roomId } = request.params;
      if (!(await roomExists(roomId))) {
        return reply.code(404).send({ error: "room_not_found" });
      }
      if (!photosEnabled()) {
        return reply.code(503).send({ error: "photos_disabled" });
      }

      const role = resolveRole(roomId, request.body?.hostToken);
      if (!role) return reply.code(404).send({ error: "room_not_found" });

      const photoId = nanoid(16);
      const uploadUrl = await createUploadUrl(objectKeyFor(roomId, photoId));
      const response: PhotoRequestUploadResponse = {
        photoId,
        uploadUrl,
        expiresAt: Date.now() + config.photoUploadUrlTtlSeconds * 1000,
      };
      return response;
    },
  );

  app.post<{ Params: { roomId: string; photoId: string }; Body: { hostToken?: string } }>(
    "/rooms/:roomId/photos/:photoId/confirm",
    async (request, reply) => {
      const { roomId, photoId } = request.params;
      if (!photosEnabled()) {
        return reply.code(503).send({ error: "photos_disabled" });
      }

      const role = resolveRole(roomId, request.body?.hostToken);
      if (!role) return reply.code(404).send({ error: "room_not_found" });

      const objectKey = objectKeyFor(roomId, photoId);
      const moderation = await moderatePhoto(objectKey);
      if (!moderation.approved) {
        return reply.code(422).send({ error: "moderation_rejected", reason: moderation.reason });
      }

      const downloadUrl = await createDownloadUrl(objectKey);
      const runtime = getRuntimeForBroadcast(roomId);
      runtime?.sendToRole(otherRole(role), {
        type: "photo_ready",
        photoId,
        from: role,
        downloadUrl,
        t: Date.now(),
      });

      return { ok: true };
    },
  );
}
