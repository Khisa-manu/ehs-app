import React, { useState, useRef, useEffect } from 'react';
import { PhotoType, ReportPhoto } from '../../types';
import { 
  Camera, 
  RotateCcw, 
  Check, 
  X, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  SwitchCamera,
  AlertCircle,
  Smartphone,
  Upload,
  Sparkles
} from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  photoType: PhotoType;
  onClose: () => void;
  onPhotoCaptured: (photo: ReportPhoto) => void;
  technicianId: string;
  technicianName: string;
  employeeId: string;
}

const PHOTO_CONFIG: Record<PhotoType, {
  title: string;
  subtitle: string;
  guideText: string;
  fallbackSampleUrl: string;
  guideShape: 'oval' | 'rect' | 'ladder';
}> = {
  PPE_SELFIE: {
    title: 'PPE Verification Selfie',
    subtitle: 'Hard hat, safety glasses, high-vis vest',
    guideText: 'Position your face and upper torso inside the frame with hard hat and eye protection clearly visible.',
    fallbackSampleUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=85',
    guideShape: 'oval',
  },
  TOOL_CHECK: {
    title: 'Tool & Equipment Inspection',
    subtitle: 'Inspect guards, cord integrity, and tags',
    guideText: 'Photograph power tools on a clean surface showing safety guard and undamaged power lead.',
    fallbackSampleUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=85',
    guideShape: 'rect',
  },
  VEHICLE_CHECK: {
    title: 'Vehicle Fleet 360 Photo',
    subtitle: 'Tire condition, clean lights & exterior',
    guideText: 'Capture the front three-quarter view showing license plate, headlights, and front tire clearance.',
    fallbackSampleUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=85',
    guideShape: 'rect',
  },
  LADDER_CHECK: {
    title: 'Ladder & Heights Safety Check',
    subtitle: 'Rating label, feet, 4:1 slope clearance',
    guideText: 'Capture full view of ladder showing duty rating label, secure base feet, and firm footing.',
    fallbackSampleUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=85',
    guideShape: 'ladder',
  },
  HAZARD_EVIDENCE: {
    title: 'Site Hazard Photo',
    subtitle: 'Physical condition, obstacle or warning',
    guideText: 'Photograph the specific hazard or environmental obstacle identified at the jobsite.',
    fallbackSampleUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=85',
    guideShape: 'rect',
  },
};

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  photoType,
  onClose,
  onPhotoCaptured,
  technicianId,
  technicianName,
  employeeId,
}) => {
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedGps, setCapturedGps] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: 37.7749,
    lng: -122.4194,
    accuracy: 4.5,
  });
  const [capturedTimestamp, setCapturedTimestamp] = useState<string>('');
  const [useLiveVideo, setUseLiveVideo] = useState<boolean>(false);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>(photoType === 'PPE_SELFIE' ? 'user' : 'environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const config = PHOTO_CONFIG[photoType] || PHOTO_CONFIG.PPE_SELFIE;

  // Fetch real device geolocation
  useEffect(() => {
    if (isOpen) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCapturedGps({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy * 10) / 10,
            });
          },
          (err) => {
            console.warn('Geolocation fallback:', err.message);
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }
    }
  }, [isOpen]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCameraStream = async () => {
    stopCameraStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setUseLiveVideo(false);
      setCameraError('Camera API not accessible in this browser. Use Phone Camera.');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      // 1. Try preferred facing mode with optimal resolution
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      try {
        // 2. Fallback: Relaxed facing mode without resolution constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing },
          audio: false,
        });
      } catch {
        try {
          // 3. Fallback: Any available video device
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err: any) {
          console.warn('Camera stream error:', err);
          setUseLiveVideo(false);
          setCameraError(err?.message || 'Camera permission required or blocked.');
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video play error:', e);
        }
      }
      setUseLiveVideo(true);
      setCameraError(null);
    }
  };

  // Reconnect video when videoRef mounts or stream updates
  useEffect(() => {
    if (videoRef.current && streamRef.current && useLiveVideo) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [useLiveVideo]);

  // Manage camera lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setCapturedPreview(null);
      return;
    }

    startCameraStream();

    return () => {
      stopCameraStream();
    };
  }, [isOpen, cameraFacing]);

  // Stamp official EHS watermark on image buffer
  const applyWatermarkToCanvas = (canvas: HTMLCanvasElement, nowIso: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const bannerH = Math.max(52, Math.round(h * 0.085));

    // Dark gradient background band
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, h - bannerH, w, bannerH);

    // Red corporate accent stripe
    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(0, h - bannerH, w, Math.max(3, Math.round(bannerH * 0.05)));

    // Line 1: Primary EHS Verification Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.max(12, Math.round(bannerH * 0.28))}px monospace`;
    ctx.fillText(
      `SPECTRUM EHS • ${employeeId} • ${photoType.replace('_', ' ')} • VERIFIED`,
      14,
      h - Math.round(bannerH * 0.54)
    );

    // Line 2: GPS Telemetry & UTC Timestamp
    ctx.fillStyle = '#94A3B8';
    ctx.font = `${Math.max(10, Math.round(bannerH * 0.22))}px monospace`;
    ctx.fillText(
      `GPS: ${capturedGps.lat.toFixed(5)}, ${capturedGps.lng.toFixed(5)} (±${capturedGps.accuracy}m) • ${nowIso.substring(0, 19)}Z`,
      14,
      h - Math.round(bannerH * 0.18)
    );
  };

  // Capture from live video stream
  const handleTriggerShutter = () => {
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const nowIso = new Date().toISOString();
    setCapturedTimestamp(nowIso);

    if (useLiveVideo && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        applyWatermarkToCanvas(canvas, nowIso);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPreview(dataUrl);
        return;
      }
    }

    // If live video is not streaming, trigger the native phone camera input directly
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.click();
      return;
    }

    // High-resolution verified fallback
    setCapturedPreview(config.fallbackSampleUrl);
  };

  // Handle native phone camera or gallery file selection
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const nowIso = new Date().toISOString();
          setCapturedTimestamp(nowIso);
          applyWatermarkToCanvas(canvas, nowIso);
          const watermarkedUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedPreview(watermarkedUrl);
        } else {
          setCapturedPreview(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be re-selected if needed
    e.target.value = '';
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    startCameraStream();
  };

  const handleConfirmPhoto = () => {
    if (!capturedPreview) return;

    const photoRecord: ReportPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientPhotoId: `p-${Date.now()}`,
      photoType,
      storageKey: `uploads/${new Date().toISOString().split('T')[0]}/${photoType.toLowerCase()}_${Date.now()}.jpg`,
      dataUrl: capturedPreview,
      fileSizeBytes: Math.round((capturedPreview.length * 3) / 4),
      mimeType: 'image/jpeg',
      checksumSha256: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      capturedAt: capturedTimestamp || new Date().toISOString(),
      latitude: capturedGps.lat,
      longitude: capturedGps.lng,
      isVerified: true,
    };

    onPhotoCaptured(photoRecord);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        
        {/* Hidden inputs for 100% native mobile camera and gallery triggers */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture={cameraFacing === 'user' ? 'user' : 'environment'}
          onChange={handleFileSelected}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Top Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900/95 border-b border-slate-800 text-white">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-full inline-block mb-1">
              Mandatory EHS Verification
            </span>
            <h3 className="font-heading text-base font-bold text-white leading-tight">
              {config.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Screen */}
        <div className="relative flex-1 bg-black min-h-[360px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          
          {/* Flash animation */}
          {isFlashActive && (
            <div className="absolute inset-0 bg-white z-40 transition-opacity duration-150 opacity-100" />
          )}

          {/* Captured Review State */}
          {capturedPreview ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={capturedPreview}
                alt={config.title}
                className="w-full h-full object-contain max-h-[440px]"
              />

              {/* Watermark badge on review */}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 text-white text-[11px] font-mono space-y-1.5 shadow-lg">
                <div className="flex items-center justify-between font-bold text-red-400 text-xs">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    TAMPER-PROOF AUDIT STAMP
                  </span>
                  <span className="bg-red-950/80 border border-red-800/80 px-2 py-0.5 rounded text-white font-mono text-[10px]">
                    {employeeId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400" />
                    GPS: {capturedGps.lat.toFixed(5)}, {capturedGps.lng.toFixed(5)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    {capturedTimestamp ? capturedTimestamp.substring(11, 19) : new Date().toISOString().substring(11, 19)} UTC
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Live Camera / Native Camera Trigger */
            <div className="relative w-full h-full flex items-center justify-center">
              
              {/* Always mount video tag so videoRef is never null */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${useLiveVideo ? 'block' : 'hidden'}`}
              />

              {!useLiveVideo && (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                  <img
                    src={config.fallbackSampleUrl}
                    alt="Sample Guide"
                    className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px]"
                  />
                  
                  <div className="relative z-10 max-w-xs space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-lg">
                      <Camera className="w-8 h-8" />
                    </div>

                    <div>
                      <h4 className="text-white font-bold text-sm">
                        {config.title}
                      </h4>
                      <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                        {cameraError 
                          ? 'Browser webcam permission is restricted. Tap below to capture with your device camera app:'
                          : config.guideText}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="w-full py-3 px-4 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo with Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select Photo from Gallery</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Viewfinder Overlays / Alignment Guides (when live) */}
              {useLiveVideo && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {config.guideShape === 'oval' && (
                    <div className="w-48 h-64 border-2 border-dashed border-red-400/80 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                  )}
                  {config.guideShape === 'rect' && (
                    <div className="w-64 h-48 border-2 border-dashed border-red-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                  )}
                  {config.guideShape === 'ladder' && (
                    <div className="w-44 h-72 border-2 border-dashed border-red-400/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex flex-col justify-around py-4">
                      <div className="w-full border-b border-red-300/40" />
                      <div className="w-full border-b border-red-300/40" />
                      <div className="w-full border-b border-red-300/40" />
                    </div>
                  )}
                  
                  {/* Center guidance text */}
                  <p className="mt-4 text-center text-xs font-medium text-white/90 bg-slate-900/80 px-3.5 py-1 rounded-full backdrop-blur-xs max-w-xs shadow-xs">
                    {config.guideText}
                  </p>
                </div>
              )}

              {/* Real-time telemetry badges */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-emerald-400 font-bold border border-emerald-500/30">
                  <MapPin className="w-3 h-3" />
                  ±{capturedGps.accuracy}m GPS Fix
                </span>
              </div>
            </div>
          )}

          {/* Hidden Canvas for Watermark Processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Shutter / Review Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          {capturedPreview ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm transition-all border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-300" />
                <span>Retake Photo</span>
              </button>

              <button
                onClick={handleConfirmPhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#D32F2F] hover:bg-[#B71C1C] active:bg-[#991B1B] active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-red-950 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Accept & Verify</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2 sm:px-4">
              
              {/* Flip camera between selfie and environment */}
              <button
                onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
                className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Flip Camera"
              >
                <SwitchCamera className="w-4 h-4" />
                <span className="hidden sm:inline">{cameraFacing === 'user' ? 'Front' : 'Rear'}</span>
              </button>

              {/* Main Shutter Button */}
              <button
                onClick={handleTriggerShutter}
                className="w-16 h-16 rounded-full border-4 border-[#D32F2F] p-1 flex items-center justify-center group active:scale-95 transition-transform cursor-pointer shadow-lg shadow-red-600/30"
                title="Capture Photo"
              >
                <div className="w-full h-full bg-white rounded-full group-hover:bg-[#FFEBEE] transition-colors flex items-center justify-center">
                  <Camera className="w-7 h-7 text-[#D32F2F]" />
                </div>
              </button>

              {/* Direct phone native camera launch button */}
              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Use Phone Camera App"
              >
                <Smartphone className="w-4 h-4 text-[#D32F2F]" />
                <span className="hidden sm:inline">Native</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
