import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Experience } from '../types/experience';
import { JobPipeline } from '../types/job';
import { DocumentDraft, DefenseChatMessage } from '../types/document';
import { PortfolioData, PortfolioElement, PortfolioTheme } from '../types/portfolio';

interface UserProfile {
  name: string;
  targetRole: string;
  isLoggedIn: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface AppContextType {
  user: UserProfile;
  login: (name: string, targetRole: string) => void;
  logout: () => void;
  
  experiences: Experience[];
  addExperience: (exp: Omit<Experience, 'id' | 'createdAt'>) => void;
  updateExperience: (id: string, exp: Partial<Experience>) => void;
  deleteExperience: (id: string) => void;
  
  pipelines: JobPipeline[];
  activePipelineId: string | null;
  setActivePipelineId: (id: string | null) => void;
  createPipeline: (targetCompany: string, targetRole: string, jdText: string) => JobPipeline;
  deletePipeline: (id: string) => void;

  documentDraft: DocumentDraft;
  updateDocumentContent: (docType: 'resume' | 'career' | 'coverLetter', text: string) => void;
  applyEvidenceFix: (originalText: string, fixText: string) => void;

  defenseMessages: DefenseChatMessage[];
  sendDefenseMessage: (text: string) => void;

  portfolioData: PortfolioData;
  updatePortfolioTitle: (name: string, role: string) => void;
  updateSlideHeader: (slideIndex: number, title: string, subtitle: string) => void;
  addPortfolioElement: (slideIndex: number, type: 'text' | 'image' | 'grid' | 'badge') => void;
  updatePortfolioElement: (slideIndex: number, elementId: string, data: Partial<PortfolioElement>) => void;
  movePortfolioElement: (slideIndex: number, elementId: string, direction: 'up' | 'down') => void;
  deletePortfolioElement: (slideIndex: number, elementId: string) => void;
  setPortfolioTheme: (theme: PortfolioTheme) => void;
  addSlide: () => void;
  deleteSlide: (slideIndex: number) => void;

  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  loadDemoData: () => void;
  clearAllData: () => void;
}

const DEMO_EXPERIENCES: Experience[] = [
  {
    id: 'exp-1',
    title: '서류 점검 자동화 및 프로세스 기획',
    organization: 'TechFlow Solutions',
    period: '2023.03 - 2023.11',
    description: 'B2B SaaS 사용자 문의 및 서류 검증 병목 해결',
    c3p4: {
      customer: 'B2B SaaS 사용자 및 운영팀',
      problem: '수작업 서류 점검 병목으로 처리 기간 평균 7일 소요',
      action: '3개월간 반복 문의 500건 분석 및 자동 체크리스트 룰셋 기획',
      product: '자동화 체크리스트 시스템 런칭 (소요 시간 7일 → 2일 단축, 71.4% 감소)'
    },
    metrics: ['처리 소요시간 71.4% 단축 (7일 → 2일)', '반복 문의 500건 룰셋화'],
    evidenceSource: '기획서 초안 v1.2',
    createdAt: new Date().toISOString()
  },
  {
    id: 'exp-2',
    title: '데이터 기반 온보딩 개선 및 애자일 스크럼 리드',
    organization: 'NexTech Labs',
    period: '2022.06 - 2022.12',
    description: '사용자 이탈률 분석 및 온보딩 UI/UX 동선 3단계 축소',
    c3p4: {
      customer: '신규 가입 모바일 유저',
      problem: '가입 온보딩 단계에서 35% 이탈 발생',
      action: '이탈 구간 로그 분석 후 UI 동선 3단계 축소 및 애자일 2주 스크럼 도입',
      product: '온보딩 완료율 22%p 상승 (65% → 87%)'
    },
    metrics: ['온보딩 완료율 22%p 상승', '2주 단위 스크럼 운영'],
    evidenceSource: 'GA4 이탈률 분석 보고서',
    createdAt: new Date().toISOString()
  },
  {
    id: 'exp-3',
    title: '신규 IP 발굴 및 콘텐츠 추천 알고리즘 기획',
    organization: 'Studio Story',
    period: '2021.09 - 2022.05',
    description: '웹툰/웹소설 독자 데이터 분석을 통한 개인화 추천 세션 설계',
    c3p4: {
      customer: '웹툰 독자층 및 신규 구독자',
      problem: '기존 인기도 기반 배치로 인한 중소 IP 열독률 저하',
      action: '장르/취향 태그 기반 추천 UI 모듈 설계 및 작가 스케줄 시스템 구축',
      product: '중소 IP 총 조회수 45% 증가 및 평균 체류시간 3.2분 상승'
    },
    metrics: ['중소 IP 조회수 +45%', '체류시간 3.2분 증가'],
    evidenceSource: '추천 시스템 A/B 테스트 성과표',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_DOC: DocumentDraft = {
  id: 'doc-1',
  docType: 'coverLetter',
  coverLetterText: `1. 지원 직무와 관련된 핵심 프로젝트 경험

데이터 기반의 의사결정으로 서비스의 사용성을 극대화한 경험이 있습니다. TechFlow Solutions 재직 당시, 기존 7일이 걸리던 서류 점검 업무를 2일 내 처리할 수 있도록 개선했습니다. 반복되는 문의 항목 500건을 분석하여 체크리스트를 자동화한 결과입니다.

또한, 신규 기능 런칭 과정에서 팀 간의 소통 오류를 줄이기 위해 애자일 스크럼 방법론을 도입하였고, 그 결과 온보딩 완료율을 22%p 상승시켰습니다. 이는 면접에서도 데이터와 프로세스로 증명 가능한 핵심 원동력이 되었습니다.`,
  resumeText: `주요 프로젝트

• 서류 점검 자동화 시스템 기획
  - 문의 항목 기반 체크리스트 설계 → 점검 소요 시간 71.4% 단축 (7일 → 2일)

• 데이터 기반 온보딩 UI 개편
  - GA4 이탈 로그 분석 후 3단계 동선 축소 → 온보딩 완료율 22%p 상승 (65% → 87%)`,
  careerText: `TechFlow Solutions (2023.03 - 2023.11)
- 직무: 서비스 기획자 / PM

1. 서류 점검 프로세스 자동화
  • Customer: B2B SaaS 사용자 및 내부 운영팀
  • Problem: 수작업 점검으로 병목 발생 (평균 7일 소요)
  • Action: 3개월간 반복 문의 500건 분석 및 자동화 체크리스트 룰셋 기획
  • Product/Result: 점검 소요 시간 71.4% 단축 (7일 → 2일)

2. 온보딩 이탈률 개선
  • Customer: 신규 가입 유저
  • Action: UI 3단계 축소 및 애자일 스크럼 운영
  • Result: 온보딩 완료율 22%p 상승`,
  defenseScore: 87,
  updatedAt: new Date().toISOString()
};

const INITIAL_DEFENSE_CHAT: DefenseChatMessage[] = [
  {
    id: 'def-1',
    sender: 'ai',
    text: '지원자님, "서류 점검 업무를 7일에서 2일로 단축했다"고 하셨는데, 구체적으로 어떤 체크리스트를 자동화하셨는지, 그리고 본인의 핵심 역할은 무엇이었는지 설명해주시겠어요?',
    timestamp: '14:30'
  }
];

const INITIAL_PORTFOLIO: PortfolioData = {
  id: 'pf-1',
  candidateName: '지원자',
  targetRole: '서비스 기획자 / UX PM',
  theme: 'navy',
  updatedAt: new Date().toISOString(),
  slides: [
    {
      id: 'slide-1',
      slideNumber: 1,
      title: '지원자 핵심 역량 및 대표 프로젝트',
      subtitle: '목적과 정밀함으로 데이터 기반 서비스 경험을 기획하는 PM입니다.',
      elements: [
        {
          id: 'el-1',
          type: 'badge',
          title: '핵심 역량 앵커',
          content: '3C4P 기반 경험 설계 | 데이터 검증 수치 71.4% 단축 | 온보딩 이탈률 22%p 개선',
          badgeType: 'primary'
        },
        {
          id: 'el-2',
          type: 'grid',
          title: '주요 성과 요약 (Evidence Verified)',
          content: '1. 서류 점검 자동화 룰셋 기획 (7일 → 2일 소요시간 71.4% 단축)\n2. GA4 유저 이탈 분석 및 온보딩 개선 (+22%p 완료율 상승)\n3. 취향 기반 개인화 추천 모듈 기획 (중소 IP 조회수 +45%)'
        }
      ]
    }
  ]
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Local Storage Loaders
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('careercraft_user');
    return saved ? JSON.parse(saved) : { name: '사용자', targetRole: '콘텐츠 기획자 / PM', isLoggedIn: false };
  });

  const [experiences, setExperiences] = useState<Experience[]>(() => {
    const saved = localStorage.getItem('careercraft_experiences');
    return saved ? JSON.parse(saved) : DEMO_EXPERIENCES;
  });

  const [pipelines, setPipelines] = useState<JobPipeline[]>(() => {
    const saved = localStorage.getItem('careercraft_pipelines');
    return saved ? JSON.parse(saved) : [];
  });

  const [activePipelineId, setActivePipelineId] = useState<string | null>(() => {
    return localStorage.getItem('careercraft_active_pipeline_id') || null;
  });

  const [documentDraft, setDocumentDraft] = useState<DocumentDraft>(() => {
    const saved = localStorage.getItem('careercraft_document');
    return saved ? JSON.parse(saved) : INITIAL_DOC;
  });

  const [defenseMessages, setDefenseMessages] = useState<DefenseChatMessage[]>(() => {
    const saved = localStorage.getItem('careercraft_defense_chat');
    return saved ? JSON.parse(saved) : INITIAL_DEFENSE_CHAT;
  });

  const [portfolioData, setPortfolioData] = useState<PortfolioData>(() => {
    const saved = localStorage.getItem('careercraft_portfolio');
    return saved ? JSON.parse(saved) : INITIAL_PORTFOLIO;
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('careercraft_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('careercraft_experiences', JSON.stringify(experiences));
  }, [experiences]);

  useEffect(() => {
    localStorage.setItem('careercraft_pipelines', JSON.stringify(pipelines));
  }, [pipelines]);

  useEffect(() => {
    if (activePipelineId) localStorage.setItem('careercraft_active_pipeline_id', activePipelineId);
    else localStorage.removeItem('careercraft_active_pipeline_id');
  }, [activePipelineId]);

  useEffect(() => {
    localStorage.setItem('careercraft_document', JSON.stringify(documentDraft));
  }, [documentDraft]);

  useEffect(() => {
    localStorage.setItem('careercraft_defense_chat', JSON.stringify(defenseMessages));
  }, [defenseMessages]);

  useEffect(() => {
    localStorage.setItem('careercraft_portfolio', JSON.stringify(portfolioData));
  }, [portfolioData]);

  // Toast System
  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Action
  const login = (name: string, targetRole: string) => {
    setUser({ name, targetRole, isLoggedIn: true });
    setPortfolioData((prev) => ({ ...prev, candidateName: name, targetRole }));
    showToast(`${name}님 환영합니다! 프로필이 업데이트되었습니다.`, 'success');
  };

  const logout = () => {
    setUser((prev) => ({ ...prev, isLoggedIn: false }));
    showToast('로그아웃되었습니다.', 'info');
  };

  // Experiences Action
  const addExperience = (data: Omit<Experience, 'id' | 'createdAt'>) => {
    const newExp: Experience = {
      ...data,
      id: 'exp-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setExperiences((prev) => [newExp, ...prev]);
    showToast('새 3C4P 경험 자산이 등록되었습니다.', 'success');
  };

  const updateExperience = (id: string, data: Partial<Experience>) => {
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e))
    );
    showToast('경험 자산이 정상 수정되었습니다.', 'success');
  };

