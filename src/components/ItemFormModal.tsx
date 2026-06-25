import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Plus, Edit2, Check } from 'lucide-react';
import type { CostItem, FormulaType, VatType } from '../types/estimate';

interface ItemFormModalProps {
  item: CostItem | null;
  categoriesList: string[];
  unitsList: string[];
  namesList: Record<string, string[]>;
  onClose: () => void;
  onSave: (item: CostItem | CostItem[]) => void;
  onCategoryRename: (oldVal: string, newVal: string) => void;
  onUnitRename: (oldVal: string, newVal: string) => void;
  onUpdateSettings: (settings: { categories: string[]; units: string[]; namesList: Record<string, string[]> }) => void;
}

// 역할 및 책임 레벨별 추천 배수 정의
const RANK_MULTIPLIERS: Record<string, number> = {
  'L1 Support': 1.0,
  'L2 Operator': 1.3,
  'L3 Specialist': 1.7,
  'L4 Lead': 2.3,
  'L5 Director': 3.0
};

// 역할 및 책임 레벨 옵션 (L1 Support ~ L5 Director 체계)
const RANK_OPTIONS = [
  '해당 없음',
  'L1 Support',
  'L2 Operator',
  'L3 Specialist',
  'L4 Lead',
  'L5 Director'
];

// 레거시 텍스트에서 등급을 파싱하여 새 레벨 체계로 변환하는 헬퍼 함수
function parseInitialRank(internalName: string, name: string): string {
  const fullText = `${internalName || ''} ${name || ''}`.toLowerCase();
  
  // 새 레벨 명칭 매핑
  for (const rank of RANK_OPTIONS) {
    if (rank !== '해당 없음' && fullText.includes(rank.toLowerCase())) {
      return rank;
    }
  }
  
  // 레거시 명칭 폴백 파싱
  if (fullText.includes('junior') || fullText.includes('보조') || fullText.includes('l1') || fullText.includes('support')) return 'L1 Support';
  if (fullText.includes('associate') || fullText.includes('실무') || fullText.includes('l2') || fullText.includes('operator')) return 'L2 Operator';
  if (fullText.includes('professional') || fullText.includes('단독') || fullText.includes('l3') || fullText.includes('specialist')) return 'L3 Specialist';
  if (fullText.includes('senior') || fullText.includes('리드') || fullText.includes('l4') || fullText.includes('lead')) return 'L4 Lead';
  if (fullText.includes('director') || fullText.includes('총괄') || fullText.includes('l5')) return 'L5 Director';
  
  return '해당 없음';
}

