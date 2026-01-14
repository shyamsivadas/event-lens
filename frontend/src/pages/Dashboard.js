import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Calendar, Image, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/events`, {
        withCredentials: true
      });
      setEvents(response.data);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Event Lens</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold mb-2">Your Events</h2>
            <p className="text-muted-foreground">Create and manage photo collection events</p>
          </div>
          <button
            onClick={() => navigate('/events/create')}
            className="btn-primary flex items-center gap-2"
            data-testid="create-event-btn"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No events yet</h3>
            <p className="text-muted-foreground mb-6">Create your first event to start collecting photos</p>
            <button
              onClick={() => navigate('/events/create')}
              className="btn-primary"
            >
              Create Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.event_id}
                onClick={() => navigate(`/events/${event.event_id}`)}
                className="glass rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-all"
                data-testid={`event-card-${event.event_id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{event.name}</h3>
                    <p className="text-sm text-muted-foreground">{event.date}</p>
                  </div>
                  {event.logo_url && (
                    <img
                      src={event.logo_url}
                      alt="Event logo"
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Image className="w-4 h-4" />
                  <span>Filter: {event.filter_type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;