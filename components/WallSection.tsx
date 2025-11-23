
import React, { useRef } from 'react';
import { Photo } from '../types';
import { DraggablePolaroid } from './DraggablePolaroid';

interface Props {
  photos: Photo[];
  onUpdatePhotoPosition: (id: string, x: number, y: number) => void;
  onUpdatePhotoProgress: (id: string, progress: number) => void;
  onDeletePhoto: (id: string) => void;
  onGenerateCaption: (id: string) => void;
  onEditPhoto: (id: string, prompt: string) => void;
  onToggleShare: (id: string) => void;
}

export const WallSection: React.FC<Props> = ({ 
  photos, 
  onUpdatePhotoPosition, 
  onUpdatePhotoProgress,
  onDeletePhoto,
  onGenerateCaption,
  onEditPhoto,
  onToggleShare
}) => {
  const wallRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={wallRef}
      className="flex-1 h-full bg-cork relative overflow-hidden shadow-[inset_10px_0_20px_rgba(0,0,0,0.05)]"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-20"></div>
      
      {photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-cork-dark/60 pointer-events-none">
          <div className="text-center">
            <h2 className="text-4xl font-handwriting font-bold mb-2 rotate-[-2deg] text-gray-500">Your Photo Wall</h2>
            <p className="text-lg font-sans opacity-70">Take a snap, shake to develop!</p>
          </div>
        </div>
      )}

      {photos.map(photo => (
        <DraggablePolaroid
          key={photo.id}
          photo={photo}
          containerRef={wallRef}
          onMove={onUpdatePhotoPosition}
          onUpdateProgress={onUpdatePhotoProgress}
          onDelete={onDeletePhoto}
          onGenerateCaption={onGenerateCaption}
          onEditPhoto={onEditPhoto}
          onToggleShare={onToggleShare}
        />
      ))}
    </div>
  );
};
