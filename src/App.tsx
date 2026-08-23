import React, { useEffect, useState } from 'react';
import { ViewState } from './types/navigation';
import LandingView from './pages/Landing';
import DashboardView from './pages/Dashboard';
import VaultView from './pages/Vault';
import HistoryView from './pages/History';
import PipelineView from './pages/Pipeline';
import InsightsView from './pages/Insights';
import EditorView from './pages/Editor';
import DefenseView from './pages/Defense';
import FeedbackReportView from './pages/FeedbackReport';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { api } from './lib/api';

// Toss redirects back here after checkout, appending paymentKey/orderId/amount on
// success (or code/message on failure) to whatever successUrl/failUrl the widget was
// given — see CreditPurchaseModal. The redirect alone doesn't grant credits: only the
// server-side /billing/confirm call (using paymentKey) actually finalizes the
// payment, so that's the call that must happen here before the balance is trusted.
function useBillingRedirect() {
  const { showToast, refreshUsage } = useApp();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (!billing) return;

    const cleanUrl = () => {
      const rest = new URLSearchParams(window.location.search);
      ['billing', 'paymentKey', 'orderId', 'amount', 'paymentType', 'code', 'message'].forEach((key) =>
        rest.delete(key)
      );
      const query = rest.toString();
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    };

    if (billing === 'success') {
      const paymentKey = params.get('paymentKey');
      const orderId = params.get('orderId');
      const amount = params.get('amount');
      if (paymentKey && orderId && amount) {
        api.billing
          .confirmPayment(paymentKey, orderId, Number(amount))
          .then(() => {
            showToast('결제가 완료되었습니다! 충전된 이용권이 반영됐습니다.', 'success');
            refreshUsage();
          })
          .catch((err) => {
            console.error('Failed to confirm payment', err);
            showToast('결제 확인에 실패했습니다. 문제가 계속되면 문의해주세요.', 'error');
          })
          .finally(cleanUrl);
        return;
      }
    } else if (billing === 'fail') {
      showToast('결제가 취소되었거나 실패했습니다.', 'info');
    }

    cleanUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

type ShellView = Exclude<ViewState, 'landing'>;

const SHELL_META: Record<ShellView, { title: string; subtitle: string }> = {
  dashboard: { title: '통합 대시보드', subtitle: '경험 자산과 진행 중인 지원을 한눈에' },
  vault: { title: '경험 보관함', subtitle: '지원서의 근거가 되는 내 경험' },
  history: { title: '지원 이력', subtitle: '지금까지 만든 지원 건과 생성된 문서' },
  pipeline: { title: '새 지원 시작', subtitle: '공고 분석 → 경험 매칭 → 지원 전략' },
  insights: { title: 'JD 인사이트', subtitle: '공고가 요구하는 역량과 조직 문화' },
  editor: { title: '지원서 작성', subtitle: '초안 생성 · 근거 검증 · 면접 방어' },
  defense: { title: '면접 방어', subtitle: '약한 주장을 파고드는 예상 질문과 답변 연습' },
  report: { title: '피드백 리포트', subtitle: '근거 검증과 방어 연습 결과 종합' }
};

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  useBillingRedirect();

  // Navigation is instant. There used to be a 400ms setTimeout with a loading
  // overlay here, which delayed every transition without doing any actual work.
  const handleNavigate = (view: ViewState) => setCurrentView(view);

  if (currentView === 'landing') {
    return (
      <>
        <LandingView onNavigate={handleNavigate} />
        <ToastContainer />
        <ConfirmDialog />
      </>
    );
  }

  const meta = SHELL_META[currentView];

  return (
    <>
      <AppShell
        currentView={currentView}
        onNavigate={handleNavigate}
        title={meta.title}
        subtitle={meta.subtitle}
        bare={currentView === 'editor'}
      >
        {currentView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
        {currentView === 'vault' && <VaultView onNavigate={handleNavigate} />}
        {currentView === 'history' && <HistoryView onNavigate={handleNavigate} />}
        {currentView === 'pipeline' && <PipelineView onNavigate={handleNavigate} />}
        {currentView === 'insights' && <InsightsView onNavigate={handleNavigate} />}
        {currentView === 'editor' && <EditorView onNavigate={handleNavigate} />}
        {currentView === 'defense' && <DefenseView onNavigate={handleNavigate} />}
        {currentView === 'report' && <FeedbackReportView onNavigate={handleNavigate} />}
      </AppShell>
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
