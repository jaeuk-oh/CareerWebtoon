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

// --- 5. Portfolio Builder View ---
const PortfolioView = ({ onNavigate }: { onNavigate: (view: ViewState) => void }) => {
  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 flex-none bg-white border-b border-[#E2E8F0] flex justify-between items-center px-6 z-20">
        <div className="flex items-center gap-6">
          <button onClick={() => onNavigate('dashboard')} className="font-bold text-xl text-[#002045] tracking-tight hover:opacity-80">CareerCraft</button>
          <nav className="hidden md:flex gap-6 h-full">
            <span className="text-[#64748b] text-sm font-medium h-full flex items-center cursor-pointer" onClick={() => onNavigate('dashboard')}>워크스페이스</span>
            <span className="text-[#64748b] text-sm font-medium h-full flex items-center cursor-pointer" onClick={() => onNavigate('editor')}>코파일럿 에디터</span>
            <span className="text-[#38A169] text-sm font-bold border-b-2 border-[#38A169] h-full flex items-center gap-2">
              <ShieldCheck size={16}/> 포트폴리오 전략
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-[#002045] text-sm font-semibold hover:bg-slate-50 transition-colors">미리보기</button>
          <button className="px-4 py-2 bg-[#002045] text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 shadow-sm transition-colors">발행</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: AI Strategy Sidebar */}
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex flex-col z-10 flex-shrink-0">
          <div className="p-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[#1a365d] text-white flex items-center justify-center">
               <Bot size={16}/>
             </div>
             <div>
               <h3 className="font-bold text-sm text-[#002045]">AI 포트폴리오 전략</h3>
               <p className="text-[11px] text-[#64748b]">TechNova 2024 하반기 공채 맞춤</p>
             </div>
          </div>
          <div className="p-5 flex flex-col gap-6 overflow-y-auto bg-slate-50 flex-1">
             <div>
               <h3 className="text-sm font-bold text-[#002045] mb-3">배치 추천 (우선순위)</h3>
               <div className="space-y-3">
                 <div className="bg-white p-3 border border-[#38A169] rounded-lg shadow-sm relative">
                   <div className="absolute -left-2 -top-2 w-5 h-5 bg-[#38A169] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                   <span className="text-xs font-bold text-[#38A169] bg-[#38A169]/10 px-2 py-0.5 rounded mb-2 inline-block">필살기</span>
                   <p className="text-sm font-bold text-[#002045]">프로젝트 A (서비스 기획)</p>
                   <p className="text-xs text-[#64748b] mt-1">JD의 핵심 요구사항인 '콘텐츠 기획'과 정확히 일치합니다. 첫 장에 배치하세요.</p>
                 </div>
                 <div className="bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm relative">
                   <div className="absolute -left-2 -top-2 w-5 h-5 bg-slate-200 text-[#002045] rounded-full flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                   <span className="text-xs font-bold text-[#64748b] bg-slate-100 px-2 py-0.5 rounded mb-2 inline-block">빌살기</span>
                   <p className="text-sm font-bold text-[#002045]">프로젝트 B (데이터 분석)</p>
                   <p className="text-xs text-[#64748b] mt-1">'데이터 활용' 역량을 보조적으로 증명할 수 있습니다.</p>
                 </div>
               </div>
             </div>
             
             <div className="h-px bg-[#E2E8F0]"></div>
             
             <div>
               <h3 className="text-sm font-bold text-[#002045] mb-3">Gap Analysis (부족한 점)</h3>
               <div className="bg-white p-3 border border-amber-300 rounded-lg shadow-sm relative">
                 <div className="flex items-center gap-2 mb-2">
                   <AlertTriangle size={16} className="text-amber-600" />
                   <span className="text-sm font-bold text-[#002045]">IP 발굴 경험 부재</span>
                 </div>
                 <p className="text-xs text-amber-900 opacity-80 leading-relaxed">
                   현재 자료에서는 IP 발굴을 직접 증명할 근거가 없습니다. 기존 경험을 억지로 연결하기보다, 
                   <strong>콘텐츠 기획/문제정의 역량</strong>을 첫 페이지에서 더 강하게 어필하는 것을 권장합니다.
                 </p>
               </div>
             </div>
          </div>
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 bg-slate-100 overflow-y-auto p-8 flex justify-center items-start">
          <div className={`w-full max-w-4xl bg-white rounded-xl border border-[#E2E8F0] ${SHADOW} overflow-hidden min-h-[800px] flex flex-col`}>
             <div className="h-10 bg-slate-50 border-b border-[#E2E8F0] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="flex-1 text-center text-xs text-[#64748b] font-medium opacity-70">슬라이드 1 / 5</div>
             </div>
             
             <div className="p-16 flex flex-col gap-12 text-center flex-1 relative group cursor-text">
                <div className="absolute inset-0 border-2 border-dashed border-transparent group-hover:border-[#E2E8F0] m-4 rounded-xl transition-colors pointer-events-none"></div>
                <div className="my-auto">
                  <h1 className="text-5xl font-bold text-[#002045] mb-6 tracking-tight">홍길동</h1>
                  <p className="text-xl text-[#64748b] max-w-2xl mx-auto leading-relaxed">목적과 정밀함으로 디지털 경험을 제작하는 선임 UX/UI 디자이너입니다.</p>
                </div>
             </div>
          </div>
        </main>

        {/* Right: Elements Sidebar */}
        <aside className="w-64 bg-white border-l border-[#E2E8F0] flex flex-col z-10 flex-shrink-0">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-bold text-[#64748b] uppercase tracking-wider">요소 추가</h2>
          </div>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto">
            {[
              { icon: Type, label: '텍스트 블록' },
              { icon: ImageIcon, label: '이미지' },
              { icon: LayoutGrid, label: '프로젝트 그리드' },
              { icon: Award, label: '스킬 배지' },
            ].map((el, i) => (
              <div key={i} className="flex flex-col gap-2 p-4 bg-white border border-[#E2E8F0] rounded-lg cursor-grab hover:border-[#1a365d] hover:shadow-sm transition-all group">
                <el.icon size={20} className="text-[#1a365d] opacity-80 group-hover:opacity-100" />
                <span className="text-sm font-semibold text-[#002045]">{el.label}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PortfolioView;
