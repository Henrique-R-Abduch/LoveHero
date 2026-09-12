export const config = {
  port: Number(process.env.PORT ?? 8787),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",

  roomInactivityTtlMs: Number(process.env.ROOM_INACTIVITY_TTL_MS ?? 15 * 60 * 1000),
  roomMaxDurationMs: Number(process.env.ROOM_MAX_DURATION_MS ?? 60 * 60 * 1000),
  reconnectWindowMs: Number(process.env.RECONNECT_WINDOW_MS ?? 30 * 1000),

  syncTickHz: Number(process.env.SYNC_TICK_HZ ?? 30),

  chatTtlMs: Number(process.env.CHAT_TTL_MS ?? 60 * 60 * 1000),

  roomCreateRateLimitMax: Number(process.env.ROOM_CREATE_RATE_LIMIT_MAX ?? 5),
  roomCreateRateLimitWindowMs: Number(process.env.ROOM_CREATE_RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000),

  photoUploadUrlTtlSeconds: Number(process.env.PHOTO_UPLOAD_URL_TTL_SECONDS ?? 5 * 60),
  photoLifecycleTtlMs: Number(process.env.PHOTO_LIFECYCLE_TTL_MS ?? 10 * 60 * 1000),
  // Explicit kill switch, independent of whether a bucket happens to be
  // configured — lets ops disable photos outright (e.g. no bucket set up
  // for this deploy yet) without touching S3_* vars.
  enablePhotos: (process.env.ENABLE_PHOTOS ?? "true") !== "false",

  s3: {
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },

  moderationApiUrl: process.env.MODERATION_API_URL ?? "",
  moderationApiKey: process.env.MODERATION_API_KEY ?? "",

  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
