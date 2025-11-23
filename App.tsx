
import React, { useState, useCallback, useEffect } from 'react';
import { CameraSection } from './components/CameraSection';
import { WallSection } from './components/WallSection';
import { WorldMap } from './components/WorldMap';
import { Photo } from './types';
import { generatePhotoCaption, editPhotoStyle } from './services/geminiService';
import { storageService } from './services/storageService';
import { Map, Loader2 } from 'lucide-react';

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [view, setView] = useState<'studio' | 'map'>('studio');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, city?: string} | undefined>(undefined);
  const [globalPhotos, setGlobalPhotos] = useState<Photo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showToast, setShowToast] = useState<{msg: string, action?: () => void} | null>(null);

  // 1. Load Photos on Startup
  useEffect(() => {
    const stored = storageService.getUserPhotos();
    if (stored) {
      setPhotos(stored);
    }
    setIsLoaded(true);

    // Fetch location
    const initLocation = async () => {
       try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setUserLocation({ lat: data.latitude, lng: data.longitude, city: data.city });
        }
      } catch (e) {
        if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition((pos) => {
             setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, city: "Unknown Location" });
           });
        }
      }
    };
    initLocation();
  }, []);

  // 2. Auto-Save whenever photos change
  useEffect(() => {
    if (isLoaded) {
      storageService.saveUserPhotos(photos);
    }
  }, [photos, isLoaded]);

  // 3. Load Global Gallery when opening map
  useEffect(() => {
    if (view === 'map') {
      const loadGlobal = async () => {
        const gallery = await storageService.getGlobalGallery();
        setGlobalPhotos(gallery);
      };
      loadGlobal();
    }
  }, [view]);


  const handleCapture = useCallback(async (dataUrl: string) => {
    const id = crypto.randomUUID();
    const randomRotation = (Math.random() * 10) - 5; 
    const isMobile = window.innerWidth < 768;
    
    const startX = isMobile ? (window.innerWidth / 2) - 120 : 40; 
    const startY = isMobile ? 20 : window.innerHeight - 400;

    const newPhoto: Photo = {
      id,
      dataUrl,
      timestamp: Date.now(),
      x: startX, 
      y: startY, 
      rotation: randomRotation,
      caption: '', 
      isGeneratingCaption: true,
      isPublic: false, 
      location: userLocation, 
      developmentProgress: 0
    };

    setPhotos(prev => [...prev, newPhoto]);

    try {
      const caption = await generatePhotoCaption(dataUrl);
      setPhotos(prev => prev.map(p => 
        p.id === id ? { ...p, caption, isGeneratingCaption: false } : p
      ));
    } catch (e) {
      setPhotos(prev => prev.map(p => 
        p.id === id ? { ...p, isGeneratingCaption: false } : p
      ));
    }
  }, [userLocation]);

  const updatePhotoPosition = useCallback((id: string, x: number, y: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  }, []);

  const updatePhotoProgress = useCallback((id: string, progress: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, developmentProgress: progress } : p));
  }, []);

  const deletePhoto = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleEditPhoto = useCallback(async (id: string, prompt: string) => {
    setPhotos(prev => prev.map(p => 
      p.id === id ? { ...p, isGeneratingCaption: true } : p 
    ));

    const photo = photos.find(p => p.id === id);
    if (photo) {
      const newImageData = await editPhotoStyle(photo.dataUrl, prompt);
      setPhotos(prev => prev.map(p => 
        p.id === id ? { 
          ...p, 
          dataUrl: newImageData || p.dataUrl, 
          isGeneratingCaption: false 
        } : p
      ));
    }
  }, [photos]);

  const handleToggleShare = useCallback((id: string) => {
    setPhotos(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          const isNowPublic = !p.isPublic;
          
          // Ensure location exists if sharing
          let updatedLoc = p.location;
          if (isNowPublic && (!p.location || !p.location.lat)) {
             updatedLoc = {
                lat: 35.6762 + (Math.random() - 0.5), 
                lng: 139.6503 + (Math.random() - 0.5),
                city: "Unknown"
             };
          }

          if (isNowPublic) {
            setShowToast({ 
              msg: "📍 Pinned to Global Gallery", 
              action: () => setView('map') 
            });
            setTimeout(() => setShowToast(null), 4000);
            
            // Trigger Cloud Sync
            const photoToUpload = { ...p, isPublic: true, location: updatedLoc };
            storageService.uploadToCloud(photoToUpload);
          }

          return { ...p, isPublic: isNowPublic, location: updatedLoc };
        }
        return p;
      });
      return updated;
    });
  }, []);


  if (!isLoaded) return <div className="flex items-center justify-center h-screen bg-retro-bg"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-retro-bg select-none font-sans fixed inset-0">
      
      {/* View Switcher */}
      <div className="absolute top-4 right-4 z-50">
         <button 
           onClick={() => setView('map')}
           className="bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors border border-gray-200"
         >
           <Map size={18} />
           <span className="hidden md:inline">Global Gallery</span>
         </button>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="absolute top-20 right-4 z-[60] animate-in slide-in-from-right duration-300">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3">
            <span>{showToast.msg}</span>
            {showToast.action && (
              <button 
                onClick={showToast.action}
                className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded hover:bg-yellow-400"
              >
                VIEW
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Views */}
      {view === 'studio' ? (
        <>
          <CameraSection onCapture={handleCapture} />
          <WallSection 
            photos={photos} 
            onUpdatePhotoPosition={updatePhotoPosition}
            onUpdatePhotoProgress={updatePhotoProgress}
            onDeletePhoto={deletePhoto}
            onGenerateCaption={() => {}}
            onEditPhoto={handleEditPhoto}
            onToggleShare={handleToggleShare}
          />
        </>
      ) : (
        <WorldMap photos={globalPhotos} onClose={() => setView('studio')} />
      )}

    </div>
  );
}

export default App;