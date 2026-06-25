import type { CostItem } from '../types/estimate';

interface LibraryCardProps {
  item: CostItem;
  onEdit: (item: CostItem) => void;
  onDelete: (id: string) => void;
}

export function LibraryCard({ item, onEdit, onDelete }: LibraryCardProps) {
  return (
    <div className="library-card animate-hover">
      <div>
        <div className="library-card-header">
          <span className="library-card-badge">{item.category}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {item.vatType === 'TAX' ? '과세(10%)' : item.vatType === 'FREE' ? '면세' : '영세'}
          </span>
        </div>
        <div className="library-card-title">{item.name}</div>
        {item.internalName && (
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            관리명: {item.internalName}
          </div>
        )}
        <div className="library-card-price">
          ₩{item.defaultPrice.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ {item.unit}</span>
        </div>
        <div className="library-card-formula">
          계산 방식: {
            item.formulaType === 'QTY_x_PRICE' ? '수량 × 단가' :
            item.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? '인원 × 일수 × 단가' :
            item.formulaType === 'MD_x_PRICE' ? '투입 MD × 단가' :
            item.formulaType === 'MONTHS_x_PRICE' ? '개월 수 × 단가' : '고정 금액'
          }
        </div>
      </div>
      
      <div className="library-card-footer">
        <button 
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onEdit(item)}
        >
          수정
        </button>
        <button 
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(item.id)}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export function EmptyGroupMessage() {
  return (
    <div style={{ 
      gridColumn: '1/-1', 
      textAlign: 'center', 
      padding: '24px 0', 
      border: '1px dashed var(--border-color)', 
      borderRadius: 'var(--radius-lg)', 
      color: 'var(--text-tertiary)', 
      fontSize: '13px', 
      backgroundColor: 'var(--bg-secondary)' 
    }}>
      등록된 단가 항목이 없습니다.
    </div>
  );
}
