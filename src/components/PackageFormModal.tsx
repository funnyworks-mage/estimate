import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { CostItem, CostPackage } from '../types/estimate';

interface PackageFormModalProps {
  pkg: CostPackage | null;
  libraryItems: CostItem[];
  onClose: () => void;
  onSave: (pkg: CostPackage) => void;
}

interface TempPackageItem {
  itemId: string;
  defaultQuantity: number;
  defaultPeople?: number;
  defaultDays?: number;
}

export default function PackageFormModal({ pkg, libraryItems, onClose, onSave }: PackageFormModalProps) {
  const [name, setName] = useState(pkg?.name || '');
  const [category, setCategory] = useState(pkg?.category || '통합 패키지');
  const [description, setDescription] = useState(pkg?.description || '');
  const [items, setItems] = useState<TempPackageItem[]>(pkg?.items || []);

  const handleAddItemToPackage = (itemId: string) => {
    const origItem = libraryItems.find(i => i.id === itemId);
    if (!origItem) return;
    
    if (items.some(i => i.itemId === itemId)) {
      alert('이미 패키지에 등록된 항목입니다.');
      return;
    }

    const newItem: TempPackageItem = {
      itemId,
      defaultQuantity: origItem.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? 0 : 1,
      defaultPeople: origItem.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? 1 : undefined,
      defaultDays: origItem.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? 1 : undefined
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItemField = (idx: number, field: keyof TempPackageItem, val: number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  };

  const handleRemoveItemFromPackage = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('패키지에 최소 한 개 이상의 품목을 등록해주세요.');
      return;
    }
    const savedPkg: CostPackage = {
      id: pkg?.id || `pkg-${Date.now()}`,
      name,
      category,
      description: description || undefined,
      items
    };
    onSave(savedPkg);
  };

  return (
    <div className="modal-overlay no-print">
      <form className="modal-container large" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2 className="modal-title">{pkg ? '패키지 세트 수정' : '새 패키지 세트 구성'}</h2>
          <button type="button" className="btn-icon-only" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', maxHeight: '70vh' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div className="form-group">
              <label className="form-label">패키지 상품명</label>
              <input 
                type="text" 
                className="input-text" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="예: 웹사이트 구축 패키지, 팝업스토어 F&B 패키지 등" 
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">대표 카테고리</label>
                <input 
                  type="text" 
                  className="input-text" 
                  required 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  placeholder="예: 개발/디자인, 식음료/현장운영 등" 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">패키지 설명 (선택)</label>
              <textarea 
                className="textarea-input" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="이 패키지의 제공 목적이나 구성을 간략히 적어주세요." 
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>구성 품목 및 기본 수량 정의</div>
              
              <div className="table-container" style={{ margin: 0 }}>
                <table className="estimate-table">
                  <thead>
                    <tr>
                      <th>항목명</th>
                      <th style={{ width: '80px' }} className="text-right">수량/공수</th>
                      <th style={{ width: '80px' }} className="text-right">인원</th>
                      <th style={{ width: '80px' }} className="text-right">기간(일)</th>
                      <th style={{ width: '50px' }} className="text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((pi, idx) => {
                      const item = libraryItems.find(i => i.id === pi.itemId);
                      const isHRItem = item?.formulaType === 'PEOPLE_x_DAYS_x_PRICE';
                      
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600' }}>
                            {item ? item.name : '알 수 없음'}
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'normal' }}>
                              {item?.category} · ₩{item?.defaultPrice.toLocaleString()}
                            </div>
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="table-input num" 
                              value={isHRItem ? (pi.defaultPeople || 0) * (pi.defaultDays || 0) : pi.defaultQuantity} 
                              disabled={isHRItem}
                              onChange={e => handleUpdateItemField(idx, 'defaultQuantity', Number(e.target.value))} 
                              style={{
                                backgroundColor: isHRItem ? '#f0f1f3' : '#ffffff',
                                color: isHRItem ? 'var(--text-secondary)' : 'var(--text-primary)',
                                fontWeight: isHRItem ? '600' : 'normal',
                                cursor: isHRItem ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>
                          <td>
                            {isHRItem ? (
                              <input 
                                type="number" 
                                className="table-input num" 
                                value={pi.defaultPeople || 0} 
                                onChange={e => handleUpdateItemField(idx, 'defaultPeople', Number(e.target.value))} 
                              />
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', display: 'block', textAlign: 'center' }}>-</span>
                            )}
                          </td>
                          <td>
                            {isHRItem ? (
                              <input 
                                type="number" 
                                className="table-input num" 
                                value={pi.defaultDays || 0} 
                                onChange={e => handleUpdateItemField(idx, 'defaultDays', Number(e.target.value))} 
                              />
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', display: 'block', textAlign: 'center' }}>-</span>
                            )}
                          </td>
                          <td className="text-center">
                            <button 
                              type="button" 
                              className="btn-icon-only" 
                              style={{ color: 'var(--color-red)' }} 
                              onClick={() => handleRemoveItemFromPackage(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                          우측 리스트에서 품목을 클릭해 패키지에 추가하세요.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px', overflowY: 'auto' }}>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>라이브러리 품목 목록</div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>클릭하여 패키지에 바로 추가할 수 있습니다.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
              {libraryItems.map(item => (
                <div 
                  key={item.id} 
                  className="modal-list-item"
                  style={{ border: '1px solid var(--border-color)', padding: '8px', cursor: 'pointer' }}
                  onClick={() => handleAddItemToPackage(item.id)}
                >
                  <div className="modal-list-item-info">
                    <div className="modal-list-item-name" style={{ fontSize: '13px', fontWeight: '600' }}>{item.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      {item.category} · ₩{item.defaultPrice.toLocaleString()} / {item.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
          <button type="submit" className="btn btn-primary">패키지 저장</button>
        </div>
      </form>
    </div>
  );
}
