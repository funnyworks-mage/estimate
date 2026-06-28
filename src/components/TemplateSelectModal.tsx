import { Cpu, Palette, Hammer, HelpCircle } from 'lucide-react';

interface TemplateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (type: 'IT' | 'DESIGN' | 'BUILD' | 'OTHER') => void;
}

export default function TemplateSelectModal({ isOpen, onClose, onCreate }: TemplateSelectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay no-print" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 className="modal-title">견적서 기본 폼 선택</h2>
          <button type="button" className="btn-icon-only" onClick={onClose}>
            <span>닫기</span>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
            작성하려는 견적 업무 도메인을 선택해 주십시오. 선택한 폼에 맞추어 최적화된 테이블 컬럼과 초기 섹션이 자동으로 구성됩니다.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {/* IT 시스템 개발 템플릿 */}
            <div 
              className="card hover-border-blue" 
              onClick={() => onCreate('IT')}
              style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-blue)' }}>
                <Cpu size={20} />
                <strong style={{ fontSize: '15px' }}>IT 시스템 구축 및 개발 용역</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                기획, UX/UI 디자인, 프론트엔드 및 백엔드 소프트웨어 개발 부문으로 구성된 인건비 중심의 표준 용역 견적서 서식입니다.
              </p>
            </div>

            {/* 디자인 템플릿 */}
            <div 
              className="card hover-border-blue" 
              onClick={() => onCreate('DESIGN')}
              style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8e44ad' }}>
                <Palette size={20} />
                <strong style={{ fontSize: '15px' }}>브랜드 디자인 및 기획 용역</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                BI/BX 브랜드 디자인, 시각 그래픽 및 홍보 산출물 제작 등 크리에이티브 기획에 최적화된 고부가가치 서식입니다.
              </p>
            </div>

            {/* 시공 템플릿 */}
            <div 
              className="card hover-border-blue" 
              onClick={() => onCreate('BUILD')}
              style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e67e22' }}>
                <Hammer size={20} />
                <strong style={{ fontSize: '15px' }}>인테리어 시공 및 원자재 납품</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                하드웨어 자재 공급, 규격별 소요 물량 계산, 현장 설치 시공 공수 및 노무비 집계에 적합한 건설/현장형 서식입니다.
              </p>
            </div>

            {/* 기타 템플릿 */}
            <div 
              className="card hover-border-blue" 
              onClick={() => onCreate('OTHER')}
              style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#27ae60' }}>
                <HelpCircle size={20} />
                <strong style={{ fontSize: '15px' }}>일반 공급 및 기타 서비스</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                유통, 제조 물품 납품, 컨설팅 자문, 교육 대행 등 일반 용역 및 물품 거래 계약에 광범위하게 활용되는 기본 서식입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .hover-border-blue:hover {
          border-color: var(--color-blue) !important;
          box-shadow: 0 4px 12px rgba(25, 118, 210, 0.08);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
