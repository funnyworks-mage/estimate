import type { CostItem, CostPackage, EstimateProject, VendorInfo, EstimateRow } from '../types/estimate';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// --- 초기 기본 데이터 (사내 표준 프리셋) ---

const DEFAULT_COST_ITEMS: CostItem[] = [
  {
    id: 'item-pm',
    name: 'PM 기획 인력',
    internalName: 'PM 기획 인력 (L5 Director)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1500000,
    rank: 'L5 Director',
    basePrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE', // 인력형 전환: 인원 * 기간 = MD 공수 자동 환산
    vatType: 'TAX',
    description: '기획 및 PM 총괄 업무',
    internalMemo: '행사 기획 및 현장 총괄 PM 기준'
  },
  {
    id: 'item-designer',
    name: '디자이너 투입',
    internalName: '디자이너 (L4 Lead)',
    category: '디자인 결과물 기준',
    unit: 'MD',
    defaultPrice: 800000,
    rank: 'L4 Lead',
    basePrice: 400000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE', // 인력형 전환: 인원 * 기간 = MD 공수 자동 환산
    vatType: 'TAX',
    description: 'UI/UX 및 키비주얼 디자인',
    internalMemo: '산출물 디자인 완료 기준'
  },
  {
    id: 'item-fe',
    name: '프론트엔드 개발',
    internalName: '프론트엔드 개발 (L3 Specialist)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 600000,
    rank: 'L3 Specialist',
    basePrice: 400000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE', // 인력형 전환: 인원 * 기간 = MD 공수 자동 환산
    vatType: 'TAX',
    description: '화면 웹/앱 UI 구현 및 API 연동',
    internalMemo: '프론트엔드 작업 공수'
  },
  {
    id: 'item-be',
    name: '백엔드 개발',
    internalName: '백엔드 개발 (L4 Lead)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 1000000,
    rank: 'L4 Lead',
    basePrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE', // 인력형 전환: 인원 * 기간 = MD 공수 자동 환산
    vatType: 'TAX',
    description: '데이터베이스 설계 및 서버 API 개발',
    internalMemo: '서버 인프라 구축 포함'
  },
  {
    id: 'item-staff-helper',
    name: '현장 보조 스태프',
    internalName: '현장 보조 스태프',
    category: '인건비 기준 (용역 공수)',
    unit: '일',
    defaultPrice: 100000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '단순 현장 보조, 등록 및 대기 업무',
    internalMemo: '단순 현장 스태프 기준'
  },
  {
    id: 'item-staff-operator',
    name: '현장 운영 스태프',
    internalName: '현장 운영 스태프',
    category: '인건비 기준 (용역 공수)',
    unit: '일',
    defaultPrice: 130000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '현장 안내, 부스 운영 및 실무 수행',
    internalMemo: '숙련 현장 스태프 기준'
  },
  {
    id: 'item-staff-supervisor',
    name: '현장 슈퍼바이저',
    internalName: '현장 슈퍼바이저',
    category: '인건비 기준 (용역 공수)',
    unit: '일',
    defaultPrice: 250000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '현장 인력 관리, 일정 및 품질 총괄 관리',
    internalMemo: '현장 감독 및 리더 기준'
  },
  {
    id: 'item-staff-pm',
    name: '행사 운영 PM',
    internalName: '행사 운영 PM',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '행사 총괄 기획 및 클라이언트 최종 커뮤니케이션',
    internalMemo: '프로젝트 총괄 PM 기준'
  },
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
      { itemId: 'item-pm', defaultQuantity: 0, defaultPeople: 1, defaultDays: 3 }, // 인원 1명 * 3일 = 3MD 자동 유도
      { itemId: 'item-staff-operator', defaultQuantity: 0, defaultPeople: 15, defaultDays: 3 }
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
  companyName: '주식회사 퍼니웍스',
  bizNumber: '119-87-05203',
  ownerName: '홍길동',
  address: '서울시 마포구 신촌로 48, 5층',
  tel: '02-123-4567',
  email: 'contact@funnyworks.com'
};

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
      supplyPrice = q * p;
      break;
    case 'FIXED':
      supplyPrice = p;
      break;
    default:
      supplyPrice = q * p;
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

