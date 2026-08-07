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

// --- 4. Copilot Editor View (Writing + Defense) ---
const EditorView = ({ onNavigate }: { onNavigate: (view: ViewState) => void }) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'evidence' | 'defense'>('defense');
  const [docType, setDocType] = useState<'resume' | 'career' | 'coverLetter'>('coverLetter');

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-hidden">
      <header className="h-16 flex-none bg-white border-b border-[#E2E8F0] flex justify-between items-center px-6 z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => onNavigate('dashboard')} className="font-bold text-xl text-[#002045] tracking-tight hover:opacity-80">CareerCraft</button>
          <nav className="hidden md:flex gap-6 h-full items-center">
            <span className="text-[#64748b] text-sm font-medium h-full flex items-center cursor-pointer" onClick={() => onNavigate('dashboard')}>워크스페이스</span>
            <span className="text-[#38A169] text-sm font-bold px-3 py-1 bg-[#38A169]/10 rounded-full flex items-center gap-2">
              <ShieldCheck size={16}/> Evidence-based Editor
            </span>
            <span className="text-[#64748b] text-sm font-medium h-full flex items-center cursor-pointer" onClick={() => onNavigate('portfolio')}>포트폴리오 전략</span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#64748b] hidden sm:block">Defensible Score: 87/100</span>
          <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-[#002045] text-sm font-semibold hover:bg-slate-50">PDF 내보내기</button>
          <button className="px-4 py-2 bg-[#002045] text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 shadow-sm">최종 저장</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden p-6 gap-6 max-w-screen-2xl mx-auto w-full">
        {/* Left: Document Editor with Annotations */}
        <div className={`flex-[3] bg-white rounded-2xl border border-[#E2E8F0] ${SHADOW} flex flex-col relative overflow-hidden`}>
          <div className="border-b border-[#E2E8F0] p-4 flex justify-between items-center bg-slate-50">
            <div className="flex gap-2 bg-[#E2E8F0]/50 p-1 rounded-lg">
              <button 
                onClick={() => setDocType('resume')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${docType === 'resume' ? 'bg-white text-[#002045] shadow-sm' : 'text-[#64748b] hover:text-[#002045]'}`}
              >이력서 (목차)</button>
              <button 
                onClick={() => setDocType('career')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${docType === 'career' ? 'bg-white text-[#002045] shadow-sm' : 'text-[#64748b] hover:text-[#002045]'}`}
              >경력기술서 (디테일)</button>
              <button 
                onClick={() => setDocType('coverLetter')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${docType === 'coverLetter' ? 'bg-white text-[#002045] shadow-sm' : 'text-[#64748b] hover:text-[#002045]'}`}
              >자기소개서 (스토리)</button>
            </div>
            <div className="flex gap-2">
               <button className="p-2 hover:bg-white rounded-lg text-[#64748b] shadow-sm bg-white border border-[#E2E8F0]"><Undo size={16}/></button>
               <button className="p-2 hover:bg-white rounded-lg text-[#64748b]"><Redo size={16}/></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 md:p-16">
            <div className="max-w-[700px] mx-auto text-[#002045] text-lg leading-loose space-y-6">
              {docType === 'coverLetter' && (
                <>
                  <h2 className="text-2xl font-bold border-b border-[#E2E8F0] pb-2 mb-6">1. 지원 직무와 관련된 핵심 프로젝트 경험</h2>
                  
                  <p>
                    데이터 기반의 의사결정으로 서비스의 사용성을 극대화한 경험이 있습니다. TechFlow Solutions 재직 당시, 
                    <span className="bg-[#38A169]/20 border-b-2 border-[#38A169] relative group cursor-pointer px-1 rounded mx-1">
                      기존 7일이 걸리던 서류 점검 업무를 2일 내 처리할 수 있도록 개선했습니다.
                      <CheckCircle2 size={14} className="inline ml-1 text-[#38A169]"/>
                    </span>
                    반복되는 문의 항목을 분석하여 체크리스트를 자동화한 결과입니다.
                  </p>

                  <p>
                    또한, 신규 기능 런칭 과정에서 팀 간의 소통 오류를 줄이기 위해 애자일 방법론을 도입하였고, 
                    그 결과 
                    <span className="bg-amber-100 border-b-2 border-amber-500 relative group cursor-pointer px-1 rounded mx-1">
                      팀의 업무 효율을 40% 이상 크게 향상시켰습니다.
                      <AlertTriangle size={14} className="inline ml-1 text-amber-600"/>
                    </span>
                    이는 성공적인 프로젝트 런칭의 핵심 원동력이 되었습니다.
                  </p>
                </>
              )}
              {docType === 'resume' && (
                <>
                  <h2 className="text-xl font-bold border-b border-[#E2E8F0] pb-2 mb-4">주요 프로젝트</h2>
                  <ul className="list-disc pl-5 space-y-3 text-base">
                    <li>
                      <span className="font-bold text-[#1a365d]">서류 점검 자동화 시스템 기획</span>
                      <p className="text-sm text-[#64748b] mt-1">문의 항목 기반 체크리스트 설계 → <span className="text-[#38A169] font-bold">점검 소요 시간 71.4% 단축 (7일 → 2일)</span></p>
                    </li>
                    <li>
                      <span className="font-bold text-[#1a365d]">신규 기능 런칭 리드</span>
                      <p className="text-sm text-[#64748b] mt-1">
                        애자일 방법론 도입을 통한 의사소통 프로세스 개편 → 
                        <span className="bg-amber-100 border-b-2 border-amber-500 relative group cursor-pointer px-1 rounded mx-1 inline-flex items-center text-amber-900">
                          업무 효율 향상 <AlertTriangle size={14} className="ml-1"/>
                        </span>
                      </p>
                    </li>
                  </ul>
                </>
              )}
              {docType === 'career' && (
                <>
                  <h2 className="text-xl font-bold border-b border-[#E2E8F0] pb-2 mb-4">TechFlow Solutions (2020.01 - 현재)</h2>
                  <div className="mb-6">
                    <h3 className="font-bold text-[#1a365d] text-lg mb-2">서류 점검 프로세스 자동화</h3>
                    <div className="bg-slate-50 p-4 rounded-lg text-base space-y-3 border border-[#E2E8F0]">
                      <p><strong className="text-[#64748b] w-24 inline-block">Background</strong> 기존 수작업 점검으로 병목 발생 (평균 7일 소요)</p>
                      <p><strong className="text-[#64748b] w-24 inline-block">Action</strong> 3개월간 반복 문의 500건 분석 및 자동화 체크리스트 룰셋 기획</p>
                      <p className="flex items-start">
                        <strong className="text-[#64748b] w-24 inline-block flex-shrink-0">Result</strong>
                        <span className="bg-[#38A169]/20 border-b-2 border-[#38A169] px-1 rounded">점검 소요 시간 71.4% 단축 (7일 → 2일)</span>
                      </p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h3 className="font-bold text-[#1a365d] text-lg mb-2">신규 기능 런칭 리드</h3>
                    <div className="bg-slate-50 p-4 rounded-lg text-base space-y-3 border border-[#E2E8F0]">
                      <p><strong className="text-[#64748b] w-24 inline-block">Background</strong> 다수 팀 간 협업 지연으로 인한 런칭 일정 위험</p>
                      <p><strong className="text-[#64748b] w-24 inline-block">Action</strong> 애자일 스크럼 도입 및 일일 동기화 세션 주도</p>
                      <p className="flex items-start">
                        <strong className="text-[#64748b] w-24 inline-block flex-shrink-0">Result</strong>
                        <span className="bg-amber-100 border-b-2 border-amber-500 px-1 rounded text-amber-900 inline-flex items-center">업무 효율 40% 이상 향상 (근거 요망) <AlertTriangle size={14} className="ml-1"/></span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Copilot Sidebar */}
        <div className={`w-[400px] flex-none bg-white rounded-2xl border border-[#E2E8F0] ${SHADOW} flex flex-col overflow-hidden`}>
          <div className="flex border-b border-[#E2E8F0] bg-slate-50 p-2 gap-2">
            <button 
              onClick={() => setActiveTab('strategy')}
              className={`flex-1 py-2 text-center text-sm font-bold rounded-lg transition-colors ${activeTab === 'strategy' ? 'bg-white text-[#1a365d] shadow-sm border border-[#E2E8F0]' : 'text-[#64748b] hover:bg-white/50'}`}
            >지원 전략</button>
            <button 
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 py-2 text-center text-sm font-bold rounded-lg transition-colors ${activeTab === 'evidence' ? 'bg-white text-[#1a365d] shadow-sm border border-[#E2E8F0]' : 'text-[#64748b] hover:bg-white/50'}`}
            >숫자 검증</button>
            <button 
              onClick={() => setActiveTab('defense')}
              className={`flex-1 py-2 text-center text-sm font-bold rounded-lg transition-colors ${activeTab === 'defense' ? 'bg-[#1a365d] text-white shadow-sm' : 'text-[#64748b] hover:bg-white/50'}`}
            >면접 방어</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-5">
             {activeTab === 'evidence' && (
               <>
                <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <div className="flex gap-2 items-start mb-3">
                    <CheckCircle2 size={18} className="text-[#38A169] flex-shrink-0 mt-0.5"/>
                    <div>
                      <h4 className="font-bold text-sm text-[#002045]">검증 완료: 입력 수치 일치</h4>
                      <p className="text-xs text-[#64748b] mt-1">사용자가 제공한 Vault 경험 데이터(2023.08 TechFlow)와 정확히 일치합니다.</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-sm border-l-2 border-[#38A169] text-[#002045]">
                    "기존 7일이 걸리던 서류 점검 업무를 2일 내 처리할 수 있도록..."
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-300 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                  <div className="flex gap-2 items-start mb-3">
                    <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div>
                      <h4 className="font-bold text-sm text-[#002045]">주의: 원본 근거 없음 (UNVERIFIED)</h4>
                      <p className="text-xs text-[#64748b] mt-1">Vault 자료에서 '40% 효율 향상'에 대한 직접적인 측정 근거를 찾을 수 없습니다.</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg text-sm border-l-2 border-amber-300 mb-3 text-amber-900 line-through opacity-70">
                    "...업무 효율을 40% 이상 크게 향상시켰습니다."
                  </div>
                  <p className="text-xs font-bold text-[#1a365d] mb-2">AI 수정 제안 (추상화 및 행동 중심):</p>
                  <div className="bg-[#f0f3ff] p-3 rounded-lg text-sm border border-[#1a365d]/20 text-[#002045] mb-3">
                    "...팀 간의 의사소통 지연을 방지하고 예정된 일정 내에 신규 기능을 성공적으로 런칭했습니다."
                  </div>
                  <button className="w-full py-2 bg-[#1a365d] text-white rounded-lg text-sm font-bold">수정안 적용</button>
                </div>
               </>
             )}

             {activeTab === 'defense' && (
               <>
                 <div className="bg-[#1a365d] text-white p-4 rounded-xl shadow-sm mb-4">
                    <h3 className="font-bold mb-1 flex items-center gap-2"><ShieldAlert size={18} /> 모의 압박 면접</h3>
                    <p className="text-xs opacity-80">현재 작성된 자소서를 기반으로 방어하기 어려운 지점을 공격합니다.</p>
                 </div>

                 {/* Chat Bubble AI */}
                 <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[#1a365d]">
                      <User size={16} />
                    </div>
                    <div className="bg-white border border-[#E2E8F0] p-3 rounded-2xl rounded-tl-sm text-sm text-[#002045] shadow-sm">
                      지원자님, "서류 점검 업무를 7일에서 2일로 단축했다"고 하셨는데, 구체적으로 어떤 체크리스트를 자동화하셨는지, 그리고 그 과정에서 본인의 핵심 역할은 무엇이었는지 설명해주시겠어요?
                    </div>
                 </div>

                 {/* Chat Bubble User Prompt */}
                 <div className="flex gap-3 flex-row-reverse mt-2">
                    <div className="w-8 h-8 rounded-full bg-[#1a365d] flex-shrink-0 flex items-center justify-center text-white">
                      <Bot size={16} />
                    </div>
                    <div className="bg-[#f0f3ff] border border-[#1a365d]/20 p-3 rounded-2xl rounded-tr-sm text-sm text-[#002045] shadow-sm">
                      <span className="text-[#64748b] italic">이 질문에 답할 수 없다면, 자소서의 구체성을 낮추거나 본인의 역할(My Role)을 명확히 하는 문장을 추가해야 합니다.</span>
                    </div>
                 </div>
               </>
             )}

             {activeTab === 'strategy' && (
               <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
                 <h4 className="font-bold text-[#002045] mb-4">현재 포지션: 콘텐츠 기획</h4>
                 <div className="space-y-4">
                   <div>
                     <span className="text-xs font-bold text-[#38A169] bg-[#38A169]/10 px-2 py-1 rounded">필살기</span>
                     <p className="text-sm text-[#002045] mt-2 font-medium">프로젝트 A (서비스 기획)</p>
                     <p className="text-xs text-[#64748b] mt-1">이력서와 자소서 전반에 가장 우선 배치되었습니다.</p>
                   </div>
                   <div className="h-px bg-[#E2E8F0]"></div>
                   <div>
                     <span className="text-xs font-bold text-[#64748b] bg-slate-100 px-2 py-1 rounded">포트폴리오 추천</span>
                     <p className="text-sm text-[#002045] mt-2 font-medium">데이터 분석 리포트 (프로젝트 B)</p>
                     <p className="text-xs text-[#64748b] mt-1">JD에 '데이터 활용 역량'이 명시되어 있으므로 포트폴리오 2번째 장에 추가를 권장합니다.</p>
                   </div>
                 </div>
               </div>
             )}
          </div>

          {activeTab === 'defense' && (
            <div className="p-3 bg-white border-t border-[#E2E8F0]">
              <div className="relative">
                <input type="text" placeholder="면접관의 질문에 답변 테스트해보기..." className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-[#1a365d]" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a365d]">
                  <Send size={18}/>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorView;
