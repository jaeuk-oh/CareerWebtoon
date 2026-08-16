import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { ViewState } from './types/navigation';
import LandingView from './pages/Landing';
import DashboardView from './pages/Dashboard';
import PipelineView from './pages/Pipeline';
import EditorView from './pages/Editor';
import { AppProvider } from './context/AppContext';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmDialog } from './components/ConfirmDialog';

const LoadingOverlay = ({ message = '불러오는 중...' }: { message?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    role="status"
    aria-live="polite"
    className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
  >
    <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
    <p className="text-slate-900 font-medium animate-pulse">{message}</p>
  </motion.div>
);

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('불러오는 중...');

  const handleNavigate = (view: ViewState) => {
    if (view === currentView) return;

    if (view === 'pipeline') setLoadingMsg('내 경험을 불러오는 중...');
    else if (view === 'editor') setLoadingMsg('근거 검증을 준비하는 중...');
    else setLoadingMsg('불러오는 중...');

    setIsLoading(true);
    setTimeout(() => {
      setCurrentView(view);
      setIsLoading(false);
    }, 400);
  };

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingOverlay message={loadingMsg} />}
      </AnimatePresence>

      {currentView === 'landing' && <LandingView onNavigate={handleNavigate} />}
      {currentView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
      {currentView === 'pipeline' && <PipelineView onNavigate={handleNavigate} />}
      {currentView === 'editor' && <EditorView onNavigate={handleNavigate} />}

      <ToastContainer />
      <ConfirmDialog />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
