import React from 'react';
import { LayoutDashboard, MessageSquare, CheckCircle, Menu, X, Code2 } from 'lucide-react';

export default function Sidebar({ view, setView, sidebarOpen, setSidebarOpen, reviews, deployed }) {
  const pendingCount = reviews.filter(r => r.status !== 'deployed').length;
  const deployedCount = deployed.length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
    { id: 'deployments', label: 'Deployments', icon: CheckCircle },
  ];

  return (
    <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 border-r border-slate-800 bg-slate-900/50 backdrop-blur flex flex-col h-screen fixed left-0 top-0`}>
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-white font-bold text-sm">Review-to-Code</h1>
              <p className="text-slate-400 text-xs">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                view === item.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Stats in sidebar */}
      {sidebarOpen && (
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
            <p className="text-blue-400 text-xs font-semibold">Reviews</p>
            <p className="text-white text-lg font-bold">{reviews.length}</p>
          </div>
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
            <p className="text-green-400 text-xs font-semibold">Deployed</p>
            <p className="text-white text-lg font-bold">{deployedCount}</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
            <p className="text-yellow-400 text-xs font-semibold">Pending</p>
            <p className="text-white text-lg font-bold">{pendingCount}</p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}