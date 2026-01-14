import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Camera as CameraIcon, SwitchCamera, Zap, ZapOff, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const FILTERS = {
  warm: 'brightness(1.1) contrast(1.05) saturate(1.2) sepia(0.15)',
  party: 'brightness(1.15) contrast(1.2) saturate(1.4) hue-rotate(5deg)',
  wedding: 'brightness(1.05) contrast(0.95) saturate(0.9) blur(0.3px)',
  corporate: 'brightness(1.05) contrast(1.1) saturate(0.8) grayscale(0.1)',
  vintage: 'brightness(0.95) contrast(1.15) saturate(0.8) sepia(0.3)'
};

const GuestCamera = () => {
  const { shareUrl } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [event, setEvent] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [photoCount, setPhotoCount] = useState({ used: 0, max: 5 });
  const [facingMode, setFacingMode] = useState('environment');
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [shareUrl, facingMode]);

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
      ctx.filter = FILTERS[event.filter_type] || FILTERS.warm;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        try {
          const filename = `photo_${Date.now()}.jpg`;
          
          const urlResponse = await axios.post(
            `${BACKEND_URL}/api/guest/${shareUrl}/presigned-url`,
            {
              event_id: event.event_id,
              device_id: deviceId,
              filename: filename,
              content_type: 'image/jpeg'
            }
          );

          await axios.put(urlResponse.data.url, blob, {
            headers: { 'Content-Type': 'image/jpeg' }
          });

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
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('Failed to upload photo');
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
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover -z-10"
        style={{ filter: FILTERS[event.filter_type] || FILTERS.warm }}
        data-testid="camera-video"
      />
      
      <canvas ref={canvasRef} className="hidden" />

      {showFlash && (
        <div className="absolute inset-0 bg-white flash-effect z-50" />
      )}

      <div className="absolute inset-0 z-10 flex flex-col">
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
              <p className="text-xs text-white/70">Tap to capture memories</p>
            </div>
          </div>
          <div className="mono text-white font-semibold text-lg" data-testid="photo-counter">
            {photoCount.used} / {photoCount.max}
          </div>
        </div>

        <div className="flex-1" />

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