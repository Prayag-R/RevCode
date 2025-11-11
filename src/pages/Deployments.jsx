import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function Deployments({ deployed }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Deployment History ({deployed.length})
        </h3>

        {deployed.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No deployments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deployed.map(dep => (
              <div 
                key={dep.id} 
                className="p-4 rounded-lg border border-green-600/30 bg-green-900/10 hover:border-green-600/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Deployment #{dep.id}
                    </p>
                    <p className="text-slate-400 text-sm mt-2">
                      Deployed: {new Date(dep.deployedAt).toLocaleString()}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Status: <span className="text-green-400 font-semibold">Active</span></p>
                  </div>
                  <div className="px-3 py-1 bg-green-600/20 text-green-400 text-xs rounded font-semibold">
                    Live
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}