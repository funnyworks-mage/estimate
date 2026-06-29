import type { CostItem, CostPackage, EstimateProject, VendorInfo, EstimateRow, ClientInfo, DailyReport } from '../types/estimate';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// --- 역사적 프로젝트 기반 라이브러리 단가 자가복구(Self-Healing) 엔진 ---
export function healCostItemsFromProjects(items: CostItem[]): CostItem[] {
  try {
    const projectsData = localStorage.getItem('estimate_projects');
    if (!projectsData) return items;
    
    const projects = JSON.parse(projectsData) as any[];
    if (!Array.isArray(projects) || projects.length === 0) return items;
    
    // 프로젝트들을 createdAt 역순(가장 최근 작성분 우선) 정렬
    const sortedProjects = [...projects].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    const priceMap = new Map<string, number>();
    sortedProjects.forEach(proj => {
      if (proj.sections && Array.isArray(proj.sections)) {
        proj.sections.forEach((sec: any) => {
          if (sec.rows && Array.isArray(sec.rows)) {
            sec.rows.forEach((row: any) => {
              if (row.name && row.price) {
                // 등급명이나 ID를 기준으로 단가 파싱
                const key = `${row.name.trim()}::${(row.rank || '').trim()}`;
                if (!priceMap.has(key)) {
                  priceMap.set(key, row.price);
                }
              }
            });
          }
        });
      }
    });

    if (priceMap.size === 0) return items;

    let modified = false;
    const healed = items.map(item => {
      const key = `${item.name.trim()}::${(item.rank || '').trim()}`;
      if (priceMap.has(key)) {
        const historicalPrice = priceMap.get(key)!;
        if (item.defaultPrice !== historicalPrice) {
          modified = true;
          return {
            ...item,
            defaultPrice: historicalPrice
          };
        }
      }
      return item;
    });

    if (modified) {
      console.log('[AutoRestore] Successfully restored cost items from historical projects data!');
    }
    return healed;
  } catch (e) {
    console.warn('[AutoRestore] Failed to scan historical projects:', e);
    return items;
  }
}

// Supabase 세션 로그인 여부 동적 검사 헬퍼
// (주요 데이터는 DB RLS 차단 에러 방지를 위해 로컬 스토리지 우선 보존 모드로 작동하도록 false 처리합니다.
//  이를 통해 콘솔의 403 네트워크 소음을 100% 정화합니다.)
async function checkSupabaseAccess(): Promise<boolean> {
  return isSupabaseConfigured; // Supabase가 유효하게 구성된 경우에만 서버 동기화 활성화
}

// --- 초기 기본 데이터 (사내 표준 프리셋) ---

