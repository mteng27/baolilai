import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Camera } from 'lucide-react';

interface Props {
  onCapture: (dataUrl: string) => void;
}

export const CameraSection: React.FC<Props> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [printingPhoto, setPrintingPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 720 }, 
          height: { ideal: 720 },
          facingMode: facingMode
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
      }
    } catch (err) {
      setError("Permission required");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreamActive(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || printingPhoto) return;

    // 1. Trigger Flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    // 2. Capture Image
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;

      // Mirror only if facing user
      if (facingMode === 'user') {
        context.translate(size, 0);
        context.scale(-1, 1); 
      }
      
      context.drawImage(video, sx, sy, size, size, 0, 0, size, size);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      // 3. Start Printing Animation
      setPrintingPhoto(dataUrl);

      // 4. After animation finishes, hand off to wall
      setTimeout(() => {
        onCapture(dataUrl);
        setPrintingPhoto(null);
      }, 1400);
    }
  };

  return (
    <div className="h-[45vh] md:h-full w-full md:w-[500px] bg-[#f0f0f0] relative flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-300 z-30 shadow-xl overflow-visible">
      
      {/* Camera Permissions Error */}
      {error && (
        <div className="absolute top-4 z-50 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <AlertCircle size={16} />
          <span className="text-xs font-bold">{error}</span>
          <button onClick={startCamera} className="ml-2 underline text-xs">Retry</button>
        </div>
      )}

      {/* --- 3D POLAROID CAMERA BODY (WHITE EDITION) --- */}
      <div className="relative w-[300px] md:w-[340px] scale-90 md:scale-100 perspective-1000 z-40">
        
        {/* Main Chassis */}
        <div className="relative bg-slate-50 rounded-[2rem] shadow-2xl p-6 pt-8 pb-20 border-b-8 border-gray-200 z-20">
          
          {/* Texture Overlay */}
          <div className="absolute inset-0 bg-white opacity-50 rounded-[2rem] pointer-events-none"></div>
          
          {/* Rainbow Stripe */}
          <div className="absolute top-12 bottom-24 left-1/2 -translate-x-1/2 w-4 h-32 flex flex-col z-10 opacity-90">
             <div className="flex-1 bg-[#FF3B30]"></div>
             <div className="flex-1 bg-[#FF9500]"></div>
             <div className="flex-1 bg-[#FFCC00]"></div>
             <div className="flex-1 bg-[#4CD964]"></div>
             <div className="flex-1 bg-[#5AC8FA]"></div>
             <div className="flex-1 bg-[#007AFF]"></div>
          </div>

          {/* Top Hardware Row */}
          <div className="relative flex justify-between items-center mb-6 px-2 z-20">
            {/* Flash Unit */}
            <div className="w-20 h-10 bg-gray-200 rounded border border-gray-300 shadow-inner flex items-center justify-center overflow-hidden relative group">
               <div className="w-16 h-6 bg-gray-800 rounded-sm relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/20"></div>
                 <div className={`absolute inset-0 bg-white transition-opacity duration-75 ${isFlashing ? 'opacity-100' : 'opacity-0'}`}></div>
               </div>
            </div>

            {/* Viewfinder */}
            <div className="w-10 h-10 bg-gray-900 rounded-lg border-2 border-gray-300 shadow-md flex items-center justify-center overflow-hidden">
               <div className="w-full h-full bg-black opacity-80"></div>
               <div className="absolute w-2 h-2 bg-white/30 rounded-full top-2 right-2"></div>
            </div>
          </div>

          {/* Main Lens Assembly (Circular) */}
          <div className="relative z-20 flex justify-center mb-8">
            <div className="w-44 h-44 rounded-full bg-white shadow-[0_10px_20px_rgba(0,0,0,0.15)] flex items-center justify-center border border-gray-100 relative">
              
              {/* Distance Ring */}
              <div className="absolute inset-2 border-2 border-dashed border-gray-300 rounded-full opacity-50 animate-spin-slow"></div>
              
              {/* The Lens Glass (Contains Video) */}
              <div className="w-36 h-36 rounded-full bg-black overflow-hidden border-[6px] border-gray-800 relative shadow-lens ring-4 ring-gray-200">
                {!isStreamActive && !error && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <RefreshCw className="animate-spin" />
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover opacity-90 ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
                />
                
                {/* Lens Reflection */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Front Controls */}
          <div className="relative z-20 flex justify-between items-center px-6">
            
            {/* Camera Switch Button */}
            <button
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-md flex items-center justify-center text-gray-600 active:scale-95 transition-transform hover:bg-gray-300"
              title="Switch Camera"
            >
              <RefreshCw size={20} />
            </button>
            
            {/* Shutter Button */}
            <button
              onClick={handleCapture}
              onTouchStart={(e) => { e.stopPropagation(); handleCapture(); }}
              disabled={!!printingPhoto}
              className={`
                w-14 h-14 rounded-full bg-[#ff453a] border-4 border-white shadow-[0_4px_6px_rgba(0,0,0,0.2)]
                active:scale-95 active:shadow-none transition-all cursor-pointer z-20
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center
              `}
            >
              <Camera className="text-red-900 opacity-30 w-6 h-6" />
            </button>
          </div>

          {/* Ejection Slot Graphic */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[240px] h-2 bg-gray-800 rounded-t-sm z-20 shadow-inner"></div>

          {/* --- PRINTING ANIMATION CONTAINER --- */}
          <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-[220px] h-[300px] overflow-hidden z-0 pointer-events-none">
            {printingPhoto && (
              <div className="w-full bg-white p-3 pb-10 shadow-xl animate-eject rounded-sm origin-top">
                  <div className="aspect-square bg-[#1a1a1a] overflow-hidden">
                    <img 
                        src={printingPhoto} 
                        alt="Developing" 
                        className="w-full h-full object-cover opacity-20 blur-sm"
                    />
                  </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};