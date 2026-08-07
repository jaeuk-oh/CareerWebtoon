import React, { useState, useEffect } from 'react';
import {
  Bot,
  LayoutDashboard,
  TrendingUp,
  ArrowRight,
  Briefcase,
  Plus,
  Folder,
  Settings,
  FileText,
  MonitorSmartphone,
  Sparkles,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo,
  Redo,
  Send,
  User,
  Loader2,
  Database,
  Target,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  GitMerge,
  Crosshair,
  MessageSquareWarning,
  ShieldAlert,
  Type,
  Image as ImageIcon,
  LayoutGrid,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState } from '../types/navigation';
import { SHADOW, HOVER_SHADOW, COLORS } from '../lib/constants';

// --- 1. Landing View ---
const LandingView = ({ onNavigate }: { onNavigate: (view: ViewState) => void }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <header className="w-full h-16 bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
          <div className="text-2xl font-bold text-[#002045] tracking-tight">CareerCraft</div>
          <nav className="hidden md:flex gap-8 items-center">
            <button onClick={() => onNavigate('dashboard')} className="text-[#64748b] hover:text-[#002045] transition-colors font-medium">워크스페이스</button>
            <button onClick={() => onNavigate('editor')} className="text-[#64748b] hover:text-[#002045] transition-colors font-medium">코파일럿 에디터</button>
          </nav>
          <button className="text-[#002045] font-semibold hover:text-[#38A169] transition-colors">로그인</button>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-24 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f0f3ff] text-[#1a365d] font-semibold text-sm mb-8">
            <ShieldCheck size={16} />
            <span>Writing AI가 아닌, Evidence-based Application AI</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-[#002045] mb-6 tracking-tight leading-tight"
          >
            내 경험을 직무에 맞는 증거로 바꾸는<br/>AI 취업 코파일럿.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-[#64748b] max-w-3xl mb-10 leading-relaxed"
          >
            없는 경험을 지어내지 않습니다. 사용자가 이미 가진 경험을 자산화하고, 
            지원 직무(JD)에 맞게 3C4P로 분해하여 면접에서 방어 가능한 최적의 지원 전략을 찾아줍니다.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex gap-4 flex-col sm:flex-row"
          >
            <button onClick={() => onNavigate('dashboard')} className="bg-[#38A169] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition-all shadow-sm flex items-center justify-center gap-2">
              <Database size={20} /> 내 자산으로 시작하기
            </button>
          </motion.div>
        </section>

        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`bg-white border border-[#E2E8F0] rounded-xl p-8 ${SHADOW}`}>
              <div className="w-12 h-12 rounded-lg bg-[#f0f3ff] text-[#1a365d] flex items-center justify-center mb-6">
                <GitMerge size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#002045] mb-3">JD × 경험 매칭</h3>
              <p className="text-[#64748b] leading-relaxed">단순 작성이 아닙니다. 채용 공고를 분석하여 내 경험 중 가장 강력한 '필살기', '밉살기', '빌살기' 소재를 선별합니다.</p>
            </div>
            <div className={`bg-white border border-[#E2E8F0] rounded-xl p-8 ${SHADOW}`}>
              <div className="w-12 h-12 rounded-lg bg-[#f0f3ff] text-[#1a365d] flex items-center justify-center mb-6">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#002045] mb-3">숫자 및 근거 검증</h3>
              <p className="text-[#64748b] leading-relaxed">"효율 30% 증가"라는 문장에 원본 데이터 근거가 있는지 추적합니다. 근거 없는 주장은 배제하여 신뢰도를 높입니다.</p>
            </div>
            <div className={`bg-white border border-[#E2E8F0] rounded-xl p-8 ${SHADOW}`}>
              <div className="w-12 h-12 rounded-lg bg-[#f0f3ff] text-[#1a365d] flex items-center justify-center mb-6">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#002045] mb-3">면접 방어 테스트</h3>
              <p className="text-[#64748b] leading-relaxed">작성된 지원서를 바탕으로 AI가 면접관처럼 압박 질문을 던집니다. 방어할 수 없는 문장은 사전에 낮추거나 제거합니다.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingView;
