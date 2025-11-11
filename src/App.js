import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Send, Code, MessageSquare, CheckCircle, Clock, TrendingUp } from 'lucide-react';
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

  // WordPress OAuth states
  const [wordpressAccessToken, setWordpressAccessToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userSites, setUserSites] = useState([]);

  // Initialize from localStorage and check for OAuth callback
  useEffect(() => {
    try {
      const savedReviews = localStorage.getItem('reviews');
      const savedToken = localStorage.getItem('wordpress-access-token');
      const savedDeployed = localStorage.getItem('deployed');

      if (savedReviews) setReviews(JSON.parse(savedReviews));
      if (savedToken) {
        setWordpressAccessToken(savedToken);
        setIsConnected(true);
        fetchUserSites(savedToken);
      }
      if (savedDeployed) setDeployed(JSON.parse(savedDeployed));

      // Check for OAuth callback
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        exchangeCode(code);
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

  // Exchange OAuth code for token
  const exchangeCode = async (code) => {
    try {
      const res = await fetch(`${API_BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.access_token) {
        setWordpressAccessToken(data.access_token);
        setIsConnected(true);
        localStorage.setItem('wordpress-access-token', data.access_token);
        fetchUserSites(data.access_token);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      console.error('Error exchanging code:', err);
    }
  };

  // Fetch user sites
  const fetchUserSites = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/list-wordpress-sites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUserSites(data.sites || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
    }
  };

  // Connect to WordPress
  const handleConnectWordPress = async () => {
    try {
      const res = await fetch(`${API_BASE}/oauth/authorize-url`);
      const data = await res.json();
      window.location.href = data.authorizeUrl;
    } catch (err) {
      alert('Error connecting to WordPress: ' + err.message);
    }
  };

  // Disconnect WordPress
  const handleDisconnectWordPress = () => {
    localStorage.removeItem('wordpress-access-token');
    setWordpressAccessToken('');
    setIsConnected(false);
    setUserSites([]);
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
              {isConnected && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-600 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm">WordPress Connected</span>
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
              <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-2">WordPress Integration</label>
                  {!isConnected ? (
                    <button
                      onClick={handleConnectWordPress}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition"
                    >
                      Connect WordPress
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-green-900/20 border border-green-600 rounded-lg">
                        <p className="text-green-400 text-sm font-semibold">✓ Connected</p>
                        <p className="text-slate-400 text-xs mt-1">{userSites.length} site(s) found</p>
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
                </div>
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
            />
          )}

          {view === 'reviews' && (
            <Reviews 
              reviews={reviews}
              onStartWorkflow={handleStartWorkflow}
              onDeleteReview={handleDeleteReview}
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
              wordpressAccessToken={wordpressAccessToken}
              userSites={userSites}
              isConnected={isConnected}
            />
          )}
        </div>
      </div>
    </div>
  );
}