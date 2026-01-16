import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, MessageSquare, Share2 } from 'lucide-react';
import { toast } from 'sonner';

// Social media icons as SVG components
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const SnapchatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.509 0-.904.074-1.274.134-.209.045-.405.074-.539.074-.24 0-.434-.119-.555-.405-.061-.193-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PhotoGallery = ({ photos, eventName }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(null); // photo index or null

  // Clip path variations for the "cut paper" look
  const clipPaths = [
    'polygon(0 0, 100% 4%, 100% 96%, 0 100%)',
    'polygon(0 4%, 100% 0, 100% 100%, 0 96%)',
    'polygon(0 0, 100% 6%, 100% 94%, 0 100%)',
    'polygon(0 3%, 100% 0, 100% 97%, 0 100%)',
    'polygon(0 0, 100% 5%, 100% 100%, 0 95%)',
  ];

  const openLightbox = (photo, index) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
    setShowShareMenu(null);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
    setShowShareMenu(null);
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

  const downloadPhoto = async (photo, e) => {
    if (e) e.stopPropagation();
    
    try {
      // Use direct download endpoint
      const downloadUrl = `${BACKEND_URL}/api/photos/${photo.photo_id}/download`;
      
      const response = await fetch(downloadUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = photo.filename || 'photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      toast.success('Photo downloaded!');
    } catch (error) {
      console.error('Download error:', error);
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

  // Social sharing functions
  const shareToFacebook = (photo, e) => {
    if (e) e.stopPropagation();
    const url = encodeURIComponent(photo.download_url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
    setShowShareMenu(null);
  };

  const shareToTwitter = (photo, e) => {
    if (e) e.stopPropagation();
    const url = encodeURIComponent(photo.download_url);
    const text = encodeURIComponent(photo.note || `Check out this photo from ${eventName}!`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
    setShowShareMenu(null);
  };

  const shareToInstagram = async (photo, e) => {
    if (e) e.stopPropagation();
    // Instagram doesn't support direct URL sharing, so we copy the link
    try {
      await navigator.clipboard.writeText(photo.download_url);
      toast.success('Link copied! Open Instagram and paste in your story or post');
    } catch {
      toast.error('Failed to copy link');
    }
    setShowShareMenu(null);
  };

  const shareToSnapchat = (photo, e) => {
    if (e) e.stopPropagation();
    // Snapchat web sharing
    const url = encodeURIComponent(photo.download_url);
    window.open(`https://www.snapchat.com/share?url=${url}`, '_blank', 'width=600,height=400');
    setShowShareMenu(null);
  };

  const toggleShareMenu = (index, e) => {
    if (e) e.stopPropagation();
    setShowShareMenu(showShareMenu === index ? null : index);
  };

  const copyLink = async (photo, e) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(photo.download_url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
    setShowShareMenu(null);
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

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowShareMenu(null);
    if (showShareMenu !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showShareMenu]);

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

  // Share menu component
  const ShareMenu = ({ photo, index, isLightbox = false }) => (
    <div 
      className={`absolute ${isLightbox ? 'bottom-full mb-2 right-0' : 'top-full mt-2 right-0'} bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[180px]`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Share to</div>
      
      <button 
        onClick={(e) => shareToInstagram(photo, e)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-700"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-lg flex items-center justify-center text-white">
          <InstagramIcon />
        </div>
        <span className="font-medium">Instagram</span>
      </button>
      
      <button 
        onClick={(e) => shareToFacebook(photo, e)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-700"
      >
        <div className="w-8 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center text-white">
          <FacebookIcon />
        </div>
        <span className="font-medium">Facebook</span>
      </button>
      
      <button 
        onClick={(e) => shareToSnapchat(photo, e)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-700"
      >
        <div className="w-8 h-8 bg-[#FFFC00] rounded-lg flex items-center justify-center text-black">
          <SnapchatIcon />
        </div>
        <span className="font-medium">Snapchat</span>
      </button>
      
      <button 
        onClick={(e) => shareToTwitter(photo, e)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-700"
      >
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
          <TwitterIcon />
        </div>
        <span className="font-medium">X (Twitter)</span>
      </button>
      
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button 
          onClick={(e) => copyLink(photo, e)}
          className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-700"
        >
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-medium">Copy Link</span>
        </button>
      </div>
    </div>
  );

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
            <div className="relative">
              <button 
                onClick={(e) => toggleShareMenu('lightbox', e)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Share2 className="w-5 h-5 text-white" />
              </button>
              {showShareMenu === 'lightbox' && <ShareMenu photo={selectedPhoto} index="lightbox" isLightbox />}
            </div>
            <button onClick={(e) => downloadPhoto(selectedPhoto, e)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
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
              
              {/* Hover Actions - Bottom Corner */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button
                  onClick={(e) => downloadPhoto(photo, e)}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-md"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => toggleShareMenu(index, e)}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-md"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4 text-gray-700" />
                  </button>
                  {showShareMenu === index && <ShareMenu photo={photo} index={index} />}
                </div>
              </div>
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
