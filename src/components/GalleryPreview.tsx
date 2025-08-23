import { useState, useEffect } from "preact/hooks";
import type { Photo } from "../utils/indexedDB";

interface GalleryPreviewProps {
  photo: Photo;
  createObjectURL: (blob: Blob) => string;
  onClick: () => void;
}

export function GalleryPreview({
  photo,
  createObjectURL,
  onClick,
}: GalleryPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = createObjectURL(photo.blob);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo, createObjectURL]);

  if (!imageUrl) return null;

  return (
    <div className="gallery-preview" onClick={onClick}>
      <img
        src={imageUrl}
        alt="Last photo"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