  const deleteExperience = (id: string) => {
    setExperiences((prev) => prev.filter((e) => e.id !== id));
    showToast('경험 자산이 삭제되었습니다.', 'info');
  };

  // Pipelines Action
  const createPipeline = (targetCompany: string, targetRole: string, jdText: string): JobPipeline => {
    const newPipeline: JobPipeline = {
      id: 'pipe-' + Date.now(),
      targetCompany: targetCompany || '새 지원 기업',
      targetRole: targetRole || '직무 미정',
      jdText,
      status: 'strategy',
      matchScore: experiences.length > 0 ? Math.min(96, 78 + experiences.length * 4) : 85,
      extractedKeywords: ['콘텐츠 기획', '데이터 분석', '문제 해결', '3C4P 앵커링'],
      primaryStrategy: `${experiences[0]?.title || '주요 역량 프로젝트'}를 대표 경험으로 1번 문항 배치`,
      secondaryStrategy: `${experiences[1]?.title || '보조 역량 프로젝트'}를 수치 검증 보조로 사용`,
      excludedProjects: ['단순 잡무 경험'],
      createdAt: new Date().toISOString()
    };

    setPipelines((prev) => [newPipeline, ...prev]);
    setActivePipelineId(newPipeline.id);
    showToast(`'${newPipeline.targetCompany}' 지원 파이프라인이 생성되었습니다.`, 'success');
    return newPipeline;
  };

