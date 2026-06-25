import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Printer, 
  Eye, 
  ArrowLeft, 
  Building2, 
  Check, 
  X, 
  HelpCircle,
  Shield,
  Palette,
  Terminal,
  Hammer,
  FileText
} from 'lucide-react';
import type { 
  EstimateProject, 
  ClientInfo, 
  CostItem, 
  CostPackage, 
  EstimateRow,
  EstimateSection
} from '../types/estimate';
import { TOTAL_CORRECTION_PRESETS } from '../types/estimate';
import { calculateRowAmounts } from '../utils/storage';

// 하위 컴포넌트 임포트
import ItemFormModal from './ItemFormModal';
import PackageFormModal from './PackageFormModal';
import LibraryImportModal from './LibraryImportModal';
import PackageImportModal from './PackageImportModal';
import EstimatePreviewModal from './EstimatePreviewModal';
import { WbsEditor } from './WbsEditor';
import TemplateSelectModal from './TemplateSelectModal';

interface EstimatesDashboardProps {
  user: any;
  userRole: 'member' | 'admin' | 'super_admin' | null;
  clients: ClientInfo[];
  categoriesList: string[];
  unitsList: string[];
  namesList: Record<string, string[]>;
  libraryItems: CostItem[];
  libraryPackages: CostPackage[];
  estimatesState: any; // useEstimateProjects의 리턴 객체
}