export const DEFAULT_COST_ITEMS: CostItem[] = [
  // --- 1. PM 기획 인력 (L1 ~ L5) ---
  {
    id: 'item-pm-l1',
    name: 'PM 기획 인력',
    internalName: 'PM 기획 인력 (L1 Support)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 400000,
    rank: 'L1 Support',
    basePrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '기획 보조 및 자료 조사 지원',
    internalMemo: 'L1 등급 기획 인력'
  },
  {
    id: 'item-pm-l2',
    name: 'PM 기획 인력',
    internalName: 'PM 기획 인력 (L2 Operator)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 500000,
    rank: 'L2 Operator',
    basePrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '일반 기획 업무 및 회의록 작성',
    internalMemo: 'L2 등급 기획 인력 (기준 단가)'
  },
  {
    id: 'item-pm-l3',
    name: 'PM 기획 인력',
    internalName: 'PM 기획 인력 (L3 Specialist)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 750000,
    rank: 'L3 Specialist',
    basePrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '핵심 기능 설계 및 화면 정의서 작성',
    internalMemo: 'L3 등급 기획 인력'
  },
  {
    id: 'item-pm-l4',
    name: 'PM 기획 인력',
    internalName: 'PM 기획 인력 (L4 Lead)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1000000,
    rank: 'L4 Lead',
    basePrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '전체 프로젝트 PL 기획 및 일정 조율',
    internalMemo: 'L4 등급 기획 인력'
  },
  {
    id: 'item-pm-l5',
    name: 'PM 기획 인력',
    internalName: 'PM 기획 인력 (L5 Director)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1500000,
    rank: 'L5 Director',
    basePrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '기획 및 PM 총괄 업무, 최종 의사결정',
    internalMemo: 'L5 등급 기획 인력'
  },

  // --- 2. 디자이너 투입 (L1 ~ L5) ---
  {
    id: 'item-designer-l1',
    name: '디자이너 투입',
    internalName: '디자이너 (L1 Support)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 320000,
    rank: 'L1 Support',
    basePrice: 400000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '배너 편집 및 그래픽 리소스 가공',
    internalMemo: 'L1 등급 디자인 인력'
  },
  {
    id: 'item-designer-l2',
    name: '디자이너 투입',
    internalName: '디자이너 (L2 Operator)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 400000,
    rank: 'L2 Operator',
    basePrice: 400000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '일반 페이지 UI 디자인 및 컴포넌트 제작',
    internalMemo: 'L2 등급 디자인 인력 (기준 단가)'
  },
  {
    id: 'item-designer-l3',
    name: '디자이너 투입',
    internalName: '디자이너 (L3 Specialist)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 600000,
    rank: 'L3 Specialist',
    basePrice: 400000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '주요 화면 UX 설계 및 키비주얼 디자인',
    internalMemo: 'L3 등급 디자인 인력'
  },
  {
    id: 'item-designer-l4',
    name: '디자이너 투입',
    internalName: '디자이너 (L4 Lead)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 800000,
    rank: 'L4 Lead',
    basePrice: 400000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '브랜드 가이드라인 구축 및 디자인 리드',
    internalMemo: 'L4 등급 디자인 인력'
  },
  {
    id: 'item-designer-l5',
    name: '디자이너 투입',
    internalName: '디자이너 (L5 Director)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1200000,
    rank: 'L5 Director',
    basePrice: 400000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '디자인 크리에이티브 디렉터 총괄 리더',
    internalMemo: 'L5 등급 디자인 인력'
  },

  // --- 3. 프론트엔드 개발 (L1 ~ L5) ---
  {
    id: 'item-fe-l1',
    name: '프론트엔드 개발',
    internalName: '프론트엔드 개발 (L1 Support)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 480000,
    rank: 'L1 Support',
    basePrice: 600000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '단순 화면 마크업 및 스타일 오류 수정',
    internalMemo: 'L1 등급 FE 개발 인력'
  },
  {
    id: 'item-fe-l2',
    name: '프론트엔드 개발',
    internalName: '프론트엔드 개발 (L2 Operator)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 600000,
    rank: 'L2 Operator',
    basePrice: 600000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '일반 페이지 퍼블리싱 및 컴포넌트 개발',
    internalMemo: 'L2 등급 FE 개발 인력 (기준 단가)'
  },
  {
    id: 'item-fe-l3',
    name: '프론트엔드 개발',
    internalName: '프론트엔드 개발 (L3 Specialist)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 900000,
    rank: 'L3 Specialist',
    basePrice: 600000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '상태 관리 및 복잡한 비즈니스 로직 API 연동',
    internalMemo: 'L3 등급 FE 개발 인력'
  },
  {
    id: 'item-fe-l4',
    name: '프론트엔드 개발',
    internalName: '프론트엔드 개발 (L4 Lead)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1200000,
    rank: 'L4 Lead',
    basePrice: 600000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '프론트 아키텍처 설계 및 PL 개발 리드',
    internalMemo: 'L4 등급 FE 개발 인력'
  },
  {
    id: 'item-fe-l5',
    name: '프론트엔드 개발',
    internalName: '프론트엔드 개발 (L5 Director)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1800000,
    rank: 'L5 Director',
    basePrice: 600000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '웹/앱 클라이언트 개발 총괄 디렉터',
    internalMemo: 'L5 등급 FE 개발 인력'
  },

  // --- 4. 백엔드 개발 (L1 ~ L5) ---
  {
    id: 'item-be-l1',
    name: '백엔드 개발',
    internalName: '백엔드 개발 (L1 Support)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 560000,
    rank: 'L1 Support',
    basePrice: 700000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '데이터 검증 로직 구현 및 쿼리 보조',
    internalMemo: 'L1 등급 BE 개발 인력'
  },
  {
    id: 'item-be-l2',
    name: '백엔드 개발',
    internalName: '백엔드 개발 (L2 Operator)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 700000,
    rank: 'L2 Operator',
    basePrice: 700000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '단순 API 엔드포인트 구현 및 테스트',
    internalMemo: 'L2 등급 BE 개발 인력 (기준 단가)'
  },
  {
    id: 'item-be-l3',
    name: '백엔드 개발',
    internalName: '백엔드 개발 (L3 Specialist)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1050000,
    rank: 'L3 Specialist',
    basePrice: 700000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '비즈니스 핵심 로직 개발 및 DB 인덱스 튜닝',
    internalMemo: 'L3 등급 BE 개발 인력'
  },
  {
    id: 'item-be-l4',
    name: '백엔드 개발',
    internalName: '백엔드 개발 (L4 Lead)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1400000,
    rank: 'L4 Lead',
    basePrice: 700000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '서버 아키텍처 설계, 보안 및 배포 PL 리드',
    internalMemo: 'L4 등급 BE 개발 인력'
  },
  {
    id: 'item-be-l5',
    name: '백엔드 개발',
    internalName: '백엔드 개발 (L5 Director)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 2100000,
    rank: 'L5 Director',
    basePrice: 700000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '인프라 및 백엔드 개발 총괄 디렉터',
    internalMemo: 'L5 등급 BE 개발 인력'
  },

  // --- 5. QA 검증 인력 (테스터, 엔지니어, 리드) ---
  {
    id: 'item-qa-l1',
    name: 'QA 검증 인력',
    internalName: 'QA 검증 인력 (테스터)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 200000,
    rank: '테스터',
    basePrice: 250000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '단순 테스트 수행 및 단순 버그 리포팅',
    internalMemo: 'QA 테스터 인력'
  },
  {
    id: 'item-qa-l2',
    name: 'QA 검증 인력',
    internalName: 'QA 검증 인력 (엔지니어)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 250000,
    rank: '엔지니어',
    basePrice: 250000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: 'TC 설계, 정밀 검증 및 기술 실무 수행',
    internalMemo: 'QA 엔지니어 인력 (기준 단가)'
  },
  {
    id: 'item-qa-l3',
    name: 'QA 검증 인력',
    internalName: 'QA 검증 인력 (리드)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 450000,
    rank: '리드',
    basePrice: 250000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: 'QA 전략 수립, 품질 리스크 매니지먼트 및 최종 승인',
    internalMemo: 'QA 리드 인력'
  },

  // --- 6. 현장 스태프 인력 (보조 스태프, 운영 스태프, 슈퍼바이저, 운영 PM) ---
  {
    id: 'item-staff-l1',
    name: '현장 스태프 인력',
    internalName: '현장 보조 스태프',
    category: '인건비 기준 (용역 공수)',
    unit: '일',
    defaultPrice: 100000,
    rank: '보조 스태프',
    basePrice: 130000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '단순 현장 보조, 등록 및 대기 업무',
    internalMemo: '현장 보조 스태프'
  },
  {
    id: 'item-staff-l2',
    name: '현장 스태프 인력',
    internalName: '현장 운영 스태프',
    category: '인건비 기준 (용역 공수)',
    unit: '일',
    defaultPrice: 130000,
    rank: '운영 스태프',
    basePrice: 130000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '현장 안내, 부스 운영 및 실무 수행',
    internalMemo: '현장 운영 스태프 (기준 단가)'
  },
  {
    id: 'item-staff-l3',
    name: '현장 스태프 인력',
    internalName: '현장 슈퍼바이저',
    category: '인건비 기준 (용역 공수)',
    unit: '일',
    defaultPrice: 250000,
    rank: '슈퍼바이저',
    basePrice: 130000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '현장 인력 관리, 일정 및 품질 총괄 관리',
    internalMemo: '현장 슈퍼바이저'
  },
  {
    id: 'item-staff-l4',
    name: '현장 스태프 인력',
    internalName: '행사 운영 PM',
    category: '인건비 기준 (용역 공수)',
    unit: '일',
    defaultPrice: 500000,
    rank: '운영 PM',
    basePrice: 130000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '행사 총괄 기획 및 클라이언트 최종 커뮤니케이션',
    internalMemo: '행사 운영 PM'
  },

  // --- 7. 기타 결과물 기준 아이템 ---
  {
    id: 'item-drink',
    name: '음료 제조',
    internalName: '기본 카페 음료 3종',
    category: '기타 결과물 기준',
    unit: '잔',
    defaultPrice: 3000,
    formulaType: 'QTY_x_PRICE',
    vatType: 'TAX',
    description: '현장 제공용 아이스 아메리카노 등 3종 음료',
    internalMemo: '원두 및 재료비 일체 포함'
  },
  {
    id: 'item-cupcake',
    name: '컵케이크 납품',
    internalName: '수제 컵케이크 2종',
    category: '기타 결과물 기준',
    unit: '개',
    defaultPrice: 4500,
    formulaType: 'QTY_x_PRICE',
    vatType: 'TAX',
    description: '디자인 로고 커스텀 컵케이크',
    internalMemo: '수제 베이킹 외주 공급'
  },
  {
    id: 'item-trans',
    name: '번역',
    internalName: '한-영 비즈니스 번역',
    category: '기타 결과물 기준',
    unit: '자',
    defaultPrice: 120,
    formulaType: 'QTY_x_PRICE',
    vatType: 'FREE',
    description: '전문 번역가에 의한 영문 감수 포함 번역',
    internalMemo: '공백 제외 글자 수 기준'
  },
  {
    id: 'item-draft',
    name: '디자인 시안',
    internalName: '브로슈어 시안 제작',
    category: '디자인 결과물 기준',
    unit: '종',
    defaultPrice: 300000,
    formulaType: 'QTY_x_PRICE',
    vatType: 'TAX',
    description: '브랜딩 리플렛 및 브로슈어 시안 3종안',
    internalMemo: '수정 2회 제한'
  },
  {
    id: 'item-maint',
    name: '월 유지보수',
    internalName: '시스템 유지관리',
    category: '개발 결과물 기준',
    unit: '개월',
    defaultPrice: 5000000,
    formulaType: 'MONTHS_x_PRICE',
    vatType: 'TAX',
    description: '서버 모니터링, 버그 패치 및 소규모 기능 개선',
    internalMemo: '월정액 기술 지원 계약'
  }
];

