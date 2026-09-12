import { config } from "../config.js";

export type ModerationResult = { approved: boolean; reason?: string };

/**
 * Content moderation gate for photos before they're relayed to the recipient.
 * MVP ships a stub (approves everything) so the burn-after-read flow is fully
 * testable end to end without a moderation vendor account. Swap the body for
 * a real call (AWS Rekognition / Hive / Sightengine) before shipping —
 * `MODERATION_API_URL`/`MODERATION_API_KEY` are already threaded through config.
 */
export async function moderatePhoto(_objectKey: string): Promise<ModerationResult> {
  if (!config.moderationApiUrl) {
    return { approved: true, reason: "stub: no moderation provider configured" };
  }

  // Real integration point: fetch the object (or hand the provider a signed
  // GET URL), POST to config.moderationApiUrl with config.moderationApiKey,
  // and map the provider's nudity/CSAM signal to { approved }.
  return { approved: true, reason: "stub: provider wiring not implemented" };
}
