import { useEffect, useRef, useState } from "react";
import type { PhotoReadyMessage } from "@syncroom/shared";
import { confirmPhoto, requestPhotoUpload, uploadPhoto } from "../lib/api";

export function PhotoUpload({
  roomId,
  hostToken,
  incoming,
  onViewed,
}: {
  roomId: string;
  hostToken: string | undefined;
  incoming: PhotoReadyMessage | null;
  onViewed: (photoId: string) => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const viewedIdRef = useRef<string | null>(null);

  // Fetch the incoming photo as a blob, display it via an object URL, and
  // never touch localStorage/disk cache — this mirrors the spec's
  // burn-after-read handling on the client.
  useEffect(() => {
    if (!incoming) return;
    let cancelled = false;
    let url: string | null = null;

    fetch(incoming.downloadUrl)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => setError("Não foi possível carregar a foto."));

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [incoming]);

  const handleViewed = () => {
    if (!incoming || viewedIdRef.current === incoming.photoId) return;
    viewedIdRef.current = incoming.photoId;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    onViewed(incoming.photoId);
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    setError(null);
    try {
      const { photoId, uploadUrl } = await requestPhotoUpload(roomId, hostToken);
      await uploadPhoto(uploadUrl, file);
      await confirmPhoto(roomId, photoId, hostToken);
    } catch {
      setError("Envio de foto indisponível (armazenamento não configurado neste ambiente).");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360 }}>
      {incoming && objectUrl && (
        <div style={{ background: "#161320", borderRadius: 12, padding: 10 }}>
          <img src={objectUrl} alt="Foto recebida" style={{ width: "100%", borderRadius: 8, display: "block" }} />
          <button
            onClick={handleViewed}
            style={{ marginTop: 8, width: "100%", padding: "8px 0", borderRadius: 8, border: "none", background: "#c9a4ff", cursor: "pointer" }}
          >
            Fechar (a foto será apagada)
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleSelect} disabled={sending} style={{ fontSize: "0.8rem" }} />
      {error && <span style={{ color: "#ff9b9b", fontSize: "0.8rem" }}>{error}</span>}
    </div>
  );
}
