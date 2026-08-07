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

// --- 2. Dashboard View (Candidate Vault & Pipelines) ---
const DashboardView = ({ onNavigate }: { onNavigate: (view: ViewState) => void }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E2E8F0] p-4 fixed h-full z-20">
        <div className="mb-8 px-2 flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="w-10 h-10 rounded-lg bg-[#1a365d] text-white flex items-center justify-center">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="font-bold text-[#002045] leading-tight">CareerCraft</h1>
            <p className="text-xs text-[#64748b]">Copilot v1.0</p>
          </div>
        </div>
        
        <button onClick={() => onNavigate('pipeline')} className="mb-6 w-full py-3 bg-[#38A169] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm">
          <Plus size={18} /> 새 지원 파이프라인
        </button>
        
        <nav className="flex flex-col gap-1">
          <a href="#" className="flex items-center gap-3 bg-[#f0f3ff] text-[#1a365d] font-semibold rounded-lg px-4 py-3 text-sm">
            <LayoutDashboard size={18} /> 통합 대시보드
          </a>
          <a href="#" className="flex items-center gap-3 text-[#64748b] hover:bg-slate-50 rounded-lg px-4 py-3 text-sm font-medium transition-colors">
            <Database size={18} /> Candidate Vault
          </a>
          <a href="#" className="flex items-center gap-3 text-[#64748b] hover:bg-slate-50 rounded-lg px-4 py-3 text-sm font-medium transition-colors">
            <FileText size={18} /> 지원 이력
          </a>
        </nav>
      </aside>

      <main className="flex-1 md:ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <section className="mb-10 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-[#002045] mb-2 tracking-tight">반가워요, Alex님.</h2>
              <p className="text-[#64748b]">보유하신 경험 자산을 바탕으로 새로운 기회를 설계하세요.</p>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Candidate Vault Overview */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className={`bg-white border border-[#E2E8F0] rounded-xl p-6 ${SHADOW}`}>
                <div className="flex items-center gap-3 mb-6">
                  <Database className="text-[#1a365d]" size={24} />
                  <h3 className="text-xl font-bold text-[#002045]">Candidate Vault</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-[#64748b]">구조화된 경험 (3C4P)</span>
                    <span className="text-lg font-bold text-[#002045]">12개</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-[#64748b]">등록된 이력서</span>
                    <span className="text-lg font-bold text-[#002045]">3건</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-[#64748b]">포트폴리오 프로젝트</span>
                    <span className="text-lg font-bold text-[#002045]">5건</span>
                  </div>
                </div>
                <button className="w-full mt-6 py-2 border border-[#E2E8F0] text-[#002045] text-sm font-semibold rounded-lg hover:bg-slate-50">
                  자산 업데이트하기
                </button>
              </div>
            </div>

            {/* Active Pipelines */}
            <div className="lg:col-span-2">
              <h3 className="text-xl font-bold text-[#002045] mb-4">진행 중인 지원 파이프라인</h3>
              <div className="space-y-4">
                {/* Pipeline Card */}
                <div onClick={() => onNavigate('editor')} className={`bg-white border border-[#E2E8F0] rounded-xl p-6 cursor-pointer ${SHADOW} ${HOVER_SHADOW} transition-all`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-2 py-1 bg-[#f0f3ff] text-[#1a365d] text-xs font-bold rounded mb-2">콘텐츠 기획 / 웹툰 PD</span>
                      <h4 className="font-bold text-[#002045] text-lg">TechNova 2024 하반기 공채</h4>
                    </div>
                    <span className="bg-[#38A169]/10 text-[#38A169] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={14} /> 방어 테스트 중
                    </span>
                  </div>
                  
                  {/* Pipeline Visual */}
                  <div className="flex items-center justify-between mt-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[75%] h-1 bg-[#38A169] -z-10 rounded-full"></div>
                    
                    {[
                      { step: 'JD 분석', done: true },
                      { step: '경험 매칭', done: true },
                      { step: '전략 추천', done: true },
                      { step: '문서 생성', done: true },
                      { step: '방어 검증', done: false },
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? 'bg-[#38A169] text-white' : 'bg-white border-2 border-[#E2E8F0] text-[#64748b]'}`}>
                          {s.done ? <CheckCircle2 size={16} /> : i + 1}
                        </div>
                        <span className="text-[11px] font-medium text-[#64748b]">{s.step}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 flex gap-3 border-t border-[#E2E8F0] pt-4">
                    <button onClick={(e) => { e.stopPropagation(); onNavigate('editor'); }} className="flex-1 py-2 bg-[#f0f3ff] text-[#1a365d] rounded-lg font-semibold text-sm hover:bg-[#e7eeff] transition-colors">
                      자소서 에디터
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onNavigate('portfolio'); }} className="flex-1 py-2 border border-[#E2E8F0] text-[#002045] rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors">
                      포트폴리오 전략 수정
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardView;
