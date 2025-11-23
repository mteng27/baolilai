
import React, { useState, useRef, useEffect } from 'react';
import { Photo } from '../types';
import { X, Globe, Minus, Plus, Navigation, MapPin, Wifi, Cloud } from 'lucide-react';

interface Props {
  photos: Photo[];
  onClose: () => void;
}

export const WorldMap: React.FC<Props> = ({ photos, onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  
  // Zoom & Pan State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // --- Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(1, transform.scale + delta), 12); 
    
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale + 1, 12) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale - 1, 1) }));
  const resetMap = () => setTransform({ x: 0, y: 0, scale: 1 });

  // Helper to map lat/lng to % positions for Equirectangular projection
  const getPos = (lat: number, lng: number) => {
    const x = (lng + 180) * (100 / 360);
    const y = (90 - lat) * (100 / 180);
    return { x, y };
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#001f3f] overflow-hidden flex flex-col font-sans">
      
      {/* --- Header / Overlay UI --- */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-50 pointer-events-none">
        {/* Title Card */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/60 flex items-center gap-4 shadow-2xl animate-in slide-in-from-top duration-500">
            <div className="bg-blue-500 text-white p-3 rounded-xl shadow-md">
               <Globe size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Global Gallery</h2>
              <div className="flex items-center gap-3">
                 <p className="text-sm text-gray-500 font-sans font-medium">
                  {photos.length} Moments Shared
                </p>
                <div className="h-3 w-[1px] bg-gray-300"></div>
                <div className="flex items-center gap-1 text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                   <Cloud size={10} />
                   <span>LIVE</span>
                </div>
              </div>
            </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 items-end pointer-events-auto">
           <button 
            onClick={onClose} 
            className="p-3 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-all border border-gray-200 shadow-lg hover:rotate-90"
          >
              <X size={24} />
          </button>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col text-gray-600 shadow-lg">
             <button onClick={zoomIn} className="p-3 hover:bg-gray-50 border-b border-gray-100">
                <Plus size={20} />
             </button>
             <button onClick={zoomOut} className="p-3 hover:bg-gray-50">
                <Minus size={20} />
             </button>
          </div>
          
          <button onClick={resetMap} className="p-3 bg-white text-blue-500 rounded-xl hover:bg-blue-50 transition-all border border-gray-200 shadow-lg">
             <Navigation size={20} />
          </button>
        </div>
      </div>

      {/* --- Interactive Map Container --- */}
      <div 
        ref={containerRef}
        className="w-full h-full cursor-move active:cursor-grabbing relative bg-[#000]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center transition-transform duration-75 ease-out origin-center"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
          }}
        >
           {/* THE MAP PLANE */}
           <div className="relative w-full min-w-[1000px] max-w-[2000px] aspect-[2/1]">
              
              {/* 1. SATELLITE MAP IMAGE BACKGROUND */}
              {/* Replacing SVG vector with a realistic image as requested */}
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Land_ocean_ice_2048.jpg/1024px-Land_ocean_ice_2048.jpg"
                alt="World Map"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none opacity-90"
                draggable={false}
              />

              {/* 2. TRAVEL LINES (White) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                 {photos.map((photo, i) => {
                   if (i === 0 || !photo.location || !photos[i-1].location) return null;
                   const curr = getPos(photo.location.lat, photo.location.lng);
                   const prev = getPos(photos[i-1].location!.lat, photos[i-1].location!.lng);
                   
                   return (
                     <line 
                       key={`line-${i}`}
                       x1={`${prev.x}%`} y1={`${prev.y}%`}
                       x2={`${curr.x}%`} y2={`${curr.y}%`}
                       stroke="rgba(255,255,255,0.3)" 
                       strokeWidth="1"
                       strokeDasharray="4 4"
                     />
                   )
                 })}
              </svg>

              {/* 3. POLAROID MARKERS (Thumbnails) */}
              <div className="absolute inset-0 pointer-events-auto">
                {photos.map((photo) => {
                  if (!photo.location || !photo.location.lat) return null;
                  const { x, y } = getPos(photo.location.lat, photo.location.lng);
                  const isHovered = hoveredId === photo.id;
                  const isSelected = selectedPhoto?.id === photo.id;
                  const rotation = photo.rotation || (Math.random() * 10 - 5);

                  return (
                    <div
                        key={photo.id}
                        className="absolute w-0 h-0 flex items-center justify-center transition-all duration-300 ease-out"
                        style={{ 
                          left: `${x}%`, 
                          top: `${y}%`, 
                          zIndex: isHovered || isSelected ? 100 : 10 
                        }}
                    >
                        {/* Interactive Container */}
                        <button 
                          className={`
                            relative group cursor-pointer transform transition-transform duration-300
                            ${isHovered || isSelected ? 'scale-150 z-50' : 'scale-75 hover:scale-110 hover:z-40'}
                          `}
                          onMouseEnter={() => setHoveredId(photo.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhoto(photo);
                          }}
                          style={{
                             transform: isHovered || isSelected ? 'scale(1.5) rotate(0deg)' : `scale(0.6) rotate(${rotation}deg)`
                          }}
                        >
                           {/* Mini Polaroid Graphic */}
                           <div className="bg-white p-1 pb-3 shadow-[0_4px_8px_rgba(0,0,0,0.5)] border border-gray-200 w-12 hover:shadow-xl">
                              <div className="aspect-square bg-gray-100 overflow-hidden border border-gray-100">
                                <img src={photo.dataUrl} className="w-full h-full object-cover" alt="Mini Snap" />
                              </div>
                              {/* Tiny text line */}
                              <div className="h-0.5 w-2/3 bg-gray-300 mt-1 mx-auto rounded-full"></div>
                           </div>

                           {/* Pin Head (Red Tack) */}
                           <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-sm border border-red-700 z-20"></div>
                        </button>
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </div>

      {/* --- Selected Photo Modal (Polaroid Style) --- */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200" 
          onClick={() => setSelectedPhoto(null)}
        >
            {/* Big Polaroid Card */}
            <div 
              className="relative bg-white p-4 pb-16 shadow-2xl max-w-sm w-full transform transition-transform cursor-default rotate-1 hover:rotate-0 duration-300" 
              onClick={e => e.stopPropagation()}
            >
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border border-red-600 z-20"></div>

                 <div className="aspect-square bg-gray-900 mb-4 overflow-hidden shadow-inner">
                    <img src={selectedPhoto.dataUrl} className="w-full h-full object-cover" alt="Memory" />
                 </div>
                 
                 <div className="text-center px-2">
                   <p className="font-handwriting text-3xl text-gray-800 leading-tight mb-3">{selectedPhoto.caption || "Untitled Memory"}</p>
                   
                   <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-sans">
                       <MapPin size={14} className="text-red-500" />
                       <span className="uppercase tracking-widest font-bold text-xs">{selectedPhoto.location?.city || "Unknown Location"}</span>
                   </div>
                 </div>

                 <button 
                   className="absolute top-2 right-2 text-gray-300 hover:text-gray-600 p-2 transition-colors"
                   onClick={() => setSelectedPhoto(null)}
                 >
                    <X size={24} />
                 </button>
            </div>
        </div>
      )}
    </div>
  );
};
