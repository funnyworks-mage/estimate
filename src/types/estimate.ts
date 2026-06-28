export type FormulaType =
  | 'QTY_x_PRICE'           // 수량 * 단가 (일반 상품형)
  | 'PEOPLE_x_DAYS_x_PRICE'     // 인원 * 일수 * 단가 (인건비/현장인력형)
  | 'MD_x_PRICE'            // 투입 MD * 단가 (개발/기획형)
  | 'MONTHS_x_PRICE'        // 개월 수 * 월 단가 (유지보수형)
  | 'FIXED';                // 고정 패키지 금액 (수량 무관 고정)

export type VatType = 'TAX' | 'FREE' | 'ZERO'; // 과세(10%), 면세, 영세

// 단일 항목 라이브러리에 저장되는 아이템 구조 (사내 단가표 원본)
export interface CostItem {
  id: string;
  name: string;
  internalName?: string;
  category: string;
  unit: string;
  defaultPrice: number;
  rank?: string;       // Junior, Associate, Professional, Senior, Lead
  basePrice?: number;  // Junior(1.0x) 기준 단가
  formulaType: FormulaType;
  vatType: VatType;
  description?: string;
  internalMemo?: string;
}

// 패키지(세트) 라이브러리에 저장되는 구조 (묶음 상품)
export interface CostPackageItem {
  itemId: string;
  defaultQuantity: number;
  defaultPeople?: number;
  defaultDays?: number;
}

export interface CostPackage {
  id: string;
  name: string;
  category: string;
  items: CostPackageItem[];
  description?: string;
}

// 실제 견적 테이블에 들어가는 행(Row) 구조 (개별 편집 가능)
export interface EstimateRow {
  id: string;
  isSelected: boolean;      // 발행 포함 여부
  category: string;         // 구분
  name: string;             // 항목명
  size?: string;            // 규격 / 사이즈 (제작/시공형에 주로 사용)
  unit: string;             // 단위
  quantity: number;         // 수량 (또는 MD, 개월 수)
  people?: number;          // 인원 (인건비형에만 사용)
  days?: number;            // 일수 (인건비형에만 사용)
  price: number;            // 단가
  rank?: string;            // 현재 등급
  basePrice?: number;       // Junior(1.0x) 기준 단가
  supplyPrice: number;      // 공급가액 (자동 계산)
  vat: number;              // 부가세 (자동 계산)
  totalPrice: number;       // 합계 (자동 계산)
  formulaType: FormulaType;
  vatType: VatType;
  description?: string;     // 비고/설명
  correctionRate?: number;  // 행별 보정율 (예: 0.5)
  correctionName?: string;  // 행별 보정 조건명 (예: '야간/주말 (+50%)')
}

// 견적서의 구분 단위 (섹션/그룹)
export interface EstimateSection {
  id: string;
  name: string;             // 섹션명 (예: "1차 개발비", "8월 운영비")
  rows: EstimateRow[];
}

// 사내 공급자 정보
export interface VendorInfo {
  companyName: string;
  bizNumber: string;
  ownerName: string;
  address: string;
  tel?: string;
  email?: string;
  sealImage?: string; // 직인 도장 이미지 (Base64 등)
  logoImage?: string; // 회사 로고 이미지 (Base64 등)
}

// WBS 내의 세부 작업 (중분류 및 상세)
export interface WbsTask {
  id: string;
  name: string;             // 작업내용 (예: "Claim Now 버튼 노출 정책 변경")
  details: string[];        // 상세 세부 불릿 리스트 (예: ["불릿1", "불릿2"])
  status: 'planned' | 'progress' | 'hold' | 'completed' | string; // 진행상황 (예정, 진행중, 보류, 완료)
  manpower: number;         // 투입인력 (명)
  md: number;               // 투입일수 (MD)
  role: string;             // 연동할 역할군
  roles?: string[];         // 다중 역할군 연동 지원
  startDate?: string;       // 시작일 (YYYY-MM-DD)
  endDate?: string;         // 종료일 (YYYY-MM-DD)
  progress?: number;        // 진척도 (0 ~ 100)
  expectedEndDate?: string; // 예상 완료일자 (YYYY-MM-DD)
  actualEndDate?: string;   // 실제 완료일자 (YYYY-MM-DD)
  memo?: string;            // 비고 및 메모
  checkedDetails?: boolean[]; // 상세 세부내역 각 줄별 체크 여부
  isCustom?: boolean;       // WBS 대시보드에서 퀵 등록한 태스크 여부 (견적서 연동본과 구분)
}

// WBS 대기능 / 항목 (대분류)
export interface WbsCategory {
  id: string;
  no: number;               // No. (순서)
  title: string;            // 항목/대분류명 (예: "벨기에/네덜란드 프로모션 오픈")
  tasks: WbsTask[];         // 하위 세부 작업들
}

export interface ClientInfo {
  id: string;
  name: string;
  bizNumber?: string;
  ownerName?: string;
  address?: string;
  managerName?: string;
  managerTel?: string;
  memo?: string;
}

// 일일 업무 보고서 구조
export interface DailyReport {
  id: string;
  reportDate: string;       // 보고서 날짜 (YYYY-MM-DD)
  title: string;            // 보고서 제목
  completedTasks: Array<{
    projectId: string;
    projectTitle: string;
    taskId: string;
    taskName: string;
    role: string;
    actualEndDate: string;
    memo?: string;
    taskDetails?: string[]; // 상세 세부 작업 내역 중 체크 완료된 목록
  }>;
  createdAt: string;
  createdBy?: string;
}

