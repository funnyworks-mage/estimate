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

interface HRGroupCardProps {
  name: string;
  items: CostItem[];
  repItem: CostItem;
  onEdit: (item: CostItem) => void;
  onDeleteGroup: (name: string) => void;
}

export function HRGroupCard({ name, items, repItem, onEdit, onDeleteGroup }: HRGroupCardProps) {
  return (
    <div className="library-card animate-hover" style={{ gridColumn: '1 / -1', minHeight: 'auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        
        <div style={{ flex: '1', minWidth: '240px' }}>
          <div className="library-card-header" style={{ marginBottom: '8px' }}>
            <span className="library-card-badge" style={{ backgroundColor: 'rgba(49, 130, 246, 0.08)', color: 'var(--color-blue)', border: '1px solid rgba(49, 130, 246, 0.15)' }}>
              {repItem.category} (통합 그룹)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {repItem.vatType === 'TAX' ? '과세(10%)' : repItem.vatType === 'FREE' ? '면세' : '영세'}
            </span>
          </div>
          <div className="library-card-title" style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 6px 0' }}>
            {name}
            <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-blue)', backgroundColor: 'var(--color-blue-light)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(49, 130, 246, 0.15)' }}>
              5대 레벨 통합
            </span>
          </div>
          <div className="library-card-formula" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            계산 방식: {
              repItem.formulaType === 'QTY_x_PRICE' ? '수량 × 단가' :
              repItem.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? '인원 × 일수 × 단가' :
              repItem.formulaType === 'MD_x_PRICE' ? '투입 MD × 단가' :
              repItem.formulaType === 'MONTHS_x_PRICE' ? '개월 수 × 단가' : '고정 금액'
            } (단위: {repItem.unit})
          </div>
        </div>

        {/* 5대 레벨 단가 가로 콤팩트 분할 배치 */}
        <div style={{ flex: '2', minWidth: '320px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {items.map((gi) => {
              const shortRank = gi.rank ? gi.rank.replace(' Support', '').replace(' Operator', '').replace(' Specialist', '').replace(' Lead', '').replace(' Director', '') : '';
              const isL2 = gi.rank === 'L2 Operator';
              return (
                <div 
                  key={gi.id} 
                  style={{ 
                    padding: '10px 6px', 
                    backgroundColor: isL2 ? 'rgba(49, 130, 246, 0.05)' : 'var(--bg-secondary)', 
                    border: isL2 ? '1.5px solid var(--color-blue)' : '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    textAlign: 'center',
                    boxShadow: isL2 ? '0 2px 8px rgba(49, 130, 246, 0.08)' : 'none'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '800', color: isL2 ? 'var(--color-blue)' : 'var(--text-primary)' }}>
                    {shortRank}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', margin: '2px 0' }}>
                    {gi.rank === 'L1 Support' ? '0.8x' : gi.rank === 'L2 Operator' ? '1.0x (기준)' : gi.rank === 'L3 Specialist' ? '1.5x' : gi.rank === 'L4 Lead' ? '2.0x' : '3.0x'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: isL2 ? 'var(--color-blue)' : 'var(--text-secondary)' }}>
                    ₩{(gi.defaultPrice / 10000).toLocaleString()}만
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
      </div>

      <div className="library-card-footer" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button 
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onEdit(repItem)}
        >
          기준 단가 수정
        </button>
        <button 
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onDeleteGroup(name)}
        >
          그룹 일괄 삭제
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
