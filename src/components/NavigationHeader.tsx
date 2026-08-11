import React, { useState } from 'react';
import { Briefcase, User, Menu, X, ShieldCheck, Database, FileEdit, LayoutTemplate } from 'lucide-react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { LoginModal } from './LoginModal';

interface NavigationHeaderProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({ currentView, onNavigate }) => {
  const { user, documentDraft } = useApp();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as ViewState, label: '워크스페이스', icon: Database },
    { id: 'pipeline' as ViewState, label: '지원 파이프라인', icon: ShieldCheck },
    { id: 'editor' as ViewState, label: '코파일럿 에디터', icon: FileEdit },
    { id: 'portfolio' as ViewState, label: '포트폴리오 전략', icon: LayoutTemplate },
  ];

  return (
    <>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <header className="w-full h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex justify-between items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <div
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs group-hover:bg-emerald-600 transition-colors">
                <Briefcase size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 tracking-tight text-lg leading-tight group-hover:text-emerald-700 transition-colors">
                  CareerCraft
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider hidden sm:block">
                  AI Career Copilot
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            {currentView !== 'landing' && (
              <nav className="hidden md:flex items-center gap-1.5 ml-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Defensible Score Indicator */}
            {currentView !== 'landing' && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-full text-xs font-bold text-emerald-800">
                <ShieldCheck size={14} className="text-emerald-600 animate-pulse" />
                <span>방어 점수: <strong className="text-emerald-700">{documentDraft.defenseScore || 87}점</strong></span>
              </div>
            )}

            {/* User Profile Button */}
            <button
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center gap-2 text-slate-800 text-xs font-bold bg-slate-100/80 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl border border-slate-200/60 transition-all active:scale-95"
            >
              <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                {user.name.slice(0, 1)}
              </div>
              <span className="max-w-[100px] truncate">{user.isLoggedIn ? user.name : '프로필 설정'}</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Out Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top duration-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-left transition-all ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
};
