import React from 'react';
import { Camera, Sparkles, Zap, Users, Download, QrCode, ArrowRight, Check, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              SnapShare
            </span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full hover:opacity-90 transition-opacity font-medium shadow-lg shadow-violet-500/25"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-400 rounded-full opacity-20 blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-indigo-400 rounded-full opacity-20 blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full mb-8">
              <Star className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">No App Download Required</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Collect Event Photos
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Instantly
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              Let your guests capture memories with their phones. Share one link, collect unlimited photos with instant filters. No app downloads required.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full hover:opacity-90 transition-all font-semibold text-lg flex items-center justify-center gap-2 group shadow-xl shadow-violet-500/30"
              >
                Start Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-full hover:border-violet-300 hover:bg-violet-50 transition-all font-semibold text-lg"
              >
                See Demo
              </button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-20 relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-gray-900/10 border border-gray-200">
              <img 
                src="https://customer-assets.emergentagent.com/job_snapshare-157/artifacts/b4m1ii9i_ChatGPT%20Image%20Jan%2014%2C%202026%2C%2011_39_28%20PM.png"
                alt="SnapShare Gallery Preview - Archive style photo collage"
                className="w-full h-auto object-cover"
              />
            </div>
            {/* Floating Elements */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-40 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-violet-400 to-indigo-400 rounded-full opacity-40 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-xl text-gray-500">Three simple steps to collect event photos</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-violet-500/5 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
                <QrCode className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">1. Share Link</h3>
              <p className="text-gray-500 leading-relaxed">
                Create your event and get a unique shareable link or QR code. No app installation needed.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-violet-500/5 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">2. Guests Capture</h3>
              <p className="text-gray-500 leading-relaxed">
                Guests open the link and capture photos instantly. Up to 5 photos per guest with notes.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-violet-500/5 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                <Download className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">3. Download All</h3>
              <p className="text-gray-500 leading-relaxed">
                View photos in real-time gallery. Download all at once or create beautiful magazine flipbooks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-xl text-gray-500">Everything you need for event photography</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-8 rounded-3xl border border-violet-100">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Photo Notes</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Guests can add personal notes to each photo, capturing the story behind every moment.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-violet-600" />
                  <span>Individual notes per photo</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-violet-600" />
                  <span>Display in gallery & flipbook</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Instant Upload</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Photos automatically upload to cloud storage. See them appear in your gallery in real-time.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-indigo-600" />
                  <span>Cloudflare R2 storage</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-indigo-600" />
                  <span>Real-time gallery updates</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-3xl border border-purple-100">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Guest Management</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Smart device fingerprinting limits photos per guest. No login required, completely frictionless.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-purple-600" />
                  <span>Photo limits per device</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-purple-600" />
                  <span>No guest authentication</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-3xl border border-pink-100">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Magazine Flipbooks</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Create stunning magazine-style flipbooks with one click. Choose from 3 beautiful styles.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-pink-600" />
                  <span>3 gallery styles</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-pink-600" />
                  <span>Shareable flipbook URLs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border border-white rounded-full" />
          <div className="absolute bottom-10 right-10 w-60 h-60 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 border border-white rounded-full" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Capture Memories?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Start collecting photos from your next event in minutes. No credit card required.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-5 bg-white text-indigo-600 rounded-full hover:bg-gray-100 transition-all font-semibold text-lg inline-flex items-center gap-2 group shadow-xl"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">SnapShare</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2025 SnapShare. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
