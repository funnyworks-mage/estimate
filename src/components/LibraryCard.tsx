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
    <div className="library-card animate-hover" style={{ gridColumn: '1 / -1', minHeight: 'auto', padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        
        {/* 1열: 직군 정보 */}
        <div style={{ flex: '1.2', minWidth: '200px' }}>
          <div className="library-card-header" style={{ marginBottom: '4px' }}>
            <span className="library-card-badge" style={{ backgroundColor: 'rgba(49, 130, 246, 0.08)', color: 'var(--color-blue)', border: '1px solid rgba(49, 130, 246, 0.15)', padding: '1px 6px', fontSize: '10px' }}>
              {repItem.category}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              {repItem.vatType === 'TAX' ? '과세(10%)' : repItem.vatType === 'FREE' ? '면세' : '영세'}
            </span>
          </div>
          <div className="library-card-title" style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0' }}>
            {name}
            <span style={{ fontSize: '9px', fontWeight: '600', color: 'var(--color-blue)', backgroundColor: 'var(--color-blue-light)', padding: '1px 6px', borderRadius: '10px', border: '1px solid rgba(49, 130, 246, 0.12)' }}>
              {items.length}레벨
            </span>
          </div>
          <div className="library-card-formula" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            계산: {
              repItem.formulaType === 'QTY_x_PRICE' ? '수량 × 단가' :
              repItem.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? '인원 × 일수 × 단가' :
              repItem.formulaType === 'MD_x_PRICE' ? '투입 MD × 단가' :
              repItem.formulaType === 'MONTHS_x_PRICE' ? '개월 수 × 단가' : '고정 금액'
            } ({repItem.unit})
          </div>
        </div>

        {/* 2열: 3/4/5대 레벨 단가 동적 분할 배치 */}
        <div style={{ flex: '2.5', minWidth: '300px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '6px' }}>
            {items.map((gi) => {
              const shortRank = gi.rank 
                ? (['L1 Support', 'L2 Operator', 'L3 Specialist', 'L4 Lead', 'L5 Director'].includes(gi.rank)
                    ? gi.rank
                        .replace(' Support', '')
                        .replace(' Operator', '')
                        .replace(' Specialist', '')
                        .replace(' Lead', '')
                        .replace(' Director', '')
                    : gi.rank)
                : '';
                
              const isBase = gi.basePrice && gi.basePrice > 0 
                ? gi.defaultPrice === gi.basePrice
                : (gi.rank === 'L2 Operator' || gi.rank === '엔지니어' || gi.rank === '운영 스태프' || gi.rank === 'L2 기본실무');
                
              const calculatedMult = gi.basePrice && gi.basePrice > 0 
                ? Math.round((gi.defaultPrice / gi.basePrice) * 10) / 10 
                : 1.0;

              return (
                <div 
                  key={gi.id} 
                  style={{ 
                    padding: '6px 4px', 
                    backgroundColor: isBase ? 'rgba(49, 130, 246, 0.04)' : 'var(--bg-secondary)', 
                    border: isBase ? '1.2px solid var(--color-blue)' : '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: '800', color: isBase ? 'var(--color-blue)' : 'var(--text-primary)' }}>
                    {shortRank}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', margin: '1px 0' }}>
                    {calculatedMult.toFixed(1)}x
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: isBase ? 'var(--color-blue)' : 'var(--text-secondary)' }}>
                    ₩{(gi.defaultPrice / 10000).toLocaleString()}만
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3열: 관리 버튼 영역 (오른쪽 배치) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '85px', alignItems: 'stretch' }}>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '10px', height: '26px', padding: '0 8px', justifyContent: 'center', fontWeight: '700' }}
            onClick={() => onEdit(repItem)}
          >
            단가 수정
          </button>
          <button 
            type="button"
            className="btn btn-danger btn-sm"
            style={{ fontSize: '10px', height: '26px', padding: '0 8px', justifyContent: 'center', fontWeight: '700' }}
            onClick={() => onDeleteGroup(name)}
          >
            그룹 삭제
          </button>
        </div>
        
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
