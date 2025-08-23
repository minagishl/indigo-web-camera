import { useState, useEffect } from "preact/hooks";
import type { Photo } from "../utils/indexedDB";

interface GalleryModalProps {
  photos: Photo[];
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function GalleryModal({
  photos,
  createObjectURL,
  revokeObjectURL,
  onClose,
  onDelete,
}: GalleryModalProps) {
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const urls = new Map<string, string>();

    photos.forEach((photo) => {
      urls.set(photo.id, createObjectURL(photo.blob));
    });

    setImageUrls(urls);

    return () => {
      urls.forEach((url) => revokeObjectURL(url));
    };
  }, [photos, createObjectURL, revokeObjectURL]);

  const handleDownload = (photo: Photo) => {
    const url = imageUrls.get(photo.id);
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    link.download = `${photo.label}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <h2 className="text-xl font-semibold">Gallery</h2>
        <button onClick={onClose} className="control-button">
          ✕
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {photos.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/60">
            <p>No photos yet. Take some photos to see them here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo) => {
              const imageUrl = imageUrls.get(photo.id);
              if (!imageUrl) return null;

              return (
                <div
                  key={photo.id}
                  className="rounded-lg overflow-hidden border border-white/20 bg-white/10"
                >
                  <img
                    src={imageUrl}
                    alt="captured"
                    className="w-full aspect-video object-cover"
                  />
                  <div className="p-2 text-xs flex items-center justify-between">
                    <span className="text-white/80 truncate flex-1 mr-2">
                      {photo.label}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(photo)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => onDelete(photo.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
