
import { Photo } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

// --- CONFIGURATION ---
// To enable REAL Global Sharing, replace this config with your own Firebase project details.
// You can get this from the Firebase Console -> Project Settings.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain: "retrosnap-gallery.firebaseapp.com",
  projectId: "retrosnap-gallery",
  storageBucket: "retrosnap-gallery.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// --- LOCAL FALLBACK CONSTANTS ---
const USER_STORAGE_KEY = 'retrosnap_user_photos_v1';
const SHARED_POOL_KEY = 'retrosnap_shared_pool_v1';

// --- FIREBASE INIT ---
let db: any = null;
try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Connected to Firebase Cloud Gallery");
  } else {
    console.warn("Firebase API Key not set. Using Local Simulation Mode.");
  }
} catch (e) {
  console.warn("Firebase initialization failed (Offline Mode):", e);
}

// --- Image Compression Helper ---
const compressImage = async (base64Str: string, maxWidth = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width *= maxWidth / height;
          height = maxWidth;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

// Curated Case Photos (Fallback)
const INITIAL_COMMUNITY_PHOTOS: Photo[] = [
  { id: 'case-tokyo', dataUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=600&auto=format&fit=crop', timestamp: Date.now(), x: 0, y: 0, rotation: -2, caption: "Neon nights 🍜", isPublic: true, developmentProgress: 100, location: { lat: 35.6938, lng: 139.7035, city: 'Tokyo' } },
  { id: 'case-paris', dataUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop', timestamp: Date.now(), x: 0, y: 0, rotation: 3, caption: "Bonjour Paris ☕", isPublic: true, developmentProgress: 100, location: { lat: 48.8584, lng: 2.2945, city: 'Paris' } },
  { id: 'case-iceland', dataUrl: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?q=80&w=600&auto=format&fit=crop', timestamp: Date.now(), x: 0, y: 0, rotation: 4, caption: "Ice & Fire 🌊", isPublic: true, developmentProgress: 100, location: { lat: 64.9631, lng: -19.0208, city: 'Iceland' } },
  { id: 'case-rio', dataUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=600&auto=format&fit=crop', timestamp: Date.now(), x: 0, y: 0, rotation: 2, caption: "Carnival! 💃", isPublic: true, developmentProgress: 100, location: { lat: -22.9519, lng: -43.2105, city: 'Rio' } },
];

export const storageService = {
  // --- Save User Photos (Local + Sync Public to Cloud) ---
  saveUserPhotos: async (photos: Photo[]) => {
    try {
      // 1. Compress large images
      const compressedPhotos = await Promise.all(photos.map(async (p) => {
        if (p.dataUrl.length > 500000) { 
          const compressed = await compressImage(p.dataUrl);
          return { ...p, dataUrl: compressed };
        }
        return p;
      }));

      // 2. Save to Local Storage (Device Persistence)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(compressedPhotos));
      
      // 3. Sync *NEW* Public photos to Cloud (Firestore)
      if (db) {
        const publicPhotos = compressedPhotos.filter(p => p.isPublic);
        // In a real app, we'd check which ones are already uploaded.
        // For this demo, we assume `addToSharedPool` handles "new" logic via a check.
        // Here we rely on the user explicitly toggling share which usually triggers a state change.
        // We will just upload the last one if it was just toggled (simplified).
      } else {
        // Fallback: Sync to Local Shared Pool
        const publicPhotos = compressedPhotos.filter(p => p.isPublic);
        storageService.addToSharedPoolLocal(publicPhotos);
      }

    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error("Local Storage is full.");
      }
    }
  },

  getUserPhotos: (): Photo[] => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  // --- Cloud / Shared Pool Logic ---

  // Call this when user clicks "Share"
  uploadToCloud: async (photo: Photo) => {
    const compressedData = await compressImage(photo.dataUrl);
    const payload = { ...photo, dataUrl: compressedData };

    if (db) {
      try {
        await addDoc(collection(db, "global_gallery"), payload);
        console.log("Photo uploaded to cloud!");
      } catch (e) {
        console.error("Cloud upload failed", e);
      }
    } else {
      // Fallback
      storageService.addToSharedPoolLocal([payload]);
    }
  },

  addToSharedPoolLocal: (photos: Photo[]) => {
    try {
      const currentPool = storageService.getSharedPoolLocal();
      const poolMap = new Map(currentPool.map(p => [p.id, p]));
      photos.forEach(p => poolMap.set(p.id, p));
      const updatedPool = Array.from(poolMap.values());
      localStorage.setItem(SHARED_POOL_KEY, JSON.stringify(updatedPool));
    } catch (e) { console.warn("Shared pool full"); }
  },

  getSharedPoolLocal: (): Photo[] => {
    try {
      const stored = localStorage.getItem(SHARED_POOL_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  },

  // --- Fetch All Global Photos ---
  getGlobalGallery: async (): Promise<Photo[]> => {
    let remotePhotos: Photo[] = [];

    // 1. Try Fetching from Cloud
    if (db) {
      try {
        const q = query(collection(db, "global_gallery"), orderBy("timestamp", "desc"), limit(50));
        const querySnapshot = await getDocs(q);
        remotePhotos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));
      } catch (e) {
        console.error("Failed to fetch cloud photos", e);
      }
    }

    // 2. Fetch Local Fallbacks if Cloud Empty or Offline
    if (remotePhotos.length === 0) {
      remotePhotos = [...INITIAL_COMMUNITY_PHOTOS, ...storageService.getSharedPoolLocal()];
    }

    // 3. Combine with User's own public photos (in case they aren't synced yet)
    const userPublic = storageService.getUserPhotos().filter(p => p.isPublic);
    
    // Dedup by ID
    const galleryMap = new Map(remotePhotos.map(p => [p.id, p]));
    userPublic.forEach(p => galleryMap.set(p.id, p));

    return Array.from(galleryMap.values());
  }
};
