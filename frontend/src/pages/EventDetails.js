import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCode } from 'react-qrcode-logo';
import { ArrowLeft, Share2, Download, Copy, Check, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadEvent();
    loadPhotos();
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

  const loadPhotos = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/events/${eventId}/photos`, {
        withCredentials: true
      });
      setPhotos(response.data);
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const shareUrl = event ? `${window.location.origin}/e/${event.share_url}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
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
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-primary" />
            Photo Gallery ({photos.length})
          </h2>
          
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No photos yet. Share the link with guests to start collecting!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.photo_id}
                  className="aspect-square bg-surface rounded-lg overflow-hidden border border-border group relative"
                >
                  {photo.download_url ? (
                    <img
                      src={photo.download_url}
                      alt={photo.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <a
                      href={photo.download_url}
                      download={photo.filename}
                      className="text-white text-sm font-medium"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;