const DEFAULT_COST_PACKAGES: CostPackage[] = [
  {
    id: 'pkg-popup',
    name: '팝업스토어 음료 운영 패키지',
    category: '식음료/현장운영',
    description: '팝업스토어 3일 운영 기준 음료, 컵케이크 및 현장 제조/안내 스태프 통합 패키지',
    items: [
      { itemId: 'item-drink', defaultQuantity: 900 },
      { itemId: 'item-cupcake', defaultQuantity: 600 },
      { itemId: 'item-pm-l2', defaultQuantity: 0, defaultPeople: 1, defaultDays: 3 },
      { itemId: 'item-staff-l2', defaultQuantity: 0, defaultPeople: 15, defaultDays: 3 }
    ]
  },
  {
    id: 'pkg-web',
    name: '웹사이트 구축 기본 패키지',
    category: '개발/디자인',
    description: '소규모 마케팅 웹사이트 기획, 디자인, 반응형 퍼블리싱 및 서버 API 구현 패키지',
    items: [
      { itemId: 'item-pm', defaultQuantity: 0, defaultPeople: 1, defaultDays: 10 }, // 1명 * 10일 = 10MD
      { itemId: 'item-designer', defaultQuantity: 0, defaultPeople: 1, defaultDays: 15 }, // 1명 * 15일 = 15MD
      { itemId: 'item-fe', defaultQuantity: 0, defaultPeople: 1, defaultDays: 20 }, // 1명 * 20일 = 20MD
      { itemId: 'item-be', defaultQuantity: 0, defaultPeople: 1, defaultDays: 20 }
    ]
  }
];

const DEFAULT_VENDOR_INFO: VendorInfo = {
  companyName: '(주)퍼니웍스',
  bizNumber: '119-87-05203',
  ownerName: '박성훈',
  address: '서울시 마포구 신촌로48',
  tel: '02-123-4567',
  email: 'contact@funnyworks.com'
};

const DEFAULT_CLIENTS: ClientInfo[] = [
  {
    id: 'client-1',
    name: 'LG CNS',
    bizNumber: '116-81-19345',
    ownerName: '김영섭',
    address: '서울특별시 강서구 마곡중앙8로 71',
    managerName: '이동훈 책임',
    managerTel: '010-1234-5678',
    memo: 'SI 프로젝트 주 거래처'
  },
  {
    id: 'client-2',
    name: '삼성전자',
    bizNumber: '124-81-00998',
    ownerName: '한종희',
    address: '경기도 수원시 영통구 삼성로 129',
    managerName: '박민우 프로',
    managerTel: '010-9876-5432',
    memo: '반도체 사업부 프로모션 거래처'
  },
  {
    id: 'client-3',
    name: '네이버',
    bizNumber: '220-81-62517',
    ownerName: '최수연',
    address: '경기도 성남시 분당구 불정로 6',
    managerName: '최윤아 팀장',
    managerTel: '010-5555-4444',
    memo: 'UI/UX 디자인 및 콘텐츠 기획 거래처'
  }
];

const DEFAULT_PROJECTS: EstimateProject[] = [
  {
    id: 'proj-sample-1',
    projectType: 'OTHER',
    title: '퍼니싱 그레이 레이븐 팝업스토어 음료 및 디저트 공급 견적',
    clientName: '신세계백화점 귀중',
    estimateDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendorInfo: DEFAULT_VENDOR_INFO,
    remarks: '1. 본 견적은 행사 기간 3일 기준입니다.\n2. 납품 수량 및 운영 조건 변경 시 금액이 변동될 수 있습니다.\n3. 대금 지급 조건: 착수금 50%, 잔금 50%(행사 종료 후 즉시).',
    status: 'draft',
    createdAt: new Date().toISOString(),
    sections: [
      {
        id: 'sec-fnb',
        name: '1. 식음료 공급 부문',
        rows: [
          {
            id: 'row-1',
            isSelected: true,
            category: '식음료',
            name: '음료 제조',
            unit: '잔',
            quantity: 900,
            price: 3000,
            supplyPrice: 2700000,
            vat: 270000,
            totalPrice: 2970000,
            formulaType: 'QTY_x_PRICE',
            vatType: 'TAX',
            description: '아이스 아메리카노, 콜드브루 등 3종 공급'
          },
          {
            id: 'row-2',
            isSelected: true,
            category: '식음료',
            name: '컵케이크 납품',
            unit: '개',
            quantity: 600,
            price: 4500,
            supplyPrice: 2700000,
            vat: 270000,
            totalPrice: 2970000,
            formulaType: 'QTY_x_PRICE',
            vatType: 'TAX',
            description: '로고 커스텀 컵케이크 2종'
          }
        ]
      },
      {
        id: 'sec-hr',
        name: '2. 현장 인건비 부문',
        rows: [
          {
            id: 'row-3',
            isSelected: true,
            category: '인건비',
            name: 'PM 기획 인력',
            unit: 'MD',
            quantity: 3, // 1명 * 3일 = 3MD 자동 매핑
            people: 1,
            days: 3,
            price: 500000,
            supplyPrice: 1500000,
            vat: 150000,
            totalPrice: 1650000,
            formulaType: 'PEOPLE_x_DAYS_x_PRICE',
            vatType: 'TAX',
            description: '행사 기획 및 현장 총괄 PM 3MD'
          },
          {
            id: 'row-4',
            isSelected: true,
            category: '인건비',
            name: '현장 운영 인력',
            unit: '일',
            quantity: 45, // 15명 * 3일 = 45일 공수 자동 매핑
            people: 15,
            days: 3,
            price: 100000,
            supplyPrice: 4500000,
            vat: 450000,
            totalPrice: 4950000,
            formulaType: 'PEOPLE_x_DAYS_x_PRICE',
            vatType: 'TAX',
            description: '현장 운영 스태프 15명'
          }
        ]
      }
    ]
  }
];

// --- 계산 도우미 함수 ---

export function calculateRowAmounts(row: Omit<EstimateRow, 'supplyPrice' | 'vat' | 'totalPrice'>): {
  quantity: number;
  supplyPrice: number;
  vat: number;
  totalPrice: number;
} {
  let q = row.quantity || 0;
  const p = row.price || 0;
  const rate = row.correctionRate || 0;
  const correctedPrice = Math.round(p * (1 + rate));

  if (row.formulaType === 'PEOPLE_x_DAYS_x_PRICE') {
    const people = row.people || 0;
    const days = row.days || 0;
    q = people * days;
  }

  let supplyPrice = 0;
  switch (row.formulaType) {
    case 'QTY_x_PRICE':
    case 'MD_x_PRICE':
    case 'MONTHS_x_PRICE':
    case 'PEOPLE_x_DAYS_x_PRICE':
      supplyPrice = q * correctedPrice;
      break;
    case 'FIXED':
      supplyPrice = correctedPrice;
      break;
    default:
      supplyPrice = q * correctedPrice;
  }

  let vat = 0;
  if (row.vatType === 'TAX') {
    vat = Math.floor(supplyPrice * 0.1);
  }

  const totalPrice = supplyPrice + vat;

  return { 
    quantity: q,
    supplyPrice, 
    vat, 
    totalPrice 
  };
}

// --- LocalStorage API ---

