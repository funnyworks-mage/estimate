import { useState, useMemo, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import type { CostItem } from '../types/estimate';

interface LibraryImportModalProps {
  isOpen: boolean;
  libraryItems: CostItem[];
  onClose: () => void;
  onImport: (selectedItemIds: string[]) => void;
}

export default function LibraryImportModal({
  isOpen,
  libraryItems,
  onClose,
  onImport
}: LibraryImportModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 모달이 열릴 때마다 선택 상태와 검색어, 아코디언 상태를 완전히 리셋
  useEffect(() => {
    if (isOpen) {
      setSelectedItemIds([]);
      setExpandedGroups(new Set());
      setSearchQuery('');
      setSelectedCategory('전체');
    }
  }, [isOpen]);

  // 카테고리 목록 추출
  const libraryCategories = useMemo(() => {
    const cats = new Set<string>();
    libraryItems.forEach(item => cats.add(item.category));
    return ['전체', ...Array.from(cats)];
  }, [libraryItems]);

  // 검색 및 필터링 적용
  const filteredLibraryItems = useMemo(() => {
    return libraryItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.internalName && item.internalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '전체' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [libraryItems, searchQuery, selectedCategory]);

  // 계층형 그룹 뷰 데이터로 변환 (인건비는 그룹으로 묶고, 나머지는 단품)
  const importListItems = useMemo(() => {
    const list: (
      | { type: 'group'; name: string; category: string; items: CostItem[] }
      | { type: 'single'; item: CostItem }
    )[] = [];
    
    const groupMap = new Map<string, { type: 'group'; name: string; category: string; items: CostItem[] }>();

    filteredLibraryItems.forEach(item => {
      const isHR = item.rank && item.rank !== '해당 없음' && item.category.includes('인건비');
      
      if (isHR) {
        const existing = groupMap.get(item.name);
        if (existing) {
          existing.items.push(item);
        } else {
          const newGroup = {
            type: 'group' as const,
            name: item.name,
            category: item.category,
            items: [item]
          };
          groupMap.set(item.name, newGroup);
          list.push(newGroup);
        }
      } else {
        list.push({
          type: 'single' as const,
          item
        });
      }
    });

    // 각 인건비 그룹 내의 아이템들을 레벨(L1 ~ L5) 순서로 정렬
    const RANK_ORDER: Record<string, number> = {
      'L1 Support': 1,
      'L2 Operator': 2,
      'L3 Specialist': 3,
      'L4 Lead': 4,
      'L5 Director': 5
    };
    
    list.forEach(node => {
      if (node.type === 'group') {
        node.items.sort((a, b) => {
          const rA = a.rank || '';
          const rB = b.rank || '';
          return (RANK_ORDER[rA] || 0) - (RANK_ORDER[rB] || 0);
        });
      }
    });

    return list;
  }, [filteredLibraryItems]);

  if (!isOpen) return null;

  // 개별 아이템 토글
  const handleToggleItem = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  // 그룹 아코디언 토글
  const toggleGroupExpand = (groupName: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupName)) {
      newSet.delete(groupName);
    } else {
      newSet.add(groupName);
    }
    setExpandedGroups(newSet);
  };

  // 그룹 체크박스 마스터 토글
  const handleToggleGroup = (group: { name: string; category: string; items: CostItem[] }, e: React.MouseEvent) => {
    e.stopPropagation(); // 대표 행 펼치기 이벤트 전파 방지
    const groupItemIds = group.items.map(gi => gi.id);
    const isAllSelected = group.items.every(gi => selectedItemIds.includes(gi.id));
    
    if (isAllSelected) {
      // 그룹 전체 해제
      setSelectedItemIds(selectedItemIds.filter(id => !groupItemIds.includes(id)));
    } else {
      // 그룹 전체 선택 (중복 방지 병합)
      const filtered = selectedItemIds.filter(id => !groupItemIds.includes(id));
      setSelectedItemIds([...filtered, ...groupItemIds]);
    }
  };

  const handleImportSubmit = () => {
    onImport(selectedItemIds);
    setSelectedItemIds([]); // 초기화
    setExpandedGroups(new Set()); // 확장 초기화
  };

  return (
    <div className="modal-overlay no-print">
      <div className="modal-container" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h2 className="modal-title">단가 라이브러리 호출</h2>
          <button type="button" className="btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ paddingBottom: '16px' }}>
          
          <div className="modal-search-bar" style={{ marginBottom: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="input-text" 
                placeholder="품목명 또는 카테고리 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
            {libraryCategories.map(cat => (
              <button
                type="button"
                key={cat}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ whiteSpace: 'nowrap', borderRadius: '20px', padding: '6px 14px' }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="modal-list" style={{ maxHeight: '50vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            {importListItems.map(node => {
              if (node.type === 'group') {
                const group = node;
                const isExpanded = expandedGroups.has(group.name);
                const isAllSelected = group.items.every(gi => selectedItemIds.includes(gi.id));
                const isAnySelected = group.items.some(gi => selectedItemIds.includes(gi.id));
                const selectedCount = group.items.filter(gi => selectedItemIds.includes(gi.id)).length;
                
                // 기준단가(L2) 노출용
                const l2Price = group.items.find(gi => gi.rank === 'L2 Operator')?.defaultPrice || 0;

                return (
                  <div key={`group-${group.name}`} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#ffffff' }}>
                    {/* 대표 행 (아코디언 헤더) */}
                    <div 
                      className="modal-list-item animate-hover"
                      onClick={() => toggleGroupExpand(group.name)}
                      style={{ 
                        padding: '12px 16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: isExpanded ? 'rgba(49, 130, 246, 0.01)' : '#ffffff',
                        borderBottom: isExpanded ? '1px dashed var(--border-color)' : 'none',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        {/* 대표 체크박스 (일괄 선택용) */}
                        <div 
                          onClick={(e) => handleToggleGroup(group, e)}
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isAllSelected}
                            ref={el => {
                              if (el) {
                                el.indeterminate = isAnySelected && !isAllSelected;
                              }
                            }}
                            readOnly
                            className="modal-list-item-checkbox"
                            style={{ margin: 0, cursor: 'pointer', width: '17px', height: '17px' }}
                          />
                        </div>
                        
                        {/* 그룹 타이틀 정보 */}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>{group.name}</span>
                            {selectedCount > 0 && (
                              <span style={{ fontSize: '12px', color: 'var(--color-blue)', fontWeight: '700' }}>
                                ({selectedCount}개 선택됨)
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            {group.category} · 역할 배수형 단가표 일괄 관리
                          </span>
                        </div>
                      </div>
                      
                      {/* 우측 컨트롤 및 가격 가이드 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        {l2Price > 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            ₩{(l2Price / 10000).toLocaleString()}만 (L2 기준)
                          </span>
                        )}
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: isExpanded ? 'var(--color-blue)' : 'var(--text-tertiary)',
                          backgroundColor: isExpanded ? 'var(--color-blue-light)' : 'var(--bg-secondary)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid ' + (isExpanded ? 'rgba(49, 130, 246, 0.15)' : 'var(--border-color)')
                        }}>
                          {isExpanded ? '접기 ▲' : '레벨 펼치기 ▼'}
                        </span>
                      </div>
                    </div>

                    {/* 자식 행 (등급별 상세 아코디언 바디) */}
                    {isExpanded && (
                      <div style={{ backgroundColor: 'var(--bg-secondary)', borderTop: 'none' }}>
                        {group.items.map(subItem => {
                          const isSubChecked = selectedItemIds.includes(subItem.id);
                          
                          // 배수율 수학적 역산 복원
                          const calculatedMult = subItem.basePrice && subItem.basePrice > 0 
                            ? Math.round((subItem.defaultPrice / subItem.basePrice) * 10) / 10 
                            : 1.0;
                          const isBase = subItem.basePrice && subItem.basePrice > 0 
                            ? subItem.defaultPrice === subItem.basePrice
                            : (subItem.rank === 'L2 Operator' || subItem.rank === '엔지니어' || subItem.rank === '운영 스태프' || subItem.rank === 'L2 기본실무');

                          return (
                            <div 
                              key={subItem.id}
                              className="modal-list-item"
                              onClick={() => handleToggleItem(subItem.id)}
                              style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px 10px 32px', // 들여쓰기 처리
                                borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                                backgroundColor: isSubChecked ? 'rgba(49, 130, 246, 0.03)' : 'transparent',
                                cursor: 'pointer',
                                borderLeft: '3px solid var(--border-color)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isSubChecked}
                                  readOnly
                                  className="modal-list-item-checkbox"
                                  style={{ margin: 0, width: '15px', height: '15px' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {subItem.rank}
                                  </span>
                                  <span style={{ 
                                    fontSize: '9px', 
                                    color: 'var(--text-tertiary)', 
                                    backgroundColor: '#ffffff', 
                                    padding: '1px 5px', 
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontWeight: '600'
                                  }}>
                                    {calculatedMult.toFixed(1)}x{isBase ? ' (기준)' : ''}
                                  </span>
                                  {subItem.internalName && subItem.internalName !== subItem.name && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'normal' }}>
                                      ({subItem.internalName})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                                ₩{subItem.defaultPrice.toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                // 일반 단일 항목 렌더링
                const item = node.item;
                const isChecked = selectedItemIds.includes(item.id);
                return (
                  <div 
                    key={item.id} 
                    className="modal-list-item animate-hover"
                    onClick={() => handleToggleItem(item.id)}
                    style={{ 
                      padding: '12px 16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        readOnly
                        className="modal-list-item-checkbox"
                        style={{ margin: 0, width: '17px', height: '17px' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{item.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {item.category} · 단위: {item.unit} · {
                            item.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? '인력형 수식' : '일반 수량 수식'
                          }
                        </span>
                      </div>
                    </div>
                    <div className="modal-list-item-price" style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', flexShrink: 0 }}>
                      ₩{item.defaultPrice.toLocaleString()}
                    </div>
                  </div>
                );
              }
            })}

            {importListItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                검색 결과가 없습니다.
              </div>
            )}
          </div>

        </div>
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 16px', fontSize: '13px' }}>
            취소
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={handleImportSubmit}
            disabled={selectedItemIds.length === 0}
            style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '600' }}
          >
            {selectedItemIds.length}개 항목 추가하기
          </button>
        </div>
      </div>
    </div>
  );
}
