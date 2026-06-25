import { useState, useMemo } from 'react';
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

  if (!isOpen) return null;

  const handleToggleItem = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  const handleImportSubmit = () => {
    onImport(selectedItemIds);
    setSelectedItemIds([]); // 초기화
  };

  return (
    <div className="modal-overlay no-print">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">단가 라이브러리 호출</h2>
          <button type="button" className="btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          
          <div className="modal-search-bar">
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="input-text" 
                placeholder="품목명 또는 카테고리 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
            {libraryCategories.map(cat => (
              <button
                type="button"
                key={cat}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="modal-list">
            {filteredLibraryItems.map(item => {
              const isChecked = selectedItemIds.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className="modal-list-item"
                  onClick={() => handleToggleItem(item.id)}
                >
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    readOnly
                    className="modal-list-item-checkbox"
                  />
                  <div className="modal-list-item-info">
                    <div className="modal-list-item-name">{item.name}</div>
                    <div className="modal-list-item-desc">
                      {item.category} · 단위: {item.unit} · {
                        item.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? '인력형 수식' : '일반 수량 수식'
                      }
                    </div>
                  </div>
                  <div className="modal-list-item-price">
                    ₩{item.defaultPrice.toLocaleString()}
                  </div>
                </div>
              );
            })}

            {filteredLibraryItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                검색 결과가 없습니다.
              </div>
            )}
          </div>

        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={handleImportSubmit}
            disabled={selectedItemIds.length === 0}
          >
            {selectedItemIds.length}개 항목 추가하기
          </button>
        </div>
      </div>
    </div>
  );
}
