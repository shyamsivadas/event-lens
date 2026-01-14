import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CreateEvent = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    logo_url: '',
    filter_type: 'warm',
    max_photos: 5,
    flipbook_style: 'memory_archive'
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/events`,
        formData,
        { withCredentials: true }
      );
      
      toast.success('Event created successfully!');
      navigate(`/events/${response.data.event_id}`);
    } catch (error) {
      toast.error('Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Create Event</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Event Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#1a1a1a] px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-white placeholder:text-gray-500"
                placeholder="My Awesome Event"
                data-testid="event-name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Event Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-[#1a1a1a] px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-white [color-scheme:dark]"
                data-testid="event-date-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Logo URL (optional)</label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full bg-[#1a1a1a] px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-white placeholder:text-gray-500"
                placeholder="https://example.com/logo.png"
                data-testid="event-logo-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Visual Filter</label>
              <select
                value={formData.filter_type}
                onChange={(e) => setFormData({ ...formData, filter_type: e.target.value })}
                className="w-full bg-[#1a1a1a] px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-white"
                data-testid="filter-select"
              >
                <option value="warm">Warm</option>
                <option value="party">Party</option>
                <option value="wedding">Wedding Soft</option>
                <option value="corporate">Corporate Clean</option>
                <option value="vintage">Vintage</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Photos Per Guest</label>
              <input
                type="number"
                value={formData.max_photos}
                onChange={(e) => setFormData({ ...formData, max_photos: parseInt(e.target.value) })}
                min="1"
                max="20"
                className="w-full bg-[#1a1a1a] px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-white"
                data-testid="max-photos-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Flipbook Gallery Style</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Memory Archive Style */}
                <div
                  onClick={() => setFormData({ ...formData, flipbook_style: 'memory_archive' })}
                  data-testid="flipbook-style-memory-archive"
                  className={`cursor-pointer rounded-lg border-2 transition-all p-4 ${
                    formData.flipbook_style === 'memory_archive'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <div className="grid grid-cols-3 gap-1 p-2 w-full h-full">
                      <div className="bg-gray-600 rounded"></div>
                      <div className="bg-gray-500 rounded col-span-2"></div>
                      <div className="bg-gray-700 rounded row-span-2"></div>
                      <div className="bg-gray-600 rounded"></div>
                      <div className="bg-gray-500 rounded"></div>
                      <div className="bg-gray-600 rounded"></div>
                      <div className="bg-gray-500 rounded col-span-2"></div>
                    </div>
                  </div>
                  <h4 className="font-semibold mb-1">Memory Archive</h4>
                  <p className="text-xs text-muted-foreground">Documentary style with scattered grid layout</p>
                </div>

                {/* Typography Collage Style */}
                <div
                  onClick={() => setFormData({ ...formData, flipbook_style: 'typography_collage' })}
                  className={`cursor-pointer rounded-lg border-2 transition-all p-4 ${
                    formData.flipbook_style === 'typography_collage'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="aspect-square bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 grid grid-cols-4 gap-1 p-2 opacity-40">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="bg-black rounded"></div>
                      ))}
                    </div>
                    <div className="relative text-black font-bold text-2xl">TYPE</div>
                  </div>
                  <h4 className="font-semibold mb-1">Typography Collage</h4>
                  <p className="text-xs text-muted-foreground">Bold text overlay with artistic arrangement</p>
                </div>

                {/* Minimalist Story Style */}
                <div
                  onClick={() => setFormData({ ...formData, flipbook_style: 'minimalist_story' })}
                  className={`cursor-pointer rounded-lg border-2 transition-all p-4 ${
                    formData.flipbook_style === 'minimalist_story'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="aspect-square bg-white rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full p-3 flex flex-col">
                      <div className="flex gap-1 mb-2">
                        <div className="w-1/3 h-2 bg-gray-300 rounded"></div>
                        <div className="w-1/3 h-2 bg-gray-300 rounded"></div>
                        <div className="w-1/3 h-2 bg-gray-300 rounded"></div>
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-1">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className="bg-gray-200 rounded"></div>
                        ))}
                      </div>
                      <div className="h-3 bg-gray-800 rounded mt-2"></div>
                    </div>
                  </div>
                  <h4 className="font-semibold mb-1">Minimalist Story</h4>
                  <p className="text-xs text-muted-foreground">Clean Instagram-style with organized layout</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="btn-primary w-full"
              data-testid="create-event-submit-btn"
            >
              {creating ? 'Creating...' : 'Create Event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;