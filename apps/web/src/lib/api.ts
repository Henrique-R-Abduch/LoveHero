import type { CreateRoomResponse, PhotoRequestUploadResponse } from "@syncroom/shared";
import { API_BASE_URL } from "./config";

export async function createRoom(): Promise<CreateRoomResponse> {
  const res = await fetch(`${API_BASE_URL}/rooms`, { method: "POST" });
  if (!res.ok) throw new Error(`create room failed: ${res.status}`);
  return res.json();
}

export async function getConfig(): Promise<{ photosEnabled: boolean }> {
  const res = await fetch(`${API_BASE_URL}/config`);
  if (!res.ok) throw new Error(`fetch config failed: ${res.status}`);
  return res.json();
}

export async function requestPhotoUpload(
  roomId: string,
  hostToken: string | undefined,
): Promise<PhotoRequestUploadResponse> {
  const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostToken }),
  });
  if (!res.ok) throw new Error(`request upload url failed: ${res.status}`);
  return res.json();
}

export async function uploadPhoto(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
}

export async function confirmPhoto(
  roomId: string,
  photoId: string,
  hostToken: string | undefined,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/photos/${photoId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostToken }),
  });
  if (!res.ok) throw new Error(`confirm photo failed: ${res.status}`);
}
