import React, { useEffect, useState } from 'react';
import { X, Loader2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeClose } from '../lib/hooks';
import { useApp } from '../context/AppContext';
import { api, CreditPackInfo } from '../lib/api';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useApp();
  const [packs, setPacks] = useState<CreditPackInfo[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isLoadingPacks, setIsLoadingPacks] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingPacks(true);
    api.billing
      .getPacks()
      .then((result) => {
        setPacks(result);
        setSelectedPackId((prev) => prev ?? result[1]?.pack_id ?? result[0]?.pack_id ?? null);
      })
      .catch((err) => {
        console.error('Failed to load credit packs', err);
        showToast('이용권 목록을 불러오지 못했습니다.', 'error');
      })
      .finally(() => setIsLoadingPacks(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!selectedPackId || isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      const { order_id, order_name, amount, client_key } = await api.billing.checkout(selectedPackId);

      // Loaded on demand rather than at app startup — nothing else on the page
      // needs Toss's SDK until the moment a purchase is actually attempted.
      const { loadTossPayments, ANONYMOUS } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(client_key);
      const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
      const tossAmount = { currency: 'KRW' as const, value: amount };
      await widgets.setAmount(tossAmount);

      // Redirects the browser to Toss's hosted payment page — nothing after this
      // line runs on success. App.tsx's useBillingRedirect picks up the redirect
      // back and calls /billing/confirm with the paymentKey Toss hands back; that
      // confirm call, not this redirect, is what actually grants the credits.
      await widgets.requestPaymentWindow({
        orderId: order_id,
        orderName: order_name,
        amount: tossAmount,
        successUrl: `${window.location.origin}${window.location.pathname}?billing=success`,
        failUrl: `${window.location.origin}${window.location.pathname}?billing=fail`
      });
    } catch (err) {
      console.error('Failed to start Toss checkout', err);
      showToast('결제창을 여는 데 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      setIsCheckingOut(false);
    }
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
          aria-labelledby="credit-modal-title"
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
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
              <Zap size={20} />
            </div>
            <div>
              <h2 id="credit-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
                AI 이용권 충전
              </h2>
              <p className="text-sm text-slate-500 font-medium">무료 한도를 넘으면 충전한 이용권에서 차감됩니다</p>
            </div>
          </div>

          {isLoadingPacks ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-2.5 mb-6">
              {packs.map((pack) => (
                <button
                  key={pack.pack_id}
                  type="button"
                  onClick={() => setSelectedPackId(pack.pack_id)}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    selectedPackId === pack.pack_id
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-900">{pack.name}</span>
                  <span className="font-bold text-slate-700">{pack.amount.toLocaleString()}원</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handlePurchase}
            disabled={!selectedPackId || isCheckingOut || isLoadingPacks}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isCheckingOut && <Loader2 size={18} className="animate-spin" />}
            <span>{isCheckingOut ? '결제창으로 이동 중…' : '토스페이먼츠로 결제하기'}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
