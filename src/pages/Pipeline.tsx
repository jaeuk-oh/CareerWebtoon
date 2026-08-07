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

// --- 3. Pipeline Initiation View ---
const PipelineView = ({ onNavigate }: { onNavigate: (view: ViewState) => void }) => {
  const [step, setStep] = useState(1);
  
  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else onNavigate('editor');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center px-6">
        <button onClick={() => onNavigate('dashboard')} className="text-[#64748b] hover:text-[#002045] flex items-center gap-2 font-medium text-sm">
           <Undo size={16} /> 돌아가기
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className={`max-w-2xl w-full bg-white rounded-2xl border border-[#E2E8F0] p-10 ${SHADOW}`}>
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-12 h-12 bg-[#f0f3ff] text-[#1a365d] rounded-xl flex items-center justify-center mb-6">
                <FileSearch size={24} />
              </div>
              <h2 className="text-2xl font-bold text-[#002045] mb-2">채용 공고(JD) 입력</h2>
              <p className="text-[#64748b] mb-8">지원하시려는 직무의 JD를 복사하여 붙여넣으세요. AI가 요구 역량을 추출합니다.</p>
              <textarea 
                className="w-full h-48 border border-[#E2E8F0] rounded-xl p-4 text-sm focus:outline-none focus:border-[#1a365d] resize-none mb-6"
                placeholder="채용 공고 내용..."
                defaultValue="[웹툰 PD 채용]&#10;- 콘텐츠 기획 및 IP 발굴&#10;- 작가 커뮤니케이션&#10;- 시장 및 데이터 분석 역량 필수"
              ></textarea>
              <div className="flex justify-end">
                <button onClick={handleNext} className="bg-[#002045] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
                  JD 분석 및 매칭 시작 <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <div className="w-12 h-12 bg-[#f0f3ff] text-[#1a365d] rounded-xl flex items-center justify-center mb-6">
                <Crosshair size={24} />
              </div>
              <h2 className="text-2xl font-bold text-[#002045] mb-2">JD × Candidate 매칭 결과</h2>
              <p className="text-[#64748b] mb-8">내 Vault에 저장된 경험과 채용 공고의 요구 역량을 매칭했습니다.</p>
              
              <div className="space-y-6 mb-8">
                <div className="border border-[#38A169] rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-[#38A169]/5 flex justify-between items-center border-b border-[#38A169]/20">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-[#38A169]">필살기 매칭</span>
                        <span className="text-xs text-[#002045] font-semibold bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">콘텐츠 기획</span>
                      </div>
                      <p className="text-[#002045] font-bold text-lg">프로젝트 A (서비스 구조 설계 경험)</p>
                    </div>
                    <span className="text-3xl font-bold text-[#38A169]">92%</span>
                  </div>
                  
                  <div className="p-4 bg-white grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="text-xs font-bold text-[#64748b] mb-2 flex items-center gap-1"><ArrowRight size={14}/> 3C4P 분해 (Experience Anchor)</h4>
                      <ul className="space-y-1.5">
                        <li className="flex gap-2"><span className="font-semibold text-[#002045] w-16">Customer</span><span className="text-[#64748b]">B2B SaaS 사용자</span></li>
                        <li className="flex gap-2"><span className="font-semibold text-[#002045] w-16">Problem</span><span className="text-[#64748b]">복잡한 서류 점검 병목 (7일 소요)</span></li>
                        <li className="flex gap-2"><span className="font-semibold text-[#002045] w-16">Action</span><span className="text-[#64748b]">반복 문의 500건 분석, 룰셋 기획</span></li>
                        <li className="flex gap-2"><span className="font-semibold text-[#002045] w-16">Product</span><span className="text-[#64748b]">자동화 체크리스트 런칭</span></li>
                      </ul>
                    </div>
                    <div className="border-l border-[#E2E8F0] pl-4">
                      <h4 className="text-xs font-bold text-[#64748b] mb-2 flex items-center gap-1"><CheckCircle2 size={14} className="text-[#38A169]"/> 검증된 수치 (Evidence)</h4>
                      <div className="bg-[#f0f3ff] p-2 rounded border border-[#e7eeff] mb-2">
                        <p className="text-xs font-semibold text-[#1a365d]">소요 시간 71.4% 단축 (7일 → 2일)</p>
                        <p className="text-[10px] text-[#64748b] mt-0.5">Source: 기획서 초안 v1.2</p>
                      </div>
                      <p className="text-xs text-[#38A169] font-medium mt-3 bg-[#38A169]/10 p-2 rounded">✓ JD '콘텐츠 기획' 역량과 완벽히 일치</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-[#E2E8F0] rounded-xl flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-[#64748b]">빌살기 매칭</span>
                      <span className="text-xs text-[#002045] font-semibold bg-slate-100 px-2 py-0.5 rounded border border-[#E2E8F0]">데이터 활용</span>
                    </div>
                    <p className="text-[#002045] font-bold">프로젝트 B (데이터 분석 성과)</p>
                    <p className="text-xs text-[#64748b] mt-1">서브 역량으로 활용 가능합니다.</p>
                  </div>
                  <span className="text-2xl font-bold text-[#64748b]">81%</span>
                </div>

                <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl flex justify-between items-center shadow-sm">
                   <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-amber-700"><AlertTriangle size={14} className="inline mr-1"/> Gap Analysis (부족한 점)</span>
                      <span className="text-xs text-[#002045] font-semibold bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">IP 발굴</span>
                    </div>
                    <p className="text-sm text-amber-900 mt-1">현재 자료에서는 IP 발굴을 직접 증명할 근거가 부족합니다. 허위 경험 생성을 방지하기 위해 이 역량은 제외하는 것을 권장합니다.</p>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">18%</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                <button onClick={() => setStep(1)} className="text-[#64748b] font-medium px-4 py-2 hover:bg-slate-50 rounded-lg">이전</button>
                <button onClick={handleNext} className="bg-[#002045] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:bg-opacity-90">
                  지원 전략 추천받기 <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <div className="w-12 h-12 bg-[#f0f3ff] text-[#1a365d] rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-2xl font-bold text-[#002045] mb-2">지원 전략 추천</h2>
              <p className="text-[#64748b] mb-8">매칭 결과를 바탕으로 가장 방어력이 높은 문서 전략을 수립합니다.</p>
              
              <div className="space-y-4 mb-8">
                <div className="border border-[#1a365d] rounded-xl p-5 bg-[#1a365d] text-white shadow-md">
                  <span className="text-xs font-bold text-[#38A169] bg-[#38A169]/20 px-2 py-0.5 rounded mb-2 inline-block">PRIMARY STRATEGY</span>
                  <h3 className="text-lg font-bold mb-2">Project A: 콘텐츠 기획을 대표 경험으로 배치</h3>
                  <p className="text-sm text-slate-300">JD의 핵심인 '콘텐츠 기획'과 완벽히 매칭됩니다. 이력서 첫 줄과 자소서 1번 문항에 집중 배치하여 첫인상을 강하게 만듭니다.</p>
                </div>
                
                <div className="border border-[#E2E8F0] rounded-xl p-5 bg-white shadow-sm">
                  <span className="text-xs font-bold text-[#64748b] bg-slate-100 px-2 py-0.5 rounded mb-2 inline-block">SECONDARY STRATEGY</span>
                  <h3 className="text-lg font-bold text-[#002045] mb-2">Project B: 데이터 기반 판단 보조</h3>
                  <p className="text-sm text-[#64748b]">단독 경험으로는 약하지만, Project A의 성과를 측정할 때 사용했던 데이터 분석 역량을 강조하여 JD의 '데이터 활용' 요구를 충족시킵니다.</p>
                </div>
                
                <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 opacity-70 border-dashed">
                  <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded mb-2 inline-block">EXCLUDED</span>
                  <h3 className="text-sm font-bold text-slate-600 mb-1">Project D (마케팅 캠페인)</h3>
                  <p className="text-xs text-slate-500">직무 연결성이 낮고, 면접에서 방어하기 어렵습니다. 과감히 제외합니다.</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                <button onClick={() => setStep(2)} className="text-[#64748b] font-medium px-4 py-2 hover:bg-slate-50 rounded-lg">이전</button>
                <button onClick={handleNext} className="bg-[#1a365d] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:bg-opacity-90">
                  문서 재구성 단계로 이동 <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <Loader2 className="w-12 h-12 text-[#1a365d] animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-[#002045] mb-2">지원 전략을 반영하여 문서를 생성중입니다</h2>
              <p className="text-[#64748b]">Evidence Validator가 숫자와 근거를 확인하고 있습니다...</p>
              {/* Auto advance simulated by useEffect in real app, here we just show a button for flow */}
              <button onClick={() => onNavigate('editor')} className="mt-8 text-sm bg-slate-100 text-[#64748b] px-4 py-2 rounded font-medium hover:bg-slate-200">완료 시뮬레이션 (에디터로 이동)</button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}

export default PipelineView;