// 견적 프로젝트 전체 구조
export interface EstimateProject {
  id: string;
  projectType: 'IT' | 'DESIGN' | 'BUILD' | 'OTHER'; // 견적서 기본 폼 종류
  title: string;
  clientId?: string;        // 고객사 ID 매핑 필드 추가
  clientName: string;
  estimateDate: string;
  expiryDate: string;
  vendorInfo: VendorInfo;
  sections: EstimateSection[];
  remarks: string;          // 비고란 내용
  status: 'draft' | 'invoicing' | 'completed'; // 작성중 | 청구중 | 지급완료
  createdAt: string;
  wbs?: WbsCategory[];      // 프로젝트별 WBS 데이터
  totalCorrectionRate?: number; // 총괄 보정율 (예: -0.10)
  totalCorrectionName?: string; // 총괄 보정명 (예: '장기계약 할인 (-10%)')
  useForeignCurrency?: boolean; // 외화 환산 표기 여부
  foreignCurrency?: 'EUR' | 'USD' | 'JPY' | 'CNY'; // 표기 외화 종류 (EUR, USD, JPY, CNY 등)
  exchangeRate?: number;        // 적용 환율 (1 외화 = OOO KRW)
  exchangeRateSource?: 'manual' | 'api'; // 환율 입력 소스
  billingDate?: string;         // 청구 예정일 (YYYY-MM-DD)
  paymentDueDate?: string;      // 수금 예정일 (YYYY-MM-DD)
  createdBy?: string;           // 작성자 UUID
  approvalStatus?: 'draft' | 'requested' | 'approved' | 'rejected'; // 결재 상태
  rejectReason?: string;        // 반려 사유
}

export interface CorrectionFactor {
  name: string;
  rate: number; // 예: -0.10, +0.50
  rangeText: string;
}

// 1. 행별 보정 프리셋 (긴급 투입, 야간/주말, 해외 커뮤니케이션, 고위험 책임, 단순 반복)
export const ROW_CORRECTION_PRESETS: CorrectionFactor[] = [
  { name: '보정 없음 (일반)', rate: 0.0, rangeText: '0%' },
  { name: '긴급 투입 (+20%)', rate: 0.20, rangeText: '+20~50%' },
  { name: '긴급 투입 (+30%)', rate: 0.30, rangeText: '+20~50%' },
  { name: '긴급 투입 (+50%)', rate: 0.50, rangeText: '+20~50%' },
  { name: '야간/주말 (+50%)', rate: 0.50, rangeText: '+50~100%' },
  { name: '야간/주말 (+70%)', rate: 0.70, rangeText: '+50~100%' },
  { name: '야간/주말 (+100%)', rate: 1.00, rangeText: '+50~100%' },
  { name: '해외 커뮤니케이션 (+10%)', rate: 0.10, rangeText: '+10~20%' },
  { name: '해외 커뮤니케이션 (+20%)', rate: 0.20, rangeText: '+10~20%' },
  { name: '고위험 책임 업무 (+20%)', rate: 0.20, rangeText: '+20~30%' },
  { name: '고위험 책임 업무 (+30%)', rate: 0.30, rangeText: '+20~30%' },
  { name: '단순 반복 대량 작업 (-10%)', rate: -0.10, rangeText: '-10~20%' },
  { name: '단순 반복 대량 작업 (-20%)', rate: -0.20, rangeText: '-10~20%' },
];

// 2. 전체 총괄 보정 프리셋 (장기계약 할인 및 야간/주말, 긴급투입 일괄 할증 등)
export const TOTAL_CORRECTION_PRESETS: CorrectionFactor[] = [
  { name: '총괄 보정 없음', rate: 0.0, rangeText: '0%' },
  // 할인형 총괄 보정
  { name: '장기계약 할인 (-5%)', rate: -0.05, rangeText: '-5~15%' },
  { name: '장기계약 할인 (-10%)', rate: -0.10, rangeText: '-5~15%' },
  { name: '장기계약 할인 (-15%)', rate: -0.15, rangeText: '-5~15%' },
  { name: '단순 반복 작업 (-10%)', rate: -0.10, rangeText: '-10~20%' },
  { name: '단순 반복 작업 (-20%)', rate: -0.20, rangeText: '-10~20%' },
  // 할증형 총괄 보정 (일괄 적용)
  { name: '긴급 투입 할증 (+20%)', rate: 0.20, rangeText: '+20~50%' },
  { name: '긴급 투입 할증 (+30%)', rate: 0.30, rangeText: '+20~50%' },
  { name: '긴급 투입 할증 (+50%)', rate: 0.50, rangeText: '+20~50%' },
  { name: '야간/주말 할증 (+50%)', rate: 0.50, rangeText: '+50~100%' },
  { name: '야간/주말 할증 (+100%)', rate: 1.00, rangeText: '+50~100%' },
  { name: '해외 커뮤니케이션 (+10%)', rate: 0.10, rangeText: '+10~20%' },
  { name: '해외 커뮤니케이션 (+20%)', rate: 0.20, rangeText: '+10~20%' },
  { name: '고위험 책임 업무 (+20%)', rate: 0.20, rangeText: '+20~30%' },
  { name: '고위험 책임 업무 (+30%)', rate: 0.30, rangeText: '+20~30%' },
];
