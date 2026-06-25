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

const CURRENCY_MAP = {
  EUR: { symbol: '€', name: '유로화', unit: 'EUR' },
  USD: { symbol: '$', name: '미국 달러', unit: 'USD' },
  JPY: { symbol: '¥', name: '일본 엔화', unit: 'JPY' },
  CNY: { symbol: '¥', name: '중국 위안화', unit: 'CNY' }
};

interface EstimatePreviewModalProps {
  isOpen: boolean;
  activeProject: EstimateProject | null;
  projectSummary: {
    supplyTotal: number;
    vatTotal: number;
    grandTotal: number;
    totalCorrectionRate?: number;
    totalCorrectionName?: string;
    totalCorrectionAmount?: number;
    finalSupplyTotal?: number;
    finalVatTotal?: number;
    finalGrandTotal?: number;
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
  React.useEffect(() => {
    if (isOpen && activeProject) {
      const oldTitle = document.title;
      document.title = activeProject.title;
      return () => {
        document.title = oldTitle;
      };
    }
  }, [isOpen, activeProject?.title]);

  if (!isOpen || !activeProject) return null;

  const currencyInfo = CURRENCY_MAP[activeProject.foreignCurrency || 'EUR'] || CURRENCY_MAP.EUR;

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
            {activeProject.vendorInfo.logoImage && (
              <div className="print-logo-wrapper" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '15px' }}>
                <img 
                  src={activeProject.vendorInfo.logoImage} 
                  alt="회사 로고" 
                  style={{ maxHeight: '40px', maxWidth: '150px', objectFit: 'contain' }} 
                />
              </div>
            )}
            <div className="print-title" style={{ fontSize: activeProject.title.length > 20 ? '20px' : '24px', letterSpacing: 'normal', paddingBottom: '12px' }}>
              {activeProject.title}
            </div>

            <div className="print-header-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px', alignItems: 'stretch' }}>
              {/* 수신인 */}
              <div>
                <table className="client-info-table-simple" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', tableLayout: 'fixed', height: '100%' }}>
                  <tbody>
                    <tr>
                      <th style={{ backgroundColor: '#f4f4f4', fontWeight: '600', border: '1px solid #000', fontSize: '11px', textAlign: 'center', padding: '8px 6px', width: '80px' }}>수 신 처</th>
                      <td style={{ border: '1px solid #000', padding: '8px 12px', fontWeight: '700', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeProject.clientName} 귀중
                      </td>
                    </tr>
                    <tr>
                      <th style={{ backgroundColor: '#f4f4f4', fontWeight: '600', border: '1px solid #000', fontSize: '11px', textAlign: 'center', padding: '8px 6px', width: '80px' }}>견적의뢰</th>
                      <td style={{ border: '1px solid #000', fontSize: '11px', padding: '8px 12px', color: '#555', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        아래와 같이 견적합니다.
                      </td>
                    </tr>
                    <tr>
                      <th style={{ backgroundColor: '#f4f4f4', fontWeight: '600', border: '1px solid #000', fontSize: '11px', textAlign: 'center', padding: '8px 6px', width: '80px' }}>발행일자</th>
                      <td style={{ border: '1px solid #000', fontSize: '11px', padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeProject.estimateDate}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ backgroundColor: '#f4f4f4', fontWeight: '600', border: '1px solid #000', fontSize: '11px', textAlign: 'center', padding: '8px 6px', width: '80px' }}>유효기간</th>
                      <td style={{ border: '1px solid #000', fontSize: '11px', padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeProject.expiryDate} (발행일로부터 30일)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 공급자 */}
              <div>
                <table className="vendor-info-table-simple" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', tableLayout: 'fixed', height: '100%' }}>
                  <tbody>
                    <tr>
                      <th style={{ backgroundColor: '#f4f4f4', fontWeight: '600', border: '1px solid #000', fontSize: '11px', textAlign: 'center', padding: '6px 4px', width: '80px' }}>상 호</th>
                      <td style={{ border: '1px solid #000', fontSize: '11px', padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeProject.vendorInfo.companyName}</td>
                    </tr>
                    <tr>
                      <th style={{ backgroundColor: '#f4f4f4', fontWeight: '600', border: '1px solid #000', fontSize: '11px', textAlign: 'center', padding: '6px 4px', width: '80px' }}>대표자명</th>
                      <td style={{ border: '1px solid #000', fontSize: '11px', padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap', verticalAlign: 'middle', position: 'relative' }}>
                        <span style={{ marginRight: '30px', position: 'relative', zIndex: 1 }}>{activeProject.vendorInfo.ownerName}</span>
                        <span style={{ position: 'relative', fontSize: '10px', color: '#666', display: 'inline-block' }}>
                          (인)
                          {activeProject.vendorInfo.sealImage && (
                            <img 
                              src={activeProject.vendorInfo.sealImage} 
                              alt="인감" 
                              style={{ 
                                position: 'absolute', 
                                left: '-22px', 
                                top: '-27px', 
                                width: '72px', 
                                height: '72px', 
                                objectFit: 'contain', 
                                mixBlendMode: 'multiply', 
                                zIndex: 2,
                                pointerEvents: 'none' 
                              }} 
                            />
                          )}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th style={{ backgroundColor: '#f4f4f4', fontWeight: '600', border: '1px solid #000', fontSize: '11px', textAlign: 'center', padding: '6px 4px', width: '80px' }}>등록번호</th>
                      <td style={{ border: '1px solid #000', fontSize: '11px', padding: '6px 8px', fontWeight: 'bold', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeProject.vendorInfo.bizNumber}</td>
                    </tr>
                    <tr>
                      <th style={{ backgroundColor: '#f4f4f4', fontWeight: '600', border: '1px solid #000', fontSize: '11px', textAlign: 'center', padding: '6px 4px', width: '80px' }}>주 소</th>
                      <td style={{ border: '1px solid #000', fontSize: '11px', padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeProject.vendorInfo.address}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 금액 표시부 */}
            <div className="amount-summary-box" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', justifyContent: 'center', height: 'auto', padding: '14px 18px', border: '2px solid #000', backgroundColor: '#fdfdfd', marginBottom: '24px' }}>
              {activeProject.useForeignCurrency && activeProject.exchangeRate ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: '#2563eb' }}>견적 합계 금액 (외화 청구 기준)</span>
                    <span style={{ fontWeight: '800', fontSize: '18px', color: '#2563eb' }}>
                      {currencyInfo.unit} {currencyInfo.symbol}{((projectSummary.finalGrandTotal ?? projectSummary.grandTotal) / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', borderTop: '1px dashed #ccc', paddingTop: '6px', marginTop: '4px', color: '#555', fontWeight: '600', fontSize: '12px' }}>
                    <span>원화 환산 금액 (부가세 포함)</span>
                    <span>일금 {convertToKoreanAmount(projectSummary.finalGrandTotal ?? projectSummary.grandTotal)}원정 (₩{(projectSummary.finalGrandTotal ?? projectSummary.grandTotal).toLocaleString()})</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>견적 합계 금액 (부가세 포함)</span>
                  <span style={{ fontWeight: '800', fontSize: '15px', color: '#000' }}>
                    일금 {convertToKoreanAmount(projectSummary.finalGrandTotal ?? projectSummary.grandTotal)}원정 (₩{(projectSummary.finalGrandTotal ?? projectSummary.grandTotal).toLocaleString()})
                  </span>
                </div>
              )}
            </div>

            {/* 견적 테이블 */}
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '12%', whiteSpace: 'nowrap' }}>구분</th>
                  <th style={{ width: activeProject.projectType === 'BUILD' ? '18%' : '26%', whiteSpace: 'nowrap' }}>품명 및 규격</th>
                  {activeProject.projectType === 'BUILD' && (
                    <th style={{ width: '10%', whiteSpace: 'nowrap' }}>규격 / 사이즈</th>
                  )}
                  <th style={{ width: '4%', whiteSpace: 'nowrap' }}>단위</th>
                  <th style={{ width: activeProject.projectType === 'BUILD' ? '14%' : '16%', whiteSpace: 'nowrap' }}>수량 / 공수</th>
                  <th style={{ width: '10%', whiteSpace: 'nowrap' }} className="num">단가</th>
                  <th style={{ width: '10%', whiteSpace: 'nowrap' }} className="center">보정</th>
                  <th style={{ width: '22%', whiteSpace: 'nowrap' }} className="num">공급가액</th>
                </tr>
              </thead>
              <tbody>
                {activeProject.sections.map((sec) => {
                  const activeRows = sec.rows.filter(r => r.isSelected);
                  if (activeRows.length === 0) return null;

                  return (
                    <React.Fragment key={sec.id}>
                      <tr className="section-header-row">
                        <td colSpan={activeProject.projectType === 'BUILD' ? 8 : 7}>{sec.name}</td>
                      </tr>
                      
                      {activeRows.map(row => {
                        let quantityText = String(row.quantity);
                        if (row.formulaType === 'PEOPLE_x_DAYS_x_PRICE') {
                          const unitLabel = row.unit === 'MD' ? 'MD' : '일';
                          quantityText = `${row.people}명 × ${row.days}일 (${row.quantity}${unitLabel})`;
                        }

                        return (
                          <tr key={row.id}>
                            <td className="center" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>{row.category}</td>
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
                            <td className="center" style={{ whiteSpace: 'nowrap', fontSize: '10px' }}>{quantityText}</td>
                            <td className="num" style={{ whiteSpace: 'nowrap' }}>₩{row.price.toLocaleString()}</td>
                            <td className="center" style={{ fontSize: '11px', color: (row.correctionRate || 0) > 0 ? 'var(--color-blue)' : (row.correctionRate || 0) < 0 ? '#e65100' : '#555', whiteSpace: 'nowrap' }}>
                              {row.correctionRate && row.correctionRate !== 0 
                                ? `${row.correctionRate > 0 ? '+' : ''}${Math.round(row.correctionRate * 100)}%` 
                                : '-'}
                            </td>
                            <td className="num" style={{ whiteSpace: 'nowrap' }}>₩{row.supplyPrice.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {projectSummary.totalCorrectionRate && projectSummary.totalCorrectionRate !== 0 ? (
                  <>
                    <tr className="print-totals-row" style={{ fontWeight: 'normal', backgroundColor: '#fafafa' }}>
                      <td colSpan={activeProject.projectType === 'BUILD' ? 6 : 5} rowSpan={5} style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', borderBottom: '1.5px solid #000', padding: '12px', verticalAlign: 'middle', fontSize: '11px', color: '#555', lineHeight: '1.5' }}>
                        * 본 견적서에 표기된 금액은 거래 조건에 따릅니다.
                      </td>
                      <td className="center" style={{ borderRight: '1px solid #000', width: '10%', whiteSpace: 'nowrap', fontSize: '11px', padding: '6px 4px', textAlign: 'center', backgroundColor: '#fafafa' }}>공급가액 소계</td>
                      <td className="num" style={{ borderRight: '1px solid #000', width: '22%', padding: '6px 8px', textAlign: 'right', fontWeight: '600' }}>
                        <div style={{ whiteSpace: 'nowrap' }}>₩{projectSummary.supplyTotal.toLocaleString()}</div>
                        {activeProject.useForeignCurrency && activeProject.exchangeRate && (
                          <div style={{ fontSize: '9px', color: '#888', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                            {currencyInfo.symbol}{(projectSummary.supplyTotal / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyInfo.unit})
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr className="print-totals-row" style={{ fontWeight: 'normal', backgroundColor: '#fafafa' }}>
                      <td className="center" style={{ borderRight: '1px solid #000', width: '10%', whiteSpace: 'nowrap', fontSize: '11px', padding: '6px 4px', textAlign: 'center', backgroundColor: '#fafafa' }}>부가세 소계</td>
                      <td className="num" style={{ borderRight: '1px solid #000', width: '22%', padding: '6px 8px', textAlign: 'right', fontWeight: '600' }}>
                        <div style={{ whiteSpace: 'nowrap' }}>₩{projectSummary.vatTotal.toLocaleString()}</div>
                        {activeProject.useForeignCurrency && activeProject.exchangeRate && (
                          <div style={{ fontSize: '9px', color: '#888', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                            {currencyInfo.symbol}{(projectSummary.vatTotal / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyInfo.unit})
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr className="print-totals-row" style={{ color: (projectSummary.totalCorrectionRate || 0) > 0 ? '#2563eb' : '#e65100', fontWeight: '600', backgroundColor: '#fafafa' }}>
                      <td className="center" style={{ borderRight: '1px solid #000', width: '10%', whiteSpace: 'nowrap', fontSize: '11px', padding: '6px 4px', textAlign: 'center', backgroundColor: '#fafafa' }}>
                        {(projectSummary.totalCorrectionRate || 0) > 0 ? '총괄 할증' : '총괄 할인'}
                      </td>
                      <td className="num" style={{ borderRight: '1px solid #000', width: '22%', padding: '6px 8px', textAlign: 'right' }}>
                        <div style={{ whiteSpace: 'nowrap' }}>
                          {projectSummary.totalCorrectionAmount && projectSummary.totalCorrectionAmount > 0 ? '+' : ''}
                          ₩{projectSummary.totalCorrectionAmount?.toLocaleString()}
                        </div>
                        {activeProject.useForeignCurrency && activeProject.exchangeRate && projectSummary.totalCorrectionAmount !== undefined && (
                          <div style={{ fontSize: '9px', color: (projectSummary.totalCorrectionRate || 0) > 0 ? '#60a5fa' : '#f97316', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                            {projectSummary.totalCorrectionAmount > 0 ? '+' : ''}
                            {currencyInfo.symbol}{(projectSummary.totalCorrectionAmount / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyInfo.unit})
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr className="print-totals-row" style={{ color: (projectSummary.totalCorrectionRate || 0) > 0 ? '#2563eb' : '#e65100', fontSize: '11px', backgroundColor: '#fafafa' }}>
                      <td className="center" style={{ borderRight: '1px solid #000', width: '10%', whiteSpace: 'nowrap', fontSize: '10px', padding: '6px 2px', textAlign: 'center', backgroundColor: '#fafafa' }}>ㄴ 부가세 변동</td>
                      <td className="num" style={{ borderRight: '1px solid #000', width: '22%', padding: '6px 8px', textAlign: 'right' }}>
                        <div style={{ whiteSpace: 'nowrap' }}>
                          {((projectSummary.finalVatTotal ?? 0) - projectSummary.vatTotal) > 0 ? '+' : ''}
                          ₩{((projectSummary.finalVatTotal ?? 0) - projectSummary.vatTotal).toLocaleString()}
                        </div>
                        {activeProject.useForeignCurrency && activeProject.exchangeRate && (
                          <div style={{ fontSize: '9px', color: (projectSummary.totalCorrectionRate || 0) > 0 ? '#60a5fa' : '#f97316', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                            {((projectSummary.finalVatTotal ?? 0) - projectSummary.vatTotal) > 0 ? '+' : ''}
                            {currencyInfo.symbol}{(((projectSummary.finalVatTotal ?? 0) - projectSummary.vatTotal) / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyInfo.unit})
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr className="print-totals-row" style={{ fontSize: '13px', backgroundColor: '#eef3fc' }}>
                      <td className="center" style={{ borderRight: '1px solid #000', borderBottom: '1.5px solid #000', color: 'var(--color-blue)', width: '10%', whiteSpace: 'nowrap', fontSize: '11px', padding: '10px 2px', fontWeight: '800', textAlign: 'center' }}>최종 합계</td>
                      <td className="num" style={{ borderRight: '1px solid #000', borderBottom: '1.5px solid #000', color: 'var(--color-blue)', width: '22%', padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle' }}>
                        {activeProject.useForeignCurrency && activeProject.exchangeRate ? (
                          (() => {
                            const afterExchange = (projectSummary.finalGrandTotal ?? projectSummary.grandTotal) / activeProject.exchangeRate;
                            const percentVal = Math.abs((projectSummary.totalCorrectionRate || 0) * 100).toFixed(2);
                            const directionText = (projectSummary.totalCorrectionRate || 0) > 0 ? '할증' : '할인';
                            return (
                              <>
                                <div style={{ fontWeight: '800', fontSize: '15px', color: '#2563eb', whiteSpace: 'nowrap' }}>
                                  {currencyInfo.symbol}{afterExchange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyInfo.unit})
                                </div>
                                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                  ₩{(projectSummary.finalGrandTotal ?? projectSummary.grandTotal).toLocaleString()}
                                  <span style={{ fontSize: '9px', color: '#888', marginLeft: '4px' }}>
                                    ({percentVal}% {directionText} 적용)
                                  </span>
                                </div>
                              </>
                            );
                          })()
                        ) : (
                          <div style={{ fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap' }}>₩{(projectSummary.finalGrandTotal ?? projectSummary.grandTotal).toLocaleString()}</div>
                        )}
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="print-totals-row" style={{ fontWeight: 'normal', backgroundColor: '#fafafa' }}>
                      <td colSpan={activeProject.projectType === 'BUILD' ? 6 : 5} rowSpan={3} style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', borderBottom: '1.5px solid #000', padding: '12px', verticalAlign: 'middle', fontSize: '11px', color: '#555', lineHeight: '1.5' }}>
                        * 본 견적서에 표기된 금액은 거래 조건에 따릅니다.
                      </td>
                      <td className="center" style={{ borderRight: '1px solid #000', width: '10%', whiteSpace: 'nowrap', fontSize: '11px', padding: '6px 4px', textAlign: 'center', backgroundColor: '#fafafa' }}>공급가액</td>
                      <td className="num" style={{ borderRight: '1px solid #000', width: '22%', padding: '6px 8px', textAlign: 'right', fontWeight: '600' }}>
                        <div style={{ whiteSpace: 'nowrap' }}>₩{projectSummary.supplyTotal.toLocaleString()}</div>
                        {activeProject.useForeignCurrency && activeProject.exchangeRate && (
                          <div style={{ fontSize: '9px', color: '#888', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                            {currencyInfo.symbol}{(projectSummary.supplyTotal / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyInfo.unit})
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr className="print-totals-row" style={{ fontWeight: 'normal', backgroundColor: '#fafafa' }}>
                      <td className="center" style={{ borderRight: '1px solid #000', width: '10%', whiteSpace: 'nowrap', fontSize: '11px', padding: '6px 4px', textAlign: 'center', backgroundColor: '#fafafa' }}>부가세 (10%)</td>
                      <td className="num" style={{ borderRight: '1px solid #000', width: '22%', padding: '6px 8px', textAlign: 'right', fontWeight: '600' }}>
                        <div style={{ whiteSpace: 'nowrap' }}>₩{projectSummary.vatTotal.toLocaleString()}</div>
                        {activeProject.useForeignCurrency && activeProject.exchangeRate && (
                          <div style={{ fontSize: '9px', color: '#888', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                            {currencyInfo.symbol}{(projectSummary.vatTotal / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyInfo.unit})
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr className="print-totals-row" style={{ fontSize: '13px', backgroundColor: '#eef3fc' }}>
                      <td className="center" style={{ borderRight: '1px solid #000', borderBottom: '1.5px solid #000', color: 'var(--color-blue)', width: '10%', whiteSpace: 'nowrap', fontSize: '11px', padding: '10px 2px', fontWeight: '800', textAlign: 'center' }}>최종 합계</td>
                      <td className="num" style={{ borderRight: '1px solid #000', borderBottom: '1.5px solid #000', color: 'var(--color-blue)', width: '22%', padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle' }}>
                        {activeProject.useForeignCurrency && activeProject.exchangeRate ? (
                          <>
                            <div style={{ fontWeight: '800', fontSize: '15px', color: '#2563eb', whiteSpace: 'nowrap' }}>
                              {currencyInfo.symbol}{(projectSummary.grandTotal / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyInfo.unit})
                            </div>
                            <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                              ₩{projectSummary.grandTotal.toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap' }}>₩{projectSummary.grandTotal.toLocaleString()}</div>
                        )}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* 비고란 */}
            {(activeProject.remarks || (activeProject.useForeignCurrency && activeProject.exchangeRate)) && (
              <div className="print-remarks">
                <div className="print-remarks-title">비고 및 계약 조건</div>
                <div className="print-remarks-content" style={{ whiteSpace: 'pre-line' }}>
                  {activeProject.remarks}
                  {activeProject.useForeignCurrency && activeProject.exchangeRate && (
                    <>
                      {activeProject.remarks ? '\n' : ''}
                      * [외화 환산 특약] 본 견적의 {currencyInfo.name}({currencyInfo.unit}) 표기는 견적 발행일({activeProject.estimateDate}) 고시 하나은행 매매기준율(1 {currencyInfo.unit} = {activeProject.exchangeRate.toLocaleString()} KRW)을 적용하여 계산된 병행 표기입니다.
                    </>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* WBS 별첨 페이지 */}
          {activeProject.wbs && activeProject.wbs.length > 0 && (
            <div className="a4-page wbs-attachment-page">
              <div className="print-title" style={{ marginTop: '20px' }}>업 무 범 위 명 세 서</div>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '20px', textAlign: 'center' }}>
                [별첨 1] 프로젝트 세부 작업 분할 구조 (WBS) 및 투입 계획
              </div>

              <table className="client-info-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '20px', fontSize: '12px', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '15%', fontWeight: 'bold', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 10px', textAlign: 'center' }}>프로젝트명</td>
                    <td style={{ width: '45%', border: '1px solid #000', padding: '8px 12px' }}>{activeProject.title}</td>
                    <td style={{ width: '15%', fontWeight: 'bold', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 10px', textAlign: 'center' }}>작성일자</td>
                    <td style={{ width: '25%', border: '1px solid #000', padding: '8px 12px' }}>{activeProject.estimateDate}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 10px', textAlign: 'center' }}>수 신 처</td>
                    <td style={{ border: '1px solid #000', padding: '8px 12px' }}>{activeProject.clientName} 귀중</td>
                    <td style={{ fontWeight: 'bold', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 10px', textAlign: 'center' }}>공 공급 자</td>
                    <td style={{ border: '1px solid #000', padding: '8px 12px' }}>{activeProject.vendorInfo.companyName}</td>
                  </tr>
                </tbody>
              </table>

              <table className="print-table wbs-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '11px', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '5%', textAlign: 'center', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 4px', fontWeight: '700' }}>No.</th>
                    <th style={{ width: '16%', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 6px', fontWeight: '700', textAlign: 'center' }}>항목 (대분류)</th>
                    <th style={{ width: '16%', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 6px', fontWeight: '700', textAlign: 'center' }}>작업내용 (중분류)</th>
                    <th style={{ width: '50%', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 6px', fontWeight: '700', textAlign: 'center' }}>상세 세부내역</th>
                    <th style={{ width: '5%', textAlign: 'center', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 4px', fontWeight: '700' }}>인력</th>
                    <th style={{ width: '8%', textAlign: 'center', border: '1px solid #000', backgroundColor: '#f4f4f4', padding: '8px 4px', fontWeight: '700' }}>공수(MD)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProject.wbs.flatMap((cat) => {
                    const totalTasks = cat.tasks.length;
                    if (totalTasks === 0) {
                      return (
                        <tr key={cat.id}>
                          <td className="center" style={{ border: '1px solid #000', verticalAlign: 'middle', textAlign: 'center', padding: '8px 4px' }}>{cat.no}</td>
                          <td style={{ fontWeight: 'bold', border: '1px solid #000', verticalAlign: 'middle', padding: '8px 10px' }}>{cat.title}</td>
                          <td colSpan={4} className="center" style={{ border: '1px solid #000', color: '#888', padding: '12px 0', textAlign: 'center' }}>
                            등록된 세부 작업이 없습니다.
                          </td>
                        </tr>
                      );
                    }

                    return cat.tasks.map((task, taskIdx) => {
                      const isFirst = taskIdx === 0;
                      return (
                        <tr key={task.id}>
                          {isFirst && (
                            <td rowSpan={totalTasks} className="center" style={{ border: '1px solid #000', verticalAlign: 'middle', fontWeight: 'bold', backgroundColor: '#fafafa', padding: '8px 4px', textAlign: 'center' }}>
                              {cat.no}
                            </td>
                          )}
                          {isFirst && (
                            <td rowSpan={totalTasks} style={{ border: '1px solid #000', fontWeight: 'bold', verticalAlign: 'middle', backgroundColor: '#fafafa', padding: '8px 10px', lineHeight: '1.4' }}>
                              {cat.title}
                            </td>
                          )}
                          <td style={{ border: '1px solid #000', fontWeight: '500', verticalAlign: 'middle', padding: '8px 10px' }}>{task.name}</td>
                          <td style={{ border: '1px solid #000', verticalAlign: 'middle', padding: '8px 10px' }}>
                            {task.details.filter(detail => detail.trim() !== '').map((detail, dIdx) => {
                              // 사용자가 직접 입력한 불릿 기호(•, *, -, · 등)가 있을 경우 중복 제거
                              const cleanedDetail = detail.replace(/^\s*[•*\-·◦▪▫●○■□🔹🔸]\s*/, '').trim();
                              return (
                                <div key={dIdx} style={{ lineHeight: '1.4', color: '#333' }}>
                                  • {cleanedDetail}
                                </div>
                              );
                            })}
                          </td>
                          <td className="center" style={{ border: '1px solid #000', verticalAlign: 'middle', padding: '8px 4px', textAlign: 'center' }}>{task.manpower}명</td>
                          <td className="center" style={{ border: '1px solid #000', verticalAlign: 'middle', padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}>{task.md}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>

              {/* WBS 공수 집계 요약 박스 */}
              <div style={{ 
                marginTop: '20px', 
                padding: '12px 16px', 
                backgroundColor: '#f8f9fa', 
                border: '1px solid #000', 
                borderRadius: '0px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <div>
                  * 본 업무범위명세서의 투입 공수는 견적서 총액 산정의 근거가 됩니다.
                </div>
                <div style={{ fontWeight: 'bold' }}>
                  총 투입 공수 합산: <span style={{ color: 'var(--color-blue)', fontSize: '14px' }}>
                    {activeProject.wbs.reduce((acc, cat) => 
                      acc + cat.tasks.reduce((tAcc, task) => tAcc + (task.md * task.manpower), 0)
                    , 0)} MD
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
