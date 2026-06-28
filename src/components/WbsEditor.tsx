import React from 'react';
import { Trash2, Plus, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import type { WbsCategory, WbsTask } from '../types/estimate';
import GanttChart from './GanttChart';

interface WbsEditorProps {
  wbs: WbsCategory[];
  availableRoles: string[];
  onChange: (updatedWbs: WbsCategory[]) => void;
  onSyncToEstimate: () => void;
}

export const WbsEditor: React.FC<WbsEditorProps> = ({ wbs, availableRoles, onChange, onSyncToEstimate }) => {
  const [activeDropdownTaskId, setActiveDropdownTaskId] = React.useState<string | null>(null);
  const [justAddedTaskId, setJustAddedTaskId] = React.useState<string | null>(null);

  // 신설 행으로 포커스를 스무스하게 옮겨주는 스프레드시트 감성 레이아웃 이펙트
  React.useLayoutEffect(() => {
    if (justAddedTaskId) {
      const el = document.getElementById(`task-name-${justAddedTaskId}`) as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        // 텍스트 캐럿을 맨 뒤로 이동
        el.setSelectionRange(el.value.length, el.value.length);
      }
      setJustAddedTaskId(null);
    }
  }, [justAddedTaskId]);

  // 중분류 작업 명칭 인풋 내 단축키 제어 핸들러 (Enter: 바로 아래 세부 추가, Alt+Enter: 안에서 두줄)
  const handleKeyDownOnTaskName = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    catId: string,
    taskIdx: number
  ) => {
    // 단독 Enter 키 입력 시에만 기본 줄바꿈을 막고 '세부 작업 행 바로 밑에 추가' 발동
    if (e.key === 'Enter' && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      
      const nextTaskId = `task_${Date.now()}_next`;
      const updated = wbs.map(cat => {
        if (cat.id === catId) {
          const newTask: WbsTask = {
            id: nextTaskId,
            name: '',
            details: [],
            status: '',
            manpower: 1,
            md: 1,
            role: '해당없음'
          };
          const newTasks = [...cat.tasks];
          // 사용자가 엔터를 친 바로 아래 위치에 행을 정확히 Splice 삽입해주는 스프레드시트 감성 이식
          newTasks.splice(taskIdx + 1, 0, newTask);
          return { ...cat, tasks: newTasks };
        }
        return cat;
      });
      
      onChange(updated);
      setJustAddedTaskId(nextTaskId);
    }
  };

  // 다중 역할군 토글 제어 핸들러 (하위 호환성을 위해 단일 role도 동시 갱신)
  const handleToggleRole = (catId: string, taskId: string, roleOpt: string) => {
    const updated = wbs.map(cat => {
      if (cat.id === catId) {
        const updatedTasks = cat.tasks.map(t => {
          if (t.id === taskId) {
            let currentRoles = t.roles ? [...t.roles] : [t.role];
            
            if (roleOpt === '해당없음') {
              currentRoles = ['해당없음'];
            } else {
              currentRoles = currentRoles.filter(r => r !== '해당없음');
              if (currentRoles.includes(roleOpt)) {
                currentRoles = currentRoles.filter(r => r !== roleOpt);
                if (currentRoles.length === 0) {
                  currentRoles = ['해당없음'];
                }
              } else {
                currentRoles = [...currentRoles, roleOpt];
              }
            }
            
            return {
              ...t,
              role: currentRoles[0] || '해당없음',
              roles: currentRoles
            };
          }
          return t;
        });
        return { ...cat, tasks: updatedTasks };
      }
      return cat;
    });
    onChange(updated);
  };

  // 역할 뱃지 리스트 렌더러
  const renderRolesBadges = (roles: WbsTask['role'][] = []) => {
    if (roles.length === 0 || roles.includes('해당없음')) {
      return <span style={{ color: '#9ca3af', fontSize: '12px' }}>선택 안함</span>;
    }
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
        {roles.map(r => {
          const badgeStyle = getRoleBadgeStyle(r);
          return (
            <span key={r} className="wbs-role-badge" style={badgeStyle}>
              {r}
            </span>
          );
        })}
      </div>
    );
  };

  // 다중 역할 트리거 스타일 헬퍼
  const getMultiRoleTriggerStyle = (roles: WbsTask['role'][] = []) => {
    if (roles.length === 0 || roles.includes('해당없음')) {
      return { borderColor: 'var(--border-color)', backgroundColor: '#fafafa' };
    }
    return { 
      borderColor: 'rgba(49, 130, 246, 0.4)', 
      backgroundColor: '#ffffff', 
      boxShadow: '0 1px 2px rgba(49, 130, 246, 0.05)' 
    };
  };

  // 대분류(항목) 추가
  const handleAddCategory = () => {
    const newCategory: WbsCategory = {
      id: `cat_${Date.now()}`,
      no: wbs.length + 1,
      title: '',
      tasks: [
        {
          id: `task_${Date.now()}_1`,
          name: '',
          details: [],
          status: '',
          manpower: 1,
          md: 1,
          role: '해당없음'
        }
      ]
    };
    onChange([...wbs, newCategory]);
  };

  // 대분류 타이틀 변경
  const handleUpdateCategoryTitle = (catId: string, title: string) => {
    const updated = wbs.map(cat => (cat.id === catId ? { ...cat, title } : cat));
    onChange(updated);
  };

  // 대분류 삭제
  const handleDeleteCategory = (catId: string) => {
    const targetCat = wbs.find(cat => cat.id === catId);
    const catTitle = targetCat?.title ? `"${targetCat.title}"` : '선택한 대분류';
    if (!confirm(`${catTitle} 항목과 포함된 모든 하위 세부 작업들이 일괄 삭제됩니다.\n정말 삭제하시겠습니까?`)) {
      return;
    }
    const filtered = wbs.filter(cat => cat.id !== catId);
    // 순서 재번호 부여
    const updated = filtered.map((cat, idx) => ({ ...cat, no: idx + 1 }));
    onChange(updated);
  };

  // 대분류 위로 이동
  const handleMoveUpCategory = (index: number) => {
    if (index === 0) return;
    const newWbs = [...wbs];
    const temp = newWbs[index];
    newWbs[index] = newWbs[index - 1];
    newWbs[index - 1] = temp;
    
    // 순서(no) 갱신
    const updated = newWbs.map((cat, idx) => ({ ...cat, no: idx + 1 }));
    onChange(updated);
  };

  // 대분류 아래로 이동
  const handleMoveDownCategory = (index: number) => {
    if (index === wbs.length - 1) return;
    const newWbs = [...wbs];
    const temp = newWbs[index];
    newWbs[index] = newWbs[index + 1];
    newWbs[index + 1] = temp;

    // 순서(no) 갱신
    const updated = newWbs.map((cat, idx) => ({ ...cat, no: idx + 1 }));
    onChange(updated);
  };

  // 중분류(세부 작업) 추가
  const handleAddTask = (catId: string) => {
    const updated = wbs.map(cat => {
      if (cat.id === catId) {
        const newTask: WbsTask = {
          id: `task_${Date.now()}_${cat.tasks.length + 1}`,
          name: '',
          details: [],
          status: '',
          manpower: 1,
          md: 1,
          role: '해당없음'
        };
        return { ...cat, tasks: [...cat.tasks, newTask] };
      }
      return cat;
    });
    onChange(updated);
  };

  // 세부 작업 필드 수정
  const handleUpdateTaskField = (
    catId: string,
    taskId: string,
    field: keyof WbsTask,
    value: any
  ) => {
    const updated = wbs.map(cat => {
      if (cat.id === catId) {
        const updatedTasks = cat.tasks.map(t =>
          t.id === taskId ? { ...t, [field]: value } : t
        );
        return { ...cat, tasks: updatedTasks };
      }
      return cat;
    });
    onChange(updated);
  };

  // 세부 작업 상세 내역 줄바꿈 파싱
  const handleUpdateTaskDetails = (catId: string, taskId: string, text: string) => {
    // 입력 중에는 엔터(줄바꿈)가 즉시 반영되도록 빈 행 필터링을 완전히 제거합니다
    const details = text.split('\n');
    handleUpdateTaskField(catId, taskId, 'details', details);
  };

  // 세부 작업 삭제
  const handleDeleteTask = (catId: string, taskId: string) => {
    const updated = wbs.map(cat => {
      if (cat.id === catId) {
        // 최소 1개는 유지하거나, 비워둘 수 있음
        const filteredTasks = cat.tasks.filter(t => t.id !== taskId);
        return { ...cat, tasks: filteredTasks };
      }
      return cat;
    });
    onChange(updated);
  };

  // 역할 뱃지 스타일 매핑
  const getRoleBadgeStyle = (role: string) => {
    const normalized = role.replace(/\s+/g, '').toLowerCase();
    if (normalized.includes('pm') || normalized.includes('기획')) {
      return { color: '#8b5cf6', backgroundColor: '#f5f3ff', border: '1px solid rgba(139, 92, 246, 0.2)' };
    }
    if (normalized.includes('디자이너') || normalized.includes('디자인')) {
      return { color: '#0d9488', backgroundColor: '#f0fdfa', border: '1px solid rgba(13, 148, 136, 0.2)' };
    }
    if (normalized.includes('프론트') || normalized.includes('fe')) {
      return { color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid rgba(37, 99, 235, 0.2)' };
    }
    if (normalized.includes('백엔드') || normalized.includes('be')) {
      return { color: '#ea580c', backgroundColor: '#fff7ed', border: '1px solid rgba(234, 88, 12, 0.2)' };
    }
    if (normalized.includes('qa') || normalized.includes('테스터') || normalized.includes('품질') || normalized.includes('검증')) {
      return { color: '#db2777', backgroundColor: '#fdf2f8', border: '1px solid rgba(219, 39, 119, 0.2)' };
    }
    return { color: '#6b7280', backgroundColor: '#f9fafb', border: '1px solid rgba(107, 114, 128, 0.2)' };
  };

  // 드롭다운 drop-up 판단을 위한 총 태스크 수 계산
  let globalTaskCount = 0;
  wbs.forEach(cat => {
    globalTaskCount += cat.tasks.length;
  });
  let currentGlobalIdx = 0;

  return (
    <div className="wbs-editor-container">
      {/* 전용 CSS 스타일 태그 내장으로 스타일 모듈화 및 시각 디자인 완성 */}
      <style>{`
        .wbs-editor-container {
          background-color: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          margin-top: 16px;
        }

        .wbs-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }

        .wbs-header-info h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px 0;
        }

        .wbs-header-info p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }

        .wbs-actions {
          display: flex;
          gap: 12px;
        }

        .wbs-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .wbs-table th {
          background-color: var(--bg-secondary);
          color: var(--text-secondary);
          font-weight: 600;
          padding: 12px 14px;
          border-bottom: 2px solid var(--border-color);
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .wbs-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-color);
          vertical-align: top;
          background-color: #ffffff;
        }

        .wbs-table tr:hover td {
          background-color: #fcfdfe;
        }

        .wbs-input-text {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          font-size: 13px;
          outline: none;
          transition: all 0.15s ease;
          background-color: #fafafa;
        }

        .wbs-input-text:focus {
          border-color: var(--color-blue);
          background-color: #ffffff;
          box-shadow: 0 0 0 2px rgba(49, 130, 246, 0.12);
        }

        .wbs-textarea-details {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.5;
          outline: none;
          resize: vertical;
          min-height: 70px;
          transition: all 0.15s ease;
          background-color: #fafafa;
          font-family: inherit;
        }

        .wbs-textarea-details:focus {
          border-color: var(--color-blue);
          background-color: #ffffff;
          box-shadow: 0 0 0 2px rgba(49, 130, 246, 0.12);
        }

        .wbs-select-role {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 6px;
          font-size: 12px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .wbs-input-num {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 4px;
          font-size: 13px;
          text-align: center;
          outline: none;
        }

        .wbs-input-num::-webkit-outer-spin-button,
        .wbs-input-num::-webkit-inner-spin-button {
          -webkit-appearance: default;
          opacity: 0.7;
        }

        .wbs-cat-cell {
          background-color: #fdfdfd;
          font-weight: 600;
        }

        .wbs-cat-header-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          margin-top: 8px;
        }

        .wbs-btn-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }

        .wbs-btn-circle:hover {
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }

        .wbs-task-action-row {
          display: flex;
          gap: 6px;
          justify-content: center;
        }

        .badge-status-completed {
          background-color: #ecfdf5;
          color: #059669;
          border: 1px solid rgba(5, 150, 105, 0.2);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .badge-status-progress {
          background-color: #eff6ff;
          color: #2563eb;
          border: 1px solid rgba(37, 99, 235, 0.2);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .badge-status-planned {
          background-color: #fffbeb;
          color: #d97706;
          border: 1px solid rgba(217, 119, 6, 0.2);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .wbs-empty-state {
          text-align: center;
          padding: 48px;
          color: var(--text-tertiary);
          font-size: 14px;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-md);
          background-color: var(--bg-secondary);
        }

        .btn-sync-wbs {
          background-color: #4f46e5;
          color: #ffffff;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06);
          transition: all 0.2s ease;
        }

        .btn-sync-wbs:hover {
          background-color: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2), 0 4px 6px -2px rgba(79, 70, 229, 0.12);
        }

        .btn-sync-wbs:active {
          transform: translateY(0);
        }

        .wbs-btn-add-cat {
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .wbs-btn-add-cat:hover {
          background-color: var(--bg-secondary);
          border-color: var(--text-secondary);
        }

        /* 프리미엄 커스텀 멀티셀렉트 스타일 */
        .wbs-multi-select-container {
          position: relative;
          width: 100%;
        }

        .wbs-multi-select-trigger {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          min-height: 32px;
          box-sizing: border-box;
        }

        .wbs-multi-select-trigger:hover {
          border-color: var(--text-secondary);
          background-color: #ffffff;
        }

        .wbs-multi-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          width: 160px;
          background-color: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 8px;
          z-index: 999;
          margin-top: 4px;
          box-sizing: border-box;
          max-height: 240px;
          overflow-y: auto;
        }

        .wbs-multi-select-dropdown.drop-up {
          top: auto;
          bottom: 100%;
          margin-top: 0;
          margin-bottom: 4px;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.12);
        }

        .wbs-multi-select-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: background-color 0.15s ease;
          user-select: none;
          margin-bottom: 2px;
        }

        .wbs-multi-select-option:hover {
          background-color: var(--bg-secondary);
          color: var(--text-primary);
        }

        .wbs-multi-select-option input[type="checkbox"] {
          cursor: pointer;
          margin: 0;
        }

        .wbs-multi-select-footer {
          border-top: 1px solid var(--border-color);
          margin-top: 6px;
          padding-top: 6px;
        }

        .wbs-role-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          white-space: nowrap;
        }
      `}</style>

      <div className="wbs-header-row">
        <div className="wbs-header-info">
          <h3>업무 범위 및 투입 계획 (WBS)</h3>
          <p>상세 업무 내역을 계층적으로 작성하고, 투입 인력 및 일수(MD)를 역할군과 연결하여 견적서 인건비에 반영할 수 있습니다.</p>
        </div>
        <div className="wbs-actions">
          <button type="button" className="wbs-btn-add-cat" onClick={handleAddCategory}>
            <Plus size={15} /> 대분류 항목 추가
          </button>
          {wbs.length > 0 && (
            <button type="button" className="btn-sync-wbs" onClick={onSyncToEstimate} title="WBS에 작성된 역할군별 총 공수를 견적서 테이블 인건비 MD 수량에 실시간 동기화합니다">
              <RefreshCw size={15} /> WBS 공수를 견적서에 반영하기
            </button>
          )}
        </div>
      </div>

      {wbs.length === 0 ? (
        <div className="wbs-empty-state">
          <p style={{ margin: '0 0 14px 0' }}>작성된 업무목록이 없습니다.</p>
          <button type="button" className="btn btn-primary" onClick={handleAddCategory}>
            <Plus size={14} /> WBS 작성 시작하기
          </button>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto', width: '100%', paddingBottom: '160px' }}>
          <table className="wbs-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>No.</th>
                <th style={{ width: '220px' }}>항목 (대분류)</th>
                <th style={{ width: '220px' }}>작업내용 (중분류)</th>
                <th>상세 세부내역 (줄바꿈 입력)</th>
                <th style={{ width: '125px' }}>역할군 연동</th>
                <th style={{ width: '105px', textAlign: 'center' }}>투입인력</th>
                <th style={{ width: '105px', textAlign: 'center' }}>투입일수</th>
                <th style={{ width: '75px', textAlign: 'center' }}>작업 관리</th>
              </tr>
            </thead>
            <tbody>
              {wbs.flatMap((cat, catIdx) => {
                const totalTasks = cat.tasks.length;
                
                // 해당 대분류 아래 세부 작업이 하나도 없는 특이 예외 케이스 처리
                if (totalTasks === 0) {
                  return (
                    <tr key={cat.id}>
                      <td className="wbs-cat-cell" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div>{cat.no}</div>
                        <div className="wbs-cat-header-actions">
                          <button type="button" className="wbs-btn-circle" onClick={() => handleMoveUpCategory(catIdx)} title="위로 이동">
                            <ArrowUp size={11} />
                          </button>
                          <button type="button" className="wbs-btn-circle" onClick={() => handleMoveDownCategory(catIdx)} title="아래로 이동">
                            <ArrowDown size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="wbs-cat-cell">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input 
                            type="text"
                            className="wbs-input-text"
                            style={{ fontWeight: '600' }}
                            value={cat.title}
                            onChange={(e) => handleUpdateCategoryTitle(cat.id, e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleAddTask(cat.id)}>
                              <Plus size={10} /> 세부 추가
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-xs" 
                              style={{ 
                                padding: '2.5px 6px', 
                                color: '#9ca3af', 
                                borderColor: '#e5e7eb', 
                                backgroundColor: '#fafafa',
                                transition: 'all 0.15s ease'
                              }} 
                              onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--color-red)';
                                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                                  e.currentTarget.style.backgroundColor = '#fff5f5';
                              }}
                              onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#9ca3af';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                  e.currentTarget.style.backgroundColor = '#fafafa';
                              }}
                              onClick={() => handleDeleteCategory(cat.id)}
                            >
                              대분류 삭제
                            </button>
                          </div>
                        </div>
                      </td>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)', verticalAlign: 'middle', padding: '16px 0' }}>
                        등록된 세부 작업내용이 없습니다. '세부 추가' 버튼을 눌러 작업을 추가하세요.
                      </td>
                    </tr>
                  );
                }

                // 정상적으로 세부작업이 있는 경우, 첫 번째 세부작업과 나머지 세부작업을 계층형 rowSpan 병합 렌더링
                return cat.tasks.map((task, taskIdx) => {
                  const isFirst = taskIdx === 0;
                  
                  return (
                    <tr key={task.id}>
                      {/* 대분류 순서(No.) 셀 - 첫 번째 세부작업에서만 렌더링 후 rowSpan 적용 */}
                      {isFirst && (
                        <td 
                          rowSpan={totalTasks} 
                          className="wbs-cat-cell" 
                          style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border-color)' }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{cat.no}</span>
                          <div className="wbs-cat-header-actions">
                            <button 
                              type="button" 
                              className="wbs-btn-circle" 
                              onClick={() => handleMoveUpCategory(catIdx)} 
                              disabled={catIdx === 0}
                              style={{ opacity: catIdx === 0 ? 0.4 : 1, cursor: catIdx === 0 ? 'not-allowed' : 'pointer' }}
                              title="위로 이동"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button 
                              type="button" 
                              className="wbs-btn-circle" 
                              onClick={() => handleMoveDownCategory(catIdx)} 
                              disabled={catIdx === wbs.length - 1}
                              style={{ opacity: catIdx === wbs.length - 1 ? 0.4 : 1, cursor: catIdx === wbs.length - 1 ? 'not-allowed' : 'pointer' }}
                              title="아래로 이동"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>
                        </td>
                      )}

                      {/* 대분류 항목명 셀 - 첫 번째 세부작업에서만 렌더링 후 rowSpan 적용 */}
                      {isFirst && (
                        <td 
                          rowSpan={totalTasks} 
                          className="wbs-cat-cell"
                          style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-color)' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input 
                              type="text"
                              className="wbs-input-text"
                              style={{ fontWeight: '700', fontSize: '13px', borderLeft: '3px solid var(--color-blue)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}
                              value={cat.title}
                              onChange={(e) => handleUpdateCategoryTitle(cat.id, e.target.value)}
                              onFocus={(e) => {
                                if (e.target.value === '새로운 대분류 항목') {
                                  handleUpdateCategoryTitle(cat.id, '');
                                }
                              }}
                              placeholder="대분류 항목명을 입력하세요"
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button type="button" className="btn btn-secondary btn-xs" style={{ padding: '2px 6px' }} onClick={() => handleAddTask(cat.id)}>
                                <Plus size={10} /> 세부 추가
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-xs" 
                                style={{ 
                                  padding: '2.5px 6px', 
                                  color: '#9ca3af', 
                                  borderColor: '#e5e7eb', 
                                  backgroundColor: '#fafafa',
                                  transition: 'all 0.15s ease'
                                }} 
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--color-red)';
                                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                                  e.currentTarget.style.backgroundColor = '#fff5f5';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#9ca3af';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                  e.currentTarget.style.backgroundColor = '#fafafa';
                                }}
                                onClick={() => handleDeleteCategory(cat.id)}
                              >
                                대분류 삭제
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* 중분류 작업내용 */}
                      <td>
                        <textarea 
                          id={`task-name-${task.id}`}
                          className="wbs-input-text"
                          style={{ 
                            resize: 'none', 
                            minHeight: '34px', 
                            height: 'auto', 
                            fontFamily: 'inherit', 
                            lineHeight: '1.4', 
                            verticalAlign: 'middle',
                            overflowY: 'hidden'
                          }}
                          rows={task.name.split('\n').length || 1}
                          value={task.name}
                          onChange={(e) => handleUpdateTaskField(cat.id, task.id, 'name', e.target.value)}
                          onKeyDown={(e) => handleKeyDownOnTaskName(e, cat.id, taskIdx)}
                          onFocus={(e) => {
                            if (e.target.value === '새로운 세부 작업내용') {
                              handleUpdateTaskField(cat.id, task.id, 'name', '');
                            }
                          }}
                          placeholder="작업 명칭을 기입하세요 (Alt+Enter: 줄바꿈, Enter: 아래에 행 추가)"
                        />
                      </td>

                      {/* 상세 세부내역 (줄바꿈 입력) */}
                      <td>
                        <textarea
                          className="wbs-textarea-details"
                          value={task.details.join('\n')}
                          onChange={(e) => handleUpdateTaskDetails(cat.id, task.id, e.target.value)}
                          onBlur={() => {
                            const cleaned = task.details.filter(line => line.trim() !== '');
                            handleUpdateTaskField(cat.id, task.id, 'details', cleaned);
                          }}
                          placeholder="• 상세 세부 작업 항목을 줄바꿈으로 나누어 입력하세요."
                        />
                      </td>

                      {/* 완료일 필드가 삭제되었습니다 */}

                      {/* 역할군 연동 - 프리미엄 멀티 셀렉트 */}
                      <td style={{ overflow: 'visible' }}>
                        {(() => {
                          // 최상단 1, 2번째 행들은 위로 열리면 헤더 바깥으로 팝업이 잘리므로, 무조건 아래로 열리도록(drop-up 해제) 제한 가드를 둡니다.
                          const isDropUp = globalTaskCount >= 3 && currentGlobalIdx >= globalTaskCount - 2 && currentGlobalIdx >= 2;
                          currentGlobalIdx++;

                          return (
                            <div className="wbs-multi-select-container">
                              <div 
                                className="wbs-multi-select-trigger"
                                style={getMultiRoleTriggerStyle(task.roles || [task.role])}
                                onClick={() => setActiveDropdownTaskId(activeDropdownTaskId === task.id ? null : task.id)}
                                title="클릭하여 역할군 다중 연동 설정"
                              >
                                {renderRolesBadges(task.roles || [task.role])}
                              </div>
                              
                              {activeDropdownTaskId === task.id && (
                                <div className={`wbs-multi-select-dropdown ${isDropUp ? 'drop-up' : ''}`}>
                                  {[...availableRoles, '해당없음'].map(opt => {
                                    const currentRoles = task.roles || [task.role];
                                    const isChecked = opt === '해당없음' 
                                      ? currentRoles.includes('해당없음') || currentRoles.length === 0
                                      : currentRoles.includes(opt);
                                      
                                    return (
                                      <label key={opt} className="wbs-multi-select-option">
                                        <input 
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleRole(cat.id, task.id, opt)}
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    );
                                  })}
                                  <div className="wbs-multi-select-footer">
                                    <button 
                                      type="button" 
                                      className="btn btn-primary btn-xs" 
                                      style={{ width: '100%', padding: '4px' }}
                                      onClick={() => setActiveDropdownTaskId(null)}
                                    >
                                      적용
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 투입인력 */}
                      <td>
                        <input 
                          type="number"
                          min="0"
                          step="1"
                          className="wbs-input-num"
                          value={task.manpower}
                          onChange={(e) => handleUpdateTaskField(cat.id, task.id, 'manpower', Math.max(0, Number(e.target.value)))}
                        />
                      </td>

                      {/* 투입일수 (MD) */}
                      <td>
                        <input 
                          type="number"
                          min="0"
                          step="0.5"
                          className="wbs-input-num"
                          value={task.md}
                          onChange={(e) => handleUpdateTaskField(cat.id, task.id, 'md', Math.max(0, Number(e.target.value)))}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            const snapped = Math.round(val * 2) / 2;
                            handleUpdateTaskField(cat.id, task.id, 'md', Math.max(0, snapped));
                          }}
                        />
                      </td>



                      {/* 작업 관리 삭제 액션 */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div className="wbs-task-action-row">
                          <button 
                            type="button" 
                            className="btn-icon-only" 
                            style={{ color: 'var(--color-red)', padding: '6px' }}
                            onClick={() => handleDeleteTask(cat.id, task.id)}
                            title="세부 작업 삭제"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>

          {/* WBS 하단 간편 대분류 추가 버튼 단추 신설 (오르락내리락 불편 완벽 해소) */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button 
              type="button" 
              className="wbs-btn-add-cat" 
              onClick={handleAddCategory}
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '14px', 
                border: '2px dashed var(--border-color)', 
                backgroundColor: '#fafafa',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f4f6fa';
                e.currentTarget.style.borderColor = 'var(--color-blue)';
                e.currentTarget.style.color = 'var(--color-blue)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(49, 130, 246, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fafafa';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Plus size={15} /> 대분류 항목 추가
            </button>
          </div>

          {/* WBS 공정관리 간트 차트 연동 렌더링 */}
          <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px dashed var(--border-color)' }}>
            <GanttChart 
              wbs={wbs} 
              onUpdateTask={(catId, taskId, fields) => {
                const updated = wbs.map(cat => {
                  if (cat.id === catId) {
                    const tasks = cat.tasks.map(t => {
                      if (t.id === taskId) {
                        return { ...t, ...fields };
                      }
                      return t;
                    });
                    return { ...cat, tasks };
                  }
                  return cat;
                });
                onChange(updated);
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
