import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Plus } from 'lucide-react';
import type { CostItem, FormulaType, VatType } from '../types/estimate';

interface ItemFormModalProps {
  item: CostItem | null;
  onClose: () => void;
  onSave: (item: CostItem | CostItem[]) => void;
}

// 등급별 추천 배수 정의
const RANK_MULTIPLIERS: Record<string, number> = {
  'Junior': 1.0,
  'Associate': 1.3,
  'Professional': 1.7,
  'Senior': 2.3,
  'Lead': 3.0
};

// 카테고리별 기본 표준 권장 항목명 정의 (삭제 불가 상용구)
const DEFAULT_POPULAR_NAMES: Record<string, string[]> = {
  '인건비 기준 (용역 공수)': [
    'PM 기획 인력',
    '디자이너 투입',
    '프론트엔드 개발',
    '백엔드 개발',
    '현장 운영 인력',
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
};

// 2. 사내 표준 인력 등급 옵션 (Junior ~ Lead 체계)
const RANK_OPTIONS = [
  '해당 없음',
  'Junior',
  'Associate',
  'Professional',
  'Senior',
  'Lead'
];

// 레거시 텍스트에서 등급을 파싱하는 헬퍼 함수
function parseInitialRank(internalName: string, name: string): string {
  const fullText = `${internalName || ''} ${name || ''}`.toLowerCase();
  for (const rank of RANK_OPTIONS) {
    if (rank !== '해당 없음' && fullText.includes(rank.toLowerCase())) {
      return rank;
    }
  }
  return '해당 없음';
}

export default function ItemFormModal({ item, onClose, onSave }: ItemFormModalProps) {
  // --- [영구 재사용 저장소 로드] 사용자가 추가한 커스텀 카테고리, 항목명, 단위 상태 ---
  // 1. 카테고리 단일 통합 리스트 (최초 로드 시 기본 카테고리 자동 이식)
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    const data = localStorage.getItem('estimate_notion_categories_v4');
    if (data) return JSON.parse(data);
    const initial = [
      '인건비 기준 (용역 공수)',
      '디자인 결과물 기준',
      '개발 결과물 기준',
      '생산 결과물 기준',
      '기타 결과물 기준'
    ];
    localStorage.setItem('estimate_notion_categories_v4', JSON.stringify(initial));
    return initial;
  });

  // 2. 단위 단일 통합 리스트
  const [unitsList, setUnitsList] = useState<string[]>(() => {
    const data = localStorage.getItem('estimate_notion_units_v4');
    if (data) return JSON.parse(data);
    const initial = ['MD', '일', '시간', 'EA', '개', '잔', '종', '페이지', '건', '식', '개월'];
    localStorage.setItem('estimate_notion_units_v4', JSON.stringify(initial));
    return initial;
  });

  // 3. 표준 항목명 단일 통합 리스트
  const [namesList, setNamesList] = useState<Record<string, string[]>>(() => {
    const data = localStorage.getItem('estimate_notion_names_v4');
    if (data) return JSON.parse(data);
    localStorage.setItem('estimate_notion_names_v4', JSON.stringify(DEFAULT_POPULAR_NAMES));
    return DEFAULT_POPULAR_NAMES;
  });

  // --- E. 입력 제어 상태 ---
  const [category, setCategory] = useState(item?.category || '인건비 기준 (용역 공수)');
  const [nameSelect, setNameSelect] = useState(item?.name || 'PM 기획 인력');
  const [rank, setRank] = useState('해당 없음');
  
  const [finalName, setFinalName] = useState(item?.name || '');
  const [finalInternalName, setFinalInternalName] = useState(item?.internalName || '');
  const [unit, setUnit] = useState(item?.unit || 'MD');

  const [defaultPrice, setDefaultPrice] = useState(item?.defaultPrice || 0);
  const [formulaType, setFormulaType] = useState<FormulaType>(item?.formulaType || 'PEOPLE_x_DAYS_x_PRICE');
  const [vatType, setVatType] = useState<VatType>(item?.vatType || 'TAX');
  const [description, setDescription] = useState(item?.description || '');
  const [internalMemo, setInternalMemo] = useState(item?.internalMemo || '');
  const [isBulkRank, setIsBulkRank] = useState(false);

  // 사용자의 수동 조작 여부 추적
  const [isNameDirty, setIsNameDirty] = useState(false);
  const [isInternalNameDirty, setIsInternalNameDirty] = useState(false);

  // 초기 렌더링 시 등급 및 항목명 역파싱 바인딩
  useEffect(() => {
    if (item) {
      const parsedRank = parseInitialRank(item.internalName || '', item.name);
      setRank(parsedRank);
      setCategory(item.category);
      setNameSelect(item.name);
      setUnit(item.unit);
      setIsNameDirty(true); // 기존 수정건은 수동 상태로 간주하여 자동완성이 덮어쓰지 않게 차단
      setIsInternalNameDirty(true);
    }
  }, [item]);

  // --- 로컬스토리지 싱크 유틸리티 ---
  const saveCategoriesList = (newCats: string[]) => {
    setCategoriesList(newCats);
    localStorage.setItem('estimate_notion_categories_v4', JSON.stringify(newCats));
  };

  const saveNamesList = (newNames: Record<string, string[]>) => {
    setNamesList(newNames);
    localStorage.setItem('estimate_notion_names_v4', JSON.stringify(newNames));
  };

  const saveUnitsList = (newUnits: string[]) => {
    setUnitsList(newUnits);
    localStorage.setItem('estimate_notion_units_v4', JSON.stringify(newUnits));
  };

  // --- [지능형 동기화 엔진] 카테고리 변경 시 매핑 및 항목명 자동 제안 ---
  const handleCategoryChange = (selectedCat: string) => {
    setCategory(selectedCat);
    
    // 1단계: 수식 및 기본 단위 자동 연동
    if (selectedCat.includes('인건비')) {
      setUnit('MD');
      setFormulaType('PEOPLE_x_DAYS_x_PRICE');
    } else if (selectedCat.includes('디자인')) {
      setUnit('종');
      setFormulaType('QTY_x_PRICE');
      setRank('해당 없음');
    } else if (selectedCat.includes('개발')) {
      setUnit('식');
      setFormulaType('QTY_x_PRICE');
      setRank('해당 없음');
    } else if (selectedCat.includes('생산')) {
      setUnit('EA');
      setFormulaType('QTY_x_PRICE');
      setRank('해당 없음');
    } else {
      setUnit('EA');
      setFormulaType('QTY_x_PRICE');
      setRank('해당 없음');
    }

    // 2단계: 카테고리에 할당된 첫 번째 표준 항목명으로 피딩
    const availableNames = namesList[selectedCat] || [];
    
    if (availableNames.length > 0) {
      setNameSelect(availableNames[0]);
    } else {
      setNameSelect('');
    }
    
    setIsNameDirty(false);
    setIsInternalNameDirty(false);
  };

  // --- [지능형 동기화 엔진] 실시간 이름/관리명 완성 조율 ---
  useEffect(() => {
    if (!nameSelect) return;

    if (!isNameDirty) {
      setFinalName(nameSelect);
    }

    if (!isInternalNameDirty) {
      if (category.includes('인건비') && rank !== '해당 없음') {
        setFinalInternalName(`${nameSelect} (${rank})`);
      } else {
        setFinalInternalName(nameSelect);
      }
    }
  }, [category, nameSelect, rank, isNameDirty, isInternalNameDirty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isHR && isBulkRank && !item) {
      // 5대 등급 일괄 생성 모드
      const items: CostItem[] = Object.keys(RANK_MULTIPLIERS).map((r) => {
        const mult = RANK_MULTIPLIERS[r];
        const calculatedPrice = Math.round(defaultPrice * mult);
        
        return {
          id: `item-${Date.now()}-${r.toLowerCase()}`,
          name: finalName,
          internalName: `${finalName} (${r})`,
          category,
          unit,
          defaultPrice: calculatedPrice,
          rank: r,
          basePrice: defaultPrice,
          formulaType,
          vatType,
          description: description || undefined,
          internalMemo: internalMemo || undefined
        };
      });
      onSave(items);
    } else {
      // 단일 등록 및 수정 모드
      const savedItem: CostItem = {
        id: item?.id || `item-${Date.now()}`,
        name: finalName,
        internalName: finalInternalName || undefined,
        category,
        unit,
        defaultPrice,
        rank: isHR && rank !== '해당 없음' ? rank : undefined,
        basePrice: isHR && rank !== '해당 없음'
          ? (item?.basePrice || (rank === 'Junior' ? defaultPrice : Math.round(defaultPrice / (RANK_MULTIPLIERS[rank] || 1.0))))
          : undefined,
        formulaType,
        vatType,
        description: description || undefined,
        internalMemo: internalMemo || undefined
      };
      onSave(savedItem);
    }
  };

  // 최종 노출할 카테고리 목록 (레거시 필터 및 단일 풀 바인딩)
  const LEGACY_CATEGORIES = ['인건비', '디자인', '개발비', '운영비', '식음료', '외주비', '직접 입력', 'new'];
  const uniqueCategories = categoriesList.filter(cat => cat && !LEGACY_CATEGORIES.includes(cat));

  // 최종 노출할 항목명 목록 (해당 카테고리의 단일 풀 바인딩)
  const availableNames = namesList[category] || [];

  const isHR = category.includes('인건비');

  return (
    <div className="modal-overlay no-print">
      {/* 커스텀 드롭다운 스타일 실시간 주입 (모듈 격리용) */}
      <style>{`
        .notion-dropdown-container {
          position: relative;
          width: 100%;
        }
        .notion-dropdown-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 10px 14px;
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 14px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease-in-out;
        }
        .notion-dropdown-trigger:hover {
          border-color: #a0a0a0;
        }
        .notion-dropdown-trigger:focus-within {
          border-color: var(--color-blue);
          box-shadow: 0 0 0 2px rgba(49, 130, 246, 0.15);
        }
        .notion-dropdown-popover {
          position: absolute;
          top: 108%;
          left: 0;
          width: 100%;
          max-height: 280px;
          overflow-y: auto;
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          z-index: 9999;
          padding: 6px 0;
          animation: slideDown 0.18s ease-out;
        }
        .notion-dropdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 14px;
          font-size: 14px;
          color: var(--text-primary);
          cursor: pointer;
          transition: background-color 0.12s;
        }
        .notion-dropdown-item:hover {
          background-color: var(--bg-secondary);
        }
        .notion-dropdown-item.active {
          background-color: var(--color-blue-light);
          color: var(--color-blue);
          font-weight: 600;
        }
        .notion-dropdown-delete-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
          padding: 4px;
          border-radius: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.15s;
        }
        .notion-dropdown-delete-btn:hover {
          background-color: rgba(231, 76, 60, 0.1);
          color: var(--color-red);
        }
        .notion-dropdown-input-area {
          display: flex;
          gap: 6px;
          padding: 8px 10px;
          border-top: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
          position: sticky;
          bottom: 0;
          margin-top: 6px;
        }
        .notion-dropdown-input {
          flex: 1;
          padding: 6px 10px;
          font-size: 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: #ffffff;
        }
        .notion-dropdown-input:focus {
          outline: none;
          border-color: var(--color-blue);
        }
        .notion-dropdown-add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-blue);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .notion-dropdown-add-btn:hover {
          background-color: #1a6fd8;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <form className="modal-container" onSubmit={handleSubmit} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{item ? '기준 단가 수정' : '새 기준 단가 등록'}</h2>
          <button type="button" className="btn-icon-only" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto', paddingBottom: '32px' }}>
          
          {/* 계단식 1단계: 카테고리 선택 */}
          <div className="grid-2">
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" style={{ fontWeight: '700', color: 'var(--color-blue)' }}>1단계. 카테고리 선택</label>
              <NotionDropdown 
                value={category}
                options={uniqueCategories}
                onSelect={(val) => handleCategoryChange(val)}
                onAddOption={(newVal) => {
                  if (!categoriesList.includes(newVal)) {
                    const updated = [...categoriesList, newVal];
                    saveCategoriesList(updated);
                  }
                  handleCategoryChange(newVal);
                }}
                onDeleteOption={(delVal) => {
                  const filtered = categoriesList.filter(c => c !== delVal);
                  saveCategoriesList(filtered);
                  if (category === delVal) {
                    const fallback = filtered.length > 0 ? filtered[0] : '';
                    handleCategoryChange(fallback);
                  }
                }}
                placeholder="카테고리 선택 및 추가"
              />
            </div>

            {/* 기본 단위 */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">기본 단위</label>
              <NotionDropdown 
                value={unit}
                options={unitsList}
                onSelect={(val) => setUnit(val)}
                onAddOption={(newVal) => {
                  if (!unitsList.includes(newVal)) {
                    const updated = [...unitsList, newVal];
                    saveUnitsList(updated);
                  }
                  setUnit(newVal);
                }}
                onDeleteOption={(delVal) => {
                  const filtered = unitsList.filter(u => u !== delVal);
                  saveUnitsList(filtered);
                  if (unit === delVal) {
                    const fallback = filtered.length > 0 ? filtered[0] : '';
                    setUnit(fallback);
                  }
                }}
                placeholder="단위 선택 및 추가"
              />
            </div>
          </div>

          {/* 계단식 2단계 & 3단계: 항목명 선택 및 인력 등급 선택 */}
          <div className="grid-2" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginTop: '12px' }}>
            
            {/* 표준 항목명 선택 */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" style={{ fontWeight: '700', color: 'var(--color-blue)' }}>2단계. 표준 항목명 선택</label>
              <NotionDropdown 
                value={nameSelect}
                options={availableNames}
                onSelect={(val) => { setNameSelect(val); setIsNameDirty(false); }}
                onAddOption={(newVal) => {
                  const currentNames = namesList[category] || [];
                  if (!currentNames.includes(newVal)) {
                    const updated = {
                      ...namesList,
                      [category]: [...currentNames, newVal]
                    };
                    saveNamesList(updated);
                  }
                  setNameSelect(newVal);
                  setIsNameDirty(false);
                }}
                onDeleteOption={(delVal) => {
                  const currentNames = namesList[category] || [];
                  const filtered = currentNames.filter(n => n !== delVal);
                  const updated = {
                    ...namesList,
                    [category]: filtered
                  };
                  saveNamesList(updated);
                  if (nameSelect === delVal) {
                    const fallback = filtered.length > 0 ? filtered[0] : '';
                    setNameSelect(fallback);
                  }
                }}
                placeholder="표준 항목 선택 및 추가"
              />
            </div>

            {/* 인건비일 경우에만 등급 노출 (계단식 연동) */}
            {isHR ? (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: '700', color: 'var(--color-blue)', margin: 0 }}>3단계. 인력 등급 선택</label>
                  {!item && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-blue)', cursor: 'pointer', fontWeight: '600' }}>
                      <input 
                        type="checkbox" 
                        checked={isBulkRank} 
                        onChange={e => {
                          setIsBulkRank(e.target.checked);
                          if (e.target.checked) {
                            setRank('해당 없음');
                          } else {
                            setRank('Junior');
                          }
                        }}
                        style={{ accentColor: 'var(--color-blue)' }}
                      />
                      5대 등급 일괄 저장
                    </label>
                  )}
                </div>
                {isBulkRank ? (
                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-blue-light)', color: 'var(--color-blue)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(49, 130, 246, 0.2)', height: '42px', display: 'flex', alignItems: 'center' }}>
                    ✨ 5대 등급 단가가 일괄 저장됩니다.
                  </div>
                ) : (
                  <select 
                    className="select-input" 
                    value={rank} 
                    onChange={e => setRank(e.target.value)}
                    style={{ borderColor: 'var(--color-blue)', height: '42px' }}
                  >
                    {RANK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', lineHeight: '1.5', backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-secondary)' }}>[사내 인력 등급 경력 기준]</div>
                  • <strong>Junior</strong> (1년 미만): 보조 수행, 반복 업무 중심<br />
                  • <strong>Associate</strong> (1~3년): 실무 수행 가능<br />
                  • <strong>Professional</strong> (3~5년): 단독 업무 수행 가능<br />
                  • <strong>Senior</strong> (5~8년): 주요 파트 리딩 가능<br />
                  • <strong>Lead</strong> (8년 이상): 프로젝트 설계/검수/의사결정 가능
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                <label className="form-label">3단계. 인력 등급 선택</label>
                <select className="select-input" disabled value="해당 없음" style={{ height: '42px' }}>
                  <option value="해당 없음">등급 해당 없음 (결과물형)</option>
                </select>
              </div>
            )}
          </div>

          {/* 실시간 자동 조합 완성부 */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-lg)', marginTop: '8px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '10px' }}>자동 조합 완성 결과 (확인 및 직접 수정 가능)</div>
            <div className="grid-2">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>최종 항목명 (견적서 노출용)</label>
                <input 
                  type="text" 
                  className="input-text"
                  value={finalName}
                  onChange={e => { setFinalName(e.target.value); setIsNameDirty(true); }}
                  placeholder="조합 결과 자동 반영됨"
                  style={{ backgroundColor: '#ffffff', fontSize: '13px' }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>내부 관리명 (사내 단가 식별용)</label>
                <input 
                  type="text" 
                  className="input-text"
                  value={finalInternalName}
                  onChange={e => { setFinalInternalName(e.target.value); setIsInternalNameDirty(true); }}
                  placeholder="조합 결과 자동 반영됨"
                  style={{ backgroundColor: '#ffffff', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* 단가 및 세무 정보 */}
          <div className="grid-2" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                {isHR && isBulkRank ? 'Junior 기준 단가 (1.0x, 원)' : '기준 단가 (원)'}
              </label>
              <input 
                type="number" 
                className="input-text" 
                required 
                value={defaultPrice} 
                onChange={e => setDefaultPrice(Number(e.target.value))} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">과세 구분</label>
              <select className="select-input" value={vatType} onChange={e => setVatType(e.target.value as VatType)}>
                <option value="TAX">일반 과세 (10% 부가세 추가)</option>
                <option value="FREE">면세 (부가세 없음)</option>
                <option value="ZERO">영세율 (수출/외화 유입)</option>
              </select>
            </div>
          </div>

          {/* 일괄 저장 모드일 때 등급별 추천 단가 실시간 미리보기 테이블 */}
          {isHR && isBulkRank && defaultPrice > 0 && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', backgroundColor: 'var(--bg-secondary)', marginTop: '4px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📊 등급별 자동 계산 단가 미리보기
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center' }}>
                {Object.keys(RANK_MULTIPLIERS).map((r) => {
                  const mult = RANK_MULTIPLIERS[r];
                  const calculated = Math.round(defaultPrice * mult);
                  return (
                    <div key={r} style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px 4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: r === 'Lead' || r === 'Senior' ? 'var(--color-blue)' : 'var(--text-primary)' }}>{r}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '2px 0' }}>{mult}x</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>₩{calculated.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">수식 계산 방식 프리셋</label>
            <select className="select-input" value={formulaType} onChange={e => setFormulaType(e.target.value as FormulaType)}>
              <option value="PEOPLE_x_DAYS_x_PRICE">인력 파견/인건비형 (공급가 = 인원 × 일수 × 단가)</option>
              <option value="QTY_x_PRICE">일반 상품/결과물형 (공급가 = 수량 × 단가)</option>
              <option value="MD_x_PRICE">투입 M/D형 (공급가 = MD수 × 단가)</option>
              <option value="MONTHS_x_PRICE">월정액/유지보수형 (공급가 = 개월 수 × 단가)</option>
              <option value="FIXED">고정 금액형 (공급가 = 단가 고정, 수량 무관)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">견적서 표시용 설명 (선택)</label>
            <textarea 
              className="textarea-input" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="견적서 상에 품명 하단에 작게 표시될 가이드를 작성하세요." 
            />
          </div>

          <div className="form-group">
            <label className="form-label">사내 관리용 메모 (선택)</label>
            <textarea 
              className="textarea-input" 
              value={internalMemo} 
              onChange={e => setInternalMemo(e.target.value)} 
              placeholder="사내 팀원들만 볼 수 있는 단가 책정 배경이나 협력업체 정산 기준 등을 메모해두세요." 
            />
          </div>

        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
          <button type="submit" className="btn btn-primary">저장하기</button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// --- [노션형 커스텀 드롭다운 컴포넌트] ---
// ==========================================
interface NotionDropdownProps {
  value: string;
  options: string[];       // 통합 단일 옵션 목록
  onSelect: (val: string) => void;
  onAddOption: (val: string) => void;
  onDeleteOption: (val: string) => void;
  placeholder?: string;
}

function NotionDropdown({
  value,
  options,
  onSelect,
  onAddOption,
  onDeleteOption,
  placeholder
}: NotionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 드롭다운 바깥 클릭 시 닫히도록 바인딩
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAdd = () => {
    const trimmed = inputText.trim();
    if (trimmed) {
      onAddOption(trimmed);
      setInputText('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="notion-dropdown-container" ref={containerRef}>
      {/* 트리거 버튼 */}
      <div 
        className="notion-dropdown-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder || '선택...'}
        </span>
        <ChevronDown size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: '8px' }} />
      </div>

      {/* 옵션 팝오버 목록 */}
      {isOpen && (
        <div className="notion-dropdown-popover">
          
          {/* 단일 루프: 모든 항목 끝에 X 삭제 단추가 표시됨 */}
          {options.map((opt) => (
            <div 
              key={opt}
              className={`notion-dropdown-item ${value === opt ? 'active' : ''}`}
              onClick={() => { onSelect(opt); setIsOpen(false); }}
            >
              <span>{opt}</span>
              <button 
                type="button"
                className="notion-dropdown-delete-btn"
                onClick={(e) => {
                  e.stopPropagation(); // 아이템 선택 이벤트 전파 차단
                  onDeleteOption(opt);
                }}
                title="선택지 삭제"
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {options.length === 0 && (
            <div style={{ padding: '8px 14px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              선택지가 없습니다. 직접 추가하세요.
            </div>
          )}

          {/* 하단 직접 입력 영역 */}
          <div className="notion-dropdown-input-area" onClick={(e) => e.stopPropagation()}>
            <input 
              type="text"
              className="notion-dropdown-input"
              placeholder="+ 직접 입력하여 옵션 추가..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button 
              type="button"
              className="notion-dropdown-add-btn"
              onClick={handleAdd}
            >
              <Plus size={12} style={{ marginRight: '2px' }} /> 추가
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
