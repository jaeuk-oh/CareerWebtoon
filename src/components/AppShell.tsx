import React, { useState } from 'react';
import {
  Briefcase,
  Database,
  FileEdit,
  LayoutDashboard,
  MessageCircle,
  Search,
  Menu,
  Plus,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { LoginModal } from './LoginModal';
import { CreditPurchaseModal } from './CreditPurchaseModal';
import { ContactModal } from './ContactModal';
import { Button, cn } from './ui';

interface NavEntry {
  id: ViewState;
  label: string;
  icon: React.ElementType;
  count?: number | string;
}

interface NavGroup {
  label: string;
  entries: NavEntry[];
}

export interface AppShellProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  title: string;
  subtitle?: string;
  /** Rendered at the right end of the top bar, before the score chip and account button. */
  actions?: React.ReactNode;
  /**
   * Screens that own their scrolling and padding (the editor canvas) set this so the
   * shell contributes layout only.
   */
  bare?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  title,
  subtitle,
  actions,
  bare = false,
  children
}) => {
  const { user, experiences, pipelines, documentDraft, experiencesLoading, activePipelineId, usage } = useApp();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Ordered to mirror how an application actually gets made: build reusable assets
  // first, then work a single application from research through to interview prep.
  const navGroups: NavGroup[] = [
    {
      label: '내 자산',
      entries: [
        { id: 'dashboard', label: '통합 대시보드', icon: LayoutDashboard, count: pipelines.length },
        {
          id: 'vault',
          label: '경험 보관함',
          icon: Database,
          count: experiencesLoading ? '···' : experiences.length
        }
      ]
    },
    {
      label: '지원 진행',
      entries: [
        { id: 'insights', label: '기업·직무 리서치', icon: Search },
        { id: 'editor', label: '지원서 작성', icon: FileEdit },
        { id: 'defense', label: '면접 방어', icon: ShieldAlert }
      ]
    }
  ];

  // The score describes the application currently open. A stale id can survive in
  // localStorage after the backing job is gone (or before the backend responds), so
  // require the application to actually be loaded before showing its score.
  const hasLoadedActivePipeline = pipelines.some((p) => p.id === activePipelineId);

  const go = (view: ViewState) => {
    setIsMobileNavOpen(false);
    onNavigate(view);
  };

  const navButton = (entry: NavEntry) => {
    const Icon = entry.icon;
    const isActive = currentView === entry.id;
    return (
      <button
        key={entry.id}
        onClick={() => go(entry.id)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors',
          isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={18} className={isActive ? 'text-brand-200' : 'text-slate-400'} />
          {entry.label}
        </span>
        {entry.count !== undefined && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-bold',
              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {entry.count}
          </span>
        )}
      </button>
    );
  };

  const sidebarBody = (
    <>
      <button
        onClick={() => go('landing')}
        className="group flex items-center gap-2.5 px-2 text-left"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition-colors group-hover:bg-brand-700">
          <Briefcase size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-tight tracking-tight text-slate-900">CareerCraft</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI 취업 코파일럿</span>
        </div>
      </button>

      <Button
        onClick={() => go('pipeline')}
        icon={<Plus size={16} />}
        fullWidth
        className="mt-6"
      >
        새 지원 시작하기
      </Button>

      <nav className="mt-6 flex flex-col gap-5">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="px-3.5 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              {group.label}
            </span>
            {group.entries.map(navButton)}
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <CreditPurchaseModal isOpen={isCreditModalOpen} onClose={() => setIsCreditModalOpen(false)} />
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

      <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
        {/* Persistent desktop sidebar */}
        <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
          {sidebarBody}
        </aside>

        {/* Mobile drawer */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/50"
              onClick={() => setIsMobileNavOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-slate-200 bg-white p-4 shadow-lg">
              <div className="mb-2 flex justify-end">
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="메뉴 닫기"
                >
                  <X size={20} />
                </button>
              </div>
              {sidebarBody}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                aria-label="메뉴 열기"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight text-slate-900">{title}</h1>
                {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2.5">
              {actions}

              {usage && (
                <div
                  className={cn(
                    'hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold xl:flex',
                    usage.free_used >= usage.free_limit && usage.credit_balance <= 0
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  무료 <strong>{usage.free_used}/{usage.free_limit}회</strong>
                  {usage.credit_balance > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      충전 <strong>{usage.credit_balance}회</strong> 남음
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                aria-label="문의하기"
                title="문의하기"
                className="hidden items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:flex"
              >
                <MessageCircle size={18} />
              </button>

              <Button size="sm" variant="secondary" onClick={() => setIsCreditModalOpen(true)}>
                충전하기
              </Button>

              {hasLoadedActivePipeline && documentDraft.defenseScore > 0 && (
                <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 xl:flex">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  방어 점수 <strong className="text-emerald-700">{documentDraft.defenseScore}점</strong>
                </div>
              )}

              <button
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
              >
                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-white">
                  {user.isLoggedIn && user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.name.slice(0, 1)
                  )}
                </span>
                <span className="hidden max-w-[110px] truncate sm:inline">
                  {user.isLoggedIn ? user.name : '로그인'}
                </span>
              </button>
            </div>
          </header>

          <main className={cn('flex-1 overflow-y-auto', !bare && 'px-4 py-6 sm:px-6 md:py-8')}>
            {bare ? children : <div className="mx-auto w-full max-w-6xl">{children}</div>}
          </main>
        </div>
      </div>
    </>
  );
};
