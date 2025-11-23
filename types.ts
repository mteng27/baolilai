
export interface Photo {
  id: string;
  dataUrl: string;
  timestamp: number;
  x: number;
  y: number;
  rotation: number;
  caption?: string;
  isGeneratingCaption?: boolean;
  isPublic?: boolean;
  developmentProgress?: number;
  location?: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
}

export interface DraggableItem {
  id: string;
  initialX: number;
  initialY: number;
  startX: number;
  startY: number;
}
