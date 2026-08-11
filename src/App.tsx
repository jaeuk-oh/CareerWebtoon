import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { ViewState } from './types/navigation';
import LandingView from './pages/Landing';
import DashboardView from './pages/Dashboard';
import PipelineView from './pages/Pipeline';
import EditorView from './pages/Editor';
import PortfolioView from './pages/Portfolio';
import { AppProvider } from './context/AppContext';
import { ToastContainer } from './components/ToastContainer';

const LoadingOverlay = ({ message = '불러오는 중...' }: { message?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
  >
    <Loader2 className="w-12 h-12 text-[#002045] animate-spin mb-4" />
    <p className="text-[#002045] font-medium animate-pulse">{message}</p>
  </motion.div>
);

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('불러오는 중...');

  const handleNavigate = (view: ViewState) => {
    if (view === currentView) return;

    if (view === 'pipeline') setLoadingMsg('Candidate Vault를 불러오는 중...');
    else if (view === 'editor') setLoadingMsg('Evidence Validator 실행 중...');
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
      {currentView === 'portfolio' && <PortfolioView onNavigate={handleNavigate} />}

      <ToastContainer />
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
