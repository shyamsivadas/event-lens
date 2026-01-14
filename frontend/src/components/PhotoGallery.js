import React, { useState, useEffect } from 'react';
import { X, Download, Share2, ChevronLeft, ChevronRight, ZoomIn, Heart } from 'lucide-react';
import { toast } from 'sonner';

const PhotoGallery = ({ photos, eventName }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [downloading, setDownloading] = useState(false);

  const openLightbox = (photo, index) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const nextPhoto = () => {
    const newIndex = (currentIndex + 1) % photos.length;
    setCurrentIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const prevPhoto = () => {
    const newIndex = (currentIndex - 1 + photos.length) % photos.length;
    setCurrentIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const toggleFavorite = (photoId) => {
    if (favorites.includes(photoId)) {
      setFavorites(favorites.filter(id => id !== photoId));
    } else {
      setFavorites([...favorites, photoId]);
    }
  };

  const downloadPhoto = async (photo) => {
    try {
      const response = await fetch(photo.download_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Photo downloaded!');
    } catch (error) {
      toast.error('Failed to download photo');
    }
  };

  const downloadAll = async () => {
    setDownloading(true);
    toast.info('Preparing download...');
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const response = await fetch(photo.download_url);
          const blob = await response.blob();
          zip.file(photo.filename, blob);
        } catch (error) {
          console.error(`Failed to download ${photo.filename}`);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventName.replace(/\s+/g, '-')}-photos.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('All photos downloaded!');
    } catch (error) {
      toast.error('Failed to download photos');
    } finally {
      setDownloading(false);
    }
  };

  const sharePhoto = async (photo) => {
    if (navigator.share && navigator.canShare) {
      try {
        await navigator.share({
          title: eventName,
          text: 'Check out this photo!',
          url: photo.download_url
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(photo.download_url);
        }
      }
    } else {
      copyToClipboard(photo.download_url);
    }
  };

  const copyToClipboard = (url) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => {
          toast.success('Link copied to clipboard!');
        })
        .catch(() => {
          fallbackCopyToClipboard(url);
        });
    } else {
      fallbackCopyToClipboard(url);
    }
  };

  const fallbackCopyToClipboard = (url) => {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    } finally {
      textArea.remove();
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!selectedPhoto) return;
      
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPhoto]);

  return (
    <>
      {/* Pixieset-style Gallery Controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-sm text-gray-500">
          {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
        </div>
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="px-6 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="download-all-btn"
        >
          {downloading ? 'Downloading...' : 'Download All'}
        </button>
      </div>

      {/* Pixieset-style Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.photo_id}
            className="group relative aspect-square cursor-pointer overflow-hidden bg-gray-100"
            onClick={() => openLightbox(photo, index)}
            data-testid={`photo-${index}`}
          >
            {photo.download_url ? (
              <img
                src={photo.download_url}
                alt={photo.filename}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ZoomIn className="w-8 h-8" />
              </div>
            )}
            
            {/* Hover Overlay - Pixieset Style */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
            
            {/* Favorite Icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(photo.photo_id);
              }}
              className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white"
              data-testid={`favorite-${index}`}
            >
              <Heart
                className={`w-4 h-4 ${
                  favorites.includes(photo.photo_id)
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-700'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Pixieset-style Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col"
          data-testid="lightbox-modal"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={closeLightbox}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="close-lightbox-btn"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
              <span className="text-sm text-gray-600 font-medium">
                {currentIndex + 1} / {photos.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sharePhoto(selectedPhoto);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadPhoto(selectedPhoto);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Download className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Image Display Area */}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            {/* Navigation Buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  className="absolute left-4 p-3 bg-white shadow-lg rounded-full hover:bg-gray-50 transition-colors z-10"
                  data-testid="prev-photo-btn"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  className="absolute right-4 p-3 bg-white shadow-lg rounded-full hover:bg-gray-50 transition-colors z-10"
                  data-testid="next-photo-btn"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              </>
            )}

            {/* Main Image */}
            <img
              src={selectedPhoto.download_url}
              alt={selectedPhoto.filename}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Bottom Thumbnail Strip */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <button
                  key={photo.photo_id}
                  onClick={() => {
                    setCurrentIndex(index);
                    setSelectedPhoto(photo);
                  }}
                  className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-black'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo.download_url}
                    alt="thumbnail"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;