export default function EstimatesDashboard({
  user,
  userRole,
  clients,
  categoriesList,
  unitsList,
  namesList,
  libraryItems,
  libraryPackages,
  estimatesState
}: EstimatesDashboardProps) {
  
  // 상태 구조 분해 할당
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    activeSubTab,
    setActiveSubTab,
    customAmountInput,
    setCustomAmountInput,
    targetSectionId,
    activeProject,
    projectSummary,
    isFormSelectModalOpen,
    setIsFormSelectModalOpen,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    isLibraryModalOpen,
    setIsLibraryModalOpen,
    isPackageModalOpen,
    setIsPackageModalOpen,
    
    // 동작 메소드
    handleCreateNewProject,
    handleDuplicateProject,
    handleDeleteProject,
    handleUpdateProjectField,
    handleUpdateProjectFields,
    handleUpdateProjectApproval,
    handleSyncWbsToEstimate,
    handleUpdateRowField,
    handleDeleteRow,
    handleOpenLibraryModal,
    handleImportSelectedItems,
    handleOpenPackageModal,
    handleImportPackage,
    updateProjectsState
  } = estimatesState;

  // 로컬 UI/정렬/필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'invoicing' | 'completed'>('all');
  const [projectTypeFilter, setProjectTypeFilter] = useState<'all' | 'IT' | 'DESIGN' | 'BUILD' | 'OTHER'>('all');
  
  // 에디터 상세 모달 상태들
  const [isItemCreateModalOpen, setIsItemCreateModalOpen] = useState(false);
  const [isPackageCreateModalOpen, setIsPackageCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<CostPackage | null>(null);

  // --- 프로젝트 필터링 & 검색 연산 ---
  const filteredProjects = useMemo(() => {
    const filtered = projects.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.clientName && p.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchType = projectTypeFilter === 'all' || p.projectType === projectTypeFilter;
      return matchSearch && matchStatus && matchType;
    });

    // 정렬 규칙 보장: 견적일자(estimateDate) 내림차순(최신순) -> 동일할 시 생성일자(createdAt) 내림차순(최신순)
    return [...filtered].sort((a, b) => {
      const dateA = a.estimateDate || '';
      const dateB = b.estimateDate || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      return createdB - createdA;
    });
  }, [projects, searchTerm, statusFilter, projectTypeFilter]);

  // --- 테이블에 인건비용 (인원, 기간) 컬럼을 노출할지 여부 결정 ---
  const shouldShowHRColumns = useMemo(() => {
    if (!activeProject) return false;
    return activeProject.projectType === 'IT' || 
           activeProject.projectType === 'DESIGN' ||
           activeProject.sections.some(s => s.rows.some(r => r.formulaType === 'PEOPLE_x_DAYS_x_PRICE'));
  }, [activeProject]);

  // 등급 라벨 번역 헬퍼
  const getRoleLabel = (role: typeof userRole) => {
    switch (role) {
      case 'super_admin': return '슈퍼관리자';
      case 'admin': return '관리자';
      case 'member': return '일반 회원';
      default: return '미정';
    }
  };

  // 프로젝트 상태별 한글화 배지 헬퍼
  const getStatusBadge = (status: 'draft' | 'invoicing' | 'completed') => {
    switch (status) {
      case 'draft':
        return <span style={{ backgroundColor: '#e2e8f0', color: '#4a5568', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>견적 작성</span>;
      case 'invoicing':
        return <span style={{ backgroundColor: '#e3f2fd', color: '#0d47a1', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>청구 진행</span>;
      case 'completed':
        return <span style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>수금 완료</span>;
      default:
        return null;
    }
  };

  return (
    <div className="workspace">
      {selectedProjectId === null ? (
        // 1. 프로젝트 목록 화면 렌더링
        <>
          <div className="workspace-header">
            <div>
              <h1 className="workspace-title">견적 프로젝트</h1>
              <p className="workspace-subtitle">도메인에 특화된 기본 폼을 선택하고 회사 표준 단가 프리셋을 활용해 고품질의 견적서를 빠르게 작성하세요.</p>
            </div>
            <div>
              <button type="button" className="btn btn-primary" onClick={() => setIsFormSelectModalOpen(true)}>
                <Plus size={16} /> 새 견적서 작성
              </button>
            </div>
          </div>

          {/* 검색 및 다차원 복합 필터 툴바 */}
          <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ flex: '1 1 280px' }}>
              <input 
                type="text" 
                className="input-text" 
                placeholder="프로젝트명 또는 고객사명 검색..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ width: '130px' }}>
                <option value="all">모든 진행 상태</option>
                <option value="draft">견적 작성</option>
                <option value="invoicing">청구 진행</option>
                <option value="completed">수금 완료</option>
              </select>
              <select className="select-input" value={projectTypeFilter} onChange={(e) => setProjectTypeFilter(e.target.value as any)} style={{ width: '130px' }}>
                <option value="all">모든 업무 도메인</option>
                <option value="IT">IT 시스템 개발</option>
                <option value="DESIGN">기획/디자인</option>
                <option value="BUILD">공사/시공/인테리어</option>
                <option value="OTHER">일반 공급/기타</option>
              </select>
            </div>
          </div>

          {/* 프로젝트 그리드 레이아웃 */}
          <div className="library-grid">
            {filteredProjects.map(proj => {
              // 해당 프로젝트의 금액 합산 연산
              let projSupply = 0;
              let projVat = 0;
              const isForeign = !!proj.useForeignCurrency;

              proj.sections.forEach(s => {
                s.rows.forEach(r => {
                  if (r.isSelected) {
                    projSupply += r.supplyPrice;
                    projVat += isForeign ? 0 : r.vat;
                  }
                });
              });

              const corrRate = proj.totalCorrectionRate || 0;
              const corrAmt = Math.round(projSupply * corrRate);
              const finalSupply = projSupply + corrAmt;
              const finalVat = isForeign ? 0 : (corrRate !== 0 ? Math.floor(finalSupply * 0.1) : projVat);
              const finalGrand = finalSupply + finalVat;

              // 통화 심볼 빌더
              const currencySymbol = isForeign ? (proj.foreignCurrency === 'EUR' ? '€' : '$') : '₩';
              const formattedFinalGrand = isForeign 
                ? (finalGrand / (proj.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : finalGrand.toLocaleString();

              const formattedOrigGrand = isForeign
                ? ((projSupply + projVat) / (proj.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : (projSupply + projVat).toLocaleString();

              // 카드 클릭 시 진입
              return (
                <div 
                  key={proj.id} 
                  className="library-card" 
                  onClick={() => setSelectedProjectId(proj.id)}
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '230px' }}
                >
                  <div>
                    <div className="library-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="library-card-badge" style={{ 
                        backgroundColor: proj.projectType === 'IT' ? '#e3f2fd' : proj.projectType === 'DESIGN' ? '#f3e5f5' : proj.projectType === 'BUILD' ? '#fff3e0' : '#e8f5e9',
                        color: proj.projectType === 'IT' ? '#0d47a1' : proj.projectType === 'DESIGN' ? '#4a148c' : proj.projectType === 'BUILD' ? '#e65100' : '#1b5e20'
                      }}>
                        {proj.projectType === 'IT' ? 'IT 개발' : proj.projectType === 'DESIGN' ? '디자인' : proj.projectType === 'BUILD' ? '공사/시공' : '일반 공급'}
                      </span>
                      <select 
                        value={proj.status} 
                        onChange={(e) => handleUpdateProjectStatus(proj.id, e.target.value as any)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: 
                            proj.status === 'draft' ? '#e2e8f0' : 
                            proj.status === 'invoicing' ? '#e3f2fd' : '#e8f5e9',
                          color: 
                            proj.status === 'draft' ? '#4a5568' : 
                            proj.status === 'invoicing' ? '#0d47a1' : '#1b5e20',
                          outline: 'none',
                          height: '24px',
                          textAlign: 'center'
                        }}
                      >
                        <option value="draft">견적 작성</option>
                        <option value="invoicing">청구 진행</option>
                        <option value="completed">수금 완료</option>
                      </select>
                    </div>
                    <div className="library-card-title" style={{ fontSize: '15px', fontWeight: '700', lineHeight: '1.4', marginBottom: '8px' }}>
                      {proj.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                      <Building2 size={13} />
                      {proj.clientName}
                    </div>
                  </div>

                  <div>
                    {/* 최종 금액 실시간 피드백 */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        <span>견적금액</span>
                        <span>{currencySymbol}{formattedOrigGrand}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: 'var(--color-blue)' }}>
                        <span>청구금액</span>
                        <span>{currencySymbol}{formattedFinalGrand}</span>
                      </div>
                    </div>

                    <div className="library-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{proj.estimateDate}</span>
                      <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                        <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={(e) => handleDuplicateProject(proj, e)} title="복사">
                          <Copy size={13} />
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={(e) => handleDeleteProject(proj.id, e)} title="삭제">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', border: '2px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-tertiary)', gap: '12px' }}>
                <FileText size={40} style={{ opacity: 0.5 }} />
                <span>검색 조건과 일치하는 견적 프로젝트가 없습니다.</span>
              </div>
            )}
          </div>
        </>
      ) : (
        // 2. 프로젝트 상세 에디터 화면 렌더링
        <>
          {activeProject && (
            <>
              {/* 에디터 탑 바 */}
              <div className="workspace-header no-print">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedProjectId(null)} style={{ height: '36px', padding: '0 12px' }}>
                    <ArrowLeft size={16} /> 목록
                  </button>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h1 className="workspace-title" style={{ fontSize: '18px', margin: 0 }}>{activeProject.title}</h1>
                      <select 
                        value={activeProject.status} 
                        onChange={(e) => handleUpdateProjectStatus(activeProject.id, e.target.value as any)}
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: 
                            activeProject.status === 'draft' ? '#e2e8f0' : 
                            activeProject.status === 'invoicing' ? '#e3f2fd' : '#e8f5e9',
                          color: 
                            activeProject.status === 'draft' ? '#4a5568' : 
                            activeProject.status === 'invoicing' ? '#0d47a1' : '#1b5e20',
                          outline: 'none',
                          height: '24px',
                          textAlign: 'center'
                        }}
                      >
                        <option value="draft">견적 작성</option>
                        <option value="invoicing">청구 진행</option>
                        <option value="completed">수금 완료</option>
                      </select>
                    </div>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      고객사: {activeProject.clientName} | 발행일: {activeProject.estimateDate}
                    </p>
                  </div>
                </div>

                {/* 우측 상단 툴바: 인쇄 및 미리보기만 남김 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsPreviewModalOpen(true)} style={{ height: '36px' }}>
                    <Eye size={16} /> 인쇄 및 미리보기
                  </button>
                </div>
              </div>

              {/* 상세 화면 서브 탭 분기 */}
              <div className="tab-nav no-print" style={{ marginBottom: '20px' }}>
                <button 
                  type="button" 
                  className={`tab-button ${activeSubTab === 'estimate' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('estimate')}
                >
                  견적서 / 문서 작성
                </button>
                <button 
                  type="button" 
                  className={`tab-button ${activeSubTab === 'wbs' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('wbs')}
                >
                  업무 범위 명세서 (WBS)
                </button>
              </div>

              {activeSubTab === 'estimate' ? (
                 // (1) 견적 편집 화면 (좌우 flex 분할 레이아웃 적용)
                 <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                   {/* 좌측 폼 영역 */}
                   <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* 기본 메타 정보 입력 카드 */}
                  <div className="card no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">견적 프로젝트명</label>
                      <input 
                        type="text" 
                        className="input-text" 
                        value={activeProject.title} 
                        onChange={(e) => handleUpdateProjectField('title', e.target.value)}
                        disabled={activeProject.approvalStatus === 'approved'}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">수신 고객사명</label>
                      <select 
                        className="select-input" 
                        value={activeProject.clientName || ''} 
                        onChange={(e) => handleUpdateProjectField('clientName', e.target.value)}
                        disabled={activeProject.approvalStatus === 'approved'}
                      >
                        <option value="">고객사 선택...</option>
                        {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">견적 발행일자</label>
                      <input 
                        type="date" 
                        className="input-text" 
                        value={activeProject.estimateDate} 
                        onChange={(e) => handleUpdateProjectField('estimateDate', e.target.value)}
                        disabled={activeProject.approvalStatus === 'approved'}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">견적 유효기간</label>
                      <input 
                        type="date" 
                        className="input-text" 
                        value={activeProject.expiryDate || ''} 
                        onChange={(e) => handleUpdateProjectField('expiryDate', e.target.value)}
                        disabled={activeProject.approvalStatus === 'approved'}
                      />
                    </div>
                  </div>

                  {/* 환율 및 총괄 보정 요율 스마트 제어 카드 */}
                  <div className="card no-print" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', backgroundColor: '#fafbfc' }}>
                    {/* 외화 표기 토글 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="useForeignCurrency" 
                        checked={!!activeProject.useForeignCurrency}
                        onChange={(e) => handleUpdateProjectField('useForeignCurrency', e.target.checked)}
                        disabled={activeProject.approvalStatus === 'approved'}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="useForeignCurrency" style={{ fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        외화 청구 견적서 전환 (수출/해외 계약용)
                      </label>
                    </div>

                    {activeProject.useForeignCurrency && (
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <select 
                            className="select-input" 
                            value={activeProject.foreignCurrency || 'USD'}
                            onChange={(e) => handleUpdateProjectField('foreignCurrency', e.target.value as any)}
                            disabled={activeProject.approvalStatus === 'approved'}
                            style={{ width: '100px', height: '36px' }}
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>적용 환율:</span>
                          <input 
                            type="number" 
                            className="input-text" 
                            value={activeProject.exchangeRate || 1350}
                            onChange={(e) => handleUpdateProjectField('exchangeRate', Number(e.target.value) || 1)}
                            disabled={activeProject.approvalStatus === 'approved'}
                            style={{ width: '100px', height: '36px', textAlign: 'right' }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>KRW 기준</span>
                        </div>
                      </div>
                    )}

                    <div style={{ flexGrow: 1 }} />

                    {/* 총괄 보정/할인 모드 드롭다운 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>총괄 요율 보정 모드:</span>
                      <select 
                        className="select-input" 
                        value={activeProject.totalCorrectionName || ''}
                        onChange={(e) => {
                          const name = e.target.value;
                          const preset = TOTAL_CORRECTION_PRESETS.find(p => p.name === name);
                          const rate = preset ? preset.rate : 0;
                          
                          handleUpdateProjectFields({
                            totalCorrectionName: name,
                            totalCorrectionRate: rate
                          });
                        }}
                        disabled={activeProject.approvalStatus === 'approved'}
                        style={{ width: '180px', height: '36px', fontWeight: '600' }}
                      >
                        <option value="">보정 없음 (표준가)</option>
                        {TOTAL_CORRECTION_PRESETS.map(p => (
                          <option key={p.name} value={p.name}>{p.name} ({p.rate * 100 > 0 ? `+${p.rate * 100}` : p.rate * 100}%)</option>
                        ))}
                      </select>

                      {/* 수동 조정 선택 시 인풋 활성화 */}
                      {activeProject.totalCorrectionName === '수동 금액 조정' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="number" 
                            className="input-text" 
                            placeholder="최종 청구 합계 입력"
                            value={customAmountInput}
                            onChange={(e) => setCustomAmountInput(e.target.value)}
                            disabled={activeProject.approvalStatus === 'approved'}
                            style={{ width: '160px', height: '36px', textAlign: 'right', fontWeight: '700', color: 'var(--color-blue)' }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {activeProject.useForeignCurrency ? '외화 기준' : '원화(공급가+세) 기준'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 섹션 및 테이블 그리드 에디터 루프 */}
                  {activeProject.sections.map(section => {
                    const isApproved = false;
                    
                    // 섹션별 소계 계산
                    let secSupply = 0;
                    let secVat = 0;
                    const isForeign = !!activeProject.useForeignCurrency;
                    
                    section.rows.forEach(r => {
                      if (r.isSelected) {
                        secSupply += r.supplyPrice;
                        secVat += isForeign ? 0 : r.vat;
                      }
                    });

                    return (
                      <div key={section.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                          <input 
                            type="text" 
                            value={section.name} 
                            onChange={(e) => {
                              const updatedSections = activeProject.sections.map(s => s.id === section.id ? { ...s, name: e.target.value } : s);
                              handleUpdateProjectField('sections', updatedSections);
                            }}
                            disabled={isApproved}
                            style={{ fontSize: '15px', fontWeight: '800', border: 'none', background: 'transparent', width: '70%', color: 'var(--text-primary)' }}
                          />
                          
                          {!isApproved && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleOpenLibraryModal(section.id)}>
                                + 항목 불러오기
                              </button>
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => {
                                if (confirm('이 섹션과 포함된 모든 항목을 삭제하시겠습니까?')) {
                                  const updatedSections = activeProject.sections.filter(s => s.id !== section.id);
                                  handleUpdateProjectField('sections', updatedSections);
                                }
                              }}>
                                삭제
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 섹션별 견적 품목 테이블 */}
                        <div className="table-container" style={{ overflowX: 'auto', width: '100%', borderRadius: '8px' }}>
                          <table className="estimate-table" style={{ minWidth: '980px', width: '100%', tableLayout: 'fixed' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid var(--border-color)', height: '36px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                <th style={{ width: '40px', textAlign: 'center' }}>선택</th>
                                <th style={{ width: '12%', textAlign: 'left' }}>등록 카테고리</th>
                                <th style={{ width: '30%', textAlign: 'left' }}>품명 및 규격</th>
                                <th style={{ width: '10%', textAlign: 'right' }}>인원/수량</th>
                                <th style={{ width: '10%', textAlign: 'right' }}>기간(일)</th>
                                <th style={{ width: '12%', textAlign: 'right' }}>수량 소계 (MD)</th>
                                <th style={{ width: '12%', textAlign: 'right' }}>단가</th>
                                <th style={{ width: '14%', textAlign: 'right' }}>공급가액</th>
                                <th style={{ width: '30px', textAlign: 'center' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.rows.map(row => (
                                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: row.isSelected ? 1 : 0.4 }}>
                                  {/* 선택 체크박스 */}
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 8px' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={!!row.isSelected} 
                                      onChange={(e) => handleUpdateRowField(section.id, row.id, 'isSelected', e.target.checked)}
                                      disabled={isApproved}
                                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-blue)', cursor: 'pointer' }}
                                    />
                                  </td>
                                  
                                  {/* 카테고리 */}
                                  <td style={{ verticalAlign: 'middle', padding: '12px 8px' }}>
                                    <span style={{ 
                                      fontSize: '11px', 
                                      fontWeight: '600', 
                                      color: 'var(--text-secondary)',
                                      backgroundColor: 'var(--bg-primary)',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)',
                                      display: 'inline-block',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {row.category}
                                    </span>
                                  </td>

                                  {/* 품명 및 등급/규격 */}
                                  <td style={{ verticalAlign: 'middle', padding: '12px 8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                      <input 
                                        type="text" 
                                        className="input-text" 
                                        value={row.name} 
                                        onChange={(e) => handleUpdateRowField(section.id, row.id, 'name', e.target.value)}
                                        disabled={isApproved}
                                        style={{ width: '100%', height: '32px', fontSize: '12px', fontWeight: '600', padding: '0 8px', borderRadius: '6px' }}
                                        placeholder="품명 입력"
                                      />
                                      {((row.category && (row.category.includes('인건비') || row.category.includes('용역'))) || row.formulaType === 'PEOPLE_x_DAYS_x_PRICE') ? (
                                        <select 
                                          className="select-input" 
                                          value={row.rank || '해당 없음'}
                                          onChange={(e) => handleUpdateRowField(section.id, row.id, 'rank', e.target.value)}
                                          disabled={isApproved}
                                          style={{ 
                                            width: '100%',
                                            height: '28px', 
                                            fontSize: '11px', 
                                            color: 'var(--color-blue)', 
                                            backgroundColor: 'var(--color-blue-light)', 
                                            border: '1px solid rgba(49, 130, 246, 0.2)',
                                            borderRadius: '4px',
                                            padding: '0 8px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                          }}
                                          title="등급 변경 시 단가가 표준 고시 배수로 자동 연산됩니다"
                                        >
                                          <option value="해당 없음">등급 미지정</option>
                                          <option value="L1 Support">L1 Support (x0.8)</option>
                                          <option value="L2 Operator">L2 Operator (x1.0)</option>
                                          <option value="L3 Specialist">L3 Specialist (x1.5)</option>
                                          <option value="L4 Lead">L4 Lead (x2.0)</option>
                                          <option value="L5 Director">L5 Director (x3.0)</option>
                                        </select>
                                      ) : (
                                        <input 
                                          type="text" 
                                          className="input-text" 
                                          placeholder="상세 규격 또는 설명 입력" 
                                          value={row.description || ''} 
                                          onChange={(e) => handleUpdateRowField(section.id, row.id, 'description', e.target.value)}
                                          disabled={isApproved}
                                          style={{ width: '100%', height: '26px', fontSize: '11px', color: 'var(--text-secondary)', padding: '0 8px', borderRadius: '4px' }}
                                        />
                                      )}
                                    </div>
                                  </td>

                                  {/* 인원 / 수량 수치 */}
                                  <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '12px 8px' }}>
                                    {row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? (
                                      <input 
                                        type="number" 
                                        className="input-text" 
                                        value={row.people || 1} 
                                        onChange={(e) => handleUpdateRowField(section.id, row.id, 'people', Number(e.target.value) || 0)}
                                        disabled={isApproved}
                                        style={{ width: '100%', height: '32px', textAlign: 'right', fontSize: '12px', padding: '0 8px', borderRadius: '6px' }}
                                      />
                                    ) : (
                                      <input 
                                        type="number" 
                                        className="input-text" 
                                        value={row.quantity} 
                                        onChange={(e) => handleUpdateRowField(section.id, row.id, 'quantity', Number(e.target.value) || 0)}
                                        disabled={isApproved}
                                        style={{ width: '100%', height: '32px', textAlign: 'right', fontSize: '12px', padding: '0 8px', borderRadius: '6px' }}
                                      />
                                    )}
                                  </td>

                                  {/* 기간(일) */}
                                  <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '12px 8px' }}>
                                    {row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? (
                                      <input 
                                        type="number" 
                                        className="input-text" 
                                        value={row.days || 1} 
                                        onChange={(e) => handleUpdateRowField(section.id, row.id, 'days', Number(e.target.value) || 0)}
                                        disabled={isApproved}
                                        style={{ width: '100%', height: '32px', textAlign: 'right', fontSize: '12px', padding: '0 8px', borderRadius: '6px' }}
                                      />
                                    ) : (
                                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', display: 'block', textAlign: 'right', paddingRight: '12px' }}>-</span>
                                    )}
                                  </td>

                                  {/* 수량 소계 */}
                                  <td style={{ textAlign: 'right', fontWeight: '700', paddingRight: '12px', whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 8px', fontSize: '12px', color: 'var(--text-primary)' }}>
                                    {row.quantity} {row.unit}
                                  </td>

                                  {/* 단가 */}
                                  <td style={{ verticalAlign: 'middle', padding: '12px 8px' }}>
                                    <input 
                                      type="number" 
                                      className="input-text" 
                                      value={row.price} 
                                      onChange={(e) => handleUpdateRowField(section.id, row.id, 'price', Number(e.target.value) || 0)}
                                      disabled={isApproved}
                                      style={{ width: '100%', height: '32px', textAlign: 'right', fontSize: '12px', fontWeight: '600', padding: '0 8px', borderRadius: '6px' }}
                                    />
                                  </td>

                                  {/* 공급가액 */}
                                  <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', paddingRight: '8px', verticalAlign: 'middle', padding: '12px 8px' }}>
                                    <span>₩{row.supplyPrice.toLocaleString()}</span>
                                  </td>

                                  {/* 삭제 버튼 */}
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 8px' }}>
                                    {!isApproved && (
                                      <button 
                                        type="button" 
                                        className="btn-icon-only text-danger" 
                                        onClick={() => handleDeleteRow(section.id, row.id)} 
                                        title="항목 삭제"
                                        style={{ 
                                          display: 'inline-flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center', 
                                          width: '24px', 
                                          height: '24px', 
                                          borderRadius: '4px', 
                                          border: 'none', 
                                          background: 'transparent', 
                                          cursor: 'pointer',
                                          padding: 0
                                        }}
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}

                              {/* 빈 행 추가 버튼 */}
                              {!isApproved && (
                                <tr>
                                  <td colSpan={9} style={{ padding: '8px 0' }}>
                                    <button 
                                      type="button" 
                                      className="btn btn-secondary btn-sm" 
                                      onClick={() => {
                                        const newRow: Omit<EstimateRow, 'supplyPrice' | 'vat' | 'totalPrice'> = {
                                          id: `row-${Date.now()}`,
                                          isSelected: true,
                                          category: categoriesList[0] || '인건비 기준 (용역 공수)',
                                          name: '새 항목',
                                          unit: 'MD',
                                          quantity: 1,
                                          price: 0,
                                          formulaType: 'QTY_x_PRICE',
                                          vatType: 'TAX'
                                        };
                                        const calculated = calculateRowAmounts(newRow);
                                        const fullRow = { ...newRow, ...calculated } as EstimateRow;
                                        const updatedSections = activeProject.sections.map(s => s.id === section.id ? { ...s, rows: [...s.rows, fullRow] } : s);
                                        handleUpdateProjectField('sections', updatedSections);
                                      }}
                                      style={{ width: '100%', height: '32px', borderStyle: 'dashed' }}
                                    >
                                      + 직접 새 품목 행 추가
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* 섹션별 누적 소계 요약 피드백 */}
                        <div className="section-footer-summary" style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '24px',
                          padding: '14px 20px',
                          backgroundColor: '#f8fafc',
                          borderTop: '1px solid var(--border-color)',
                          borderBottomLeftRadius: '8px',
                          borderBottomRightRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--text-secondary)',
                          marginTop: '-16px' // 테이블 컨테이너와의 갭 조절
                        }}>
                          <div>
                            공급가액 소계: <span style={{ color: 'var(--text-primary)', fontWeight: '700', marginLeft: '6px' }}>
                              ₩{secSupply.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            부가세 소계: <span style={{ color: 'var(--text-primary)', fontWeight: '700', marginLeft: '6px' }}>
                              ₩{secVat.toLocaleString()}
                            </span>
                          </div>
                          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                            섹션 합계 금액: <span style={{ color: 'var(--color-blue)', fontWeight: '800', marginLeft: '6px', fontSize: '14px' }}>
                              ₩{(secSupply + secVat).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 새 섹션 추가 대형 버튼 */}
                  {activeProject.approvalStatus !== 'approved' && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => {
                        const newSec: EstimateSection = {
                          id: `sec-${Date.now()}`,
                          name: '새 구분 섹션',
                          rows: []
                        };
                        handleUpdateProjectField('sections', [...activeProject.sections, newSec]);
                      }}
                      style={{ height: '44px', borderStyle: 'dashed', fontWeight: '700' }}
                    >
                      + 신규 구분 섹션 추가
                    </button>
                  )}

                    {/* 비고 및 거래 특약 사항 단독 카드 */}
                    <div className="card">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: '700' }}>비고 및 거래 특약 사항</label>
                        <textarea 
                          className="input-text" 
                          value={activeProject.remarks || ''} 
                          onChange={(e) => handleUpdateProjectField('remarks', e.target.value)}
                          disabled={activeProject.approvalStatus === 'approved'}
                          style={{ minHeight: '120px', fontSize: '12px', lineHeight: '1.6', width: '100%', resize: 'none' }}
                          placeholder="예: 대금 지급 조건, 계약 유효기간 등"
                        />
                      </div>
                    </div>
                  </div> {/* 좌측 폼 영역 닫힘 */}

                  {/* 우측 견적 요약 사이드 패널 */}
                  <div className="editor-aside">
                    <div className="summary-panel">
                      <div className="summary-title">실시간 견적 요약</div>
                      
                      <div className="summary-row">
                        <span>선택 품목 수:</span>
                        <span>
                          {activeProject.sections.reduce((acc, sec) => acc + sec.rows.filter(r => r.isSelected).length, 0)}개
                        </span>
                      </div>

                      {projectSummary.totalCorrectionRate !== 0 ? (
                        <>
                          <div className="summary-row">
                            <span>공급가액 소계:</span>
                            <span>₩{projectSummary.supplyTotal.toLocaleString()}</span>
                          </div>

                          <div className="summary-row">
                            <span>부가세 소계:</span>
                            <span>₩{projectSummary.vatTotal.toLocaleString()}</span>
                          </div>

                          <div className="summary-row" style={{ color: projectSummary.totalCorrectionRate > 0 ? 'var(--color-blue)' : '#e65100', fontWeight: '500' }}>
                            <span>
                              {projectSummary.totalCorrectionName || (projectSummary.totalCorrectionRate > 0 ? '총괄 할증' : '총괄 할인')}
                              {` (${(projectSummary.totalCorrectionRate * 100).toFixed(2)}%)`}
                            </span>
                            <span>
                              {projectSummary.totalCorrectionAmount > 0 ? '+' : ''}
                              ₩{projectSummary.totalCorrectionAmount.toLocaleString()}
                            </span>
                          </div>

                          <div className="summary-row" style={{ color: projectSummary.totalCorrectionRate > 0 ? 'var(--color-blue)' : '#e65100', fontSize: '12px', paddingLeft: '8px' }}>
                            <span>ㄴ 부가세 변동액:</span>
                            <span>
                              {((projectSummary.finalVatTotal ?? 0) - projectSummary.vatTotal) > 0 ? '+' : ''}
                              ₩{((projectSummary.finalVatTotal ?? 0) - projectSummary.vatTotal).toLocaleString()}
                            </span>
                          </div>

                          {activeProject.useForeignCurrency && activeProject.exchangeRate ? (
                            <>
                              <div className="summary-row total">
                                <span>최종 합계 ({activeProject.foreignCurrency})</span>
                                <span style={{ color: 'var(--color-blue)', fontSize: '18px', fontWeight: '800' }}>
                                  {activeProject.foreignCurrency === 'USD' ? '$' : 
                                   activeProject.foreignCurrency === 'EUR' ? '€' : 
                                   activeProject.foreignCurrency === 'JPY' ? '¥' : 
                                   activeProject.foreignCurrency === 'CNY' ? '¥' : ''}
                                  {((projectSummary.finalGrandTotal ?? projectSummary.grandTotal) / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '-8px', marginBottom: '8px', fontWeight: '500' }}>
                                원화 환산: ₩{(projectSummary.finalGrandTotal ?? projectSummary.grandTotal).toLocaleString()}
                              </div>
                            </>
                          ) : (
                            <div className="summary-row total">
                              <span>최종 합계 금액</span>
                              <span>₩{(projectSummary.finalGrandTotal ?? projectSummary.grandTotal).toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="summary-row">
                            <span>총 공급가액:</span>
                            <span>₩{projectSummary.supplyTotal.toLocaleString()}</span>
                          </div>

                          <div className="summary-row">
                            <span>총 부가세액:</span>
                            <span>₩{projectSummary.vatTotal.toLocaleString()}</span>
                          </div>

                          {activeProject.useForeignCurrency && activeProject.exchangeRate ? (
                            <>
                              <div className="summary-row total">
                                <span>최종 합계 ({activeProject.foreignCurrency})</span>
                                <span style={{ color: 'var(--color-blue)', fontSize: '18px', fontWeight: '800' }}>
                                  {activeProject.foreignCurrency === 'USD' ? '$' : 
                                   activeProject.foreignCurrency === 'EUR' ? '€' : 
                                   activeProject.foreignCurrency === 'JPY' ? '¥' : 
                                   activeProject.foreignCurrency === 'CNY' ? '¥' : ''}
                                  {(projectSummary.grandTotal / activeProject.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '-8px', marginBottom: '8px', fontWeight: '500' }}>
                                원화 환산: ₩{projectSummary.grandTotal.toLocaleString()}
                              </div>
                            </>
                          ) : (
                            <div className="summary-row total">
                              <span>최종 합계 금액</span>
                              <span>₩{projectSummary.grandTotal.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="summary-panel" style={{ backgroundColor: 'var(--color-blue-light)', borderColor: 'rgba(49,130,246,0.2)' }}>
                      <div className="summary-title" style={{ color: 'var(--color-blue)', borderBottomColor: 'rgba(49,130,246,0.1)' }}>발행 상태</div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                        현재 문서는 초안 상태입니다. 발행 미리보기를 통해 스타일을 확인하고 정식 문서를 발행하십시오.
                      </p>
                      <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setIsPreviewModalOpen(true)}>
                        <Printer size={16} /> 정식 견적서 인쇄
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // (2) WBS 일정 및 투입 리소스 설계 화면 (WbsEditor 연동)
                <WbsEditor 
                  wbs={activeProject.wbs || []} 
                  availableRoles={['기획/PM', 'UI/UX 디자인', '프론트엔드 개발', '백엔드 개발', 'QA/품질검증', '기타']}
                  onChange={(newWbs) => handleUpdateProjectField('wbs', newWbs)} 
                  onSyncToEstimate={handleSyncWbsToEstimate}
                />
              )}
            </>
          )}
        </>
      )}

      {/* --- 견적 생성 템플릿 선택 모달 --- */}
      {isFormSelectModalOpen && (
        <TemplateSelectModal 
          isOpen={isFormSelectModalOpen} 
          onClose={() => setIsFormSelectModalOpen(false)} 
          onCreate={handleCreateNewProject}
        />
      )}

      {/* --- 스마트 항목 가져오기 모달 --- */}
      {isLibraryModalOpen && (
        <LibraryImportModal 
          isOpen={isLibraryModalOpen} 
          onClose={() => setIsLibraryModalOpen(false)} 
          libraryItems={libraryItems} 
          onImport={handleImportSelectedItems}
        />
      )}



      {/* --- 인쇄/미리보기 모달 --- */}
      {isPreviewModalOpen && activeProject && (
        <EstimatePreviewModal 
          isOpen={isPreviewModalOpen} 
          onClose={() => setIsPreviewModalOpen(false)} 
          activeProject={activeProject} 
          projectSummary={projectSummary}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}
