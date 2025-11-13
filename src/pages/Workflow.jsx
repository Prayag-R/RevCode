import React, { useState } from 'react';
import { RefreshCw, CheckCircle, Copy, ArrowRight, AlertCircle, Loader } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

export default function Workflow({
  selectedReview,
  generatedPrompt,
  promptDraft,
  generatedCode,
  loading,
  onGeneratePrompt,
  onGenerateCode,
  onCopyCode,
  onPromptChange,
  onBackToDashboard,
  selectedSite,
  isConnected,
}) {
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployStatus, setDeployStatus] = useState(null);
  const [codeType, setCodeType] = useState('css');

  const handleGenerateCodeWithContext = async () => {
    if (!promptDraft) {
      alert('Please refine the prompt first');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptDraft })
      });
      if (!res.ok) throw new Error('Failed to generate code');
      const data = await res.json();
      setCodeType(data.code_type || 'css');
      onGenerateCode(data.code);
    } catch (err) {
      alert('Error generating code: ' + err.message);
    }
  };

  const handleDeploy = async () => {
    if (!generatedCode) {
      alert('Please generate code first');
      return;
    }

    if (!isConnected || !selectedSite) {
      alert('Please connect a WordPress site first');
      return;
    }

    setDeployLoading(true);
    setDeployStatus('deploying');
    try {
      const res = await fetch(`${API_BASE}/deploy-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: selectedSite.siteUrl,
          apiKey: selectedSite.apiKey,
          code: generatedCode,
          codeType: codeType,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Deployment failed');
      }

      setDeployStatus('success');
      setTimeout(() => setDeployStatus(null), 5000);
    } catch (err) {
      setDeployStatus('error');
      alert('Deployment error: ' + err.message);
      setTimeout(() => setDeployStatus(null), 3000);
    } finally {
      setDeployLoading(false);
    }
  };

  if (!selectedReview) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No review selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBackToDashboard}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition flex items-center gap-2"
      >
        ← Back to Dashboard
      </button>

      {/* Connection Status */}
      {!isConnected ? (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-yellow-400 inline mr-2" />
          <span className="text-yellow-300 text-sm">Connect WordPress in Settings to deploy code</span>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-green-400 inline mr-2" />
          <span className="text-green-300 text-sm">Connected to: <strong>{selectedSite?.name}</strong> ({selectedSite?.siteUrl})</span>
        </div>
      )}

      {/* Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Generate Prompt */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
            <h4 className="font-bold text-white">Generate Prompt</h4>
          </div>
          <p className="text-slate-300 text-sm mb-4 pb-4 border-b border-slate-700">"{selectedReview?.text}"</p>
          {!generatedPrompt ? (
            <button
              onClick={onGeneratePrompt}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </button>
          ) : (
            <div className="bg-slate-900/50 p-3 rounded-lg text-slate-300 text-xs border border-slate-700 max-h-64 overflow-y-auto font-mono">
              {generatedPrompt}
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center justify-center">
          <ArrowRight className="w-6 h-6 text-slate-600" />
        </div>

        {/* Step 2: Refine & Generate Code */}
        {generatedPrompt && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <h4 className="font-bold text-white">Refine & Generate Code</h4>
            </div>

            <label className="text-slate-400 text-xs block mb-2">Refine Prompt</label>
            <textarea
              value={promptDraft}
              onChange={(e) => onPromptChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm font-mono h-32 resize-none focus:outline-none focus:border-blue-500 mb-3"
            />
            <button
              onClick={handleGenerateCodeWithContext}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
        )}

        {/* Step 3: Deploy */}
        {generatedCode && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
              <h4 className="font-bold text-white">Deploy</h4>
            </div>

            <label className="text-slate-400 text-xs block mb-2">Code Type</label>
            <select
              value={codeType}
              onChange={(e) => setCodeType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm mb-3"
            >
              <option value="css">CSS</option>
              <option value="js">JavaScript</option>
              <option value="html">HTML</option>
            </select>

            <div className="bg-slate-900/50 p-3 rounded-lg text-slate-300 text-xs font-mono border border-slate-700 mb-3 max-h-40 overflow-y-auto">
              <pre>{generatedCode.substring(0, 200)}...</pre>
            </div>

            <button
              onClick={() => onCopyCode(generatedCode)}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-semibold transition flex items-center justify-center gap-2 mb-3"
            >
              <Copy className="w-4 h-4" />
              Copy Code
            </button>

            <button
              onClick={handleDeploy}
              disabled={deployLoading || !isConnected}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deployLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Deploying...
                </>
              ) : !isConnected ? (
                'Connect WordPress First'
              ) : (
                'Deploy to WordPress'
              )}
            </button>

            {deployStatus && (
              <div className={`p-3 rounded-lg text-center font-semibold mt-3 flex items-center justify-center gap-2 ${
                deployStatus === 'success'
                  ? 'bg-green-900/30 text-green-300'
                  : deployStatus === 'deploying'
                  ? 'bg-blue-900/30 text-blue-300'
                  : 'bg-red-900/30 text-red-300'
              }`}>
                {deployStatus === 'success' && (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Deployed Successfully!
                  </>
                )}
                {deployStatus === 'deploying' && (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Deploying...
                  </>
                )}
                {deployStatus === 'error' && (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Deployment Error
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}