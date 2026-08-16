import React from 'react';
import { ShieldCheck, GitMerge, Target, ShieldAlert, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { ViewState } from '../types/navigation';
import { NavigationHeader } from '../components/NavigationHeader';

interface LandingViewProps {
  onNavigate: (view: ViewState) => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <NavigationHeader currentView="landing" onNavigate={onNavigate} />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-28 px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs mb-6 shadow-2xs"
          >
            <ShieldCheck size={16} className="text-emerald-600 animate-pulse" />
            <span>그럴듯한 글쓰기 AI가 아니라, 근거 기반 지원서 AI</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight leading-tight"
          >
            내 경험을 직무에 맞는 증거로 바꾸는<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-emerald-800 to-emerald-600">
              AI 취업 코파일럿.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mb-10 leading-relaxed font-medium"
          >
            없는 경험을 허위로 지어내지 않습니다. 사용자가 이미 가진 3C4P 경험을 자산화하고, 
            지원 직무(JD)에 맞게 분해하여 면접관의 압박 질문을 완벽하게 방어합니다.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 flex-col sm:flex-row w-full sm:w-auto"
          >
            <button
              onClick={() => onNavigate('dashboard')}
              className="bg-slate-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 active:scale-98"
            >
              <Database size={20} />
              <span>내 워크스페이스 시작하기</span>
            </button>
          </motion.div>
        </section>

        {/* 3 Core Value Cards */}
        <section className="py-12 md:py-16 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center mb-6 shadow-xs font-bold">
                <GitMerge size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2.5">채용 공고 맞춤 경험 매칭</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                단순 입사 지원서 작성이 아닙니다. 채용 공고(JD)를 분석해 내 경험 중 면접 방어력이 가장 높은 '대표 경험'을 자동으로 골라줍니다.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center mb-6 shadow-xs font-bold">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2.5">수치 및 근거 정합성 검증</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                "업무 효율 40% 향상"과 같은 모호한 주장을 AI가 실제 근거와 대조해 추적합니다. 내 경험과 일치하지 않는 과장 문장은 사전에 걸러냅니다.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-3xl bg-slate-900 text-emerald-400 flex items-center justify-center mb-6 shadow-xs font-bold">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2.5">AI 모의 압박 면접</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                작성한 지원서를 기반으로 AI 면접관이 압박 꼬리질문을 던지고, 실제로 답변한 내용을 근거로 강약을 평가합니다.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-white border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
        © 2026 CareerCraft. 근거 기반 취업 코파일럿.
      </footer>
    </div>
  );
};

export default LandingView;
