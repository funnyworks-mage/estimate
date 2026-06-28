import { useMemo } from 'react';
import { Plus, Users } from 'lucide-react';
import type { ClientInfo, EstimateProject } from '../types/estimate';
import ClientFormModal from './ClientFormModal';

interface ClientsDashboardProps {
  clients: ClientInfo[];
  projects: EstimateProject[];
  onSaveClient: (client: ClientInfo) => void;
  onDeleteClient: (id: string) => void;
  isClientCreateModalOpen: boolean;
  setIsClientCreateModalOpen: (open: boolean) => void;
  editingClient: ClientInfo | null;
  setEditingClient: (client: ClientInfo | null) => void;
}

interface ClientStatEntry {
  name: string;
  count: number;
  quoteTotalKrw: number;
  billingTotalKrw: number;
  invoicedTotalKrw: number;
  completedTotalKrw: number;
  quoteForeign: Record<string, number>;
  billingForeign: Record<string, number>;
  invoicedForeign: Record<string, number>;
  completedForeign: Record<string, number>;
  totalMd: number;
  minDate: string;
  maxDate: string;
  months?: number;
  monthlyAverageBilling?: number;
  monthlyAverageMd?: number;
  monthlyAverageBillingForeign?: Record<string, number>;
}

export default function ClientsDashboard({
  clients,
  projects,
  onSaveClient,
  onDeleteClient,
  isClientCreateModalOpen,
  setIsClientCreateModalOpen,
  editingClient,
  setEditingClient
}: ClientsDashboardProps) {

  // --- 고객사별 대시보드 정밀 다중 지표 통계 연산 ---
  const clientStats = useMemo(() => {
    const stats: Record<string, ClientStatEntry> = {};
    
    projects.forEach(proj => {
      let supplyTotal = 0;
      let vatTotal = 0;
      let projectMd = 0;
      
      proj.sections.forEach(sec => {
        sec.rows.forEach(row => {
          if (row.isSelected) {
            supplyTotal += row.supplyPrice;
            vatTotal += row.vat;
            
            if (row.unit === 'MD' || row.formulaType === 'PEOPLE_x_DAYS_x_PRICE') {
              projectMd += row.quantity || 0;
            }
          }
        });
      });
      const grandTotal = supplyTotal + vatTotal;
      const correctionRate = proj.totalCorrectionRate || 0;
      const finalSupplyTotal = supplyTotal + Math.round(supplyTotal * correctionRate);
      const finalVatTotal = correctionRate !== 0 ? Math.floor(finalSupplyTotal * 0.1) : vatTotal;
      const finalGrandTotal = finalSupplyTotal + finalVatTotal;

      const hasForeign = proj.useForeignCurrency && proj.exchangeRate && proj.exchangeRate > 0;
      const currency = proj.foreignCurrency || 'USD';
      const quoteForeignAmt = hasForeign ? grandTotal / proj.exchangeRate! : 0;
      const billingForeignAmt = hasForeign ? finalGrandTotal / proj.exchangeRate! : 0;

      const clientKey = proj.clientName || '미지정 고객사';
      if (!stats[clientKey]) {
        stats[clientKey] = {
          name: clientKey,
          count: 0,
          quoteTotalKrw: 0,
          billingTotalKrw: 0,
          invoicedTotalKrw: 0,
          completedTotalKrw: 0,
          quoteForeign: {},
          billingForeign: {},
          invoicedForeign: {},
          completedForeign: {},
          totalMd: 0,
          minDate: proj.estimateDate || '',
          maxDate: proj.estimateDate || ''
        };
      }

      const entry = stats[clientKey];
      entry.count += 1;
      entry.quoteTotalKrw += grandTotal;
      entry.billingTotalKrw += finalGrandTotal;
      entry.totalMd += projectMd;

      const pDate = proj.estimateDate || '';
      if (pDate) {
        if (!entry.minDate || pDate < entry.minDate) entry.minDate = pDate;
        if (!entry.maxDate || pDate > entry.maxDate) entry.maxDate = pDate;
      }

      if (proj.status === 'invoicing' || proj.status === 'completed') {
        entry.invoicedTotalKrw += finalGrandTotal;
      }
      if (proj.status === 'completed') {
        entry.completedTotalKrw += finalGrandTotal;
      }

      if (hasForeign) {
        entry.quoteForeign[currency] = (entry.quoteForeign[currency] || 0) + quoteForeignAmt;
        entry.billingForeign[currency] = (entry.billingForeign[currency] || 0) + billingForeignAmt;
        
        if (proj.status === 'invoicing' || proj.status === 'completed') {
          entry.invoicedForeign[currency] = (entry.invoicedForeign[currency] || 0) + billingForeignAmt;
        }
        if (proj.status === 'completed') {
          entry.completedForeign[currency] = (entry.completedForeign[currency] || 0) + billingForeignAmt;
        }
      }
    });

    // 다차원 롤업 평균 연산 파이프라인
    Object.keys(stats).forEach(key => {
      const entry = stats[key];
      if (entry.minDate && entry.maxDate) {
        const minD = new Date(entry.minDate);
        const maxD = new Date(entry.maxDate);
        
        let diffMonths = (maxD.getFullYear() - minD.getFullYear()) * 12 + (maxD.getMonth() - minD.getMonth());
        diffMonths = Math.max(1, diffMonths + 1);
        
        entry.months = diffMonths;
        entry.monthlyAverageBilling = Math.round(entry.billingTotalKrw / diffMonths);
        entry.monthlyAverageMd = Math.round((entry.totalMd / diffMonths) * 10) / 10;
        
        entry.monthlyAverageBillingForeign = {};
        Object.keys(entry.billingForeign).forEach(cur => {
          const totalAmt = entry.billingForeign[cur];
          entry.monthlyAverageBillingForeign![cur] = Math.round((totalAmt / diffMonths) * 100) / 100;
        });
      } else {
        entry.months = 1;
        entry.monthlyAverageBilling = entry.billingTotalKrw;
        entry.monthlyAverageMd = entry.totalMd;
        entry.monthlyAverageBillingForeign = {};
        Object.keys(entry.billingForeign).forEach(cur => {
          entry.monthlyAverageBillingForeign![cur] = entry.billingForeign[cur];
        });
      }
    });

    return stats;
  }, [projects]);

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">고객사 관리</h1>
          <p className="workspace-subtitle">주요 거래처 및 고객사들의 정보와 담당자 연락처를 관리합니다.</p>
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={() => { setEditingClient(null); setIsClientCreateModalOpen(true); }}>
            <Plus size={16} /> 새 고객사 등록
          </button>
        </div>
      </div>

      {/* 실시간 거래처 다차원 지표 통계 패널 */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} className="color-blue" />
          고객사별 누적 정밀 거래 지표
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '700' }}>
                <th style={{ padding: '8px 12px' }}>고객사명</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>견적 총액 (소계)</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>최종 계약액 (원화/외화)</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>청구/수금 완료 누적액</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>총 투입 공수 (MD)</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>거래 기간 (월간 평균 계약액)</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>프로젝트 수</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(clientStats).map(stat => {
                // 외화 데이터 문자열 빌더
                const billingForeignParts = Object.keys(stat.billingForeign).map(cur => {
                  return `${stat.billingForeign[cur].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
                }).join(' / ');

                const completedForeignParts = Object.keys(stat.completedForeign).map(cur => {
                  return `${stat.completedForeign[cur].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
                }).join(' / ');

                return (
                  <tr key={stat.name} style={{ borderBottom: '1px solid var(--border-color)', height: '44px' }}>
                    <td style={{ padding: '8px 12px', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>
                      ₩{stat.quoteTotalKrw.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#1976d2', fontWeight: '700' }}>
                      <div>₩{stat.billingTotalKrw.toLocaleString()}</div>
                      {billingForeignParts && (
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>({billingForeignParts})</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#2e7d32', fontWeight: '700' }}>
                      <div>₩{stat.completedTotalKrw.toLocaleString()}</div>
                      {completedForeignParts && (
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>({completedForeignParts})</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>
                      {stat.totalMd.toLocaleString()} MD
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <div>{stat.minDate || 'N/A'} ~ {stat.maxDate || 'N/A'} ({stat.months}개월)</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: '600' }}>
                        월 평균: ₩{stat.monthlyAverageBilling?.toLocaleString()} 
                        ({stat.monthlyAverageMd} MD)
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>{stat.count}건</td>
                  </tr>
                );
              })}
              {Object.keys(clientStats).length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    집계된 누적 거래 통계가 존재하지 않습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 거래처 카드 리스트 테이블 */}
      <div className="library-grid">
        {clients.map(client => (
          <div key={client.id} className="library-card" style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="library-card-header">
                <span className="library-card-badge" style={{ backgroundColor: 'var(--color-blue-light)', color: 'var(--color-blue)' }}>고객사</span>
                {client.bizNumber && (
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{client.bizNumber}</span>
                )}
              </div>
              <div className="library-card-title" style={{ fontSize: '16px', marginBottom: '8px' }}>{client.name}</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {client.ownerName && <div><strong>대표자:</strong> {client.ownerName}</div>}
                {client.managerName && (
                  <div><strong>담당자:</strong> {client.managerName} {client.managerTel && `(${client.managerTel})`}</div>
                )}
                {client.address && (
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>주소:</strong> {client.address}
                  </div>
                )}
                {client.memo && (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '4px' }}>
                    * {client.memo}
                  </div>
                )}
              </div>
            </div>

            <div className="library-card-footer" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setEditingClient(client); setIsClientCreateModalOpen(true); }}
              >
                수정
              </button>
              <button 
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => onDeleteClient(client.id)}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-tertiary)' }}>
            등록된 고객사가 없습니다.
          </div>
        )}
      </div>

      {/* 고객사 신규/수정 모달 */}
      {isClientCreateModalOpen && (
        <ClientFormModal 
          isOpen={isClientCreateModalOpen} 
          onClose={() => { setIsClientCreateModalOpen(false); setEditingClient(null); }} 
          onSave={onSaveClient}
          editingClient={editingClient}
        />
      )}
    </div>
  );
}
