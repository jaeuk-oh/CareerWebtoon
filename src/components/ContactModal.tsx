import React, { useState } from 'react';
import { X, Loader2, MessageCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeClose } from '../lib/hooks';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { user, showToast } = useApp();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user.email ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleClose = () => {
    setMessage('');
    setIsSubmitted(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!message.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.support.createInquiry(message.trim(), email.trim() || undefined);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit contact inquiry', err);
      showToast('문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative"
        >
          <button
            onClick={handleClose}
            aria-label="닫기"
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X size={20} />
          </button>

          {isSubmitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">문의가 접수되었습니다</h2>
              <p className="text-sm text-slate-500">확인 후 빠르게 답변드릴게요.</p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition-colors"
              >
                닫기
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h2 id="contact-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
                    문의하기
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">데모 운영 중입니다. 불편한 점이나 궁금한 점을 남겨주세요.</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-xs font-bold text-slate-600">
                    회신받을 이메일 (선택)
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-xs font-bold text-slate-600">
                    문의 내용
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="어떤 문제가 있으셨나요?"
                    className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!message.trim() || isSubmitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                <span>{isSubmitting ? '보내는 중…' : '문의 보내기'}</span>
              </button>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
