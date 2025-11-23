
import React, { useState, useEffect, useRef } from 'react';
import { Photo } from '../types';
import { X, Sparkles, Loader2, Edit2, Download, Globe } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Props {
  photo: Photo;
  onMove: (id: string, x: number, y: number) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
  onGenerateCaption: (id: string) => void;
  onEditPhoto: (id: string, prompt: string) => void;
  onToggleShare: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const DraggablePolaroid: React.FC<Props> = ({ 
  photo, 
  onMove, 
  onUpdateProgress,
  onDelete, 
  onGenerateCaption,
  onEditPhoto,
  onToggleShare,
  containerRef 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Development Logic - Initialize from prop
  const [developmentProgress, setDevelopmentProgress] = useState(photo.developmentProgress || 0);
  const progressRef = useRef(developmentProgress);
  const lastPos = useRef({ x: 0, y: 0 });
  
  // Edit Mode Logic
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  // Keep ref updated for cleanup
  useEffect(() => {
    progressRef.current = developmentProgress;
  }, [developmentProgress]);

  // Auto-develop over time
  useEffect(() => {
    const timer = setInterval(() => {
      setDevelopmentProgress(prev => Math.min(prev + 0.5, 100));
    }, 100);
    
    return () => {
      clearInterval(timer);
      // Save progress to parent state when component unmounts (e.g., switching views)
      onUpdateProgress(photo.id, progressRef.current);
    };
  }, [photo.id, onUpdateProgress]);

  // --- Unified Drag Handler Logic ---
  const handleStart = (clientX: number, clientY: number) => {
    if (isEditing) return;
    
    if (elementRef.current && containerRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
      setIsDragging(true);
      lastPos.current = { x: clientX, y: clientY };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; 
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newX = clientX - containerRect.left - dragOffset.x;
      let newY = clientY - containerRect.top - dragOffset.y;

      onMove(photo.id, newX, newY);

      // Shake Detection Logic
      const dx = Math.abs(clientX - lastPos.current.x);
      const dy = Math.abs(clientY - lastPos.current.y);
      const speed = dx + dy;

      // If shaking fast, boost development
      if (speed > 15 && developmentProgress < 100) {
        setDevelopmentProgress(prev => Math.min(prev + 2, 100));
      }

      lastPos.current = { x: clientX, y: clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault(); // Prevent selection
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault(); // Prevent scrolling while dragging
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      // Add passive: false to allow calling preventDefault
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset, onMove, photo.id, containerRef, developmentProgress]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPrompt.trim()) {
      onEditPhoto(photo.id, editPrompt);
      setIsEditing(false);
      setEditPrompt('');
    }
  };

  const handleDownload = async () => {
    if (!elementRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(elementRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: null,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `polaroid-${photo.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDownload();
  };

  // Calculate filters based on development progress
  const brightness = 0.1 + (developmentProgress / 100) * 0.9;
  const contrast = 1.2 - (developmentProgress / 100) * 0.2;
  const grayscale = 1 - (developmentProgress / 100);

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleDownload();
      }}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        left: `${photo.x}px`,
        top: `${photo.y}px`,
        transform: `rotate(${photo.rotation}deg) scale(${isDragging ? 1.05 : 1})`,
        zIndex: isDragging || isEditing ? 50 : 10,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'transform 0.2s ease-out, box-shadow 0.2s',
        touchAction: 'none',
      }}
      className={`
        group
        bg-white p-3 pb-12 
        shadow-polaroid hover:shadow-polaroid-hover
        w-60 select-none
        transition-all duration-300
      `}
      title="Double-click or Right-click to download"
    >
      {/* Pin Graphic */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm z-20 border border-red-700 opacity-90"></div>
      
      {/* Public/Shared Indicator */}
      {photo.isPublic && (
        <div className="absolute -top-2 -right-2 z-30 bg-blue-500 text-white p-1 rounded-full shadow-md border-2 border-white" title="Shared to World">
          <Globe size={12} />
        </div>
      )}

      {/* Location Tag (Small) */}
      {photo.location?.city && (
         <div className="absolute top-2 right-2 z-30 bg-black/10 px-1.5 py-0.5 rounded text-[10px] font-sans text-gray-500">
            {photo.location.city}
         </div>
      )}

      {/* Image Area */}
      <div className="aspect-square bg-[#0a0a0a] overflow-hidden mb-3 relative transition-colors duration-1000">
        {photo.isGeneratingCaption && (
           <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/20 text-white">
             <Loader2 className="animate-spin w-8 h-8" />
           </div>
        )}
        
        {isDownloading && (
           <div className="absolute inset-0 flex items-center justify-center z-40 bg-white/50 text-gray-800">
             <Loader2 className="animate-spin w-8 h-8" />
             <span className="ml-2 text-sm font-bold">Saving...</span>
           </div>
        )}

        <img 
          src={photo.dataUrl} 
          alt="Memory" 
          className="w-full h-full object-cover pointer-events-none transition-all duration-300"
          style={{
            filter: `brightness(${brightness}) contrast(${contrast}) grayscale(${grayscale})`,
          }}
          draggable={false}
        />
        
        {/* Film Grain Overlay */}
        <div className="absolute inset-0 bg-black opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
        
        {/* Edit Input Overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-2" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
            <form onSubmit={handleEditSubmit} className="w-full">
              <label className="text-white text-xs font-bold mb-1 block">Re-imagine style:</label>
              <input 
                autoFocus
                type="text" 
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="e.g. Sketch, Oil Painting..."
                className="w-full px-2 py-1 rounded text-sm mb-2 text-black"
              />
              <div className="flex gap-2 justify-end">
                 <button 
                   type="button"
                   onClick={() => setIsEditing(false)}
                   className="text-xs text-white hover:text-gray-300 px-2 py-1"
                 >Cancel</button>
                 <button 
                   type="submit"
                   className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
                 >
                   Apply <Sparkles size={10}/>
                 </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Caption Area */}
      <div className="min-h-[2.5rem] flex items-center justify-center text-center relative px-1">
        {developmentProgress < 80 ? (
          <p className="text-gray-300 text-xs font-sans animate-pulse">
            {developmentProgress < 30 ? "Developing..." : "Shake me!"}
          </p>
        ) : (
          <p className="font-handwriting text-2xl text-gray-800 leading-none transform -rotate-1 break-words w-full">
            {photo.caption || "..."}
          </p>
        )}

        {/* Actions (Visible on hover or always on mobile if developed) */}
        {!isEditing && (
          <div className={`absolute -bottom-11 left-0 right-0 flex justify-center gap-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
             <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="p-2 bg-white rounded-full shadow-md hover:bg-green-50 text-green-600 transition-colors border border-gray-100"
              title="Download"
            >
              <Download size={14} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-2 bg-white rounded-full shadow-md hover:bg-indigo-50 text-indigo-500 transition-colors border border-gray-100"
              title="Edit Style"
            >
              <Edit2 size={14} />
            </button>
            
            {/* Share Toggle Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleShare(photo.id);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onToggleShare(photo.id);
              }}
              className={`p-2 rounded-full shadow-md transition-colors border border-gray-100 ${photo.isPublic ? 'bg-yellow-50 text-yellow-500 border-yellow-200' : 'bg-white hover:bg-blue-50 text-gray-400 hover:text-blue-500'}`}
              title={photo.isPublic ? "Unshare" : "Share to World"}
            >
              <Globe size={14} />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(photo.id);
              }}
               onTouchStart={(e) => {
                e.stopPropagation();
                onDelete(photo.id);
              }}
              className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 text-red-500 transition-colors border border-gray-100"
              title="Discard"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
