import React, { useState, useEffect } from 'react';
import { X, Download, Share2, ChevronLeft, ChevronRight, ZoomIn, Heart, Eye, Grid, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

const PhotoGallery = ({ photos, eventName, galleryStyle = 'memory_archive' }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'styled'

  const openLightbox = (photo, index) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
    setPreviewMode(false);
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

  // Get style name for display
  const getStyleName = () => {
    const styles = {
      memory_archive: 'Memory Archive',
      typography_collage: 'Typography Collage',
      minimalist_story: 'Minimalist Story'
    };
    return styles[galleryStyle] || 'Gallery';
  };

  // Render Memory Archive style - Scattered polaroid layout
  const renderMemoryArchiveGrid = () => (
    <div className="space-y-4">
      {/* Scattered layout with varying sizes */}
      <div className="grid grid-cols-12 gap-3 auto-rows-[150px]">
        {photos.map((photo, index) => {
          // Create varied grid spans for scattered effect
          const patterns = [
            'col-span-4 row-span-2', // Large
            'col-span-3 row-span-1', // Medium
            'col-span-5 row-span-2', // Wide
            'col-span-4 row-span-1', // Normal
            'col-span-3 row-span-2', // Tall
            'col-span-5 row-span-1', // Wide small
          ];
          const pattern = patterns[index % patterns.length];
          
          return (
            <div
              key={photo.photo_id}
              className={`${pattern} group relative cursor-pointer`}
              onClick={() => openLightbox(photo, index)}
            >
              {/* Polaroid frame effect */}
              <div className="absolute inset-0 bg-white p-2 pb-8 shadow-lg transform rotate-[var(--rotation)] hover:rotate-0 transition-transform duration-300"
                   style={{ '--rotation': `${(index % 5 - 2) * 2}deg` }}>
                {photo.download_url ? (
                  <img
                    src={photo.download_url}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                {/* Photo number label */}
                <div className="absolute bottom-1 left-2 text-xs text-gray-500 font-mono">
                  #{index + 1}
                </div>
              </div>
              {/* Preview button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhoto(photo);
                  setCurrentIndex(index);
                  setPreviewMode(true);
                }}
                className="absolute top-4 right-4 p-2 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                data-testid={`preview-${index}`}
              >
                <Eye className="w-4 h-4 text-white" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Typography Collage style - Bold with text overlays
  const renderTypographyCollageGrid = () => {
    const colors = ['bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500'];
    const overlayTexts = ['LOVE', 'JOY', 'LIFE', 'FUN', 'EPIC', 'WOW', 'YES', 'MAGIC'];
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        {photos.map((photo, index) => (
          <div
            key={photo.photo_id}
            className={`group relative aspect-square cursor-pointer overflow-hidden ${colors[index % colors.length]}`}
            onClick={() => openLightbox(photo, index)}
          >
            {photo.download_url ? (
              <img
                src={photo.download_url}
                alt={photo.filename}
                className="w-full h-full object-cover mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white/50" />
              </div>
            )}
            
            {/* Bold typography overlay */}
            <div className="absolute inset-0 flex items-end p-3">
              <span className="text-4xl md:text-5xl font-black text-white/30 leading-none">
                {overlayTexts[index % overlayTexts.length]}
              </span>
            </div>
            
            {/* Border frame */}
            <div className="absolute inset-1 border-2 border-white/30 pointer-events-none" />
            
            {/* Preview button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhoto(photo);
                setCurrentIndex(index);
                setPreviewMode(true);
              }}
              className="absolute top-3 right-3 p-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              data-testid={`preview-${index}`}
            >
              <Eye className="w-4 h-4 text-black" />
            </button>
            
            {/* Photo number */}
            <div className="absolute top-3 left-3 text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Minimalist Story style - Clean Instagram-like
  const renderMinimalistStoryGrid = () => (
    <div className="bg-white rounded-xl overflow-hidden">
      {/* Instagram-style progress dots */}
      <div className="flex gap-1 p-3 justify-center">
        {photos.slice(0, 10).map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 max-w-[40px] rounded-full ${
              index < photos.length ? 'bg-gray-800' : 'bg-gray-200'
            }`}
          />
        ))}
        {photos.length > 10 && (
          <span className="text-xs text-gray-400 ml-2">+{photos.length - 10}</span>
        )}
      </div>
      
      {/* Clean grid */}
      <div className="grid grid-cols-3 gap-[2px] p-[2px] bg-gray-100">
        {photos.map((photo, index) => (
          <div
            key={photo.photo_id}
            className="group relative aspect-square cursor-pointer bg-white"
            onClick={() => openLightbox(photo, index)}
          >
            {photo.download_url ? (
              <img
                src={photo.download_url}
                alt={photo.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <ZoomIn className="w-6 h-6 text-gray-300" />
              </div>
            )}
            
            {/* Subtle hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
            
            {/* Preview button - minimal style */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhoto(photo);
                setCurrentIndex(index);
                setPreviewMode(true);
              }}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`preview-${index}`}
            >
              <div className="p-3 bg-white/90 rounded-full shadow-lg">
                <Eye className="w-5 h-5 text-gray-800" />
              </div>
            </button>
          </div>
        ))}
      </div>
      
      {/* Bottom bar */}
      <div className="p-3 border-t border-gray-100 text-center">
        <span className="text-sm text-gray-500">{photos.length} moments captured</span>
      </div>
    </div>
  );

  // Standard grid view (default fallback)
  const renderStandardGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {photos.map((photo, index) => (
        <div
          key={photo.photo_id}
          className="group relative aspect-square cursor-pointer overflow-hidden bg-gray-100 rounded-lg"
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
          
          {/* Preview button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPhoto(photo);
              setCurrentIndex(index);
              setPreviewMode(true);
            }}
            className="absolute top-3 left-3 p-2 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`preview-${index}`}
          >
            <Eye className="w-4 h-4 text-gray-700" />
          </button>
          
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

  // Render styled preview in lightbox based on gallery style
  const renderStyledPreview = () => {
    if (!selectedPhoto) return null;
    
    const styleConfigs = {
      memory_archive: {
        bg: 'bg-gray-900',
        frame: 'bg-white p-4 pb-12 shadow-2xl',
        label: 'Memory Archive',
        labelStyle: 'text-white/60 font-mono text-sm'
      },
      typography_collage: {
        bg: 'bg-yellow-500',
        frame: 'border-4 border-white',
        label: 'Typography Collage',
        labelStyle: 'text-black font-black text-lg'
      },
      minimalist_story: {
        bg: 'bg-white',
        frame: '',
        label: 'Minimalist Story',
        labelStyle: 'text-gray-500 text-sm'
      }
    };
    
    const config = styleConfigs[galleryStyle] || styleConfigs.memory_archive;
    
    return (
      <div className={`fixed inset-0 z-50 ${config.bg} flex flex-col`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-black/20">
          <div className="flex items-center gap-4">
            <button
              onClick={closeLightbox}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div>
              <span className={config.labelStyle}>{config.label}</span>
              <span className="text-white/40 mx-2">•</span>
              <span className="text-white/60 text-sm">{currentIndex + 1} / {photos.length}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(false)}
              className="px-3 py-1.5 text-sm text-white/80 hover:text-white border border-white/30 rounded-full hover:bg-white/10 transition-colors"
            >
              Exit Preview
            </button>
            <button
              onClick={() => downloadPhoto(selectedPhoto)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Styled Image Display */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Image with style-specific frame */}
          <div className={`max-w-3xl max-h-[70vh] ${config.frame}`}>
            <img
              src={selectedPhoto.download_url}
              alt={selectedPhoto.filename}
              className="max-h-full max-w-full object-contain"
            />
            {galleryStyle === 'memory_archive' && (
              <div className="text-center mt-2 text-gray-400 text-sm font-mono">
                #{currentIndex + 1} • {eventName}
              </div>
            )}
            {galleryStyle === 'typography_collage' && (
              <div className="absolute bottom-4 left-4 text-6xl font-black text-white/30">
                {['LOVE', 'JOY', 'LIFE', 'FUN'][currentIndex % 4]}
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="p-4 bg-black/30">
          <div className="flex gap-2 overflow-x-auto justify-center">
            {photos.map((photo, index) => (
              <button
                key={photo.photo_id}
                onClick={() => {
                  setCurrentIndex(index);
                  setSelectedPhoto(photo);
                }}
                className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-white scale-110'
                    : 'border-transparent opacity-50 hover:opacity-80'
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
    );
  };

  // Standard lightbox
  const renderLightbox = () => {
    if (!selectedPhoto) return null;
    
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button onClick={closeLightbox} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-sm text-gray-600 font-medium">{currentIndex + 1} / {photos.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => sharePhoto(selectedPhoto)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={() => downloadPhoto(selectedPhoto)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Download className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 relative">
          {photos.length > 1 && (
            <>
              <button onClick={prevPhoto} className="absolute left-4 p-3 bg-white shadow-lg rounded-full hover:bg-gray-50">
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <button onClick={nextPhoto} className="absolute right-4 p-3 bg-white shadow-lg rounded-full hover:bg-gray-50">
                <ChevronRight className="w-6 h-6 text-gray-700" />
              </button>
            </>
          )}
          <img src={selectedPhoto.download_url} alt={selectedPhoto.filename} className="max-h-full max-w-full object-contain" />
        </div>

        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((photo, index) => (
              <button
                key={photo.photo_id}
                onClick={() => { setCurrentIndex(index); setSelectedPhoto(photo); }}
                className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all ${
                  index === currentIndex ? 'border-black' : 'border-transparent opacity-60 hover:opacity-100'
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

  // Render gallery based on selected style
  const renderGallery = () => {
    if (viewMode === 'grid') {
      return renderStandardGrid();
    }
    
    switch (galleryStyle) {
      case 'memory_archive':
        return renderMemoryArchiveGrid();
      case 'typography_collage':
        return renderTypographyCollageGrid();
      case 'minimalist_story':
        return renderMinimalistStoryGrid();
      default:
        return renderStandardGrid();
    }
  };

  return (
    <>
      {/* Gallery Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
          </span>
          
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('styled')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'styled' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title={`${getStyleName()} View`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          
          {viewMode === 'styled' && (
            <span className="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded-full">
              {getStyleName()}
            </span>
          )}
        </div>
        
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="px-6 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
          data-testid="download-all-btn"
        >
          {downloading ? 'Downloading...' : 'Download All'}
        </button>
      </div>

      {/* Gallery */}
      {renderGallery()}

      {/* Lightbox */}
      {selectedPhoto && (previewMode ? renderStyledPreview() : renderLightbox())}
    </>
  );
};

export default PhotoGallery;
