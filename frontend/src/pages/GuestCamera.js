import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Camera, ImagePlus, ChevronLeft, ChevronRight, X, Check, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GuestCamera = () => {
  const { shareUrl } = useParams();
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const noteInputRef = useRef(null);
  
  const [event, setEvent] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [photoCount, setPhotoCount] = useState({ used: 0, max: 5 });
  const [loading, setLoading] = useState(true);
  
  // Multiple photos with individual notes
  const [selectedPhotos, setSelectedPhotos] = useState([]); // Array of { file, previewUrl, note }
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  const MAX_PHOTOS_PER_BATCH = 5;

  useEffect(() => {
    initializeApp();
    return () => {
      selectedPhotos.forEach(photo => {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, [shareUrl]);

  // Auto-focus note input when switching photos
  useEffect(() => {
    if (showNoteEditor && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [currentPhotoIndex, showNoteEditor]);

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
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return null;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        return null;
      }
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        note: ''
      };
    }).filter(Boolean);

    if (newPhotos.length > 0) {
      setSelectedPhotos(prev => [...prev, ...newPhotos]);
      toast.success(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added`);
    }

    e.target.value = '';
  };

  const openCamera = () => cameraInputRef.current?.click();
  const openGallery = () => galleryInputRef.current?.click();

  const removePhoto = (index) => {
    setSelectedPhotos(prev => {
      const photo = prev[index];
      if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      const newPhotos = prev.filter((_, i) => i !== index);
      
      // Adjust current index if needed
      if (currentPhotoIndex >= newPhotos.length && newPhotos.length > 0) {
        setCurrentPhotoIndex(newPhotos.length - 1);
      }
      
      // Close editor if no photos left
      if (newPhotos.length === 0) {
        setShowNoteEditor(false);
      }
      
      return newPhotos;
    });
  };

  const clearAllPhotos = () => {
    selectedPhotos.forEach(photo => {
      if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    });
    setSelectedPhotos([]);
    setShowNoteEditor(false);
    setCurrentPhotoIndex(0);
  };

  const updateNote = (index, note) => {
    setSelectedPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, note } : photo
    ));
  };

  const proceedToNotes = () => {
    if (selectedPhotos.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }
    setCurrentPhotoIndex(0);
    setShowNoteEditor(true);
  };

  const goToNextPhoto = () => {
    if (currentPhotoIndex < selectedPhotos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const goToPrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const uploadPhotos = async () => {
    if (selectedPhotos.length === 0 || uploading) return;
    
    setUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < selectedPhotos.length; i++) {
        const { previewUrl, note } = selectedPhotos[i];
        const filename = `photo_${Date.now()}_${i}.jpg`;

        // Convert to JPEG blob
        const canvas = document.createElement('canvas');
        const img = new Image();
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = previewUrl;
        });

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

        const urlResponse = await axios.post(
          `${BACKEND_URL}/api/guest/${shareUrl}/presigned-url`,
          {
            event_id: event.event_id,
            device_id: deviceId,
            filename: filename,
            content_type: 'image/jpeg'
          }
        );

        const uploadResponse = await axios.put(urlResponse.data.url, blob, {
          headers: { 'Content-Type': 'image/jpeg' }
        });

        if (uploadResponse.status === 200) {
          await axios.post(
            `${BACKEND_URL}/api/guest/${shareUrl}/track-upload`,
            {
              device_id: deviceId,
              filename: filename,
              s3_key: urlResponse.data.object_key,
              note: note.trim()
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
        clearAllPhotos();

        if (newUsed >= photoCount.max) {
          setTimeout(() => navigate(`/e/${shareUrl}/thankyou`), 1000);
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

  // Note Editor Screen - Swipe through photos and add notes
  if (showNoteEditor && selectedPhotos.length > 0) {
    const currentPhoto = selectedPhotos[currentPhotoIndex];
    const isFirstPhoto = currentPhotoIndex === 0;
    const isLastPhoto = currentPhotoIndex === selectedPhotos.length - 1;
    const notesAdded = selectedPhotos.filter(p => p.note.trim()).length;

    return (
      <div className="fixed inset-0 bg-black flex flex-col" data-testid="note-editor">
        {/* Full-screen photo background */}
        <div className="absolute inset-0">
          <img 
            src={currentPhoto.previewUrl} 
            alt={`Photo ${currentPhotoIndex + 1}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
        </div>

        {/* Header */}
        <div className="relative z-10 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowNoteEditor(false)}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <div className="text-center">
              <p className="text-white font-semibold">{currentPhotoIndex + 1} of {selectedPhotos.length}</p>
              <p className="text-white/60 text-xs">{notesAdded} note{notesAdded !== 1 ? 's' : ''} added</p>
            </div>

            <button
              onClick={() => removePhoto(currentPhotoIndex)}
              className="p-2 bg-red-500/80 backdrop-blur-sm rounded-full hover:bg-red-500 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Photo dots indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {selectedPhotos.map((photo, index) => (
              <button
                key={index}
                onClick={() => setCurrentPhotoIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentPhotoIndex 
                    ? 'w-8 h-2 bg-white' 
                    : photo.note.trim() 
                      ? 'w-2 h-2 bg-green-400' 
                      : 'w-2 h-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 relative z-10 flex items-center justify-between px-2">
          {/* Left Arrow */}
          <button
            onClick={goToPrevPhoto}
            disabled={isFirstPhoto}
            className={`p-3 rounded-full transition-all ${
              isFirstPhoto 
                ? 'opacity-0 pointer-events-none' 
                : 'bg-white/10 backdrop-blur-sm hover:bg-white/20'
            }`}
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={goToNextPhoto}
            disabled={isLastPhoto}
            className={`p-3 rounded-full transition-all ${
              isLastPhoto 
                ? 'opacity-0 pointer-events-none' 
                : 'bg-white/10 backdrop-blur-sm hover:bg-white/20'
            }`}
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Bottom Section - Note Input */}
        <div className="relative z-10 p-4 pb-6">
          {/* Note Input */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20">
            <textarea
              ref={noteInputRef}
              value={currentPhoto.note}
              onChange={(e) => updateNote(currentPhotoIndex, e.target.value)}
              placeholder="Add a note for this photo..."
              className="w-full bg-transparent text-white placeholder:text-white/50 outline-none resize-none text-base leading-relaxed"
              rows={2}
              maxLength={280}
              data-testid="photo-note-input"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-white/50">{currentPhoto.note.length}/280</span>
              {currentPhoto.note.trim() && (
                <span className="text-xs text-green-400">✓ Note added</span>
              )}
            </div>
          </div>

          {/* Navigation & Upload Buttons */}
          <div className="flex gap-3">
            {!isLastPhoto ? (
              <>
                <button
                  onClick={goToNextPhoto}
                  className="flex-1 bg-white hover:bg-gray-100 py-4 rounded-2xl text-black font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  Next Photo
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={uploadPhotos}
                disabled={uploading}
                className="flex-1 bg-white hover:bg-gray-100 py-4 rounded-2xl text-black font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                data-testid="upload-btn"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Upload {selectedPhotos.length} Photo{selectedPhotos.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Skip all notes option */}
          {isLastPhoto && !uploading && (
            <button
              onClick={uploadPhotos}
              className="w-full mt-3 py-3 text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              {notesAdded === 0 ? 'Upload without notes' : `Upload (${notesAdded} note${notesAdded !== 1 ? 's' : ''})`}
            </button>
          )}
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
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between border border-white/10">
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
                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                  {index + 1}
                </div>
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
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mb-8">
              <Camera className="w-16 h-16 text-white/60" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 text-center">
              Share Your Moments
            </h3>
            <p className="text-white/60 text-center mb-8 max-w-sm">
              Select up to {Math.min(photoCount.remaining, MAX_PHOTOS_PER_BATCH)} photos, then add a note to each one
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-white mb-2 text-center">
              {canAddMore ? 'Add more photos?' : 'Ready to continue!'}
            </h3>
            <p className="text-white/60 text-center mb-8 max-w-sm">
              {canAddMore 
                ? `You can add ${getMaxSelectablePhotos()} more photo${getMaxSelectablePhotos() !== 1 ? 's' : ''}`
                : 'Tap continue to add notes to your photos'}
            </p>
          </>
        )}

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-4">
          {canAddMore && (
            <>
              <button
                onClick={openCamera}
                className="w-full bg-white hover:bg-gray-100 py-5 rounded-2xl text-black font-semibold flex items-center justify-center gap-3 transition-all text-lg"
                data-testid="take-photo-btn"
              >
                <Camera className="w-6 h-6" />
                Take Photo
              </button>

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

          {selectedPhotos.length > 0 && (
            <button
              onClick={proceedToNotes}
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
        <p className={`text-sm ${photoCount.remaining > 0 ? 'text-white/60' : 'text-red-400 font-medium'}`}>
          {photoCount.remaining > 0 
            ? `You can upload ${photoCount.remaining} more photo${photoCount.remaining !== 1 ? 's' : ''} total`
            : 'Photo limit reached'}
        </p>
      </div>
    </div>
  );
};

export default GuestCamera;
