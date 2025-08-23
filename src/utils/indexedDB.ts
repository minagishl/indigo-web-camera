const DB_NAME = "indigo-web-camera";
const DB_VERSION = 1;
const STORE_NAME = "photos";

export interface Photo {
  id: string;
  blob: Blob;
  timestamp: number;
  label: string;
}

export class PhotoDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async savePhoto(blob: Blob, label: string): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    const id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const photo: Photo = {
      id,
      blob,
      timestamp: Date.now(),
      label,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(photo);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPhotos(): Promise<Photo[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      const request = index.getAll();

      request.onsuccess = () => {
        const photos = request.result as Photo[];
        resolve(photos.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getLatestPhoto(): Promise<Photo | null> {
    const photos = await this.getAllPhotos();
    return photos.length > 0 ? photos[0] : null;
  }

  async deletePhoto(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const photoDB = new PhotoDB();
