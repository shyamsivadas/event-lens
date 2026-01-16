import React, { useState, useEffect } from 'react';
import { X, Download, Share2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const PhotoGallery = ({ photos, eventName }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // Clip path variations for the "cut paper" look
  const clipPaths = [
    'polygon(0 0, 100% 4%, 100% 96%, 0 100%)',      // Slant down-right
    'polygon(0 4%, 100% 0, 100% 100%, 0 96%)',      // Slant up-right
    'polygon(0 0, 100% 6%, 100% 94%, 0 100%)',      // Aggressive cut
    'polygon(0 3%, 100% 0, 100% 97%, 0 100%)',      // Subtle slant
    'polygon(0 0, 100% 5%, 100% 100%, 0 95%)',      // Mixed
  ];

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
          text: photo.note || 'Check out this photo!',
          url: photo.download_url
        });
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
        .then(() => toast.success('Link copied!'))
        .catch(() => toast.error('Failed to copy'));
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

  // Format date/time for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Lightbox
  const renderLightbox = () => {
    if (!selectedPhoto) return null;
    
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <button onClick={closeLightbox} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="text-white/60 text-sm">{currentIndex + 1} / {photos.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => sharePhoto(selectedPhoto)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => downloadPhoto(selectedPhoto)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Download className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Image */}
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
          
          {/* Note */}
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

        {/* Thumbnails */}
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-2xl font-bold text-gray-900">{photos.length}</span>
          <span className="text-gray-500 ml-2">Moments Captured</span>
        </div>
        
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="px-6 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
          data-testid="download-all-btn"
        >
          {downloading ? 'Preparing...' : 'Download All'}
        </button>
      </div>

      {/* 837-Style Masonry Gallery */}
      <div 
        className="gallery-masonry"
        style={{
          columnCount: 3,
          columnGap: '32px',
        }}
      >
        <style>{`
          @media (max-width: 900px) {
            .gallery-masonry { column-count: 2 !important; }
          }
          @media (max-width: 600px) {
            .gallery-masonry { column-count: 1 !important; }
          }
        `}</style>
        
        {photos.map((photo, index) => (
          <div
            key={photo.photo_id}
            className="break-inside-avoid mb-8 group cursor-pointer"
            onClick={() => openLightbox(photo, index)}
            data-testid={`photo-${index}`}
          >
            {/* Image Container with Clip Path */}
            <div 
              className="relative overflow-hidden mb-3"
              style={{
                clipPath: clipPaths[index % clipPaths.length]
              }}
            >
              {photo.download_url ? (
                <img
                  src={photo.download_url}
                  alt={photo.filename}
                  className="w-full h-auto grayscale contrast-110 group-hover:grayscale-0 transition-all duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Loading...</span>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="relative pr-12">
              {/* Note Text */}
              {photo.note && (
                <p className="text-lg font-medium text-gray-900 leading-snug mb-1">
                  {photo.note}
                </p>
              )}
              
              {/* Caption - Date */}
              <p className="text-sm text-gray-500">
                {formatDate(photo.uploaded_at)}
              </p>

              {/* Logo Badge */}
              <div className="absolute right-0 bottom-0 w-9 h-9 border border-gray-900 rounded-full flex items-center justify-center">
                <span className="text-[8px] font-bold text-center leading-none">
                  {eventName.substring(0, 3).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {renderLightbox()}
    </>
  );
};

export default PhotoGallery;
