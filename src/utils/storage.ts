import type { CostItem, CostPackage, EstimateProject, VendorInfo, EstimateRow } from '../types/estimate';

// --- 초기 기본 데이터 (사내 표준 프리셋) ---

const DEFAULT_COST_ITEMS: CostItem[] = [
  {
    id: 'item-pm',
    name: 'PM 기획 인력',
    internalName: 'PM 기획 인력 (Lead)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 500000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE', // 인력형 전환: 인원 * 기간 = MD 공수 자동 환산
    vatType: 'TAX',
    description: '기획 및 PM 총괄 업무',
    internalMemo: '행사 기획 및 현장 총괄 PM 기준'
  },
  {
    id: 'item-designer',
    name: '디자이너 투입',
    internalName: '디자이너 (Senior)',
    category: '디자인 결과물 기준',
    unit: 'MD',
    defaultPrice: 400000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE', // 인력형 전환: 인원 * 기간 = MD 공수 자동 환산
    vatType: 'TAX',
    description: 'UI/UX 및 키비주얼 디자인',
    internalMemo: '산출물 디자인 완료 기준'
  },
  {
    id: 'item-fe',
    name: '프론트엔드 개발',
    internalName: '프론트엔드 개발 (Professional)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 600000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE', // 인력형 전환: 인원 * 기간 = MD 공수 자동 환산
    vatType: 'TAX',
    description: '화면 웹/앱 UI 구현 및 API 연동',
    internalMemo: '프론트엔드 작업 공수'
  },
  {
    id: 'item-be',
    name: '백엔드 개발',
    internalName: '백엔드 개발 (Senior)',
    category: '인건비 기준 (용역 공수)',
    unit: 'MD',
    defaultPrice: 700000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE', // 인력형 전환: 인원 * 기간 = MD 공수 자동 환산
    vatType: 'TAX',
    description: '데이터베이스 설계 및 서버 API 개발',
    internalMemo: '서버 인프라 구축 포함'
  },
  {
    id: 'item-staff',
    name: '현장 운영 인력',
    internalName: '현장 진행 스태프 (Associate)',
    category: '인건비 기준 (용역 공수)',
    unit: '일',
    defaultPrice: 100000,
    formulaType: 'PEOPLE_x_DAYS_x_PRICE',
    vatType: 'TAX',
    description: '행사 현장 안내 및 운영 지원 인력',
    internalMemo: '식비 별도 제공 필요'
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
      { itemId: 'item-staff', defaultQuantity: 0, defaultPeople: 15, defaultDays: 3 }
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
  VENDOR_INFO: 'estimate_vendor_info'
};

export const StorageAPI = {
  getProjects(): EstimateProject[] {
    const data = localStorage.getItem(KEYS.PROJECTS);
    if (!data) {
      this.saveProjects(DEFAULT_PROJECTS);
      return DEFAULT_PROJECTS;
    }
    return JSON.parse(data);
  },

  saveProjects(projects: EstimateProject[]): void {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
  },

  getProjectById(id: string): EstimateProject | undefined {
    const projects = this.getProjects();
    return projects.find(p => p.id === id);
  },

  saveProject(project: EstimateProject): void {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx > -1) {
      projects[idx] = project;
    } else {
      projects.push(project);
    }
    this.saveProjects(projects);
  },

  deleteProject(id: string): void {
    const projects = this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    this.saveProjects(filtered);
  },

  getCostItems(): CostItem[] {
    const data = localStorage.getItem(KEYS.COST_ITEMS);
    if (!data) {
      this.saveCostItems(DEFAULT_COST_ITEMS);
      return DEFAULT_COST_ITEMS;
    }
    
    const items = JSON.parse(data) as CostItem[];
    
    // 로컬스토리지 구버전 데이터 마이그레이션 보정 (단위 보정 및 레거시 비표준 등급 자동 정화)
    let needsUpdate = false;
    const migratedItems = items.map(item => {
      const currentItem = { ...item };
      
      // 1. 카테고리 레거시 명칭 갱신
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
      
      // 2. 단위 및 수식 보정
      if (['item-pm', 'item-designer', 'item-fe', 'item-be'].includes(currentItem.id) && currentItem.unit !== 'MD') {
        currentItem.unit = 'MD';
        currentItem.formulaType = 'PEOPLE_x_DAYS_x_PRICE';
        needsUpdate = true;
      }

      // 3. 신규 5대 표준 등급 (Junior, Associate, Professional, Senior, Lead)으로 자동 마이그레이션
      if (currentItem.internalName) {
        let nameWithRank = currentItem.internalName;
        let rankChanged = false;

        if (nameWithRank.includes('S등급') || nameWithRank.includes('특급') || nameWithRank.includes('Lead')) {
          nameWithRank = nameWithRank.replace('S등급', 'Lead').replace('특급', 'Lead');
          rankChanged = true;
        } else if (nameWithRank.includes('A등급') || nameWithRank.includes('고급') || nameWithRank.includes('Senior')) {
          nameWithRank = nameWithRank.replace('A등급', 'Senior').replace('고급', 'Senior');
          rankChanged = true;
        } else if (nameWithRank.includes('중급') || nameWithRank.includes('Professional')) {
          nameWithRank = nameWithRank.replace('중급', 'Professional');
          rankChanged = true;
        } else if (nameWithRank.includes('초급') || nameWithRank.includes('Associate')) {
          nameWithRank = nameWithRank.replace('초급', 'Associate');
          rankChanged = true;
        }

        if (rankChanged) {
          currentItem.internalName = nameWithRank;
          needsUpdate = true;
        }
      }

      return currentItem;
    });

    if (needsUpdate) {
      this.saveCostItems(migratedItems);
      return migratedItems;
    }
    
    return items;
  },

  saveCostItems(items: CostItem[]): void {
    localStorage.setItem(KEYS.COST_ITEMS, JSON.stringify(items));
  },

  saveCostItem(item: CostItem): void {
    const items = this.getCostItems();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx > -1) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    this.saveCostItems(items);
  },

  deleteCostItem(id: string): void {
    const items = this.getCostItems();
    this.saveCostItems(items.filter(i => i.id !== id));
  },

  getCostPackages(): CostPackage[] {
    const data = localStorage.getItem(KEYS.COST_PACKAGES);
    if (!data) {
      this.saveCostPackages(DEFAULT_COST_PACKAGES);
      return DEFAULT_COST_PACKAGES;
    }
    return JSON.parse(data);
  },

  saveCostPackages(packages: CostPackage[]): void {
    localStorage.setItem(KEYS.COST_PACKAGES, JSON.stringify(packages));
  },

  saveCostPackage(pkg: CostPackage): void {
    const packages = this.getCostPackages();
    const idx = packages.findIndex(p => p.id === pkg.id);
    if (idx > -1) {
      packages[idx] = pkg;
    } else {
      packages.push(pkg);
    }
    this.saveCostPackages(packages);
  },

  deleteCostPackage(id: string): void {
    const packages = this.getCostPackages();
    this.saveCostPackages(packages.filter(p => p.id !== id));
  },

  getVendorInfo(): VendorInfo {
    const data = localStorage.getItem(KEYS.VENDOR_INFO);
    if (!data) {
      this.saveVendorInfo(DEFAULT_VENDOR_INFO);
      return DEFAULT_VENDOR_INFO;
    }
    return JSON.parse(data);
  },

  saveVendorInfo(info: VendorInfo): void {
    localStorage.setItem(KEYS.VENDOR_INFO, JSON.stringify(info));
  },

  exportData(): string {
    const payload = {
      projects: this.getProjects(),
      costItems: this.getCostItems(),
      costPackages: this.getCostPackages(),
      vendorInfo: this.getVendorInfo()
    };
    return JSON.stringify(payload, null, 2);
  },

  importData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.projects) this.saveProjects(parsed.projects);
      if (parsed.costItems) this.saveCostItems(parsed.costItems);
      if (parsed.costPackages) this.saveCostPackages(parsed.costPackages);
      if (parsed.vendorInfo) this.saveVendorInfo(parsed.vendorInfo);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
};
