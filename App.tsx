import React, { useState } from 'react';
import { ScriptGenerator } from './components/ScriptGenerator';
import { LiveCoach } from './components/LiveCoach';
import { ChatAssistant } from './components/ChatAssistant';
import { UserProfile } from './components/UserProfile';
import { AppTab } from './types';
import { PenTool, Mic2, MessageSquareText, User } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.GENERATOR);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.ibb.co/1qgbT6L/1735702581691.jpg" 
              alt="Grupo 5K Logo" 
              className="h-12 w-auto rounded-lg object-contain shadow-md shadow-indigo-500/10"
            />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              5K Guiones
            </h1>
          </div>
          
          <nav className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab(AppTab.GENERATOR)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === AppTab.GENERATOR 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <PenTool className="w-4 h-4" /> Guion
            </button>
            <button
              onClick={() => setActiveTab(AppTab.LIVE_COACH)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === AppTab.LIVE_COACH 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Mic2 className="w-4 h-4" /> Coach
            </button>
            <button
              onClick={() => setActiveTab(AppTab.CHAT)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === AppTab.CHAT 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <MessageSquareText className="w-4 h-4" /> Chat
            </button>
            <button
              onClick={() => setActiveTab(AppTab.PROFILE)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === AppTab.PROFILE 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <User className="w-4 h-4" /> Mi Estilo
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="animate-fade-in">
          {activeTab === AppTab.GENERATOR && <ScriptGenerator />}
          {activeTab === AppTab.LIVE_COACH && <LiveCoach />}
          {activeTab === AppTab.CHAT && <ChatAssistant />}
          {activeTab === AppTab.PROFILE && <UserProfile />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-sm">
        <p>Impulsado por Gemini 2.5 Flash, Pro & Live API</p>
      </footer>
    </div>
  );
};

export default App;