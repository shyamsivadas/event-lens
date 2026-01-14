import React, { useState, useEffect } from 'react';
import { X, Download, Share2, ChevronLeft, ChevronRight, ZoomIn, Heart, MessageSquare } from 'lucide-react';
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
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => fallbackCopyToClipboard(url));
    } else {
      fallbackCopyToClipboard(url);
    }
  };

  const fallbackCopyToClipboard = (url) => {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      toast.success('Link copied to clipboard!');
    } catch (err) {
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
  }, [selectedPhoto, currentIndex]);

  // Simple photo grid
  const renderPhotoGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map((photo, index) => (
        <div
          key={photo.photo_id}
          className="group relative aspect-square cursor-pointer overflow-hidden bg-gray-100 rounded-xl"
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
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
          
          {/* Note indicator on hover */}
          {photo.note && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-start gap-1.5">
                <MessageSquare className="w-3 h-3 text-white/70 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white line-clamp-2">{photo.note}</p>
              </div>
            </div>
          )}
          
          {/* Note badge (always visible) */}
          {photo.note && (
            <div className="absolute bottom-2 right-2 p-1.5 bg-primary rounded-full group-hover:opacity-0 transition-opacity">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
          )}
          
          {/* Favorite button */}
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
  );

  // Lightbox
  const renderLightbox = () => {
    if (!selectedPhoto) return null;
    
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={closeLightbox} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
            <span className="text-sm text-white/60">{currentIndex + 1} / {photos.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => sharePhoto(selectedPhoto)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => downloadPhoto(selectedPhoto)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Download className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Image container */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
          {photos.length > 1 && (
            <>
              <button onClick={prevPhoto} className="absolute left-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={nextPhoto} className="absolute right-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
          
          <img 
            src={selectedPhoto.download_url} 
            alt={selectedPhoto.filename} 
            className="max-h-[60vh] max-w-full object-contain rounded-lg" 
          />
          
          {/* Note display */}
          {selectedPhoto.note && (
            <div className="mt-4 max-w-lg w-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-white/60 flex-shrink-0 mt-0.5" />
                  <p className="text-white/90 text-sm leading-relaxed">{selectedPhoto.note}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        <div className="p-4 bg-black/50">
          <div className="flex gap-2 overflow-x-auto justify-center pb-2">
            {photos.map((photo, index) => (
              <button
                key={photo.photo_id}
                onClick={() => { setCurrentIndex(index); setSelectedPhoto(photo); }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img src={photo.download_url} alt="thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Gallery Controls */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-500">
          {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
        </span>
        
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
          data-testid="download-all-btn"
        >
          {downloading ? 'Downloading...' : 'Download All'}
        </button>
      </div>

      {/* Photo Grid */}
      {renderPhotoGrid()}

      {/* Lightbox */}
      {renderLightbox()}
    </>
  );
};

export default PhotoGallery;
