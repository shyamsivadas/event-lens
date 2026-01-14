import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { SwitchCamera, Zap, ZapOff, MessageSquare, X, Send, RotateCcw, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GuestCamera = () => {
  const { shareUrl } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [event, setEvent] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [photoCount, setPhotoCount] = useState({ used: 0, max: 5 });
  const [facingMode, setFacingMode] = useState('environment');
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Preview & Notes feature
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingCapture, setPendingCapture] = useState(null);
  const [note, setNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    initializeCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
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

    // Capture the image
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setPendingCapture(blob);
      setPreviewUrl(url);
      setShowPreview(true);
      setNote('');
      setIsEditingNote(false);
      setCapturing(false);
    }, 'image/jpeg', 0.92);
  };

  const retakePhoto = () => {
    // Clean up preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPendingCapture(null);
    setPreviewUrl(null);
    setShowPreview(false);
    setNote('');
    setIsEditingNote(false);
  };

  const uploadPhoto = async () => {
    if (!pendingCapture || uploading) return;
    
    setUploading(true);

    try {
      const filename = `photo_${Date.now()}.jpg`;
      const photoNote = note.trim();
      
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

        toast.success(photoNote ? 'Photo & note uploaded!' : 'Photo uploaded!');
        
        // Clean up
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setPendingCapture(null);
        setPreviewUrl(null);
        setShowPreview(false);
        setNote('');

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
      setUploading(false);
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

  // Preview Screen
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden" data-testid="photo-preview">
        {/* Preview Image */}
        <div className="absolute inset-0">
          {previewUrl && (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          )}
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10">
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
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
                <p className="text-xs text-white/70">Preview your photo</p>
              </div>
            </div>
            <div className="mono text-white font-semibold text-lg">
              {photoCount.used} / {photoCount.max}
            </div>
          </div>
        </div>

        {/* Bottom Section - Note & Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          {/* Note Section */}
          <div className="glass rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-white/70" />
                <span className="text-sm font-medium text-white/90">Add a note</span>
              </div>
              {note && !isEditingNote && (
                <button
                  onClick={() => setIsEditingNote(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  data-testid="edit-note-btn"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
            
            {isEditingNote || !note ? (
              <div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Share your thoughts about this moment..."
                  className="w-full bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none text-white placeholder:text-white/40"
                  rows={2}
                  maxLength={280}
                  autoFocus={isEditingNote}
                  data-testid="photo-note-input"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-white/50">{note.length}/280</span>
                  {isEditingNote && note && (
                    <button
                      onClick={() => setIsEditingNote(false)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20">
                <p className="text-white/90 text-sm">{note}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Retake Button */}
            <button
              onClick={retakePhoto}
              disabled={uploading}
              className="flex-1 glass py-4 rounded-2xl text-white font-medium flex items-center justify-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50"
              data-testid="retake-btn"
            >
              <RotateCcw className="w-5 h-5" />
              Retake
            </button>

            {/* Upload Button */}
            <button
              onClick={uploadPhoto}
              disabled={uploading}
              className="flex-[2] bg-primary hover:bg-primary/90 py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              data-testid="upload-btn"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Upload Photo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Camera Screen
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
            📸 Tap to capture, then preview before uploading
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
