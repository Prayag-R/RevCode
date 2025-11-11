import React from 'react';
import { MessageSquare, CheckCircle, Trash2, AlertCircle } from 'lucide-react';

export default function Reviews({ reviews, onStartWorkflow, onDeleteReview }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          All Reviews ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div
                key={review.id}
                className={`p-4 rounded-lg border transition cursor-pointer flex items-start justify-between group ${
                  review.generatedCode
                    ? 'bg-green-900/10 border-green-600/30 hover:border-green-600/50'
                    : 'bg-slate-900/30 border-slate-700 hover:border-blue-500'
                }`}
                onClick={() => onStartWorkflow(review)}
              >
                <div className="flex-1">
                  <p className="text-white font-medium">{review.text}</p>
                  <div className="flex gap-3 text-slate-400 text-xs mt-2">
                    <span>{review.date}</span>
                    <span>{review.time}</span>
                    <span className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">{review.source}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {review.generatedCode && (
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Generated
                    </span>
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