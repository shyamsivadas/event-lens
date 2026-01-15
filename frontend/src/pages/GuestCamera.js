import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Camera, ImagePlus, MessageSquare, X, Check, Pencil, Trash2, Plus } from 'lucide-react';
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
  
  // Multiple photos feature
  const [selectedPhotos, setSelectedPhotos] = useState([]); // Array of { file, previewUrl }
  const [showReview, setShowReview] = useState(false);
  const [note, setNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [uploading, setUploading] = useState(false);

  const MAX_PHOTOS_PER_BATCH = 5;

  useEffect(() => {
    initializeApp();
    return () => {
      // Clean up preview URLs
      selectedPhotos.forEach(photo => {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
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

  const getMaxSelectablePhotos = () => {
    const remaining = photoCount.remaining - selectedPhotos.length;
    return Math.min(remaining, MAX_PHOTOS_PER_BATCH - selectedPhotos.length);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSelectable = getMaxSelectablePhotos();
    const filesToAdd = files.slice(0, maxSelectable);

    const newPhotos = filesToAdd.map(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return null;
      }
      // Validate file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        return null;
      }
      return {
        file,
        previewUrl: URL.createObjectURL(file)
      };
    }).filter(Boolean);

    if (newPhotos.length > 0) {
      setSelectedPhotos(prev => [...prev, ...newPhotos]);
      toast.success(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added`);
    }

    // Reset input
    e.target.value = '';
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  const removePhoto = (index) => {
    setSelectedPhotos(prev => {
      const photo = prev[index];
      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAllPhotos = () => {
    selectedPhotos.forEach(photo => {
      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    });
    setSelectedPhotos([]);
    setShowReview(false);
    setNote('');
  };

  const proceedToReview = () => {
    if (selectedPhotos.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }
    setShowReview(true);
  };

  const uploadPhotos = async () => {
    if (selectedPhotos.length === 0 || uploading) return;
    
    setUploading(true);
    const photoNote = note.trim();
    let successCount = 0;

    try {
      for (let i = 0; i < selectedPhotos.length; i++) {
        const { file, previewUrl } = selectedPhotos[i];
        const filename = `photo_${Date.now()}_${i}.jpg`;

        // Convert to JPEG blob
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

        // Upload to R2
        const uploadResponse = await axios.put(urlResponse.data.url, blob, {
          headers: { 'Content-Type': 'image/jpeg' }
        });

        if (uploadResponse.status === 200) {
          // Track upload - only add note to first photo
          await axios.post(
            `${BACKEND_URL}/api/guest/${shareUrl}/track-upload`,
            {
              device_id: deviceId,
              filename: filename,
              s3_key: urlResponse.data.object_key,
              note: i === 0 ? photoNote : ''
            }
          );
          successCount++;
        }
      }

      if (successCount > 0) {
        const newUsed = photoCount.used + successCount;
        setPhotoCount({
          used: newUsed,
          max: photoCount.max,
          remaining: photoCount.max - newUsed
        });

        toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded!`);
        
        // Clean up
        clearAllPhotos();

        if (newUsed >= photoCount.max) {
          setTimeout(() => {
            navigate(`/e/${shareUrl}/thankyou`);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload some photos');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Review Screen - Show selected photos and notes
  if (showReview) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black overflow-auto" data-testid="photo-review">
        {/* Header */}
        <div className="sticky top-0 p-4 z-10 bg-gradient-to-b from-gray-900 to-transparent">
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <button
              onClick={() => setShowReview(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="text-center">
              <h2 className="font-bold text-white">{event.name}</h2>
              <p className="text-xs text-white/70">Review & Upload</p>
            </div>
            <div className="mono text-white font-semibold">
              {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {selectedPhotos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                <img 
                  src={photo.previewUrl} 
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-lg text-xs text-white">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>

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
                  className="flex items-center gap-1 text-xs text-white hover:text-white/80 transition-colors"
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
                  placeholder="Share your thoughts about these moments..."
                  className="w-full bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20 focus:border-white/40 outline-none resize-none text-white placeholder:text-white/40"
                  rows={3}
                  maxLength={280}
                  data-testid="photo-note-input"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-white/50">{note.length}/280</span>
                  {isEditingNote && note && (
                    <button
                      onClick={() => setIsEditingNote(false)}
                      className="text-xs text-white hover:text-white/80 transition-colors"
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
            <button
              onClick={() => setShowReview(false)}
              disabled={uploading}
              className="flex-1 bg-white/10 hover:bg-white/20 py-4 rounded-2xl text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              Add More
            </button>
            <button
              onClick={uploadPhotos}
              disabled={uploading}
              className="flex-[2] bg-white hover:bg-gray-100 py-4 rounded-2xl text-black font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              data-testid="upload-btn"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Upload {selectedPhotos.length} Photo{selectedPhotos.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Screen - Photo Selection
  const canAddMore = getMaxSelectablePhotos() > 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black overflow-auto" data-testid="guest-camera">
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
        multiple
        onChange={handleFileSelect}
        className="hidden"
        data-testid="gallery-input"
      />

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
            <p className="text-xs text-white/60">uploaded</p>
          </div>
        </div>
      </div>

      {/* Selected Photos Preview */}
      {selectedPhotos.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/70 text-sm">
              {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearAllPhotos}
              className="text-red-400 text-sm hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {selectedPhotos.map((photo, index) => (
              <div key={index} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                <img 
                  src={photo.previewUrl} 
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {canAddMore && (
              <button
                onClick={openGallery}
                className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-white/50 hover:border-white/50 hover:text-white/70 transition-colors"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {selectedPhotos.length === 0 ? (
          <>
            {/* Empty State */}
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mb-8">
              <Camera className="w-16 h-16 text-white/60" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 text-center">
              Share Your Moments
            </h3>
            <p className="text-white/60 text-center mb-8 max-w-sm">
              Take photos or choose from gallery. You can select up to {Math.min(photoCount.remaining, MAX_PHOTOS_PER_BATCH)} photos at once.
            </p>
          </>
        ) : (
          <>
            {/* Photos Selected State */}
            <h3 className="text-xl font-bold text-white mb-2 text-center">
              {canAddMore ? 'Add more photos?' : 'Ready to upload!'}
            </h3>
            <p className="text-white/60 text-center mb-8 max-w-sm">
              {canAddMore 
                ? `You can add ${getMaxSelectablePhotos()} more photo${getMaxSelectablePhotos() !== 1 ? 's' : ''}`
                : 'Tap continue to add a note and upload'}
            </p>
          </>
        )}

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-4">
          {canAddMore && (
            <>
              {/* Take Photo Button */}
              <button
                onClick={openCamera}
                className="w-full bg-white hover:bg-gray-100 py-5 rounded-2xl text-black font-semibold flex items-center justify-center gap-3 transition-all text-lg"
                data-testid="take-photo-btn"
              >
                <Camera className="w-6 h-6" />
                Take Photo
              </button>

              {/* Choose from Gallery Button */}
              <button
                onClick={openGallery}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 py-5 rounded-2xl text-white font-semibold flex items-center justify-center gap-3 transition-all text-lg"
                data-testid="gallery-btn"
              >
                <ImagePlus className="w-6 h-6" />
                Choose from Gallery
              </button>
            </>
          )}

          {/* Continue Button - Show when photos are selected */}
          {selectedPhotos.length > 0 && (
            <button
              onClick={proceedToReview}
              className="w-full bg-white hover:bg-gray-100 py-5 rounded-2xl text-black font-semibold flex items-center justify-center gap-3 transition-all text-lg"
              data-testid="continue-btn"
            >
              <Check className="w-6 h-6" />
              Continue ({selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''})
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        {photoCount.remaining > 0 ? (
          <p className="text-white/60 text-sm">
            You can upload {photoCount.remaining} more photo{photoCount.remaining !== 1 ? 's' : ''} total
          </p>
        ) : (
          <p className="text-red-400 text-sm font-medium">
            Photo limit reached
          </p>
        )}
      </div>
    </div>
  );
};

export default GuestCamera;
