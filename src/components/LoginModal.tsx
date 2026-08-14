import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeClose } from '../lib/hooks';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, login, logout } = useApp();
  const [name, setName] = useState(user.name !== '사용자' ? user.name : '');
  const [targetRole, setTargetRole] = useState(user.targetRole || '');

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    login(name.trim(), targetRole.trim() || '취업 준비생');
    onClose();
  };

  const handleLogout = () => {
    logout();
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
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shadow-xs">
              <User size={20} />
            </div>
            <div>
              <h2 id="login-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
                {user.isLoggedIn ? '내 계정 프로필' : 'CareerCraft 시작하기'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {user.isLoggedIn ? '프로필과 지원 포지션을 설정하세요' : '이름과 지원 직무를 입력하세요'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-name" className="block text-xs font-bold text-slate-800 mb-1">지원자 성함 / 닉네임</label>
              <input
                id="login-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김민수"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label htmlFor="login-role" className="block text-xs font-bold text-slate-800 mb-1">목표 지원 직무 (Target Role)</label>
              <input
                id="login-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="예: 콘텐츠 기획자 / 백엔드 개발자"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="pt-4 flex gap-3">
              {user.isLoggedIn && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-3 border border-rose-200 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-50 transition-colors"
                >
                  로그아웃
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-xs transition-all"
              >
                {user.isLoggedIn ? '프로필 저장' : '로그인 / 시작하기'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
