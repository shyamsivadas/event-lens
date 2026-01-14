import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Play, Pause, ChevronLeft, ChevronRight, Grid3x3, LayoutGrid, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';

const PhotoGallery = ({ photos, eventName }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [layout, setLayout] = useState('grid'); // 'grid' or 'masonry'
  const [filter, setFilter] = useState('all');
  const [downloading, setDownloading] = useState(false);

  // Slideshow auto-advance
  useEffect(() => {
    if (isSlideshow && photos.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
        setSelectedPhoto(photos[(currentIndex + 1) % photos.length]);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [isSlideshow, currentIndex, photos]);

  const openLightbox = (photo, index) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
    setIsSlideshow(false);
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
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => {
          toast.success('Link copied to clipboard!');
        })
        .catch(() => {
          // Fallback to old method
          fallbackCopyToClipboard(url);
        });
    } else {
      // Use fallback for older browsers or insecure contexts
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

  const startSlideshow = () => {
    setIsSlideshow(true);
    if (!selectedPhoto && photos.length > 0) {
      setSelectedPhoto(photos[0]);
      setCurrentIndex(0);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!selectedPhoto) return;
      
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === ' ') setIsSlideshow(!isSlideshow);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPhoto, isSlideshow]);

  return (
    <>
      {/* Gallery Controls */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayout('grid')}
            className={`p-2 rounded-lg transition-colors ${
              layout === 'grid' ? 'bg-primary text-white' : 'bg-surface text-muted-foreground hover:bg-surface/80'
            }`}
            data-testid="grid-layout-btn"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLayout('masonry')}
            className={`p-2 rounded-lg transition-colors ${
              layout === 'masonry' ? 'bg-primary text-white' : 'bg-surface text-muted-foreground hover:bg-surface/80'
            }`}
            data-testid="masonry-layout-btn"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startSlideshow}
            className="btn-primary flex items-center gap-2"
            data-testid="start-slideshow-btn"
          >
            <Play className="w-4 h-4" />
            Slideshow
          </button>
          <button
            onClick={downloadAll}
            disabled={downloading}
            className="btn-primary flex items-center gap-2"
            data-testid="download-all-btn"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Downloading...' : 'Download All'}
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div
        className={`${
          layout === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4'
        }`}
      >
        {photos.map((photo, index) => (
          <div
            key={photo.photo_id}
            className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-surface transition-all hover:border-primary/50 hover:scale-[1.02]"
            onClick={() => openLightbox(photo, index)}
            data-testid={`photo-${index}`}
          >
            <div className="aspect-square w-full overflow-hidden">
              {photo.download_url ? (
                <img
                  src={photo.download_url}
                  alt={photo.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-surface">
                  <ZoomIn className="w-8 h-8" />
                </div>
              )}
            </div>
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadPhoto(photo);
                  }}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                  data-testid={`download-photo-${index}`}
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sharePhoto(photo);
                  }}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                  data-testid={`share-photo-${index}`}
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          data-testid="lightbox-modal"
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
            data-testid="close-lightbox-btn"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 glass px-4 py-2 rounded-full text-white font-mono z-10">
            {currentIndex + 1} / {photos.length}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevPhoto();
            }}
            className="absolute left-4 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
            data-testid="prev-photo-btn"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextPhoto();
            }}
            className="absolute right-4 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
            data-testid="next-photo-btn"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Control Buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 glass px-4 py-2 rounded-full z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSlideshow(!isSlideshow);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              data-testid="toggle-slideshow-btn"
            >
              {isSlideshow ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadPhoto(selectedPhoto);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                sharePhoto(selectedPhoto);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Main Image */}
          <img
            src={selectedPhoto.download_url}
            alt={selectedPhoto.filename}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default PhotoGallery;