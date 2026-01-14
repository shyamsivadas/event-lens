import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Camera as CameraIcon, SwitchCamera, Zap, ZapOff } from 'lucide-react';
import { toast } from 'sonner';
import { applyFilter, getPreviewFilter, PREMIUM_FILTERS } from '@/utils/filters';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GuestCamera = () => {
  const { shareUrl } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  
  const [event, setEvent] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [photoCount, setPhotoCount] = useState({ used: 0, max: 5 });
  const [facingMode, setFacingMode] = useState('environment');
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useAdvancedPreview, setUseAdvancedPreview] = useState(false);

  useEffect(() => {
    initializeCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [shareUrl, facingMode]);

  // Start real-time filter preview when event loads
  useEffect(() => {
    if (event && videoRef.current && previewCanvasRef.current && useAdvancedPreview) {
      startFilterPreview();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [event, useAdvancedPreview]);

  const startFilterPreview = () => {
    const video = videoRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!video || !previewCanvas || !event) return;

    const ctx = previewCanvas.getContext('2d');
    
    const renderFrame = () => {
      if (video.readyState >= 2) {
        previewCanvas.width = video.videoWidth;
        previewCanvas.height = video.videoHeight;
        
        // Draw video frame
        ctx.drawImage(video, 0, 0);
        
        // Apply premium filter
        applyFilter(ctx, previewCanvas, event.filter_type);
      }
      animationRef.current = requestAnimationFrame(renderFrame);
    };
    
    renderFrame();
  };

  const initializeCamera = async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprintId = result.visitorId;
      setDeviceId(fingerprintId);

      const eventResponse = await axios.get(`${BACKEND_URL}/api/guest/${shareUrl}`);
      setEvent(eventResponse.data);

      const limitResponse = await axios.get(
        `${BACKEND_URL}/api/guest/${shareUrl}/limit?device_id=${fingerprintId}`
      );
      setPhotoCount(limitResponse.data);

      if (limitResponse.data.remaining <= 0) {
        navigate(`/e/${shareUrl}/thankyou`);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setLoading(false);
    } catch (error) {
      console.error('Camera initialization error:', error);
      toast.error('Failed to access camera');
    }
  };

  const switchCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
  };

  const capturePhoto = async () => {
    if (capturing || photoCount.remaining <= 0) return;

    setCapturing(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Draw video frame first
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Apply premium filter (baked into the image)
      applyFilter(ctx, canvas, event.filter_type);

      canvas.toBlob(async (blob) => {
        try {
          const filename = `photo_${Date.now()}.jpg`;
          
          console.log('Requesting presigned URL...');
          const urlResponse = await axios.post(
            `${BACKEND_URL}/api/guest/${shareUrl}/presigned-url`,
            {
              event_id: event.event_id,
              device_id: deviceId,
              filename: filename,
              content_type: 'image/jpeg'
            }
          );

          console.log('Presigned URL received:', urlResponse.data);
          const presignedUrl = urlResponse.data.url;

          console.log('Uploading to R2...');
          const uploadResponse = await axios.put(presignedUrl, blob, {
            headers: { 
              'Content-Type': 'image/jpeg'
            }
          });

          console.log('Upload response:', uploadResponse.status);

          if (uploadResponse.status === 200) {
            await axios.post(
              `${BACKEND_URL}/api/guest/${shareUrl}/track-upload`,
              {
                device_id: deviceId,
                filename: filename,
                s3_key: urlResponse.data.object_key
              }
            );

            const newUsed = photoCount.used + 1;
            setPhotoCount({
              used: newUsed,
              max: photoCount.max,
              remaining: photoCount.max - newUsed
            });

            toast.success('Photo captured!');

            if (newUsed >= photoCount.max) {
              setTimeout(() => {
                navigate(`/e/${shareUrl}/thankyou`);
              }, 1000);
            }
          } else {
            throw new Error(`Upload failed with status ${uploadResponse.status}`);
          }
        } catch (error) {
          console.error('Upload error details:', error);
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
          const errorMsg = error.response?.data?.detail || error.message || 'Upload failed';
          toast.error(`Failed to upload photo: ${errorMsg}`);
        } finally {
          setCapturing(false);
        }
      }, 'image/jpeg', 0.92);
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to capture photo');
      setCapturing(false);
    }
  };

  // Get filter info for display
  const getFilterInfo = () => {
    if (!event) return { name: 'Loading...', category: '' };
    const filter = PREMIUM_FILTERS[event.filter_type];
    if (filter) {
      return {
        name: filter.name,
        category: filter.category === 'wedding' ? '💍 Wedding' : '✨ Premium'
      };
    }
    return { name: event.filter_type, category: '' };
  };

  const filterInfo = getFilterInfo();

  if (loading || !event) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-white">Loading camera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" data-testid="guest-camera">
      {/* Video element - hidden when using advanced preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover ${useAdvancedPreview ? 'hidden' : ''}`}
        style={{ filter: getPreviewFilter(event.filter_type) }}
        data-testid="camera-video"
      />
      
      {/* Advanced preview canvas - shows real filter effect */}
      {useAdvancedPreview && (
        <canvas
          ref={previewCanvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          data-testid="preview-canvas"
        />
      )}
      
      {/* Capture canvas (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash effect */}
      {showFlash && (
        <div className="absolute inset-0 bg-white flash-effect z-50" />
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col">
        {/* Header */}
        <div className="glass p-4 m-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            {event.logo_url && (
              <img
                src={event.logo_url}
                alt="Event logo"
                className="w-10 h-10 rounded-lg object-cover"
              />
            )}
            <div>
              <h2 className="font-bold text-white">{event.name}</h2>
              <p className="text-xs text-white/70">
                {filterInfo.category} <span className="text-primary">{filterInfo.name}</span> filter
              </p>
            </div>
          </div>
          <div className="mono text-white font-semibold text-lg" data-testid="photo-counter">
            {photoCount.used} / {photoCount.max}
          </div>
        </div>

        <div className="flex-1" />

        {/* Controls */}
        <div className="p-8 flex items-center justify-between">
          <button
            onClick={switchCamera}
            className="glass p-4 rounded-full text-white hover:bg-white/20 transition-all"
            data-testid="switch-camera-btn"
          >
            <SwitchCamera className="w-6 h-6" />
          </button>

          <button
            onClick={capturePhoto}
            disabled={capturing || photoCount.remaining <= 0}
            className="capture-button"
            data-testid="capture-btn"
          >
            {capturing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              </div>
            )}
          </button>

          <button
            onClick={() => setFlash(!flash)}
            className="glass p-4 rounded-full text-white hover:bg-white/20 transition-all"
            data-testid="flash-toggle-btn"
          >
            {flash ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-6 text-white/70 text-sm">
          {photoCount.remaining > 0 ? (
            <p>You can take {photoCount.remaining} more photo{photoCount.remaining !== 1 ? 's' : ''}</p>
          ) : (
            <p>Photo limit reached</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestCamera;