export default function ItemFormModal({
  item,
  categoriesList,
  unitsList,
  namesList,
  onClose,
  onSave,
  onCategoryRename,
  onUnitRename,
  onUpdateSettings
}: ItemFormModalProps) {
  // --- E. 입력 제어 상태 ---
  const [category, setCategory] = useState(item?.category || '인건비 기준 (용역 공수)');
  const [nameSelect, setNameSelect] = useState(item?.name || '');
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
    } else {
      // 신규 등록 시 첫 번째 표준 항목으로 초기 선택
      const initialCat = '인건비 기준 (용역 공수)';
      setCategory(initialCat);
      const available = namesList[initialCat] || [];
      if (available.length > 0) {
        setNameSelect(available[0]);
      }
    }
  }, [item, namesList]);

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
      // 5대 레벨 일괄 생성 모드
      const items: CostItem[] = Object.keys(RANK_MULTIPLIERS).map((r) => {
        const mult = RANK_MULTIPLIERS[r];
        const calculatedPrice = Math.round(defaultPrice * mult);
        
        return {
          id: `item-${Date.now()}-${r.toLowerCase().replace(/\s+/g, '-')}`,
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
          ? (item?.basePrice || (rank === 'L1 Support' ? defaultPrice : Math.round(defaultPrice / (RANK_MULTIPLIERS[rank] || 1.0))))
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
          background-color: rgba(49, 130, 246, 0.1);
          color: var(--color-blue);
        }
        .notion-dropdown-delete-btn.danger:hover {
          background-color: rgba(231, 76, 60, 0.1);
          color: var(--color-red);
        }
        .notion-dropdown-item-actions {
          display: flex;
          gap: 4px;
          opacity: 0.4;
          transition: opacity 0.15s;
        }
        .notion-dropdown-item:hover .notion-dropdown-item-actions {
          opacity: 1;
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
                    const updatedCats = [...categoriesList, newVal];
                    const updatedNames = { ...namesList, [newVal]: [] };
                    onUpdateSettings({ categories: updatedCats, units: unitsList, namesList: updatedNames });
                  }
                  handleCategoryChange(newVal);
                }}
                onDeleteOption={(delVal) => {
                  const filteredCats = categoriesList.filter(c => c !== delVal);
                  const updatedNames = { ...namesList };
                  delete updatedNames[delVal];
                  onUpdateSettings({ categories: filteredCats, units: unitsList, namesList: updatedNames });
                  if (category === delVal) {
                    const fallback = filteredCats.length > 0 ? filteredCats[0] : '';
                    handleCategoryChange(fallback);
                  }
                }}
                onEditOption={(oldVal, newVal) => {
                  const trimmed = newVal.trim();
                  if (!trimmed || oldVal === trimmed) return;
                  onCategoryRename(oldVal, trimmed);
                  if (category === oldVal) {
                    setCategory(trimmed);
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
                    onUpdateSettings({ categories: categoriesList, units: updated, namesList });
                  }
                  setUnit(newVal);
                }}
                onDeleteOption={(delVal) => {
                  const filtered = unitsList.filter(u => u !== delVal);
                  onUpdateSettings({ categories: categoriesList, units: filtered, namesList });
                  if (unit === delVal) {
                    const fallback = filtered.length > 0 ? filtered[0] : '';
                    setUnit(fallback);
                  }
                }}
                onEditOption={(oldVal, newVal) => {
                  const trimmed = newVal.trim();
                  if (!trimmed || oldVal === trimmed) return;
                  onUnitRename(oldVal, trimmed);
                  if (unit === oldVal) {
                    setUnit(trimmed);
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
                    const updatedNames = {
                      ...namesList,
                      [category]: [...currentNames, newVal]
                    };
                    onUpdateSettings({ categories: categoriesList, units: unitsList, namesList: updatedNames });
                  }
                  setNameSelect(newVal);
                  setIsNameDirty(false);
                }}
                onDeleteOption={(delVal) => {
                  const currentNames = namesList[category] || [];
                  const filtered = currentNames.filter(n => n !== delVal);
                  const updatedNames = {
                    ...namesList,
                    [category]: filtered
                  };
                  onUpdateSettings({ categories: categoriesList, units: unitsList, namesList: updatedNames });
                  if (nameSelect === delVal) {
                    const fallback = filtered.length > 0 ? filtered[0] : '';
                    setNameSelect(fallback);
                  }
                }}
                onEditOption={(oldVal, newVal) => {
                  const trimmed = newVal.trim();
                  if (!trimmed || oldVal === trimmed) return;
                  const currentNames = namesList[category] || [];
                  const updatedNamesArray = currentNames.map(n => n === oldVal ? trimmed : n);
                  const updatedNames = {
                    ...namesList,
                    [category]: updatedNamesArray
                  };
                  onUpdateSettings({ categories: categoriesList, units: unitsList, namesList: updatedNames });
                  if (nameSelect === oldVal) {
                    setNameSelect(trimmed);
                  }
                }}
                placeholder="표준 항목 선택 및 추가"
              />
            </div>

            {/* 인건비일 경우에만 등급 노출 (계단식 연동) */}
            {isHR ? (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: '700', color: 'var(--color-blue)', margin: 0 }}>3단계. 역할 및 책임 레벨 선택</label>
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
                            setRank('L1 Support');
                          }
                        }}
                        style={{ accentColor: 'var(--color-blue)' }}
                      />
                      5대 레벨 일괄 저장
                    </label>
                  )}
                </div>
                {isBulkRank ? (
                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-blue-light)', color: 'var(--color-blue)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(49, 130, 246, 0.2)', height: '42px', display: 'flex', alignItems: 'center' }}>
                    ✨ 5대 레벨 단가가 일괄 저장됩니다.
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
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-secondary)' }}>[역할 및 책임 범위 레벨 기준]</div>
                  • <strong>L1 Support</strong> (보조 수행): 단순 반복 업무 및 보조 수행 (자료 정리, 현장 보조 등)<br />
                  • <strong>L2 Operator</strong> (실무 실행): 일반 실무 독립 수행 및 실행 (정해진 프로세스 처리)<br />
                  • <strong>L3 Specialist</strong> (전문 수행): 특정 파트의 단독 전문 수행 가능 (고급 실무력 보유)<br />
                  • <strong>L4 Lead</strong> (파트 리딩): 파트 리딩, 일정/품질 검수 및 고객 협의 가능<br />
                  • <strong>L5 Director</strong> (총괄 책임): 프로젝트 총괄 설계, 핵심 의사결정 및 최종 검수
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                <label className="form-label">3단계. 역할 및 책임 레벨 선택</label>
                <select className="select-input" disabled value="해당 없음" style={{ height: '42px' }}>
                  <option value="해당 없음">레벨 해당 없음 (결과물형)</option>
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
                {isHR && isBulkRank ? 'L1 Support 기준 단가 (1.0x, 원)' : '기준 단가 (원)'}
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
                📊 레벨별 자동 계산 단가 미리보기
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center' }}>
                {Object.keys(RANK_MULTIPLIERS).map((r) => {
                  const mult = RANK_MULTIPLIERS[r];
                  const calculated = Math.round(defaultPrice * mult);
                  return (
                    <div key={r} style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px 4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: r === 'L5 Director' || r === 'L4 Lead' ? 'var(--color-blue)' : 'var(--text-primary)' }}>{r}</div>
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
  onEditOption: (oldVal: string, newVal: string) => void; // 인라인 수정 핸들러
  placeholder?: string;
}

function NotionDropdown({
  value,
  options,
  onSelect,
  onAddOption,
  onDeleteOption,
  onEditOption,
  placeholder
}: NotionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 드롭다운 바깥 클릭 시 닫히도록 바인딩
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingValue(null);
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

  const handleSaveEdit = (oldOpt: string) => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== oldOpt) {
      onEditOption(oldOpt, trimmed);
    }
    setEditingValue(null);
  };

  return (
    <div className="notion-dropdown-container" ref={containerRef}>
      {/* 트리거 버튼 */}
      <div 
        className="notion-dropdown-trigger" 
        onClick={() => { setIsOpen(!isOpen); setEditingValue(null); }}
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
          
          {/* 단일 루프 */}
          {options.map((opt) => {
            const isEditing = opt === editingValue;
            
            if (isEditing) {
              return (
                <div 
                  key={opt}
                  className="notion-dropdown-item"
                  onClick={(e) => e.stopPropagation()} // 팝오버 닫힘 방지
                  style={{ backgroundColor: 'var(--bg-secondary)', gap: '6px' }}
                >
                  <input 
                    type="text"
                    className="notion-dropdown-input"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEdit(opt);
                      } else if (e.key === 'Escape') {
                        setEditingValue(null);
                      }
                    }}
                    autoFocus
                    style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                  />
                  <button 
                    type="button"
                    className="notion-dropdown-delete-btn"
                    onClick={() => handleSaveEdit(opt)}
                    style={{ height: '24px', width: '24px' }}
                    title="저장"
                  >
                    <Check size={12} />
                  </button>
                  <button 
                    type="button"
                    className="notion-dropdown-delete-btn danger"
                    onClick={() => setEditingValue(null)}
                    style={{ height: '24px', width: '24px' }}
                    title="취소"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            }

            return (
              <div 
                key={opt}
                className={`notion-dropdown-item ${value === opt ? 'active' : ''}`}
                onClick={() => { onSelect(opt); setIsOpen(false); }}
              >
                <span>{opt}</span>
                <div className="notion-dropdown-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    className="notion-dropdown-delete-btn"
                    onClick={() => {
                      setEditingValue(opt);
                      setEditText(opt);
                    }}
                    title="선택지 수정"
                    style={{ height: '24px', width: '24px' }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    type="button"
                    className="notion-dropdown-delete-btn danger"
                    onClick={() => onDeleteOption(opt)}
                    title="선택지 삭제"
                    style={{ height: '24px', width: '24px' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}

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
