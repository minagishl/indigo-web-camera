import { useState, useEffect } from "preact/hooks";
import { X, Download, Trash2 } from "lucide-preact";
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
    <div className="absolute top-0 left-0 w-full h-full z-20">
      <div
        className="absolute top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-black/50 backdrop-blur rounded-3xl p-6 overflow-y-auto border border-white/30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Gallery</h2>
          <button
            onClick={onClose}
            className="size-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {photos.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/60">
              <p className="text-lg">
                No photos yet. Take some photos to see them here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => {
                const imageUrl = imageUrls.get(photo.id);
                if (!imageUrl) return null;

                return (
                  <div
                    key={photo.id}
                    className="group rounded-2xl overflow-hidden border border-white/20 bg-white/5 transition-colors duration-300"
                  >
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt="captured"
                        className="w-full aspect-video object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/90 truncate flex-1 mr-2 font-medium">
                          {photo.label}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(photo)}
                          className="flex-1 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs rounded-xl transition-colors flex items-center justify-center"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(photo.id)}
                          className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-xl transition-colors flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 size={14} />
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
    </div>
  );
}
