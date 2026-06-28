import { useState } from 'react';
import type { EstimateProject } from '../types/estimate';
import { X, Copy, ChevronRight } from 'lucide-react';

interface ImportProjectSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: EstimateProject[];
  currentProjectId: string;
  onImport: (targetProjectId: string, sectionIds: string[], importWbs: boolean) => Promise<void>;
}

export default function ImportProjectSectionsModal({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onImport
}: ImportProjectSectionsModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [importWbs, setImportWbs] = useState<boolean>(true);

  if (!isOpen) return null;

  // 현재 편집 중인 프로젝트는 대상 목록에서 제외
  const targetProjects = projects.filter(p => p.id !== currentProjectId);
  const activeTargetProject = projects.find(p => p.id === selectedTargetId);

  const handleSelectProject = (id: string) => {
    setSelectedTargetId(id);
    setSelectedSectionIds([]); // 프로젝트 변경 시 섹션 초기화
  };

  const handleToggleSection = (id: string) => {
    if (selectedSectionIds.includes(id)) {
      setSelectedSectionIds(selectedSectionIds.filter(sId => sId !== id));
    } else {
      setSelectedSectionIds([...selectedSectionIds, id]);
    }
  };

  const handleToggleAllSections = () => {
    if (!activeTargetProject) return;
    if (selectedSectionIds.length === activeTargetProject.sections.length) {
      setSelectedSectionIds([]);
    } else {
      setSelectedSectionIds(activeTargetProject.sections.map(s => s.id));
    }
  };

  const handleImportClick = async () => {
    if (!selectedTargetId || selectedSectionIds.length === 0) return;
    try {
      await onImport(selectedTargetId, selectedSectionIds, importWbs);
      alert('선택하신 섹션 및 WBS 상세 일정이 성공적으로 병합 복제되었습니다!');
      onClose();
    } catch (e) {
      console.error(e);
      alert('병합 중 알 수 없는 오류가 발생했습니다.');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-container" style={{ width: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={20} style={{ color: 'var(--color-blue)' }} />
            <h2 className="modal-title">다른 견적서 불러오기 (섹션 & WBS 병합)</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="modal-body" style={{ display: 'flex', gap: '20px', padding: '20px', overflow: 'hidden', flexGrow: 1 }}>
          
          {/* 좌측: 견적서 목록 */}
          <div style={{ width: '48%', borderRight: '1px solid var(--border-color)', paddingRight: '16px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px' }}>1. 가져올 대상 견적서 선택</h3>
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px' }}>
              {targetProjects.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                  가져올 수 있는 다른 견적서가 없습니다.
                </div>
              ) : (
                targetProjects.map(proj => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => handleSelectProject(proj.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: proj.id === selectedTargetId ? '1px solid var(--color-blue)' : '1px solid var(--border-color)',
                      backgroundColor: proj.id === selectedTargetId ? 'var(--color-blue-light)' : '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ flexGrow: 1, paddingRight: '12px' }}>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: '700', 
                        color: proj.id === selectedTargetId ? 'var(--color-blue)' : 'var(--text-primary)', 
                        whiteSpace: 'normal', 
                        wordBreak: 'break-all',
                        lineHeight: '1.4'
                      }}>
                        {proj.title}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        {proj.clientName} | {proj.estimateDate}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: proj.id === selectedTargetId ? 'var(--color-blue)' : 'var(--text-tertiary)' }} />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 우측: 선택한 견적서 내 섹션 목록 */}
          <div style={{ width: '52%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px' }}>2. 가져올 구분 섹션 선택</h3>
            
            {!selectedTargetId ? (
              <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-tertiary)', fontSize: '12px', height: '300px' }}>
                좌측에서 가져올 원본 견적서를 먼저 선택해 주세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                
                {/* 전체 선택 바 */}
                {activeTargetProject && activeTargetProject.sections.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '10px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input 
                        type="checkbox"
                        checked={selectedSectionIds.length === activeTargetProject.sections.length}
                        onChange={handleToggleAllSections}
                        style={{ accentColor: 'var(--color-blue)' }}
                      />
                      전체 선택 ({selectedSectionIds.length}/{activeTargetProject.sections.length})
                    </label>
                  </div>
                )}

                {/* 섹션 카드 리스트 */}
                <div style={{ overflowY: 'auto', flexGrow: 1, maxHeight: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeTargetProject?.sections.map(sec => {
                    const isChecked = selectedSectionIds.includes(sec.id);
                    return (
                      <div
                        key={sec.id}
                        onClick={() => handleToggleSection(sec.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          border: isChecked ? '1px solid var(--color-blue)' : '1px solid var(--border-color)',
                          backgroundColor: isChecked ? 'var(--color-blue-light)' : '#ffffff',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // 부모 div 클릭 시 변경되도록 처리
                          style={{ accentColor: 'var(--color-blue)' }}
                        />
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {sec.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            내부 품목 수: {sec.rows.length}개
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* WBS 연동 여부 체크박스 */}
                {activeTargetProject && activeTargetProject.wbs && activeTargetProject.wbs.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#eff6ff', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox"
                      id="importWbsCheckbox"
                      checked={importWbs}
                      onChange={(e) => setImportWbs(e.target.checked)}
                      style={{ accentColor: 'var(--color-blue)', cursor: 'pointer' }}
                    />
                    <label htmlFor="importWbsCheckbox" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-blue)', cursor: 'pointer' }}>
                      📋 대상 견적서의 WBS 상세 작업 내역도 함께 가져오기 (권장)
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            disabled={!selectedTargetId || selectedSectionIds.length === 0}
            onClick={handleImportClick}
          >
            선택한 섹션 가져오기
          </button>
        </div>

      </div>
    </div>
  );
}
