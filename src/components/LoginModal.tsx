import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, User, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeClose } from '../lib/hooks';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 35.5 24 35.5c-6.4 0-11.6-5.2-11.6-11.6S17.6 12.3 24 12.3c2.9 0 5.6 1.1 7.6 2.9l6-6C34 5.9 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.6 15 19 12.3 24 12.3c2.9 0 5.6 1.1 7.6 2.9l6-6C34 5.9 29.3 4 24 4c-7.6 0-14.2 4.3-17.7 10.1z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.6 2.4-7.2 2.4-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.7 39.5 16.3 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 36.3 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z" />
  </svg>
);

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, loginWithGoogle, logout, updateTargetRole } = useApp();
  const [targetRole, setTargetRole] = useState(user.targetRole || '');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    await loginWithGoogle();
    // On success this redirects away to Google, so the loading state below
    // only ever matters for the failure path (loginWithGoogle already toasts).
    setIsSigningIn(false);
  };

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await logout();
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    updateTargetRole(targetRole.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative"
        >
          <button
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shadow-xs overflow-hidden">
              {user.isLoggedIn && user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div>
              <h2 id="login-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
                {user.isLoggedIn ? user.name : 'CareerCraft 시작하기'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {user.isLoggedIn
                  ? user.email || '내 계정'
                  : '로그인하지 않아도 사용할 수 있지만, 다른 기기에서 이어서 쓰려면 Google 로그인이 필요해요'}
              </p>
            </div>
          </div>

          {!user.isLoggedIn && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-slate-800 rounded-xl font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 mb-3"
            >
              {isSigningIn ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
              <span>Google로 계속하기</span>
            </button>
          )}

          <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
            {user.isLoggedIn
              ? '이 계정으로 등록한 경험과 지원 내역은 다른 기기에서도 로그인하면 그대로 볼 수 있습니다.'
              : '로그인 전에 등록하는 경험과 지원 내역은 이 브라우저에만 저장되며, Google로 로그인하면 별도의 계정으로 새로 시작합니다.'}
          </p>

          <form onSubmit={handleSaveRole} className="space-y-4">
            <div>
              <label htmlFor="login-role" className="block text-xs font-bold text-slate-800 mb-1">목표 지원 직무</label>
              <input
                id="login-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="예: 콘텐츠 기획자 / 백엔드 개발자"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="pt-2 flex gap-3">
              {user.isLoggedIn && (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isSigningOut}
                  className="flex-1 py-3 border border-rose-200 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSigningOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                  <span>로그아웃</span>
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-xs transition-all"
              >
                저장
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
