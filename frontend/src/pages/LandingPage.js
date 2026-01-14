import React from 'react';
import { Camera, Sparkles, Zap, Users, Download, QrCode, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-8 h-8 text-black" />
            <span className="text-2xl font-bold">Event Lens</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-medium"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              Collect Event Photos
              <br />
              <span className="text-gray-400">Instantly</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Let your guests capture memories with their phones. Share one link, collect unlimited photos with instant filters. No app downloads required.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-black text-white rounded-full hover:bg-gray-800 transition-all font-medium text-lg flex items-center gap-2 group"
              >
                Start Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                className="px-8 py-4 border-2 border-black text-black rounded-full hover:bg-black hover:text-white transition-all font-medium text-lg"
              >
                See Demo
              </button>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-20 relative">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center shadow-2xl">
              <div className="text-center">
                <Camera className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Hero Demo Preview</p>
              </div>
            </div>
            {/* Floating Elements */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-yellow-400 rounded-full opacity-60 blur-xl" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-400 rounded-full opacity-60 blur-xl" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Three simple steps to collect event photos</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">1. Share Link</h3>
              <p className="text-gray-600 leading-relaxed">
                Create your event and get a unique shareable link or QR code. No app installation needed.
              </p>
            </div>

            <div className="bg-white p-10 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">2. Guests Capture</h3>
              <p className="text-gray-600 leading-relaxed">
                Guests open the link, camera launches instantly with live filters. Up to 5 photos per guest.
              </p>
            </div>

            <div className="bg-white p-10 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">3. Download All</h3>
              <p className="text-gray-600 leading-relaxed">
                View photos in real-time gallery. Download all at once or create beautiful magazine flipbooks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold mb-16 text-center">Powerful Features</h2>
          
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <Sparkles className="w-12 h-12 mb-4" />
              <h3 className="text-3xl font-bold mb-4">Live Filters</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                Apply professional filters in real-time. Choose from Warm, Party, Wedding, Corporate, or Vintage styles.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5" />
                  <span>Canvas-based processing</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5" />
                  <span>Consistent event aesthetic</span>
                </div>
              </div>
            </div>

            <div>
              <Zap className="w-12 h-12 mb-4" />
              <h3 className="text-3xl font-bold mb-4">Instant Upload</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                Photos automatically upload to cloud storage. See them appear in your gallery in real-time.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5" />
                  <span>Cloudflare R2 storage</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5" />
                  <span>Real-time gallery updates</span>
                </div>
              </div>
            </div>

            <div>
              <Users className="w-12 h-12 mb-4" />
              <h3 className="text-3xl font-bold mb-4">Guest Management</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                Smart device fingerprinting limits photos per guest. No login required, completely frictionless.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5" />
                  <span>Photo limits per device</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5" />
                  <span>No guest authentication</span>
                </div>
              </div>
            </div>

            <div>
              <Download className="w-12 h-12 mb-4" />
              <h3 className="text-3xl font-bold mb-4">Magazine Flipbooks</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                Create stunning magazine-style flipbooks with one click. Professional presentation for your event photos.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5" />
                  <span>Heyzine integration</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5" />
                  <span>Shareable flipbook URLs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Ready to Capture Memories?</h2>
          <p className="text-xl text-gray-300 mb-10">
            Start collecting photos from your next event in minutes. No credit card required.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-5 bg-white text-black rounded-full hover:bg-gray-100 transition-all font-medium text-lg inline-flex items-center gap-2 group"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-6 h-6" />
              <span className="text-lg font-bold">Event Lens</span>
            </div>
            <p className="text-gray-600 text-sm">
              © 2025 Event Lens. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;