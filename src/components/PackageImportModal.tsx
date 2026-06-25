import { X, ChevronRight } from 'lucide-react';
import type { CostPackage, CostItem } from '../types/estimate';

interface PackageImportModalProps {
  isOpen: boolean;
  libraryPackages: CostPackage[];
  libraryItems: CostItem[];
  onClose: () => void;
  onImport: (pkg: CostPackage) => void;
}

export default function PackageImportModal({
  isOpen,
  libraryPackages,
  libraryItems,
  onClose,
  onImport
}: PackageImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay no-print">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">패키지 세트 호출</h2>
          <button type="button" className="btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {libraryPackages.map(pkg => (
              <div 
                key={pkg.id} 
                className="card"
                style={{ cursor: 'pointer' }}
                onClick={() => onImport(pkg)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '15px' }}>{pkg.name}</span>
                  <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{pkg.description}</p>
                
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  포함 항목: {pkg.items.map(pi => {
                    const item = libraryItems.find(i => i.id === pi.itemId);
                    return item ? item.name : '';
                  }).filter(Boolean).join(', ')}
                </div>
              </div>
            ))}

            {libraryPackages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                등록된 패키지가 없습니다. 항목 라이브러리 탭에서 패키지를 먼저 생성하십시오.
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
