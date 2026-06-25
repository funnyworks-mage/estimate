import React from 'react';
import { X, Printer } from 'lucide-react';
import type { EstimateProject } from '../types/estimate';

// --- 한글 금액 변환 함수 ---
function convertToKoreanAmount(num: number): string {
  if (num === 0) return '영';
  const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const smallUnits = ['', '십', '백', '천'];
  const largeUnits = ['', '만', '억', '조'];
  
  let result = '';
  let unitCount = 0;
  
  while (num > 0) {
    const chunk = num % 10000;
    num = Math.floor(num / 10000);
    
    if (chunk === 0) {
      unitCount++;
      continue;
    }
    
    let chunkResult = '';
    let temp = chunk;
    for (let i = 0; i < 4; i++) {
      const digit = temp % 10;
      temp = Math.floor(temp / 10);
      
      if (digit > 0) {
        const digitStr = units[digit];
        const isOneAndNotUnit = digit === 1 && i > 0;
        chunkResult = (isOneAndNotUnit ? '' : digitStr) + smallUnits[i] + chunkResult;
      }
    }
    
    result = chunkResult + largeUnits[unitCount] + result;
    unitCount++;
  }
  
  return result;
}

interface EstimatePreviewModalProps {
  isOpen: boolean;
  activeProject: EstimateProject | null;
  projectSummary: {
    supplyTotal: number;
    vatTotal: number;
    grandTotal: number;
  };
  onClose: () => void;
  onPrint: () => void;
}

export default function EstimatePreviewModal({
  isOpen,
  activeProject,
  projectSummary,
  onClose,
  onPrint
}: EstimatePreviewModalProps) {
  if (!isOpen || !activeProject) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header no-print">
          <h2 className="modal-title">
            견적서 원장 발행 미리보기 ({
              activeProject.projectType === 'IT' ? 'IT 개발 폼' :
              activeProject.projectType === 'DESIGN' ? '디자인 폼' :
              activeProject.projectType === 'BUILD' ? '제작/시공 폼' : '기타 폼'
            })
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-primary" onClick={onPrint}>
              <Printer size={16} /> 인쇄 및 PDF로 저장
            </button>
            <button type="button" className="btn btn-secondary btn-icon-only" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="preview-document-container">
          
          <div className="a4-page">
            <div className="print-title">견  적  서</div>

            <div className="print-header-grid">
              {/* 수신인 */}
              <div>
                <table className="client-info-table">
                  <tbody>
                    <tr>
                      <td className="client-name-large">
                        {activeProject.clientName} 귀중
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#555', paddingTop: '12px' }}>
                        아래와 같이 견적합니다.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>발행 일자 :</strong> {activeProject.estimateDate}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>유효 기간 :</strong> {activeProject.expiryDate} (발행일로부터 30일)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 공급자 */}
              <div>
                <table className="vendor-info-table">
                  <tbody>
                    <tr>
                      <th rowSpan={5}>공<br/>급<br/>자</th>
                      <th>등록번호</th>
                      <td colSpan={3} style={{ fontWeight: 'bold' }}>{activeProject.vendorInfo.bizNumber}</td>
                    </tr>
                    <tr>
                      <th>상호(법인명)</th>
                      <td>{activeProject.vendorInfo.companyName}</td>
                      <th>대 표</th>
                      <td>
                        {activeProject.vendorInfo.ownerName}
                        {activeProject.vendorInfo.sealImage && (
                          <div className="seal-wrapper">
                            <img src={activeProject.vendorInfo.sealImage} alt="인감" className="seal-image" />
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th>주 소</th>
                      <td colSpan={3} style={{ fontSize: '10px' }}>{activeProject.vendorInfo.address}</td>
                    </tr>
                    <tr>
                      <th>전화번호</th>
                      <td>{activeProject.vendorInfo.tel || '-'}</td>
                      <th>이메일</th>
                      <td style={{ fontSize: '10px' }}>{activeProject.vendorInfo.email || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 금액 표시부 */}
            <div className="amount-summary-box">
              <span>견적 합계 금액 (부가세 포함)</span>
              <span>
                일금 {convertToKoreanAmount(projectSummary.grandTotal)}원정 (₩{projectSummary.grandTotal.toLocaleString()})
              </span>
            </div>

            {/* 견적 테이블 */}
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>구분</th>
                  <th style={{ width: activeProject.projectType === 'BUILD' ? '28%' : '38%' }}>품명 및 규격</th>
                  {activeProject.projectType === 'BUILD' && (
                    <th style={{ width: '13%' }}>규격 / 사이즈</th>
                  )}
                  <th style={{ width: '8%' }}>단위</th>
                  <th style={{ width: '10%' }}>수량 / 공수</th>
                  <th style={{ width: '14%' }} className="num">단가</th>
                  <th style={{ width: '18%' }} className="num">공급가액</th>
                </tr>
              </thead>
              <tbody>
                {activeProject.sections.map((sec) => {
                  const activeRows = sec.rows.filter(r => r.isSelected);
                  if (activeRows.length === 0) return null;

                  return (
                    <React.Fragment key={sec.id}>
                      <tr className="section-header-row">
                        <td colSpan={activeProject.projectType === 'BUILD' ? 7 : 6}>{sec.name}</td>
                      </tr>
                      
                      {activeRows.map(row => {
                        let quantityText = String(row.quantity);
                        if (row.formulaType === 'PEOPLE_x_DAYS_x_PRICE') {
                          const unitLabel = row.unit === 'MD' ? 'MD' : '일';
                          quantityText = `${row.people}명 × ${row.days}일 (${row.quantity}${unitLabel})`;
                        }

                        return (
                          <tr key={row.id}>
                            <td className="center">{row.category}</td>
                            <td>
                              <div style={{ fontWeight: '500' }}>{row.name}</div>
                              {row.description && (
                                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                  {row.description}
                                </div>
                              )}
                            </td>
                            {activeProject.projectType === 'BUILD' && (
                              <td className="center" style={{ fontSize: '11px' }}>{row.size || '-'}</td>
                            )}
                            <td className="center">{row.unit}</td>
                            <td className="center">{quantityText}</td>
                            <td className="num">₩{row.price.toLocaleString()}</td>
                            <td className="num">₩{row.supplyPrice.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                <tr className="print-totals-row">
                  <td colSpan={activeProject.projectType === 'BUILD' ? 5 : 4} rowSpan={3} style={{ borderRight: '1px solid #000', padding: '12px', verticalAlign: 'middle' }}>
                    * 본 견적서에 표기된 금액은 거래 조건에 따릅니다.
                  </td>
                  <td className="center" style={{ borderLeft: '1px solid #000' }}>공급가액</td>
                  <td className="num">₩{projectSummary.supplyTotal.toLocaleString()}</td>
                </tr>
                <tr className="print-totals-row">
                  <td className="center">부가세 (10%)</td>
                  <td className="num">₩{projectSummary.vatTotal.toLocaleString()}</td>
                </tr>
                <tr className="print-totals-row" style={{ fontSize: '13px' }}>
                  <td className="center" style={{ backgroundColor: '#eef3fc', color: 'var(--color-blue)' }}>최종합계</td>
                  <td className="num" style={{ backgroundColor: '#eef3fc', color: 'var(--color-blue)' }}>₩{projectSummary.grandTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* 비고란 */}
            {activeProject.remarks && (
              <div className="print-remarks">
                <div className="print-remarks-title">비고 및 계약 조건</div>
                <div className="print-remarks-content">{activeProject.remarks}</div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
