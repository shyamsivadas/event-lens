import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Camera, ImagePlus, MessageSquare, RotateCcw, Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GuestCamera = () => {
  const { shareUrl } = useParams();
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  
  const [event, setEvent] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [photoCount, setPhotoCount] = useState({ used: 0, max: 5 });
  const [loading, setLoading] = useState(true);
  
  // Preview & Notes feature
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [note, setNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    initializeApp();
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [shareUrl]);

  const initializeApp = async () => {
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

      setLoading(false);
    } catch (error) {
      console.error('Initialization error:', error);
      toast.error('Failed to load event');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image size must be less than 20MB');
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setShowPreview(true);
    setNote('');
    setIsEditingNote(false);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  const cancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowPreview(false);
    setNote('');
    setIsEditingNote(false);
  };

  const uploadPhoto = async () => {
    if (!selectedFile || uploading) return;
    
    setUploading(true);

    try {
      const filename = `photo_${Date.now()}.jpg`;
      const photoNote = note.trim();

      // Convert to JPEG blob for consistency
      const canvas = document.createElement('canvas');
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = previewUrl;
      });

      // Resize if needed (max 1920px)
      const maxSize = 1920;
      let width = img.width;
      let height = img.height;
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      // Get presigned URL
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

      // Upload to R2
      const uploadResponse = await axios.put(presignedUrl, blob, {
        headers: { 
          'Content-Type': 'image/jpeg'
        }
      });

      if (uploadResponse.status === 200) {
        // Track upload
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
        setSelectedFile(null);
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
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Preview Screen
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden" data-testid="photo-preview">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Preview Image */}
        <div className="absolute inset-0">
          {previewUrl && (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-contain bg-black"
            />
          )}
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10">
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <button
              onClick={cancelPreview}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-white">{event.name}</h2>
              <p className="text-xs text-white/70">Preview your photo</p>
            </div>
            <div className="mono text-white font-semibold">
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
                <span className="text-sm font-medium text-white/90">Add a note (optional)</span>
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
            {/* Choose Different Button */}
            <button
              onClick={cancelPreview}
              disabled={uploading}
              className="flex-1 glass py-4 rounded-2xl text-white font-medium flex items-center justify-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50"
              data-testid="retake-btn"
            >
              <RotateCcw className="w-5 h-5" />
              Change
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

  // Main Screen - Camera & Gallery Selection
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black overflow-hidden" data-testid="guest-camera">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="camera-input"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="gallery-input"
      />

      {/* Content */}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4">
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {event.logo_url && (
                <img
                  src={event.logo_url}
                  alt="Event logo"
                  className="w-12 h-12 rounded-xl object-cover"
                />
              )}
              <div>
                <h2 className="font-bold text-white text-lg">{event.name}</h2>
                <p className="text-sm text-white/70">{event.date}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="mono text-white font-bold text-2xl" data-testid="photo-counter">
                {photoCount.used}/{photoCount.max}
              </div>
              <p className="text-xs text-white/60">photos</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Illustration/Icon */}
          <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mb-8">
            <Camera className="w-16 h-16 text-white/60" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2 text-center">
            Share Your Moment
          </h3>
          <p className="text-white/60 text-center mb-8 max-w-sm">
            Take a new photo or choose one from your gallery to share with everyone
          </p>

          {/* Action Buttons */}
          <div className="w-full max-w-sm space-y-4">
            {/* Take Photo Button */}
            <button
              onClick={openCamera}
              disabled={photoCount.remaining <= 0}
              className="w-full bg-primary hover:bg-primary/90 py-5 rounded-2xl text-white font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              data-testid="take-photo-btn"
            >
              <Camera className="w-6 h-6" />
              Take Photo
            </button>

            {/* Choose from Gallery Button */}
            <button
              onClick={openGallery}
              disabled={photoCount.remaining <= 0}
              className="w-full glass hover:bg-white/20 py-5 rounded-2xl text-white font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              data-testid="gallery-btn"
            >
              <ImagePlus className="w-6 h-6" />
              Choose from Gallery
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center">
          {photoCount.remaining > 0 ? (
            <p className="text-white/60 text-sm">
              You can upload {photoCount.remaining} more photo{photoCount.remaining !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-red-400 text-sm font-medium">
              Photo limit reached
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestCamera;
