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
}

// 견적 프로젝트 전체 구조
export interface EstimateProject {
  id: string;
  projectType: 'IT' | 'DESIGN' | 'BUILD' | 'OTHER'; // 견적서 기본 폼 종류
  title: string;
  clientName: string;
  estimateDate: string;
  expiryDate: string;
  vendorInfo: VendorInfo;
  sections: EstimateSection[];
  remarks: string;          // 비고란 내용
  status: 'draft' | 'published';
  createdAt: string;
}
