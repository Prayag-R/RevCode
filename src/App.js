import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Plus } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Reviews from './pages/Reviews';
import Deployments from './pages/Deployments';
import Workflow from './pages/Workflow';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Review data
  const [reviews, setReviews] = useState([]);
  const [deployed, setDeployed] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);

  // Workflow states
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [promptDraft, setPromptDraft] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  // WordPress states
  const [isConnected, setIsConnected] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  
  // Direct setup states
  const [showDirectSetup, setShowDirectSetup] = useState(false);
  const [directSiteUrl, setDirectSiteUrl] = useState('');
  const [directApiKey, setDirectApiKey] = useState('');
  const [directSiteName, setDirectSiteName] = useState('');
  const [directSetupLoading, setDirectSetupLoading] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const savedReviews = localStorage.getItem('reviews');
      const savedDeployed = localStorage.getItem('deployed');
      const savedSite = localStorage.getItem('wordpress-site');

      if (savedReviews) setReviews(JSON.parse(savedReviews));
      if (savedDeployed) setDeployed(JSON.parse(savedDeployed));
      
      if (savedSite) {
        setSelectedSite(JSON.parse(savedSite));
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    }
  }, []);

  // Save reviews to localStorage
  useEffect(() => {
    localStorage.setItem('reviews', JSON.stringify(reviews));
  }, [reviews]);

  // Save deployed to localStorage
  useEffect(() => {
    localStorage.setItem('deployed', JSON.stringify(deployed));
  }, [deployed]);

  // Direct setup
  const handleDirectSetup = async () => {
    if (!directSiteUrl.trim() || !directApiKey.trim()) {
      alert('Please enter both Site URL and API Key');
      return;
    }

    setDirectSetupLoading(true);
    try {
      const res = await fetch(`${API_BASE}/setup/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-' + Date.now(),
          siteUrl: directSiteUrl,
          apiKey: directApiKey,
          siteName: directSiteName || 'My WordPress Site'
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert('Error: ' + data.error + '\n' + (data.hints?.join('\n') || ''));
        return;
      }

      const siteData = {
        name: data.site.name,
        siteUrl: data.site.siteUrl,
        apiKey: directApiKey
      };

      setSelectedSite(siteData);
      setIsConnected(true);
      localStorage.setItem('wordpress-site', JSON.stringify(siteData));
      localStorage.setItem('wordpress-setup-method', 'direct');

      setDirectSiteUrl('');
      setDirectApiKey('');
      setDirectSiteName('');
      setShowDirectSetup(false);

      alert('✅ WordPress site connected successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setDirectSetupLoading(false);
    }
  };

  // Disconnect WordPress
  const handleDisconnectWordPress = () => {
    localStorage.removeItem('wordpress-site');
    localStorage.removeItem('wordpress-setup-method');
    setSelectedSite(null);
    setIsConnected(false);
  };

  // API helper
  const callAPI = async (endpoint, data) => {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result;
  };

  // Add test review
  const handleAddReview = (testReviewText) => {
    if (!testReviewText.trim()) return;
    const newReview = {
      id: Date.now(),
      text: testReviewText,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'test',
      status: 'new',
    };
    setReviews([newReview, ...reviews]);
  };

  // Delete review
  const handleDeleteReview = (id) => {
    setReviews(reviews.filter(r => r.id !== id));
  };

  // Start workflow
  const handleStartWorkflow = (review) => {
    if (!isConnected) {
      alert('Please connect a WordPress site first!');
      setShowSettings(true);
      return;
    }
    setSelectedReview(review);
    setGeneratedPrompt(review.generatedPrompt || '');
    setPromptDraft(review.promptDraft || review.generatedPrompt || '');
    setGeneratedCode(review.generatedCode || '');
    setView('workflow');
  };

  // Persist review updates
  const persistReviewUpdates = (id, updates) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    setSelectedReview(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  // Generate prompt
  const handleGeneratePrompt = async () => {
    if (!selectedReview) return;
    setLoading(true);
    try {
      const { prompt } = await callAPI('generate-prompt', { review: selectedReview.text });
      setGeneratedPrompt(prompt);
      setPromptDraft(prompt);
      persistReviewUpdates(selectedReview.id, { generatedPrompt: prompt, promptDraft: prompt });
    } catch (err) {
      alert('Error generating prompt: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate code
  const handleGenerateCode = (code) => {
    setGeneratedCode(code);
    if (selectedReview?.id) persistReviewUpdates(selectedReview.id, { generatedCode: code });
  };

  // Copy code
  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  // Prompt change
  const handlePromptChange = (value) => {
    setPromptDraft(value);
    if (selectedReview?.id) persistReviewUpdates(selectedReview.id, { promptDraft: value });
  };

  // Back to dashboard
  const handleBackToDashboard = () => {
    setView('dashboard');
    setSelectedReview(null);
    setGeneratedCode('');
    setGeneratedPrompt('');
    setPromptDraft('');
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex">
      <Sidebar 
        view={view} 
        setView={setView} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        reviews={reviews}
        deployed={deployed}
      />

      <div className="flex-1 flex flex-col" style={{ marginLeft: sidebarOpen ? '256px' : '80px' }}>
        {/* Header */}
        <div className="border-b border-slate-800 bg-[#131B2E]">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white capitalize">{view}</h2>
              <p className="text-slate-400 text-sm">Manage your AI-powered features</p>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && selectedSite && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-600 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm">{selectedSite.name}</span>
                </div>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#131B2E] rounded-xl p-6 max-w-md w-full border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-4">WordPress Setup</h2>
              <div className="space-y-4">
                {!isConnected ? (
                  <>
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowDirectSetup(!showDirectSetup)}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Direct Setup (Recommended)
                      </button>
                    </div>

                    {showDirectSetup && (
                      <div className="bg-slate-900/50 p-4 rounded-lg space-y-3 border border-slate-700">
                        <p className="text-slate-400 text-sm">
                          Enter your WordPress site URL and API key from the AI Code Deployer plugin
                        </p>
                        <input
                          type="text"
                          placeholder="https://example.com"
                          value={directSiteUrl}
                          onChange={(e) => setDirectSiteUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500"
                        />
                        <input
                          type="password"
                          placeholder="Your API Key"
                          value={directApiKey}
                          onChange={(e) => setDirectApiKey(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500"
                        />
                        <input
                          type="text"
                          placeholder="Site Name (optional)"
                          value={directSiteName}
                          onChange={(e) => setDirectSiteName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500"
                        />
                        <button
                          onClick={handleDirectSetup}
                          disabled={directSetupLoading}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition disabled:opacity-50"
                        >
                          {directSetupLoading ? 'Connecting...' : 'Connect Site'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-900/20 border border-green-600 rounded-lg">
                      <p className="text-green-400 text-sm font-semibold">✓ Connected</p>
                      {selectedSite && (
                        <>
                          <p className="text-slate-400 text-xs mt-2">{selectedSite.name}</p>
                          <p className="text-slate-400 text-xs">{selectedSite.siteUrl}</p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={handleDisconnectWordPress}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 bg-[#0B1120]">
          {view === 'dashboard' && (
            <Dashboard 
              reviews={reviews}
              deployed={deployed}
              onAddReview={handleAddReview}
              onStartWorkflow={handleStartWorkflow}
              onDeleteReview={handleDeleteReview}
              isConnected={isConnected}
            />
          )}

          {view === 'reviews' && (
            <Reviews 
              reviews={reviews}
              onStartWorkflow={handleStartWorkflow}
              onDeleteReview={handleDeleteReview}
              isConnected={isConnected}
            />
          )}

          {view === 'deployments' && (
            <Deployments deployed={deployed} />
          )}

          {view === 'workflow' && (
            <Workflow 
              selectedReview={selectedReview}
              generatedPrompt={generatedPrompt}
              promptDraft={promptDraft}
              generatedCode={generatedCode}
              loading={loading}
              onGeneratePrompt={handleGeneratePrompt}
              onGenerateCode={handleGenerateCode}
              onCopyCode={handleCopyCode}
              onPromptChange={handlePromptChange}
              onBackToDashboard={handleBackToDashboard}
              selectedSite={selectedSite}
              isConnected={isConnected}
            />
          )}
        </div>
      </div>
    </div>
  );
}