  const deletePipeline = (id: string) => {
    setPipelines((prev) => prev.filter((p) => p.id !== id));
    if (activePipelineId === id) setActivePipelineId(null);
    showToast('파이프라인이 삭제되었습니다.', 'info');
  };

  // Document Editor Actions
  const updateDocumentContent = (docType: 'resume' | 'career' | 'coverLetter', text: string) => {
    setDocumentDraft((prev) => ({
      ...prev,
      docType,
      coverLetterText: docType === 'coverLetter' ? text : prev.coverLetterText,
      resumeText: docType === 'resume' ? text : prev.resumeText,
      careerText: docType === 'career' ? text : prev.careerText,
      updatedAt: new Date().toISOString()
    }));
  };

  const applyEvidenceFix = (originalText: string, fixText: string) => {
    setDocumentDraft((prev) => {
      let updatedCover = prev.coverLetterText.replace(originalText, fixText);
      let updatedCareer = prev.careerText.replace(originalText, fixText);
      let updatedResume = prev.resumeText.replace(originalText, fixText);

      return {
        ...prev,
        coverLetterText: updatedCover,
        careerText: updatedCareer,
        resumeText: updatedResume,
        defenseScore: Math.min(100, (prev.defenseScore || 87) + 5),
        updatedAt: new Date().toISOString()
      };
    });
    showToast('AI 수정안이 반영되었습니다. 방어점수가 +5 상승했습니다!', 'success');
  };