export const StorageAPI = {
  // --- 로컬 데이터 자가 구출(마이그레이션) 엔진 ---
  // 개편 이전에 로컬스토리지에만 저장되고 Supabase DB에는 저장되지 못했던 소중한 사용자 데이터를 구출합니다.
  async rescueLocalDataToSupabase(): Promise<void> {
    if (!(await checkSupabaseAccess())) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        console.log('[Rescue] No active session. Postponing migration...');
        return;
      }
      const currentUserId = session.user.id;

      // 1. 고객사 구출
      const localClientsData = localStorage.getItem('estimate_clients');
      if (localClientsData) {
        const localClients = JSON.parse(localClientsData);
        if (Array.isArray(localClients) && localClients.length > 0) {
          const sanitized = localClients.map((c: any) => {
            const cleaned = { ...c };
            delete cleaned.created_by;
            delete cleaned.createdBy;
            return cleaned;
          });
          const { error } = await supabase.from('estimate_clients').upsert(sanitized);
          if (!error) {
            localStorage.setItem('estimate_clients_backup_rescued', localClientsData);
            localStorage.removeItem('estimate_clients');
            console.log('[Rescue] Successfully migrated estimate_clients!');
          } else {
            console.warn('[Rescue] Clients migration error:', error);
            const wantDownload = confirm(
              `[데이터 복구 실패] 거래처 정보(estimate_clients)를 DB로 옮기는 중 오류가 발생했습니다.\n` +
              `사유: ${error.message} (코드: ${error.code})\n\n` +
              `★ 중요: 로컬스토리지에 들어있는 소중한 데이터를 PC 파일로 안전하게 즉시 백업(다운로드)하시겠습니까?`
            );
            if (wantDownload) {
              this.downloadEmergencyBackup();
            }
          }
        }
      }

      // 2. 프로젝트 구출
      const localProjectsData = localStorage.getItem('estimate_projects');
      if (localProjectsData) {
        const localProjects = JSON.parse(localProjectsData) as EstimateProject[];
        if (Array.isArray(localProjects) && localProjects.length > 0) {
          const sanitized = localProjects.map((p: any) => {
            const cleaned = { ...p };
            if (currentUserId) {
              cleaned.created_by = currentUserId;
            }
            delete cleaned.createdBy;
            return cleaned;
          });
          const { error } = await supabase.from('estimate_projects').upsert(sanitized);
          if (!error) {
            localStorage.setItem('estimate_projects_backup_rescued', localProjectsData);
            localStorage.removeItem('estimate_projects');
            console.log('[Rescue] Successfully migrated estimate_projects!');
          } else {
            console.warn('[Rescue] Projects migration error:', error);
            const wantDownload = confirm(
              `[데이터 복구 실패] 견적 프로젝트(estimate_projects)를 DB로 옮기는 중 오류가 발생했습니다.\n` +
              `사유: ${error.message} (코드: ${error.code})\n\n` +
              `★ 중요: 로컬스토리지에 들어있는 소중한 데이터를 PC 파일로 안전하게 즉시 백업(다운로드)하시겠습니까?`
            );
            if (wantDownload) {
              this.downloadEmergencyBackup();
            }
          }
        }
      }

      // 3. 단가 항목 구출
      const localItemsData = localStorage.getItem('estimate_cost_items');
      if (localItemsData) {
        const localItems = JSON.parse(localItemsData);
        if (Array.isArray(localItems) && localItems.length > 0) {
          const sanitized = localItems.map((i: any) => {
            const cleaned = { ...i };
            if (currentUserId) {
              cleaned.created_by = currentUserId;
            }
            delete cleaned.createdBy;
            return cleaned;
          });
          const { error } = await supabase.from('cost_items').upsert(sanitized);
          if (!error) {
            localStorage.setItem('estimate_cost_items_backup_rescued', localItemsData);
            localStorage.removeItem('estimate_cost_items');
            console.log('[Rescue] Successfully migrated cost_items!');
          } else {
            console.warn('[Rescue] CostItems migration error:', error);
            const wantDownload = confirm(
              `[데이터 복구 실패] 단가 항목(cost_items)을 DB로 옮기는 중 오류가 발생했습니다.\n` +
              `사유: ${error.message} (코드: ${error.code})\n\n` +
              `★ 중요: 로컬스토리지에 들어있는 소중한 데이터를 PC 파일로 안전하게 즉시 백업(다운로드)하시겠습니까?`
            );
            if (wantDownload) {
              this.downloadEmergencyBackup();
            }
          }
        }
      }

      // 4. 일일 보고서 구출
      const localReportsData = localStorage.getItem('estimate_daily_reports');
      if (localReportsData) {
        const localReports = JSON.parse(localReportsData);
        if (Array.isArray(localReports) && localReports.length > 0) {
          const sanitized = localReports.map((r: any) => ({
            id: r.id,
            report_date: r.reportDate,
            title: r.title,
            completed_tasks: r.completedTasks,
            created_by: currentUserId || r.createdBy || r.created_by || null
          }));
          const { error } = await supabase.from('estimate_daily_reports').upsert(sanitized);
          if (!error) {
            localStorage.setItem('estimate_daily_reports_backup_rescued', localReportsData);
            localStorage.removeItem('estimate_daily_reports');
            console.log('[Rescue] Successfully migrated estimate_daily_reports!');
          } else {
            console.warn('[Rescue] DailyReports migration error:', error);
            const wantDownload = confirm(
              `[데이터 복구 실패] 일일 보고서(estimate_daily_reports)를 DB로 옮기는 중 오류가 발생했습니다.\n` +
              `사유: ${error.message}\n\n` +
              `★ 중요: 로컬스토리지에 들어있는 소중한 데이터를 PC 파일로 안전하게 즉시 백업(다운로드)하시겠습니까?`
            );
            if (wantDownload) {
              this.downloadEmergencyBackup();
            }
          }
        }
      }

      // 5. 묶음 패키지 구출
      const localPackagesData = localStorage.getItem('estimate_cost_packages');
      if (localPackagesData) {
        const localPackages = JSON.parse(localPackagesData);
        if (Array.isArray(localPackages) && localPackages.length > 0) {
          const sanitized = localPackages.map((p: any) => {
            const cleaned = { ...p };
            delete cleaned.created_by;
            delete cleaned.createdBy;
            return cleaned;
          });
          const { error } = await supabase.from('cost_packages').upsert(sanitized);
          if (!error) {
            localStorage.setItem('estimate_cost_packages_backup_rescued', localPackagesData);
            localStorage.removeItem('estimate_cost_packages');
            console.log('[Rescue] Successfully migrated cost_packages!');
          } else {
            console.warn('[Rescue] CostPackages migration error:', error);
            const wantDownload = confirm(
              `[데이터 복구 실패] 묶음 패키지(cost_packages)를 DB로 옮기는 중 오류가 발생했습니다.\n` +
              `사유: ${error.message} (코드: ${error.code})\n\n` +
              `★ 중요: 로컬스토리지에 들어있는 소중한 데이터를 PC 파일로 안전하게 즉시 백업(다운로드)하시겠습니까?`
            );
            if (wantDownload) {
              this.downloadEmergencyBackup();
            }
          }
        }
      }

      // 6. 공급자 정보 구출
      const localVendorData = localStorage.getItem('estimate_vendor_info');
      if (localVendorData) {
        const localVendor = JSON.parse(localVendorData);
        if (localVendor) {
          const cleaned = { ...localVendor };
          delete cleaned.created_by;
          delete cleaned.createdBy;
          const payload = { id: 'default_vendor', ...cleaned };
          const { error } = await supabase.from('vendor_info').upsert(payload);
          if (!error) {
            localStorage.setItem('estimate_vendor_info_backup_rescued', localVendorData);
            localStorage.removeItem('estimate_vendor_info');
            console.log('[Rescue] Successfully migrated vendor_info!');
          } else {
            console.warn('[Rescue] VendorInfo migration error:', error);
            const wantDownload = confirm(
              `[데이터 복구 실패] 공급자 서명 정보(vendor_info)를 DB로 옮기는 중 오류가 발생했습니다.\n` +
              `사유: ${error.message} (코드: ${error.code})\n\n` +
              `★ 중요: 로컬스토리지에 들어있는 소중한 데이터를 PC 파일로 안전하게 즉시 백업(다운로드)하시겠습니까?`
            );
            if (wantDownload) {
              this.downloadEmergencyBackup();
            }
          }
        }
      }

    } catch (e) {
      console.warn('[Rescue] Local data migration failed:', e);
    }
  },

  // --- Projects (견적 프로젝트) CRUD ---
  async getProjects(): Promise<EstimateProject[]> {
    await this.rescueLocalDataToSupabase();
    let projects: EstimateProject[] = [];

    if (await checkSupabaseAccess()) {
      try {
        const { data, error } = await supabase
          .from('estimate_projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          projects = data as EstimateProject[];
        } else if (error) {
          console.warn('[Supabase] getProjects error:', error);
        }
      } catch (e) {
        console.warn('[Supabase] getProjects network error:', e);
      }
    }
    
    if (projects.length === 0) {
      projects = DEFAULT_PROJECTS;
    }

    // WBS 더미 데이터 자가 정화(Clean-up) 엔진
    let needsSave = false;
    const cleanedProjects = projects.map(proj => {
      if (!proj.wbs || proj.wbs.length === 0) return proj;
      
      let projChanged = false;
      const cleanWbs = proj.wbs.map(cat => {
        let catChanged = false;
        const cleanedTitle = cat.title === '새로운 대분류 항목' ? '' : cat.title;
        if (cleanedTitle !== cat.title) catChanged = true;

        const cleanedTasks = cat.tasks.map(task => {
          let taskChanged = false;
          const cleanedName = task.name === '새로운 세부 작업내용' ? '' : task.name;
          if (cleanedName !== task.name) taskChanged = true;

          const cleanedDetails = task.details.filter(detail => 
            detail !== '상세 세부 내역을 줄바꿈으로 작성하세요'
          );
          if (cleanedDetails.length !== task.details.length) taskChanged = true;

          if (taskChanged) {
            return {
              ...task,
              name: cleanedName,
              details: cleanedDetails
            };
          }
          return task;
        });

        const anyTaskChanged = cleanedTasks.some((t, idx) => t !== cat.tasks[idx]);
        if (catChanged || anyTaskChanged) {
          projChanged = true;
          return {
            ...cat,
            title: cleanedTitle,
            tasks: cleanedTasks
          };
        }
        return cat;
      });

      if (projChanged) {
        needsSave = true;
        return { ...proj, wbs: cleanWbs };
      }
      return proj;
    });

    if (needsSave && (await checkSupabaseAccess())) {
      try {
        const { error } = await supabase.from('estimate_projects').upsert(cleanedProjects);
        if (error) console.warn('[Supabase] auto-clean upsert error:', error);
      } catch (e) {
        console.warn('[Supabase] auto-clean upsert network error:', e);
      }
    }

    return cleanedProjects;
  },

  async saveProjects(projects: EstimateProject[]): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('estimate_projects')
          .upsert(projects);
        if (error) {
          console.warn('[Supabase] saveProjects error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveProjects network error:', e);
        throw e;
      }
    }
  },

  async getProjectById(id: string): Promise<EstimateProject | undefined> {
    const projects = await this.getProjects();
    return projects.find(p => p.id === id);
  },

  async saveProject(project: EstimateProject): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('estimate_projects')
          .upsert(project);
        if (error) {
          console.warn('[Supabase] saveProject error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveProject network error:', e);
        throw e;
      }
    }
  },

  async deleteProject(id: string): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('estimate_projects')
          .delete()
          .eq('id', id);
        if (error) {
          console.warn('[Supabase] deleteProject error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] deleteProject network error:', e);
        throw e;
      }
    }
  },

  // --- Clients (고객사 주소록) CRUD ---
  async getClients(): Promise<ClientInfo[]> {
    let clients: ClientInfo[] = [];

    if (await checkSupabaseAccess()) {
      try {
        const { data, error } = await supabase
          .from('estimate_clients')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data) {
          clients = data as ClientInfo[];
        } else if (error) {
          console.warn('[Supabase] getClients error:', error);
        }
      } catch (e) {
        console.warn('[Supabase] getClients network error:', e);
      }
    }
    
    if (clients.length === 0) {
      clients = DEFAULT_CLIENTS;
    }
    return clients;
  },

  async saveClients(clients: ClientInfo[]): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('estimate_clients')
          .upsert(clients);
        if (error) {
          console.warn('[Supabase] saveClients error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveClients network error:', e);
        throw e;
      }
    }
  },

  async saveClient(client: ClientInfo): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('estimate_clients')
          .upsert(client);
        if (error) {
          console.warn('[Supabase] saveClient error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveClient network error:', e);
        throw e;
      }
    }
  },

  async deleteClient(id: string): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('estimate_clients')
          .delete()
          .eq('id', id);
        if (error) {
          console.warn('[Supabase] deleteClient error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] deleteClient network error:', e);
        throw e;
      }
    }
  },

  // --- DailyReports (일일 업무 보고서) CRUD ---
  async getDailyReports(): Promise<DailyReport[]> {
    let reports: DailyReport[] = [];

    if (await checkSupabaseAccess()) {
      try {
        const { data, error } = await supabase
          .from('estimate_daily_reports')
          .select('*')
          .order('report_date', { ascending: false });
        if (!error && data) {
          reports = data.map((r: any) => ({
            id: r.id,
            reportDate: r.report_date,
            title: r.title,
            completedTasks: r.completed_tasks,
            createdAt: r.created_at,
            createdBy: r.created_by
          })) as DailyReport[];
        } else if (error) {
          console.warn('[Supabase] getDailyReports error:', error);
        }
      } catch (e) {
        console.warn('[Supabase] getDailyReports network error:', e);
      }
    }
    return reports;
  },

  async saveDailyReport(report: DailyReport): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        let currentUserId: string | null = null;
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          currentUserId = session.user.id;
        }

        const payload = {
          id: report.id,
          report_date: report.reportDate,
          title: report.title,
          completed_tasks: report.completedTasks,
          created_by: currentUserId || report.createdBy || null
        };

        const { error } = await supabase
          .from('estimate_daily_reports')
          .upsert(payload);
        if (error) {
          console.warn('[Supabase] saveDailyReport error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveDailyReport network error:', e);
        throw e;
      }
    }
  },

  async deleteDailyReport(id: string): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('estimate_daily_reports')
          .delete()
          .eq('id', id);
        if (error) {
          console.warn('[Supabase] deleteDailyReport error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] deleteDailyReport network error:', e);
        throw e;
      }
    }
  },

  // --- CostItems (사내 기준 단가표) CRUD ---
  async getCostItems(): Promise<CostItem[]> {
    let items: CostItem[] = [];
    let isDbReadSuccess = false;

    if (await checkSupabaseAccess()) {
      try {
        const { data, error } = await supabase
          .from('cost_items')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          items = data as CostItem[];
          isDbReadSuccess = true;
        }
      } catch (e) {
        console.warn('[Supabase] getCostItems network error:', e);
      }
    }

    if (items.length === 0) {
      items = healCostItemsFromProjects(DEFAULT_COST_ITEMS);
    }
    
    // 구버전 데이터 마이그레이션 보정 엔진
    let needsUpdate = false;
    const migratedItems = items.map(item => {
      const currentItem = { ...item };
      
      if (currentItem.category === '인건비') {
        currentItem.category = '인건비 기준 (용역 공수)';
        needsUpdate = true;
      }
      if (currentItem.category === '디자인') {
        currentItem.category = '디자인 결과물 기준';
        needsUpdate = true;
      }
      if (currentItem.category === '개발비' || currentItem.category === '개발') {
        currentItem.category = '개발 결과물 기준';
        needsUpdate = true;
      }
      if (currentItem.category === '운영비' && currentItem.id === 'item-staff') {
        currentItem.category = '인건비 기준 (용역 공수)';
        needsUpdate = true;
      }
      if (currentItem.category === '운영비' && currentItem.id === 'item-maint') {
        currentItem.category = '개발 결과물 기준';
        needsUpdate = true;
      }
      if (currentItem.category === '식음료') {
        currentItem.category = '기타 결과물 기준';
        needsUpdate = true;
      }
      if (currentItem.category === '외주비') {
        currentItem.category = '기타 결과물 기준';
        needsUpdate = true;
      }
      
      if (
        (currentItem.id.startsWith('item-pm-') || 
         currentItem.id.startsWith('item-designer-') || 
         currentItem.id.startsWith('item-fe-') || 
         currentItem.id.startsWith('item-be-') || 
         currentItem.id.startsWith('item-qa-')) && 
        currentItem.unit !== 'MD'
      ) {
        currentItem.unit = 'MD';
        currentItem.formulaType = 'PEOPLE_x_DAYS_x_PRICE';
        needsUpdate = true;
      }

      // 새 레벨(L1 ~ L5) 마이그레이션 보정
      if (currentItem.rank) {
        let newRank = currentItem.rank;
        let rankMigrated = false;

        if (['Junior', 'Level 1', '보조'].includes(newRank)) {
          newRank = 'L1 Support';
          rankMigrated = true;
        } else if (['Associate', 'Level 2', '실무'].includes(newRank)) {
          newRank = 'L2 Operator';
          rankMigrated = true;
        } else if (['Professional', 'Level 3', '단독'].includes(newRank)) {
          newRank = 'L3 Specialist';
          rankMigrated = true;
        } else if (['Senior', 'Level 4', '리드'].includes(newRank)) {
          newRank = 'L4 Lead';
          rankMigrated = true;
        } else if (['Lead', 'Level 5', '총괄'].includes(newRank)) {
          newRank = 'L5 Director';
          rankMigrated = true;
        }

        if (rankMigrated) {
          currentItem.rank = newRank;
          needsUpdate = true;
        }
      }

      if (currentItem.internalName) {
        let nameWithRank = currentItem.internalName;
        let rankChanged = false;

        // 1단계: 레거시 한글/영어 직급명을 새 영문 레벨 키워드로 통일 및 마이그레이션
        if (nameWithRank.includes('S등급') || nameWithRank.includes('특급') || nameWithRank.includes('Lead')) {
          if (!nameWithRank.includes('L5 Director')) {
            nameWithRank = nameWithRank.replace('S등급', 'L5 Director').replace('특급', 'L5 Director').replace('(Lead)', '(L5 Director)');
            rankChanged = true;
          }
        }
        if (nameWithRank.includes('A등급') || nameWithRank.includes('고급') || nameWithRank.includes('Senior')) {
          if (!nameWithRank.includes('L4 Lead')) {
            nameWithRank = nameWithRank.replace('A등급', 'L4 Lead').replace('고급', 'L4 Lead').replace('(Senior)', '(L4 Lead)');
            rankChanged = true;
          }
        }
        if (nameWithRank.includes('중급') || nameWithRank.includes('Professional')) {
          if (!nameWithRank.includes('L3 Specialist')) {
            nameWithRank = nameWithRank.replace('중급', 'L3 Specialist').replace('(Professional)', '(L3 Specialist)');
            rankChanged = true;
          }
        }
        if (nameWithRank.includes('초급') || nameWithRank.includes('Associate')) {
          if (!nameWithRank.includes('L2 Operator')) {
            nameWithRank = nameWithRank.replace('초급', 'L2 Operator').replace('(Associate)', '(L2 Operator)');
            rankChanged = true;
          }
        }
        if (nameWithRank.includes('Junior')) {
          if (!nameWithRank.includes('L1 Support')) {
            nameWithRank = nameWithRank.replace('(Junior)', '(L1 Support)');
            rankChanged = true;
          }
        }

        if (rankChanged) {
          currentItem.internalName = nameWithRank;
          needsUpdate = true;
        }
      }

      return currentItem;
    });

    // --- [안전성 극대화] 중복 ID 제거 및 잃어버린 L2 Operator 자동 복구 엔진 ---
    const uniqueMap = new Map<string, CostItem>();
    migratedItems.forEach(item => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });
    let deduplicatedItems = Array.from(uniqueMap.values());
    const hadDuplicates = deduplicatedItems.length !== migratedItems.length;

    // 인건비 그룹별 등급 현황 통계
    const hrGroups: Record<string, { hasL2: boolean; noRankItem: CostItem | null; totalCount: number }> = {};
    deduplicatedItems.forEach(item => {
      if (item.category && item.category.includes('인건비')) {
        const name = item.name;
        if (!hrGroups[name]) {
          hrGroups[name] = { hasL2: false, noRankItem: null, totalCount: 0 };
        }
        hrGroups[name].totalCount++;
        if (item.rank === 'L2 Operator') {
          hrGroups[name].hasL2 = true;
        } else if (!item.rank || item.rank === '해당 없음') {
          hrGroups[name].noRankItem = item;
        }
      }
    });

    // L2 Operator가 누락되었는데 등급 없는 항목이 있는 그룹 복구
    let hasRecoveredL2 = false;
    deduplicatedItems = deduplicatedItems.map(item => {
      if (item.category && item.category.includes('인건비') && (!item.rank || item.rank === '해당 없음')) {
        const groupInfo = hrGroups[item.name];
        if (groupInfo && !groupInfo.hasL2 && groupInfo.totalCount > 1) {
          hasRecoveredL2 = true;
          return {
            ...item,
            rank: 'L2 Operator',
            internalName: item.internalName && !item.internalName.includes('L2 Operator')
              ? `${item.name} (L2 Operator)`
              : item.internalName || `${item.name} (L2 Operator)`
          };
        }
      }
      return item;
    });

    const finalNeedsUpdate = needsUpdate || isDbReadSuccess || hadDuplicates || hasRecoveredL2;

    if (finalNeedsUpdate && (await checkSupabaseAccess())) {
      try {
        await this.saveCostItems(deduplicatedItems);
      } catch (e) {
        console.warn('[Supabase] auto-clean cost items error:', e);
      }
    }
    
    return deduplicatedItems;
  },

  async saveCostItems(items: CostItem[]): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('cost_items')
          .upsert(items);
        if (error) {
          console.warn('[Supabase] saveCostItems error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveCostItems network error:', e);
        throw e;
      }
    }
  },

  async saveCostItem(item: CostItem | CostItem[]): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const payload = Array.isArray(item) ? item : [item];
        const { error } = await supabase
          .from('cost_items')
          .upsert(payload);
        if (error) {
          console.warn('[Supabase] saveCostItem error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveCostItem network error:', e);
        throw e;
      }
    }
  },

  async deleteCostItem(id: string): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('cost_items')
          .delete()
          .eq('id', id);
        if (error) {
          console.warn('[Supabase] deleteCostItem error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] deleteCostItem network error:', e);
        throw e;
      }
    }
  },

  // --- CostPackages (묶음 패키지 상품) CRUD ---
  async getCostPackages(): Promise<CostPackage[]> {
    let packages: CostPackage[] = [];
    if (await checkSupabaseAccess()) {
      try {
        const { data, error } = await supabase
          .from('cost_packages')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          packages = data as CostPackage[];
        } else if (error) {
          console.warn('[Supabase] getCostPackages error:', error);
        }
      } catch (e) {
        console.warn('[Supabase] getCostPackages network error:', e);
      }
    }
    
    if (packages.length === 0) {
      packages = DEFAULT_COST_PACKAGES;
    }
    return packages;
  },

  async saveCostPackages(packages: CostPackage[]): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('cost_packages')
          .upsert(packages);
        if (error) {
          console.warn('[Supabase] saveCostPackages error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveCostPackages network error:', e);
        throw e;
      }
    }
  },

  async saveCostPackage(pkg: CostPackage): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('cost_packages')
          .upsert(pkg);
        if (error) {
          console.warn('[Supabase] saveCostPackage error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveCostPackage network error:', e);
        throw e;
      }
    }
  },

  async deleteCostPackage(id: string): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('cost_packages')
          .delete()
          .eq('id', id);
        if (error) {
          console.warn('[Supabase] deleteCostPackage error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] deleteCostPackage network error:', e);
        throw e;
      }
    }
  },

  // --- VendorInfo (공급자 서명 설정) CRUD ---
  async getVendorInfo(): Promise<VendorInfo> {
    if (await checkSupabaseAccess()) {
      try {
        const { data, error } = await supabase
          .from('vendor_info')
          .select('*')
          .eq('id', 'default_vendor')
          .single();
        if (!error && data) {
          return data as VendorInfo;
        }
        if (error && error.code === 'PGRST116') {
          await this.saveVendorInfo(DEFAULT_VENDOR_INFO);
          return DEFAULT_VENDOR_INFO;
        }
        console.warn('[Supabase] getVendorInfo error:', error);
      } catch (e) {
        console.warn('[Supabase] getVendorInfo network error:', e);
      }
    }
    return DEFAULT_VENDOR_INFO;
  },

  async saveVendorInfo(info: VendorInfo): Promise<void> {
    const payload = { id: 'default_vendor', ...info };
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('vendor_info')
          .upsert(payload);
        if (error) {
          console.warn('[Supabase] saveVendorInfo error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveVendorInfo network error:', e);
        throw e;
      }
    }
  },

  downloadEmergencyBackup(): void {
    const payload = {
      projects: JSON.parse(localStorage.getItem('estimate_projects') || '[]'),
      costItems: JSON.parse(localStorage.getItem('estimate_cost_items') || '[]'),
      costPackages: JSON.parse(localStorage.getItem('estimate_cost_packages') || '[]'),
      vendorInfo: JSON.parse(localStorage.getItem('estimate_vendor_info') || 'null'),
      clients: JSON.parse(localStorage.getItem('estimate_clients') || '[]'),
      dailyReports: JSON.parse(localStorage.getItem('estimate_daily_reports') || '[]'),
      exportedAt: new Date().toISOString(),
      note: "Emergency backup created during Supabase migration failure."
    };
    
    const dataStr = JSON.stringify(payload, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const exportFileName = `estimate_emergency_backup_${dateStr}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  },

  // --- 백업용 내보내기/가져오기 기능 ---
  async exportData(): Promise<string> {
    const payload = {
      projects: await this.getProjects(),
      costItems: await this.getCostItems(),
      costPackages: await this.getCostPackages(),
      vendorInfo: await this.getVendorInfo(),
      clients: await this.getClients(),
      dailyReports: await this.getDailyReports()
    };
    return JSON.stringify(payload, null, 2);
  },

  async importData(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      const errors: string[] = [];
      
      // 현재 로그인한 사용자 세션 정보 가져오기
      let currentUserId: string | null = null;
      if (await checkSupabaseAccess()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user) {
            currentUserId = session.user.id;
          }
        } catch (e) {
          console.warn('[Import] 사용자 세션 확인 실패:', e);
        }
      }
      
      // 0. 일일 업무 보고서 복원
      if (parsed.dailyReports && Array.isArray(parsed.dailyReports)) {
        if (await checkSupabaseAccess()) {
          try {
            const payloads = parsed.dailyReports.map((r: any) => ({
              id: r.id,
              report_date: r.reportDate,
              title: r.title,
              completed_tasks: r.completedTasks,
              created_by: currentUserId || r.createdBy || r.created_by || null
            }));

            const { error } = await supabase
              .from('estimate_daily_reports')
              .upsert(payloads);
            if (error) {
              errors.push(`일일 보고서(estimate_daily_reports) DB 업로드 실패: ${error.message}`);
            }
          } catch (e: any) {
            errors.push(`일일 보고서 DB 통신 오류: ${e.message}`);
          }
        }
      }

      // 1. 고객사 정보를 프로젝트보다 먼저 복원하여 외래키 참조 관계 유지
      if (parsed.clients && Array.isArray(parsed.clients)) {
        const sanitizedClients = parsed.clients.map((client: any) => {
          const cleaned = { ...client };
          if (currentUserId) {
            cleaned.created_by = currentUserId;
          }
          delete cleaned.createdBy;
          return cleaned;
        });
        if (await checkSupabaseAccess()) {
          try {
            const { error } = await supabase
              .from('estimate_clients')
              .upsert(sanitizedClients);
            if (error) {
              errors.push(`고객사(estimate_clients) DB 업로드 실패: ${error.message} (코드: ${error.code})`);
            }
          } catch (e: any) {
            errors.push(`고객사 DB 통신 오류: ${e.message}`);
          }
        }
      }
      
      // 2. 프로젝트 복원 및 외래키(created_by) 데이터 정화 처리
      if (parsed.projects && Array.isArray(parsed.projects)) {
        const sanitizedProjects = parsed.projects.map((proj: any) => {
          const cleaned = { ...proj };
          
          // 백업 데이터 내의 생성자 ID가 현재 로그인한 유저와 매칭되도록 보정
          // 외래키(auth.users) 위반 에러 방지 목적
          if (currentUserId) {
            cleaned.created_by = currentUserId;
          }
          delete cleaned.createdBy;
          return cleaned;
        });
        
        if (await checkSupabaseAccess()) {
          try {
            const { error } = await supabase
              .from('estimate_projects')
              .upsert(sanitizedProjects);
            if (error) {
              errors.push(`견적 프로젝트(estimate_projects) DB 업로드 실패: ${error.message} (코드: ${error.code})`);
            }
          } catch (e: any) {
            errors.push(`견적 프로젝트 DB 통신 오류: ${e.message}`);
          }
        }
      } else if (parsed.projects) {
        const proj = parsed.projects;
        const cleaned = { ...proj };
        if (currentUserId) {
          cleaned.created_by = currentUserId;
        }
        delete cleaned.createdBy;
        if (await checkSupabaseAccess()) {
          try {
            const { error } = await supabase
              .from('estimate_projects')
              .upsert(cleaned);
            if (error) {
              errors.push(`견적 프로젝트 DB 업로드 실패: ${error.message} (코드: ${error.code})`);
            }
          } catch (e: any) {
            errors.push(`견적 프로젝트 DB 통신 오류: ${e.message}`);
          }
        }
      }
      
      // 3. 단가 항목 복원
      if (parsed.costItems && Array.isArray(parsed.costItems)) {
        const sanitizedCostItems = parsed.costItems.map((item: any) => {
          const cleaned = { ...item };
          if (currentUserId) {
            cleaned.created_by = currentUserId;
          }
          delete cleaned.createdBy;
          return cleaned;
        });
        if (await checkSupabaseAccess()) {
          try {
            const { error } = await supabase
              .from('cost_items')
              .upsert(sanitizedCostItems);
            if (error) {
              errors.push(`단가 항목(cost_items) DB 업로드 실패: ${error.message} (코드: ${error.code})`);
            }
          } catch (e: any) {
            errors.push(`단가 항목 DB 통신 오류: ${e.message}`);
          }
        }
      }
      
      // 4. 패키지 복원
      if (parsed.costPackages && Array.isArray(parsed.costPackages)) {
        const sanitizedCostPackages = parsed.costPackages.map((pkg: any) => {
          const cleaned = { ...pkg };
          if (currentUserId) {
            cleaned.created_by = currentUserId;
          }
          delete cleaned.createdBy;
          return cleaned;
        });
        if (await checkSupabaseAccess()) {
          try {
            const { error } = await supabase
              .from('cost_packages')
              .upsert(sanitizedCostPackages);
            if (error) {
              errors.push(`묶음 패키지(cost_packages) DB 업로드 실패: ${error.message} (코드: ${error.code})`);
            }
          } catch (e: any) {
            errors.push(`묶음 패키지 DB 통신 오류: ${e.message}`);
          }
        }
      }
      
      // 5. 공급자 정보 복원
      if (parsed.vendorInfo) {
        const cleanedVendor = { ...parsed.vendorInfo };
        if (currentUserId) {
          cleanedVendor.created_by = currentUserId;
        }
        delete cleanedVendor.createdBy;
        if (await checkSupabaseAccess()) {
          try {
            const payload = { id: 'default_vendor', ...cleanedVendor };
            const { error } = await supabase
              .from('vendor_info')
              .upsert(payload);
            if (error) {
              errors.push(`공급자 서명(vendor_info) DB 업로드 실패: ${error.message} (코드: ${error.code})`);
            }
          } catch (e: any) {
            errors.push(`공급자 서명 DB 통신 오류: ${e.message}`);
          }
        }
      }
      
      if (errors.length > 0) {
        return { success: false, error: errors.join('\n') };
      }
      
      return { success: true };
    } catch (e: any) {
      console.warn(e);
      return { success: false, error: `JSON 파싱 오류: ${e.message}` };
    }
  },

  // --- Settings (드롭다운 카테고리, 단위, 항목명 맵) CRUD ---
  async getSettings(): Promise<{ categories: string[]; units: string[]; namesList: Record<string, string[]> }> {
    const defaultSettings = {
      categories: [
        '인건비 기준 (용역 공수)',
        '디자인 결과물 기준',
        '개발 결과물 기준',
        '생산 결과물 기준',
        '기타 결과물 기준'
      ],
      units: ['MD', '일', '시간', 'EA', '개', '잔', '종', '페이지', '건', '식', '개월'],
      namesList: {
        '인건비 기준 (용역 공수)': [
          'PM 기획 인력',
          '디자이너 투입',
          '프론트엔드 개발',
          '백엔드 개발',
          '현장 보조 스태프',
          '현장 운영 스태프',
          '현장 슈퍼바이저',
          '행사 운영 PM',
          '시스템 엔지니어',
          'UI/UX 퍼블리셔'
        ],
        '디자인 결과물 기준': [
          '디자인 시안',
          'BI/BX 로고 디자인',
          '브로슈어 제작',
          '패키지 디자인',
          '웹사이트 상세페이지'
        ],
        '개발 결과물 기준': [
          '월 유지보수',
          '시스템 구축',
          '서버 인프라 세팅',
          '데이터베이스 설계',
          'API 연동 개발'
        ],
        '생산 결과물 기준': [
          '인쇄물 제작',
          '부스 자재 생산',
          '아크릴 명판 제작',
          '시공 자재 가공',
          '현수막 출력'
        ],
        '기타 결과물 기준': [
          '음료 제조',
          '컵케이크 납품',
          '번역',
          '도서 구매',
          '소모품 구입'
        ]
      }
    };

    if (await checkSupabaseAccess()) {
      try {
        const { data, error } = await supabase
          .from('estimate_settings')
          .select('*')
          .eq('id', 'default_settings')
          .single();
        if (!error && data) {
          const parsed = {
            categories: Array.isArray(data.categories) ? data.categories : JSON.parse(data.categories),
            units: Array.isArray(data.units) ? data.units : JSON.parse(data.units),
            namesList: typeof data.names_list === 'object' ? data.names_list : JSON.parse(data.names_list)
          };
          return parsed;
        }
        
        if (error && (error.code === 'PGRST116' || error.code === '42P01')) {
          console.warn('[Supabase] estimate_settings 테이블이 존재하지 않거나 설정이 비어있습니다. DB 업서트를 시도합니다.');
          if (error.code === 'PGRST116') {
            await this.saveSettings(defaultSettings);
          }
        } else {
          console.warn('[Supabase] getSettings error:', error);
        }
      } catch (e) {
        console.warn('[Supabase] getSettings network error:', e);
      }
    }
    return defaultSettings;
  },

  async saveSettings(settings: { categories: string[]; units: string[]; namesList: Record<string, string[]> }): Promise<void> {
    if (await checkSupabaseAccess()) {
      try {
        const { error } = await supabase
          .from('estimate_settings')
          .upsert({
            id: 'default_settings',
            categories: settings.categories,
            units: settings.units,
            names_list: settings.namesList
          });
        if (error) {
          console.warn('[Supabase] saveSettings error:', error);
          throw new Error(error.message);
        }
      } catch (e: any) {
        console.warn('[Supabase] saveSettings network error:', e);
        throw e;
      }
    }
  },

  getHealedDefaultCostItems(): CostItem[] {
    return healCostItemsFromProjects(DEFAULT_COST_ITEMS);
  }
};
