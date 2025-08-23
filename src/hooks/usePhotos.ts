import { useState, useEffect, useCallback } from "preact/hooks";
import { photoDB, type Photo } from "../utils/indexedDB";

export const usePhotos = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await photoDB.init();
      const allPhotos = await photoDB.getAllPhotos();
      setPhotos(allPhotos);
    } catch (err) {
      console.error("Failed to load photos:", err);
      setError("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, []);

  const addPhoto = useCallback((photo: Photo) => {
    setPhotos((prev) => [photo, ...prev]);
  }, []);

  const deletePhoto = useCallback(async (id: string) => {
    try {
      await photoDB.deletePhoto(id);
      setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    } catch (err) {
      console.error("Failed to delete photo:", err);
      setError("Failed to delete photo");
    }
  }, []);

  const getLatestPhoto = useCallback((): Photo | null => {
    return photos.length > 0 ? photos[0] : null;
  }, [photos]);

  const createObjectURL = useCallback((blob: Blob): string => {
    return URL.createObjectURL(blob);
  }, []);

  const revokeObjectURL = useCallback((url: string) => {
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  return {
    photos,
    loading,
    error,
    addPhoto,
    deletePhoto,
    getLatestPhoto,
    createObjectURL,
    revokeObjectURL,
    reload: loadPhotos,
  };
};