  // Defense Mock Interview Action
  const sendDefenseMessage = (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: DefenseChatMessage = {
      id: 'def-user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setDefenseMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      let replyText = '';
      let scoreChange = 3;
      if (text.length > 35 && (text.includes('역할') || text.includes('성과') || text.includes('분석') || text.includes('룰셋') || text.includes('3C4P') || text.includes('수치'))) {
        replyText = '탁월한 답변입니다! 3C4P 구조와 본인의 핵심 행동(Action)이 명확하여 면접관의 압박 꼬리질문을 완벽하게 방어할 수 있습니다. 방어 점수가 +5 상승했습니다.';
        scoreChange = 5;
      } else {
        replyText = '답변의 구체성이 다소 부족합니다. 단순히 "최선을 다했다"보다는, 어떤 수치 기준으로 효과를 측정했는지 Evidence Vault 데이터를 밝혀주세요.';
        scoreChange = 1;
      }

      const aiMsg: DefenseChatMessage = {
        id: 'def-ai-' + Date.now(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setDefenseMessages((prev) => [...prev, aiMsg]);
      setDocumentDraft((prev) => ({
        ...prev,
        defenseScore: Math.min(100, (prev.defenseScore || 87) + scoreChange)
      }));
    }, 900);
  };

  // Portfolio Actions
  const updatePortfolioTitle = (name: string, role: string) => {
    setPortfolioData((prev) => ({
      ...prev,
      candidateName: name,
      targetRole: role
    }));
  };

  const updateSlideHeader = (slideIndex: number, title: string, subtitle: string) => {
    setPortfolioData((prev) => {
      const slides = [...prev.slides];
      if (slides[slideIndex]) {
        slides[slideIndex] = { ...slides[slideIndex], title, subtitle };
      }
      return { ...prev, slides };
    });
  };

  const addPortfolioElement = (slideIndex: number, type: 'text' | 'image' | 'grid' | 'badge') => {
    setPortfolioData((prev) => {
      const slides = [...prev.slides];
      if (!slides[slideIndex]) return prev;
      
      const newEl: PortfolioElement = {
        id: 'el-' + Date.now(),
        type,
        title: type === 'text' ? '프로젝트 핵심 하이라이트' : type === 'grid' ? '3C4P 문제해결 구조' : type === 'badge' ? '핵심 스킬 배지' : '시각 자료 예시',
        content: type === 'text' ? '여기에 프로젝트의 목적, 본인의 핵심 역할 및 측정 가능한 성과를 기재하세요.' : type === 'grid' ? '• Customer: 주요 고객 및 시장\n• Problem: 직무 병목 문제\n• Action: 수행한 기획/행동\n• Product: 검증된 수치 성과' : 'React | TypeScript | Data Analysis',
        badgeType: 'primary'
      };

      slides[slideIndex] = {
        ...slides[slideIndex],
        elements: [...slides[slideIndex].elements, newEl]
      };

      return { ...prev, slides };
    });
    showToast('포트폴리오 요소가 추가되었습니다.', 'info');
  };

  const updatePortfolioElement = (slideIndex: number, elementId: string, data: Partial<PortfolioElement>) => {
    setPortfolioData((prev) => {
      const slides = [...prev.slides];
      if (!slides[slideIndex]) return prev;
      slides[slideIndex] = {
        ...slides[slideIndex],
        elements: slides[slideIndex].elements.map((el) => (el.id === elementId ? { ...el, ...data } : el))
      };
      return { ...prev, slides };
    });
    showToast('요소 내용이 업데이트되었습니다.', 'success');
  };

  const movePortfolioElement = (slideIndex: number, elementId: string, direction: 'up' | 'down') => {
    setPortfolioData((prev) => {
      const slides = [...prev.slides];
      if (!slides[slideIndex]) return prev;
      const elements = [...slides[slideIndex].elements];
      const idx = elements.findIndex((e) => e.id === elementId);
      if (idx === -1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= elements.length) return prev;

      const temp = elements[idx];
      elements[idx] = elements[targetIdx];
      elements[targetIdx] = temp;

      slides[slideIndex] = { ...slides[slideIndex], elements };
      return { ...prev, slides };
    });
  };

  const deletePortfolioElement = (slideIndex: number, elementId: string) => {
    setPortfolioData((prev) => {
      const slides = [...prev.slides];
      if (!slides[slideIndex]) return prev;
      slides[slideIndex] = {
        ...slides[slideIndex],
        elements: slides[slideIndex].elements.filter((e) => e.id !== elementId)
      };
      return { ...prev, slides };
    });
    showToast('요소가 삭제되었습니다.', 'info');
  };

  const setPortfolioTheme = (theme: PortfolioTheme) => {
    setPortfolioData((prev) => ({ ...prev, theme }));
    showToast(`포트폴리오 테마가 '${theme}'로 변경되었습니다.`, 'info');
  };

  const addSlide = () => {
    setPortfolioData((prev) => {
      const newSlideNum = prev.slides.length + 1;
      const newSlide = {
        id: 'slide-' + Date.now(),
        slideNumber: newSlideNum,
        title: `슬라이드 ${newSlideNum}: 프로젝트 상세 분석`,
        subtitle: '3C4P 기반 문제 정의 및 검증 성과 소개',
        elements: []
      };
      return { ...prev, slides: [...prev.slides, newSlide] };
    });
    showToast('새 슬라이드가 추가되었습니다.', 'success');
  };

  const deleteSlide = (slideIndex: number) => {
    setPortfolioData((prev) => {
      if (prev.slides.length <= 1) return prev;
      const slides = prev.slides.filter((_, i) => i !== slideIndex);
      return { ...prev, slides };
    });
    showToast('슬라이드가 삭제되었습니다.', 'info');
  };

  // Demo & Reset Actions
  const loadDemoData = () => {
    setUser({ name: 'Alex (기획자)', targetRole: '콘텐츠 기획자 / 웹툰 PD', isLoggedIn: true });
    setExperiences(DEMO_EXPERIENCES);
    const demoPipe: JobPipeline = {
      id: 'pipe-demo-1',
      targetCompany: 'TechNova',
      targetRole: '콘텐츠 기획 / 웹툰 PD',
      jdText: '[TechNova 2024 웹툰 PD 채용]\n- 신규 웹툰 IP 발굴 및 기획\n- 작가 커뮤니케이션 및 스케줄링 관리\n- 사용자 이탈 및 작품 반응 데이터 분석 역량',
      status: 'defense',
      matchScore: 94,
      extractedKeywords: ['콘텐츠 기획', 'IP 발굴', '데이터 분석', '애자일 스크럼'],
      primaryStrategy: 'TechFlow 서류 점검 자동화 프로젝트를 1번 대표 경험으로 배치',
      secondaryStrategy: 'NexTech Labs GA4 분석 및 온보딩 개선으로 수치 검증 보조',
      excludedProjects: ['단순 서포트 알바 경험'],
      createdAt: new Date().toISOString()
    };
    setPipelines([demoPipe]);
    setActivePipelineId(demoPipe.id);
    setDocumentDraft(INITIAL_DOC);
    setDefenseMessages(INITIAL_DEFENSE_CHAT);
    setPortfolioData({
      ...INITIAL_PORTFOLIO,
      candidateName: 'Alex',
      targetRole: '콘텐츠 기획자 / 웹툰 PD'
    });
    showToast('실서비스 테스트용 풍부한 데모 데이터가 로드되었습니다.', 'success');
  };

  const clearAllData = () => {
    setUser({ name: '사용자', targetRole: '', isLoggedIn: false });
    setExperiences([]);
    setPipelines([]);
    setActivePipelineId(null);
    setDocumentDraft({
      id: 'doc-empty',
      docType: 'coverLetter',
      coverLetterText: '',
      resumeText: '',
      careerText: '',
      defenseScore: 0,
      updatedAt: new Date().toISOString()
    });
    setDefenseMessages([]);
    setPortfolioData({
      id: 'pf-empty',
      candidateName: '지원자',
      targetRole: '지원 직무',
      theme: 'navy',
      updatedAt: new Date().toISOString(),
      slides: [
        {
          id: 'slide-1',
          slideNumber: 1,
          title: '포트폴리오 타이틀',
          subtitle: '지원자 소개 문구를 작성하세요.',
          elements: []
        }
      ]
    });
    localStorage.clear();
    showToast('모든 데이터가 초기화되었습니다.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        experiences,
        addExperience,
        updateExperience,
        deleteExperience,
        pipelines,
        activePipelineId,
        setActivePipelineId,
        createPipeline,
        deletePipeline,
        documentDraft,
        updateDocumentContent,
        applyEvidenceFix,
        defenseMessages,
        sendDefenseMessage,
        portfolioData,
        updatePortfolioTitle,
        updateSlideHeader,
        addPortfolioElement,
        updatePortfolioElement,
        movePortfolioElement,
        deletePortfolioElement,
        setPortfolioTheme,
        addSlide,
        deleteSlide,
        toasts,
        showToast,
        removeToast,
        loadDemoData,
        clearAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

