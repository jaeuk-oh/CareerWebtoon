import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, User, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, login, logout } = useApp();
  const [name, setName] = useState(user.name !== '사용자' ? user.name : '');
  const [targetRole, setTargetRole] = useState(user.targetRole || '');

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#1a365d] text-white flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#002045]">
                {user.isLoggedIn ? '내 계정 프로필' : 'CareerCraft 시작하기'}
              </h2>
              <p className="text-xs text-[#64748b]">
                {user.isLoggedIn ? '프로필과 지원 포지션을 설정하세요' : '이름과 지원 직무를 입력하세요'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#002045] mb-1">지원자 성함 / 닉네임</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김민수"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a365d]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002045] mb-1">목표 지원 직무 (Target Role)</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="예: 콘텐츠 기획자 / 백엔드 개발자"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a365d]"
              />
            </div>

            <div className="pt-4 flex gap-3">
              {user.isLoggedIn && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors"
                >
                  로그아웃
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-3 bg-[#002045] text-white rounded-xl font-semibold text-sm hover:bg-opacity-90 transition-colors"
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
