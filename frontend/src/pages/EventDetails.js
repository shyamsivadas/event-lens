import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCode } from 'react-qrcode-logo';
import { ArrowLeft, Share2, Download, Copy, Check, Image as ImageIcon, Trash2, Sparkles, BookOpen, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import PhotoGallery from '@/components/PhotoGallery';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingFlipbook, setCreatingFlipbook] = useState(false);

  useEffect(() => {
    loadEvent();
    loadPhotos();
    
    // Auto-refresh photos every 10 seconds
    const interval = setInterval(() => {
      loadPhotos(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/events/${eventId}`, {
        withCredentials: true
      });
      setEvent(response.data);
    } catch (error) {
      toast.error('Failed to load event');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/events/${eventId}/photos`, {
        withCredentials: true
      });
      setPhotos(response.data);
    } catch (error) {
      if (!silent) {
        console.error('Failed to load photos:', error);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const shareUrl = event ? `${window.location.origin}/e/${event.share_url}` : '';

  const copyToClipboard = () => {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopied(true);
          toast.success('Link copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // Fallback to old method
          fallbackCopyToClipboard();
        });
    } else {
      // Use fallback for older browsers or insecure contexts
      fallbackCopyToClipboard();
    }
  };

  const fallbackCopyToClipboard = () => {
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    } finally {
      textArea.remove();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/events/${eventId}`, {
        withCredentials: true
      });
      toast.success('Event deleted');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const createFlipbook = async () => {
    if (photos.length === 0) {
      toast.error('No photos to create flipbook');
      return;
    }

    setCreatingFlipbook(true);
    toast.info('Creating flipbook... This may take a minute');

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/events/${eventId}/create-flipbook`,
        {},
        { withCredentials: true }
      );

      toast.success('Flipbook created successfully!');
      await loadEvent();
    } catch (error) {
      console.error('Flipbook error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create flipbook');
    } finally {
      setCreatingFlipbook(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">{event.name}</h1>
          </div>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-destructive hover:text-destructive/80 transition-colors"
            data-testid="delete-event-btn"
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Share2 className="w-6 h-6 text-primary" />
              Share with Guests
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Guest Camera Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-[#1a1a1a] px-4 py-3 rounded-lg border border-border text-white"
                    data-testid="share-url-input"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="btn-primary flex items-center gap-2"
                    data-testid="copy-link-btn"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-surface rounded-lg">
                  <p className="text-muted-foreground mb-1">Event Date</p>
                  <p className="font-semibold">{event.date}</p>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                  <p className="text-muted-foreground mb-1">Filter Type</p>
                  <p className="font-semibold capitalize">{event.filter_type}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold mb-4">QR Code</h3>
            <div className="bg-white p-4 rounded-lg">
              <QRCode
                value={shareUrl}
                size={200}
                quietZone={10}
                data-testid="qr-code"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Guests can scan to access the camera
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Professional Gallery ({photos.length})
            </h2>
            <div className="flex items-center gap-2">
              {event.flipbook_url && (
                <a
                  href={event.flipbook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-2"
                  data-testid="view-flipbook-btn"
                >
                  <BookOpen className="w-4 h-4" />
                  View Flipbook
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={createFlipbook}
                disabled={creatingFlipbook || photos.length === 0}
                className="btn-primary flex items-center gap-2"
                data-testid="create-flipbook-btn"
              >
                <BookOpen className="w-4 h-4" />
                {creatingFlipbook ? 'Creating...' : event.flipbook_url ? 'Recreate Flipbook' : 'Create Flipbook'}
              </button>
              <button
                onClick={() => loadPhotos()}
                disabled={refreshing}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No photos yet. Share the link with guests to start collecting!</p>
            </div>
          ) : (
            <PhotoGallery 
              photos={photos} 
              eventName={event.name}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;