import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { SwitchCamera, Zap, ZapOff, MessageSquare, X, Send } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
  
  // Notes feature
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [pendingCapture, setPendingCapture] = useState(null);

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

    // Capture the image
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and store for later upload
    canvas.toBlob((blob) => {
      setPendingCapture(blob);
      setShowNoteInput(true);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 200);
    }, 'image/jpeg', 0.92);
  };

  const uploadPhotoWithNote = async (includeNote = true) => {
    if (!pendingCapture) return;
    
    setCapturing(true);
    setShowNoteInput(false);

    try {
      const filename = `photo_${Date.now()}.jpg`;
      const photoNote = includeNote ? note.trim() : '';
      
      const urlResponse = await axios.post(
        `${BACKEND_URL}/api/guest/${shareUrl}/presigned-url`,
        {
          event_id: event.event_id,
          device_id: deviceId,
          filename: filename,
          content_type: 'image/jpeg'
        }
      );

      const presignedUrl = urlResponse.data.url;

      const uploadResponse = await axios.put(presignedUrl, pendingCapture, {
        headers: { 
          'Content-Type': 'image/jpeg'
        }
      });

      if (uploadResponse.status === 200) {
        await axios.post(
          `${BACKEND_URL}/api/guest/${shareUrl}/track-upload`,
          {
            device_id: deviceId,
            filename: filename,
            s3_key: urlResponse.data.object_key,
            note: photoNote
          }
        );

        const newUsed = photoCount.used + 1;
        setPhotoCount({
          used: newUsed,
          max: photoCount.max,
          remaining: photoCount.max - newUsed
        });

        toast.success(photoNote ? 'Photo & note captured!' : 'Photo captured!');
        setNote('');
        setPendingCapture(null);

        if (newUsed >= photoCount.max) {
          setTimeout(() => {
            navigate(`/e/${shareUrl}/thankyou`);
          }, 1000);
        }
      } else {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Upload failed';
      toast.error(`Failed to upload photo: ${errorMsg}`);
    } finally {
      setCapturing(false);
    }
  };

  const cancelCapture = () => {
    setShowNoteInput(false);
    setNote('');
    setPendingCapture(null);
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
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="camera-video"
      />
      
      {/* Capture canvas (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash effect */}
      {showFlash && (
        <div className="absolute inset-0 bg-white flash-effect z-50" />
      )}

      {/* Note Input Modal */}
      {showNoteInput && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Preview of captured photo */}
            <div className="relative aspect-video bg-gray-900">
              <canvas 
                ref={(el) => {
                  if (el && pendingCapture) {
                    const ctx = el.getContext('2d');
                    const img = new Image();
                    img.onload = () => {
                      el.width = img.width;
                      el.height = img.height;
                      ctx.drawImage(img, 0, 0);
                    };
                    img.src = URL.createObjectURL(pendingCapture);
                  }
                }}
                className="w-full h-full object-cover"
              />
              <button
                onClick={cancelCapture}
                className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Note input */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Add a note (optional)</span>
              </div>
              
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Share your thoughts about this moment..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none text-gray-800 placeholder:text-gray-400"
                rows={3}
                maxLength={280}
                autoFocus
                data-testid="photo-note-input"
              />
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{note.length}/280</span>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => uploadPhotoWithNote(false)}
                  disabled={capturing}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  data-testid="skip-note-btn"
                >
                  Skip Note
                </button>
                <button
                  onClick={() => uploadPhotoWithNote(true)}
                  disabled={capturing}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                  data-testid="save-with-note-btn"
                >
                  {capturing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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
              <p className="text-xs text-white/70">{event.date}</p>
            </div>
          </div>
          <div className="mono text-white font-semibold text-lg" data-testid="photo-counter">
            {photoCount.used} / {photoCount.max}
          </div>
        </div>

        <div className="flex-1" />

        {/* Hint text */}
        <div className="text-center mb-4">
          <p className="text-white/60 text-sm bg-black/30 inline-block px-4 py-2 rounded-full">
            📝 Add a note with your photo!
          </p>
        </div>

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
            disabled={capturing || photoCount.remaining <= 0 || showNoteInput}
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
