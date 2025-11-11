import React, { useState } from 'react';
import { Send, MessageSquare, Clock, CheckCircle, TrendingUp, AlertCircle, Trash2 } from 'lucide-react';

export default function Dashboard({ reviews, deployed, onAddReview, onStartWorkflow, onDeleteReview }) {
  const [testReviewText, setTestReviewText] = useState('');
  
  const pendingCount = reviews.filter(r => r.status !== 'deployed').length;
  const generatedCount = reviews.filter(r => r.generatedCode).length;

  const handleSubmit = () => {
    onAddReview(testReviewText);
    setTestReviewText('');
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A2332] border border-[#2A3B4C] rounded-xl p-6 hover:border-slate-600 transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-sm font-medium">Total Reviews</p>
            <MessageSquare className="w-5 h-5 text-blue-500 opacity-60" />
          </div>
          <p className="text-4xl font-bold text-white mb-1">{reviews.length}</p>
          <p className="text-slate-500 text-xs">All incoming reviews</p>
        </div>

        <div className="bg-[#1A2332] border border-[#2A3B4C] rounded-xl p-6 hover:border-slate-600 transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-sm font-medium">Pending</p>
            <Clock className="w-5 h-5 text-yellow-500 opacity-60" />
          </div>
          <p className="text-4xl font-bold text-white mb-1">{pendingCount}</p>
          <p className="text-slate-500 text-xs">Awaiting processing</p>
        </div>

        <div className="bg-[#1A2332] border border-[#2A3B4C] rounded-xl p-6 hover:border-slate-600 transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-sm font-medium">Code Generated</p>
            <CheckCircle className="w-5 h-5 text-green-500 opacity-60" />
          </div>
          <p className="text-4xl font-bold text-white mb-1">{generatedCount}</p>
          <p className="text-slate-500 text-xs">Reviews with code</p>
        </div>

        <div className="bg-[#1A2332] border border-[#2A3B4C] rounded-xl p-6 hover:border-slate-600 transition">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-sm font-medium">Success Rate</p>
            <TrendingUp className="w-5 h-5 text-purple-500 opacity-60" />
          </div>
          <p className="text-4xl font-bold text-white mb-1">{reviews.length > 0 ? Math.round((generatedCount / reviews.length) * 100) : 0}%</p>
          <p className="text-slate-500 text-xs">Code generation rate</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-[#1A2332] border border-[#2A3B4C] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-500" />
          Create Test Review
        </h3>
        <div className="flex gap-3">
          <textarea
            value={testReviewText}
            onChange={(e) => setTestReviewText(e.target.value)}
            placeholder="Enter customer feedback or test review..."
            className="flex-1 px-4 py-3 bg-[#0F1621] border border-[#2A3B4C] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-24"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!testReviewText.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition h-fit flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="bg-[#1A2332] border border-[#2A3B4C] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          Recent Reviews ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm">No reviews yet. Add one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 5).map(review => (
              <div
                key={review.id}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between group ${
                  review.generatedCode
                    ? 'bg-green-900/10 border-green-600/30 hover:border-green-600/50'
                    : 'bg-[#0F1621] border-[#2A3B4C] hover:border-blue-500'
                }`}
                onClick={() => onStartWorkflow(review)}
              >
                <div className="flex-1">
                  <p className="text-white font-medium">{review.text}</p>
                  <div className="flex gap-3 text-slate-400 text-xs mt-2">
                    <span>{review.date}</span>
                    <span>{review.time}</span>
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded text-slate-300">{review.source}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {review.generatedCode && (
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded font-semibold">Generated</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteReview(review.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/30 rounded transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}