const KEYS = {
  PROJECTS: 'estimate_projects',
  COST_ITEMS: 'estimate_cost_items',
  COST_PACKAGES: 'estimate_cost_packages',
  VENDOR_INFO: 'estimate_vendor_info',
  SETTINGS: 'estimate_settings'
};

export const StorageAPI = {
  // --- Projects (견적 프로젝트) CRUD ---
  async getProjects(): Promise<EstimateProject[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('estimate_projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          localStorage.setItem(KEYS.PROJECTS, JSON.stringify(data));
          return data as EstimateProject[];
        }
        console.error('[Supabase] getProjects error:', error);
      } catch (e) {
        console.error('[Supabase] getProjects network error:', e);
      }
    }
    const data = localStorage.getItem(KEYS.PROJECTS);
    if (!data) {
      await this.saveProjects(DEFAULT_PROJECTS);
      return DEFAULT_PROJECTS;
    }
    return JSON.parse(data);
  },

  async saveProjects(projects: EstimateProject[]): Promise<void> {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('estimate_projects')
          .upsert(projects);
        if (error) console.error('[Supabase] saveProjects error:', error);
      } catch (e) {
        console.error('[Supabase] saveProjects network error:', e);
      }
    }
  },

  async getProjectById(id: string): Promise<EstimateProject | undefined> {
    const projects = await this.getProjects();
    return projects.find(p => p.id === id);
  },

  async saveProject(project: EstimateProject): Promise<void> {
    const projects = await this.getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx > -1) {
      projects[idx] = project;
    } else {
      projects.push(project);
    }
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('estimate_projects')
          .upsert(project);
        if (error) console.error('[Supabase] saveProject error:', error);
      } catch (e) {
        console.error('[Supabase] saveProject network error:', e);
      }
    }
  },

  async deleteProject(id: string): Promise<void> {
    const projects = await this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(filtered));
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('estimate_projects')
          .delete()
          .eq('id', id);
        if (error) console.error('[Supabase] deleteProject error:', error);
      } catch (e) {
        console.error('[Supabase] deleteProject network error:', e);
      }
    }
  },

  // --- CostItems (사내 기준 단가표) CRUD ---
  async getCostItems(): Promise<CostItem[]> {
    let items: CostItem[] = [];
    let loadedFromSupabase = false;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cost_items')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          items = data as CostItem[];
          loadedFromSupabase = true;
        } else {
          console.error('[Supabase] getCostItems error:', error);
        }
      } catch (e) {
        console.error('[Supabase] getCostItems network error:', e);
      }
    }

    if (!loadedFromSupabase) {
      const data = localStorage.getItem(KEYS.COST_ITEMS);
      if (!data) {
        await this.saveCostItems(DEFAULT_COST_ITEMS);
        return DEFAULT_COST_ITEMS;
      }
      items = JSON.parse(data) as CostItem[];
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
      
      if (['item-pm', 'item-designer', 'item-fe', 'item-be'].includes(currentItem.id) && currentItem.unit !== 'MD') {
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

    if (needsUpdate || loadedFromSupabase) {
      // 로컬 스토리지 상시 갱신
      localStorage.setItem(KEYS.COST_ITEMS, JSON.stringify(migratedItems));
      
      // 마이그레이션 등으로 보정된 데이터를 Supabase에도 일괄 업서트
      if (needsUpdate && isSupabaseConfigured) {
        await this.saveCostItems(migratedItems);
      }
    }
    
    return migratedItems;
  },

  async saveCostItems(items: CostItem[]): Promise<void> {
    localStorage.setItem(KEYS.COST_ITEMS, JSON.stringify(items));
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('cost_items')
          .upsert(items);
        if (error) console.error('[Supabase] saveCostItems error:', error);
      } catch (e) {
        console.error('[Supabase] saveCostItems network error:', e);
      }
    }
  },

  async saveCostItem(item: CostItem | CostItem[]): Promise<void> {
    const items = await this.getCostItems();
    let updated: CostItem[] = [...items];
    
    if (Array.isArray(item)) {
      updated = [...item, ...updated];
    } else {
      const idx = items.findIndex(i => i.id === item.id);
      if (idx > -1) {
        updated[idx] = item;
      } else {
        updated = [item, ...updated];
      }
    }
    
    localStorage.setItem(KEYS.COST_ITEMS, JSON.stringify(updated));
    
    if (isSupabaseConfigured) {
      try {
        const payload = Array.isArray(item) ? item : [item];
        const { error } = await supabase
          .from('cost_items')
          .upsert(payload);
        if (error) console.error('[Supabase] saveCostItem error:', error);
      } catch (e) {
        console.error('[Supabase] saveCostItem network error:', e);
      }
    }
  },

  async deleteCostItem(id: string): Promise<void> {
    const items = await this.getCostItems();
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(KEYS.COST_ITEMS, JSON.stringify(filtered));
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('cost_items')
          .delete()
          .eq('id', id);
        if (error) console.error('[Supabase] deleteCostItem error:', error);
      } catch (e) {
        console.error('[Supabase] deleteCostItem network error:', e);
      }
    }
  },

  // --- CostPackages (묶음 패키지 상품) CRUD ---
  async getCostPackages(): Promise<CostPackage[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('cost_packages')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          localStorage.setItem(KEYS.COST_PACKAGES, JSON.stringify(data));
          return data as CostPackage[];
        }
        console.error('[Supabase] getCostPackages error:', error);
      } catch (e) {
        console.error('[Supabase] getCostPackages network error:', e);
      }
    }
    const data = localStorage.getItem(KEYS.COST_PACKAGES);
    if (!data) {
      await this.saveCostPackages(DEFAULT_COST_PACKAGES);
      return DEFAULT_COST_PACKAGES;
    }
    return JSON.parse(data);
  },

  async saveCostPackages(packages: CostPackage[]): Promise<void> {
    localStorage.setItem(KEYS.COST_PACKAGES, JSON.stringify(packages));
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('cost_packages')
          .upsert(packages);
        if (error) console.error('[Supabase] saveCostPackages error:', error);
      } catch (e) {
        console.error('[Supabase] saveCostPackages network error:', e);
      }
    }
  },

  async saveCostPackage(pkg: CostPackage): Promise<void> {
    const packages = await this.getCostPackages();
    const idx = packages.findIndex(p => p.id === pkg.id);
    if (idx > -1) {
      packages[idx] = pkg;
    } else {
      packages.push(pkg);
    }
    localStorage.setItem(KEYS.COST_PACKAGES, JSON.stringify(packages));
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('cost_packages')
          .upsert(pkg);
        if (error) console.error('[Supabase] saveCostPackage error:', error);
      } catch (e) {
        console.error('[Supabase] saveCostPackage network error:', e);
      }
    }
  },

  async deleteCostPackage(id: string): Promise<void> {
    const packages = await this.getCostPackages();
    const filtered = packages.filter(p => p.id !== id);
    localStorage.setItem(KEYS.COST_PACKAGES, JSON.stringify(filtered));
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('cost_packages')
          .delete()
          .eq('id', id);
        if (error) console.error('[Supabase] deleteCostPackage error:', error);
      } catch (e) {
        console.error('[Supabase] deleteCostPackage network error:', e);
      }
    }
  },

  // --- VendorInfo (공급자 서명 설정) CRUD ---
  async getVendorInfo(): Promise<VendorInfo> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('vendor_info')
          .select('*')
          .eq('id', 'default_vendor')
          .single();
        if (!error && data) {
          localStorage.setItem(KEYS.VENDOR_INFO, JSON.stringify(data));
          return data as VendorInfo;
        }
        if (error && error.code === 'PGRST116') {
          await this.saveVendorInfo(DEFAULT_VENDOR_INFO);
          return DEFAULT_VENDOR_INFO;
        }
        console.error('[Supabase] getVendorInfo error:', error);
      } catch (e) {
        console.error('[Supabase] getVendorInfo network error:', e);
      }
    }
    const data = localStorage.getItem(KEYS.VENDOR_INFO);
    if (!data) {
      await this.saveVendorInfo(DEFAULT_VENDOR_INFO);
      return DEFAULT_VENDOR_INFO;
    }
    return JSON.parse(data);
  },

  async saveVendorInfo(info: VendorInfo): Promise<void> {
    const payload = { id: 'default_vendor', ...info };
    localStorage.setItem(KEYS.VENDOR_INFO, JSON.stringify(info));
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('vendor_info')
          .upsert(payload);
        if (error) console.error('[Supabase] saveVendorInfo error:', error);
      } catch (e) {
        console.error('[Supabase] saveVendorInfo network error:', e);
      }
    }
  },

  // --- 백업용 내보내기/가져오기 기능 ---
  async exportData(): Promise<string> {
    const payload = {
      projects: await this.getProjects(),
      costItems: await this.getCostItems(),
      costPackages: await this.getCostPackages(),
      vendorInfo: await this.getVendorInfo()
    };
    return JSON.stringify(payload, null, 2);
  },

  async importData(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.projects) await this.saveProjects(parsed.projects);
      if (parsed.costItems) await this.saveCostItems(parsed.costItems);
      if (parsed.costPackages) await this.saveCostPackages(parsed.costPackages);
      if (parsed.vendorInfo) await this.saveVendorInfo(parsed.vendorInfo);
      return true;
    } catch (e) {
      console.error(e);
      return false;
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

    if (isSupabaseConfigured) {
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
          localStorage.setItem(KEYS.SETTINGS, JSON.stringify(parsed));
          return parsed;
        }
        
        if (error && (error.code === 'PGRST116' || error.code === '42P01')) {
          console.warn('[Supabase] estimate_settings 테이블이 존재하지 않거나 설정이 비어있습니다. 로컬 기본 설정을 이용하고 업서트를 시도합니다.');
          if (error.code === 'PGRST116') {
            await this.saveSettings(defaultSettings);
          }
        } else {
          console.error('[Supabase] getSettings error:', error);
        }
      } catch (e) {
        console.error('[Supabase] getSettings network error:', e);
      }
    }

    const localData = localStorage.getItem(KEYS.SETTINGS);
    if (!localData) {
      const legacyCats = localStorage.getItem('estimate_notion_categories_v4');
      const legacyUnits = localStorage.getItem('estimate_notion_units_v4');
      const legacyNames = localStorage.getItem('estimate_notion_names_v4');
      
      const migrated = {
        categories: legacyCats ? JSON.parse(legacyCats) : defaultSettings.categories,
        units: legacyUnits ? JSON.parse(legacyUnits) : defaultSettings.units,
        namesList: legacyNames ? JSON.parse(legacyNames) : defaultSettings.namesList
      };

      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(migrated));
      return migrated;
    }
    return JSON.parse(localData);
  },

  async saveSettings(settings: { categories: string[]; units: string[]; namesList: Record<string, string[]> }): Promise<void> {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    
    localStorage.setItem('estimate_notion_categories_v4', JSON.stringify(settings.categories));
    localStorage.setItem('estimate_notion_units_v4', JSON.stringify(settings.units));
    localStorage.setItem('estimate_notion_names_v4', JSON.stringify(settings.namesList));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('estimate_settings')
          .upsert({
            id: 'default_settings',
            categories: settings.categories,
            units: settings.units,
            names_list: settings.namesList,
            updated_at: new Date().toISOString()
          });
        if (error) {
          if (error.code === '42P01') {
            console.warn('[Supabase] estimate_settings 테이블이 존재하지 않아 DB에 저장하지 못했습니다. 로컬스토리지 전용 모드로 원활히 구동됩니다.');
          } else {
            console.error('[Supabase] saveSettings error:', error);
          }
        }
      } catch (e) {
        console.error('[Supabase] saveSettings network error:', e);
      }
    }
  }
};
