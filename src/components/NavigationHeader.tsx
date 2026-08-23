import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { LoginModal } from './LoginModal';
import { Button } from './ui';

interface NavigationHeaderProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

/**
 * Marketing header for the landing page only. Every signed-in screen is wrapped in
 * AppShell, which carries its own sidebar and top bar — this used to duplicate that
 * navigation and rendered a branch that could never be reached from the landing view.
 */
export const NavigationHeader: React.FC<NavigationHeaderProps> = ({ onNavigate }) => {
  const { user } = useApp();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <header className="sticky top-0 z-40 h-16 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => onNavigate('landing')} className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition-colors group-hover:bg-brand-700">
              <Briefcase size={18} />
            </span>
            <span className="flex flex-col text-left">
              <span className="text-lg font-bold leading-tight tracking-tight text-slate-900">CareerCraft</span>
              <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 sm:block">
                AI 취업 코파일럿
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => setIsLoginOpen(true)}>
              {user.isLoggedIn ? user.name : '로그인'}
            </Button>
            <Button size="sm" onClick={() => onNavigate('dashboard')}>
              워크스페이스 열기
            </Button>
          </div>
        </div>
      </header>
    </>
  );
};
