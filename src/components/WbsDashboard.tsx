import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Lock } from 'lucide-react';
import type { EstimateProject, WbsTask } from '../types/estimate';
import { StorageAPI } from '../utils/storage';

interface WbsDashboardProps {
  projects: EstimateProject[];
  onUpdateProjects: (updated: EstimateProject[]) => void;
  user?: any;
}

export default function WbsDashboard({ projects, onUpdateProjects, user }: WbsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // 계정별 로컬스토리지 필터 상태 기억 키 산출
  const storageKey = useMemo(() => {
    if (user && user.id) {
      return `wbs_last_filter_user_${user.id}`;
    }
    return 'wbs_last_filter_guest';
  }, [user]);

  // 로컬스토리지에서 이전 선택 필터 상태 로드
  const initialFilter = useMemo(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('WBS 필터 상태 로드 실패:', e);
    }
    return { client: 'all', project: 'all', status: 'all' };
  }, [storageKey]);

  const [clientFilter, setClientFilter] = useState<string>(initialFilter.client || 'all');
  const [projectFilter, setProjectFilter] = useState<string>(initialFilter.project || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter.status || 'all');

  // 필터 상태 변경 시 로컬스토리지에 동기화 저장
  useEffect(() => {
    const filterState = {
      client: clientFilter,
      project: projectFilter,
      status: statusFilter
    };
    localStorage.setItem(storageKey, JSON.stringify(filterState));
  }, [clientFilter, projectFilter, statusFilter, storageKey]);
  
  // 현재 상세 세부내역을 텍스트 통째로 편집 중인 태스크 ID 상태
  const [editingDetailsTaskId, setEditingDetailsTaskId] = useState<string | null>(null);

  // 모든 프로젝트 WBS 작업(Task)들을 평탄화(Flatten)하여 수집 및 정렬
  const allWbsTasks = useMemo(() => {
    const list: Array<{
      projectId: string;
      projectTitle: string;
      projectClientName: string;
      categoryTitle: string;
      categoryNo: number;
      task: WbsTask;
    }> = [];

    projects.forEach(proj => {
      if (proj.wbs && Array.isArray(proj.wbs)) {
        proj.wbs.forEach(cat => {
          if (cat.tasks && Array.isArray(cat.tasks)) {
            cat.tasks.forEach(task => {
              list.push({
                projectId: proj.id,
                projectTitle: proj.title,
                projectClientName: proj.clientName || '미지정 고객사',
                categoryTitle: cat.title || '기타 구분',
                categoryNo: cat.no,
                task
              });
            });
          }
        });
      }
    });

    // 고객 선택이 기본 소팅(정렬)된 상태를 구현하기 위해 정렬 수행
    list.sort((a, b) => {
      // 1. 고객명 기준 오름차순 정렬 (가나다순)
      if (a.projectClientName !== b.projectClientName) {
        return a.projectClientName.localeCompare(b.projectClientName);
      }
      // 2. 프로젝트 타이틀 기준 오름차순 정렬 (가나다순)
      if (a.projectTitle !== b.projectTitle) {
        return a.projectTitle.localeCompare(b.projectTitle);
      }
      // 3. 대분류 No. (순서) 기준 오름차순 정렬
      return a.categoryNo - b.categoryNo;
    });

    return list;
  }, [projects]);

  // 필터링 적용
  const filteredTasks = useMemo(() => {
    return allWbsTasks.filter(item => {
      const matchSearch = 
        item.task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.projectClientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.task.role && item.task.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.task.details && item.task.details.join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchClient = clientFilter === 'all' || item.projectClientName === clientFilter;
      const matchProject = projectFilter === 'all' || item.projectId === projectFilter;
      
      // task.status가 없거나 비어있는 경우 기본값인 'planned'(예정)으로 간주하여 필터링 일관성 보장
      const taskStatus = item.task.status || 'planned';
      const matchStatus = statusFilter === 'all' || taskStatus === statusFilter;

      return matchSearch && matchClient && matchProject && matchStatus;
    });
  }, [allWbsTasks, searchTerm, clientFilter, projectFilter, statusFilter]);

  // 고유 고객사 목록 추출 (WBS 여부 무관하여 신규 프로젝트 등록 지원)
  const clientsList = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(p => {
      if (p.clientName) {
        names.add(p.clientName);
      }
    });
    return Array.from(names).sort();
  }, [projects]);

  // 고객 선택 상태에 종속된 프로젝트 목록 추출 (WBS 여부 무관)
  const projectsFilteredByClientList = useMemo(() => {
    return projects.filter(p => {
      return clientFilter === 'all' || p.clientName === clientFilter;
    });
  }, [projects, clientFilter]);

  // 고객 필터를 바꾸면 하위 프로젝트 필터는 '전체'로 안전하게 초기화
  const handleClientFilterChange = (clientVal: string) => {
    setClientFilter(clientVal);
    setProjectFilter('all');
  };

  // --- 퀵 에디터 모달 입력 임시 상태 ---
  const [showProjModal, setShowProjModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjType, setNewProjType] = useState<'IT' | 'DESIGN' | 'BUILD' | 'OTHER'>('OTHER');
  
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatProjId, setNewCatProjId] = useState('');

  // --- WBS 퀵 에디터 코어 비즈니스 로직 함수 ---
  // 1. WBS 프로젝트 신규 생성 (Supabase 연동)
  const handleCreateProject = async (title: string, clientName: string, type: 'IT' | 'DESIGN' | 'BUILD' | 'OTHER') => {
    if (!title.trim() || !clientName.trim()) {
      alert('프로젝트명과 고객사명은 필수 입력 항목입니다.');
      return;
    }

    const newProject: EstimateProject = {
      id: `proj_${Date.now()}`,
      projectType: type,
      title: title.trim(),
      clientName: clientName.trim(),
      estimateDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date().toISOString().split('T')[0],
      vendorInfo: {
        companyName: '',
        bizNumber: '',
        ownerName: '',
        address: ''
      },
      sections: [],
      remarks: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      wbs: [] // 빈 WBS 상태로 생성
    };

    const updatedProjects = [...projects, newProject];
    onUpdateProjects(updatedProjects);
    await StorageAPI.saveProject(newProject);
    
    // 필터를 생성한 프로젝트로 자동 포커스
    setClientFilter(newProject.clientName);
    setProjectFilter(newProject.id);
    
    // 폼 초기화 및 모달 닫기
    setNewProjTitle('');
    setNewProjClient('');
    setNewProjType('OTHER');
    setShowProjModal(false);
    alert(`[${newProject.title}] 프로젝트가 생성 완료되어 WBS 통합 관리에 자동 매핑되었습니다.`);
  };

  // 2. 대분류 카테고리 추가
  const handleAddCategory = async (projectId: string, title: string) => {
    if (!projectId) {
      alert('대상 프로젝트를 선택해 주세요.');
      return;
    }
    if (!title.trim()) {
      alert('대분류 카테고리 명칭을 입력해 주세요.');
      return;
    }

    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId) {
        const currentWbs = proj.wbs ? [...proj.wbs] : [];
        const newNo = currentWbs.length + 1;
        const newCat = {
          id: `cat_${Date.now()}`,
          no: newNo,
          title: title.trim(),
          tasks: []
        };
        return {
          ...proj,
          wbs: [...currentWbs, newCat]
        };
      }
      return proj;
    });

    onUpdateProjects(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) {
      await StorageAPI.saveProject(targetProj);
    }

    // 폼 초기화 및 모달 닫기
    setNewCatTitle('');
    setNewCatProjId('');
    setShowCatModal(false);
  };

  // 3. WBS 태스크 행 실시간 추가
  const handleAddTask = async (projectId: string, categoryTitle: string) => {
    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId && proj.wbs) {
        const updatedWbs = proj.wbs.map(cat => {
          if (cat.title === categoryTitle) {
            const currentTasks = cat.tasks ? [...cat.tasks] : [];
            const newTask: WbsTask = {
              id: `task_${Date.now()}`,
              name: '', // 빈 입력칸으로 시작
              details: [],
              status: 'planned',
              manpower: 1,
              md: 1,
              role: '프론트엔드', // 기본 역할군 지정
              roles: [],
              startDate: new Date().toISOString().split('T')[0],
              expectedEndDate: new Date().toISOString().split('T')[0],
              progress: 0,
              memo: '',
              checkedDetails: [],
              isCustom: true // WBS 대시보드에서 퀵 등록한 태스크 여부 플래그 추가
            };
            return {
              ...cat,
              tasks: [...currentTasks, newTask]
            };
          }
          return cat;
        });
        return { ...proj, wbs: updatedWbs };
      }
      return proj;
    });

    onUpdateProjects(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) {
      await StorageAPI.saveProject(targetProj);
    }
  };

  // 4. WBS 태스크 행 영구 삭제
  const handleDeleteTask = async (projectId: string, categoryTitle: string, taskId: string) => {
    if (!confirm('선택한 WBS 태스크를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId && proj.wbs) {
        const updatedWbs = proj.wbs.map(cat => {
          if (cat.title === categoryTitle) {
            const updatedTasks = cat.tasks.filter(t => t.id !== taskId);
            return { ...cat, tasks: updatedTasks };
          }
          return cat;
        });
        return { ...proj, wbs: updatedWbs };
      }
      return proj;
    });

    onUpdateProjects(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) {
      await StorageAPI.saveProject(targetProj);
    }
  };

  // 프로젝트 + 대분류 기준으로 연속된 행들의 rowSpan 값을 계산
  const rowSpans = useMemo(() => {
    const spans: number[] = [];
    let i = 0;
    
    while (i < filteredTasks.length) {
      let span = 1;
      const current = filteredTasks[i];
      
      while (
        i + span < filteredTasks.length &&
        filteredTasks[i + span].projectId === current.projectId &&
        filteredTasks[i + span].categoryTitle === current.categoryTitle
      ) {
        span++;
      }
      
      spans.push(span);
      for (let j = 1; j < span; j++) {
        spans.push(0);
      }
      
      i += span;
    }
    
    return spans;
  }, [filteredTasks]);

  // WBS 작업 일반 필드 인라인 변경 핸들러
  const handleUpdateTask = async (projectId: string, taskId: string, field: keyof WbsTask, value: any) => {
    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId && proj.wbs) {
        const updatedWbs = proj.wbs.map(cat => {
          const updatedTasks = cat.tasks.map(task => {
            if (task.id === taskId) {
              const updatedTask = { ...task, [field]: value };
              
              // 1. 상태를 '완료(completed)'로 변경할 때 실제 완료일을 오늘 날짜로 자동 세팅
              if (field === 'status' && value === 'completed') {
                if (!task.actualEndDate) {
                  updatedTask.actualEndDate = new Date().toISOString().split('T')[0];
                }
                updatedTask.progress = 100;
                
                // 모든 세부내역 체크 처리
                if (task.details && task.details.length > 0) {
                  updatedTask.checkedDetails = new Array(task.details.length).fill(true);
                }
              } 
              // 2. 완료가 아닌 상태로 변경 시 실제 완료일 소거
              else if (field === 'status' && value !== 'completed') {
                updatedTask.actualEndDate = '';
                if (task.progress === 100) {
                  updatedTask.progress = 50;
                  
                  // 모든 세부내역 체크 해제 처리 (보완)
                  if (task.details && task.details.length > 0) {
                    updatedTask.checkedDetails = new Array(task.details.length).fill(false);
                  }
                }
              }

              // 3. 실제 완료일을 기입했을 때 상태를 자동으로 'completed'로 맞춤
              if (field === 'actualEndDate' && value && value.trim() !== '') {
                updatedTask.status = 'completed';
                updatedTask.progress = 100;
                if (task.details && task.details.length > 0) {
                  updatedTask.checkedDetails = new Array(task.details.length).fill(true);
                }
              }

              return updatedTask;
            }
            return task;
          });
          return { ...cat, tasks: updatedTasks };
        });
        return { ...proj, wbs: updatedWbs };
      }
      return proj;
    });

    onUpdateProjects(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) {
      await StorageAPI.saveProject(targetProj);
    }
  };

  // 상세 세부내역의 개별 불릿 체크박스 토글 핸들러 (진척도 자동 연동 산출)
  const handleToggleDetailCheck = async (projectId: string, taskId: string, task: WbsTask, index: number, checked: boolean) => {
    const currentChecked = task.checkedDetails ? [...task.checkedDetails] : [];
    
    // 배열 크기 맞춤 채우기
    while (currentChecked.length < task.details.length) {
      currentChecked.push(false);
    }
    currentChecked[index] = checked;

    // 체크 비율 기반 진척도(progress) 재계산
    const total = task.details.length;
    const checkedCount = currentChecked.filter(Boolean).length;
    const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

    // 진행 상태 및 완료일자 스마트 연동
    let status = task.status || 'planned';
    let actualEndDate = task.actualEndDate || '';
    
    if (progress === 100) {
      status = 'completed';
      if (!actualEndDate) {
        actualEndDate = new Date().toISOString().split('T')[0];
      }
    } else if (status === 'completed' && progress < 100) {
      status = 'progress'; // 완료에서 내려오면 진행중으로 변경
      actualEndDate = '';
    }

    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId && proj.wbs) {
        const updatedWbs = proj.wbs.map(cat => {
          const updatedTasks = cat.tasks.map(t => {
            if (t.id === taskId) {
              return { 
                ...t, 
                checkedDetails: currentChecked,
                progress,
                status,
                actualEndDate
              };
            }
            return t;
          });
          return { ...cat, tasks: updatedTasks };
        });
        return { ...proj, wbs: updatedWbs };
      }
      return proj;
    });

    onUpdateProjects(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) {
      await StorageAPI.saveProject(targetProj);
    }
  };

  // 상세 세부내역 텍스트 전체 편집 완료 핸들러
  const handleUpdateTaskDetails = async (projectId: string, taskId: string, text: string) => {
    // 빈 줄 제외한 배열 빌드
    const details = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId && proj.wbs) {
        const updatedWbs = proj.wbs.map(cat => {
          const updatedTasks = cat.tasks.map(task => {
            if (task.id === taskId) {
              // 텍스트 구조 변경에 따른 체크 배열 리셋/조정
              const newChecked = new Array(details.length).fill(false);
              return { 
                ...task, 
                details, 
                checkedDetails: newChecked,
                progress: 0 // 리셋 시 진척도 0%
              };
            }
            return task;
          });
          return { ...cat, tasks: updatedTasks };
        });
        return { ...proj, wbs: updatedWbs };
      }
      return proj;
    });

    onUpdateProjects(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) {
      await StorageAPI.saveProject(targetProj);
    }
  };



  return (
    <div className="workspace" style={{ maxWidth: '100%' }}>
      {styleTag}

      <div className="workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="workspace-title">WBS 통합 일정 관리</h1>
          <p className="workspace-subtitle">전체 프로젝트의 대분류, 중분류, 상세내역, 역할군 및 작업 일정을 Supabase와 연동하여 종합 관리합니다.</p>
        </div>
        
        {/* WBS 프로젝트 및 대분류 퀵 생성 도구 패널 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setShowCatModal(true)}
            style={{ fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={14} /> 대분류 카테고리 추가
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => setShowProjModal(true)}
            style={{ fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={14} /> 새 WBS 프로젝트 등록
          </button>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="filter-bar">
        <div className="filter-input-wrapper">
          <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            className="filter-input" 
            placeholder="작업명, 상세내역, 프로젝트, 역할군, 대분류 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* 1. 마스터 고객사 선택 드롭다운 */}
        <select 
          className="filter-select"
          value={clientFilter}
          onChange={(e) => handleClientFilterChange(e.target.value)}
          style={{ minWidth: '160px', fontWeight: clientFilter !== 'all' ? 'bold' : 'normal' }}
        >
          <option value="all">전체 고객사 ({clientsList.length}개사)</option>
          {clientsList.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        
        {/* 2. 고객사별 하위 프로젝트 선택 드롭다운 (연동형) */}
        <select 
          className="filter-select"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ minWidth: '180px', fontWeight: projectFilter !== 'all' ? 'bold' : 'normal' }}
        >
          <option value="all">전체 프로젝트 ({projectsFilteredByClientList.length}건)</option>
          {projectsFilteredByClientList.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>

        {/* 3. 진행 상태 선택 드롭다운 */}
        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 진행상태</option>
          <option value="planned">⌛ 예정 (planned)</option>
          <option value="progress">⚙️ 진행중 (progress)</option>
          <option value="hold">❌ 보류 (hold)</option>
          <option value="completed">✅ 완료 (completed)</option>
        </select>
      </div>

      {/* WBS 통합 테이블 */}
      <div className="table-container" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%' }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th style={{ width: '140px' }}>프로젝트 / 대분류</th>
              <th style={{ width: '180px' }}>중분류 (작업내용)</th>
              <th style={{ width: '380px' }}>상세 세부내역 (체크 시 진척도 연동)</th>
              <th style={{ width: '110px' }}>역할군</th>
              <th style={{ width: '90px', textAlign: 'center' }}>투입 계획</th>
              <th style={{ width: '80px', textAlign: 'center' }}>진척도</th>
              <th style={{ width: '100px', textAlign: 'center' }}>진행 상태</th>
              <th style={{ width: '110px', textAlign: 'center' }}>시작일</th>
              <th style={{ width: '110px', textAlign: 'center' }}>예상 종료일</th>
              <th style={{ width: '110px', textAlign: 'center' }}>실제 종료일</th>
              <th style={{ width: '180px' }}>메모</th>
              <th style={{ width: '55px', textAlign: 'center' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(({ projectId, projectTitle, categoryTitle, task }, idx) => {
              const statusVal = task.status || 'planned';
              const progressVal = task.progress || 0;
              const isEditingDetails = editingDetailsTaskId === task.id;
              const span = rowSpans[idx];
              
              // 해당 태스크가 수정/삭제 가능한 퀵 등록 태스크인지 판정 (견적서 연동 정합성 수호)
              const proj = projects.find(p => p.id === projectId);
              const isCustomProject = proj ? (proj.projectType === 'OTHER' || !proj.sections || proj.sections.length === 0) : false;
              const isEditAllowed = isCustomProject || task.isCustom === true;
              
              return (
                <tr key={task.id}>
                  {/* 1. 프로젝트 / 대분류 (병합 처리 적용 및 퀵 태스크 추가 버튼 삽입) */}
                  {span > 0 && (
                    <td 
                      rowSpan={span}
                      style={{ 
                        verticalAlign: 'top', 
                        borderRight: '1px solid var(--border-color)',
                        backgroundColor: '#fdfdfd',
                        padding: '12px 10px'
                      }}
                    >
                      <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {categoryTitle}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={projectTitle}>
                        {projectTitle}
                      </div>
                      
                      {/* 태스크 실시간 수시 행 삽입 버튼 (견적 연동 시 원천 숨김 차단) */}
                      {isEditAllowed && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleAddTask(projectId, categoryTitle)}
                          style={{ marginTop: '10px', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', padding: '4px 6px' }}
                        >
                          <Plus size={12} /> 작업 추가
                        </button>
                      )}
                    </td>
                  )}

                  {/* 2. 중분류 (작업내용 - 견적 연동 시 읽기전용 보호) */}
                  <td>
                    <textarea 
                      className={`dash-textarea-input font-bold ${!isEditAllowed ? 'readonly-task' : ''}`}
                      rows={task.name ? Math.max(2, task.name.split('\n').length) : 2}
                      value={task.name}
                      onChange={(e) => handleUpdateTask(projectId, task.id, 'name', e.target.value)}
                      placeholder="작업내용을 입력하세요"
                      readOnly={!isEditAllowed}
                      style={{ 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        height: 'auto', 
                        overflowY: 'hidden',
                        cursor: !isEditAllowed ? 'default' : 'text',
                        color: !isEditAllowed ? '#334155' : 'inherit'
                      }}
                    />
                  </td>

                  {/* 3. 상세 세부내역 (체크박스 리스트 + 편집 토글 모드) */}
                  <td style={{ overflow: 'visible', verticalAlign: 'top' }}>
                    <div className="details-column-container" style={{ position: 'relative' }}>
                      {isEditingDetails ? (
                        /* 편집 모드: 텍스트 입력창 */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <textarea
                            className="dash-textarea-input editing"
                            rows={task.details ? Math.max(4, task.details.length) : 4}
                            defaultValue={task.details ? task.details.join('\n') : ''}
                            onBlur={(e) => {
                              handleUpdateTaskDetails(projectId, task.id, e.target.value);
                              setEditingDetailsTaskId(null);
                            }}
                            placeholder="• 상세 세부 작업을 줄바꿈으로 나누어 입력하세요"
                            style={{ fontSize: '12px', color: '#1e293b', backgroundColor: '#fff', border: '1px solid var(--color-blue)', padding: '6px 8px' }}
                            autoFocus
                          />
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                            입력창 밖을 클릭하면 저장 및 체크박스 리스트로 자동 변환됩니다.
                          </div>
                        </div>
                      ) : (
                        /* 보기 모드: 체크박스 불릿 리스트 */
                        <div className="details-list-view" style={{ minHeight: '40px' }}>
                          {task.details && task.details.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {task.details.map((line, idx) => {
                                const isChecked = task.checkedDetails?.[idx] || false;
                                return (
                                  <label 
                                    key={idx} 
                                    className="dash-detail-label-row"
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'flex-start', 
                                      gap: '8px', 
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      lineHeight: '1.4',
                                      color: isChecked ? 'var(--text-tertiary)' : '#334155',
                                      textDecoration: isChecked ? 'line-through' : 'none'
                                    }}
                                  >
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={(e) => handleToggleDetailCheck(projectId, task.id, task, idx, e.target.checked)}
                                      style={{ width: '14px', height: '14px', marginTop: '2px', accentColor: 'var(--color-blue)', cursor: 'pointer' }}
                                    />
                                    <span style={{ wordBreak: 'break-all' }}>{line.replace(/^[•\-\*\s]+/, '')}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>상세 세부내역이 비어 있습니다.</span>
                          )}
                          
                          {/* 마우스 오버 시 우측 상단에 노출될 미니 편집 버튼 (수정 권한 확인) */}
                          {isEditAllowed && (
                            <button 
                              type="button" 
                              className="dash-detail-edit-btn"
                              onClick={() => setEditingDetailsTaskId(task.id)}
                              title="상세 세부내역 수정"
                            >
                              <Edit2 size={10} /> 편집
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 4. 역할군 (세로 정렬로 변경) */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      {task.roles && task.roles.length > 0 ? (
                        task.roles.map(r => (
                          <span key={r} className="dash-role-badge">{r}</span>
                        ))
                      ) : (
                        <span className="dash-role-badge">{task.role || '해당없음'}</span>
                      )}
                    </div>
                  </td>

                  {/* 5. 투입 계획 (수정 불가능 고정 텍스트 형태) */}
                  <td style={{ textAlign: 'center' }}>
                    <div className="dash-plan-fixed-box">
                      <div className="plan-item">
                        <strong>인원:</strong> {task.manpower || 0}명
                      </div>
                      <div className="plan-item" style={{ marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                        <strong>일수:</strong> {task.md || 0}MD
                      </div>
                    </div>
                  </td>

                  {/* 6. 진척도 (체크박스 자동 연동 표시) */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: progressVal === 100 ? '#059669' : 'var(--text-primary)' }}>
                        {progressVal}%
                      </span>
                      <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressVal}%`, height: '100%', backgroundColor: progressVal === 100 ? '#10b981' : '#3b82f6', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  </td>

                  {/* 7. 진행 상태 */}
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className={`status-badge-select ${statusVal}`}
                      value={statusVal}
                      onChange={(e) => handleUpdateTask(projectId, task.id, 'status', e.target.value)}
                    >
                      <option value="planned">⌛ 예정</option>
                      <option value="progress">⚙️ 진행중</option>
                      <option value="hold">❌ 보류</option>
                      <option value="completed">✅ 완료</option>
                    </select>
                  </td>

                  {/* 8. 시작일 */}
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="date" 
                      className="dash-input-date"
                      value={task.startDate || ''}
                      onChange={(e) => handleUpdateTask(projectId, task.id, 'startDate', e.target.value)}
                    />
                  </td>

                  {/* 9. 예상 종료일 */}
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="date" 
                      className="dash-input-date"
                      value={task.expectedEndDate || ''}
                      onChange={(e) => handleUpdateTask(projectId, task.id, 'expectedEndDate', e.target.value)}
                    />
                  </td>

                  {/* 10. 실제 종료일 */}
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="date" 
                      className="dash-input-date"
                      value={task.actualEndDate || ''}
                      onChange={(e) => handleUpdateTask(projectId, task.id, 'actualEndDate', e.target.value)}
                      style={{ 
                        fontWeight: task.actualEndDate ? 'bold' : 'normal', 
                        color: task.actualEndDate ? '#059669' : 'inherit' 
                      }}
                    />
                  </td>

                  {/* 11. 메모 */}
                  <td>
                    <textarea 
                      className="dash-textarea-input"
                      rows={task.memo ? Math.max(2, task.memo.split('\n').length) : 2}
                      placeholder="메모 입력..."
                      value={task.memo || ''}
                      onChange={(e) => handleUpdateTask(projectId, task.id, 'memo', e.target.value)}
                      style={{ fontSize: '12px', height: 'auto', overflowY: 'hidden' }}
                    />
                  </td>
                  
                  {/* 12. 행 삭제 액션 버튼 (수정 권한 확인 및 자물쇠 기어 이식) */}
                  <td style={{ textAlign: 'center' }}>
                    {isEditAllowed ? (
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={() => handleDeleteTask(projectId, categoryTitle, task.id)}
                        style={{ padding: '6px' }}
                        title="작업 영구 삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : (
                      <span title="견적 연동 항목 (삭제 및 수정 불가)" style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '24px', width: '24px' }}>
                        <Lock size={12} />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                  {projects.some(p => p.wbs && p.wbs.length > 0) 
                    ? '필터 조건에 부합하는 WBS 태스크가 없습니다.' 
                    : '등록된 WBS 프로젝트가 없습니다. 우측 상단의 프로젝트 생성 및 대분류 추가 버튼을 이용해 첫 일정을 수립해 주세요.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- A. 새 WBS 프로젝트 등록 모달 --- */}
      {showProjModal && (
        <div className="wbs-modal-backdrop">
          <div className="wbs-modal-content">
            <h3 className="wbs-modal-title">새 WBS 프로젝트 등록</h3>
            <p className="wbs-modal-desc">월간 운영용 또는 단순 일정 관리용 프로젝트를 WBS 대시보드에 즉시 생성합니다.</p>
            
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#475569' }}>프로젝트명 (필수)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="예: 2026년 7월 글로벌 운영 지원" 
                value={newProjTitle}
                onChange={(e) => setNewProjTitle(e.target.value)}
                style={{ fontSize: '13px', padding: '8px', width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#475569' }}>고객사명 (필수)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="예: LG전자, LG CNS 등" 
                value={newProjClient}
                onChange={(e) => setNewProjClient(e.target.value)}
                style={{ fontSize: '13px', padding: '8px', width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#475569' }}>프로젝트 유형</label>
              <select 
                className="filter-select" 
                value={newProjType}
                onChange={(e: any) => setNewProjType(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              >
                <option value="OTHER">기타 일정/운영 프로젝트 (OTHER)</option>
                <option value="IT">IT 개발/유지보수 프로젝트 (IT)</option>
                <option value="DESIGN">디자인 프로젝트 (DESIGN)</option>
                <option value="BUILD">제작 및 시공 프로젝트 (BUILD)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowProjModal(false); setNewProjTitle(''); setNewProjClient(''); }}>취소</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCreateProject(newProjTitle, newProjClient, newProjType)}>프로젝트 생성</button>
            </div>
          </div>
        </div>
      )}

      {/* --- B. 대분류 카테고리 추가 모달 --- */}
      {showCatModal && (
        <div className="wbs-modal-backdrop">
          <div className="wbs-modal-content">
            <h3 className="wbs-modal-title">대분류 카테고리 추가</h3>
            <p className="wbs-modal-desc">선택한 프로젝트 아래에 신규 작업 그룹(대분류)을 즉시 삽입합니다.</p>
            
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#475569' }}>대상 프로젝트 (필수)</label>
              <select 
                className="filter-select"
                value={newCatProjId}
                onChange={(e) => setNewCatProjId(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              >
                <option value="">-- 추가할 프로젝트를 고르세요 --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.clientName ? `[${p.clientName}] ` : ''}{p.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#475569' }}>대분류 카테고리 명칭 (필수)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="예: 공통 운영 지원, 7월 1차 고도화 등" 
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                style={{ fontSize: '13px', padding: '8px', width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowCatModal(false); setNewCatTitle(''); setNewCatProjId(''); }}>취소</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAddCategory(newCatProjId, newCatTitle)}>카테고리 추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 고유 CSS 리터럴 정의
const styleTag = (
  <style>{`
    .filter-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-input-wrapper {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 8px 12px;
      flex: 1;
      min-width: 240px;
      transition: all 0.15s ease;
    }
    .filter-input-wrapper:focus-within {
      border-color: var(--color-blue);
      box-shadow: 0 0 0 3px rgba(49, 130, 246, 0.1);
    }
    .filter-input {
      border: none;
      outline: none;
      width: 100%;
      font-size: 13px;
      margin-left: 8px;
    }
    .filter-select {
      border: 1px solid var(--border-color);
      background: #ffffff;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      font-size: 13px;
      outline: none;
      min-width: 140px;
      cursor: pointer;
    }
    .status-badge-select {
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 6px 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      width: 90px;
      text-align: center;
    }
    .status-badge-select.completed {
      background-color: #ecfdf5;
      color: #059669;
    }
    .status-badge-select.progress {
      background-color: #eff6ff;
      color: #2563eb;
    }
    .status-badge-select.hold {
      background-color: #fef2f2;
      color: #dc2626;
    }
    .status-badge-select.planned {
      background-color: #fffbeb;
      color: #d97706;
    }
    .dash-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      table-layout: fixed;
    }
    .dash-table th {
      background-color: var(--bg-secondary);
      color: var(--text-secondary);
      font-weight: 600;
      padding: 12px 10px;
      border-bottom: 2px solid var(--border-color);
      text-align: left;
      font-size: 11px;
      white-space: nowrap;
    }
    .dash-table td {
      padding: 12px 10px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
      background-color: #ffffff;
      word-wrap: break-word;
      overflow: hidden;
    }
    .dash-table tr:hover td {
      background-color: #fafbfc;
    }
    .dash-textarea-input {
      width: 100%;
      border: 1px solid transparent;
      background: transparent;
      padding: 4px 6px;
      border-radius: 4px;
      outline: none;
      resize: none;
      font-family: inherit;
      line-height: 1.4;
      transition: all 0.15s;
    }
    .dash-textarea-input:hover {
      border-color: var(--border-color);
      background: #fafafa;
    }
    .dash-textarea-input:focus, .dash-textarea-input.editing {
      border-color: var(--color-blue);
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(49, 130, 246, 0.1);
    }
    .dash-input-date {
      border: 1px solid transparent;
      background: transparent;
      padding: 4px 2px;
      font-size: 11px;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      font-family: inherit;
      width: 100px;
      text-align: center;
    }
    .dash-input-date:hover {
      border-color: var(--border-color);
      background: #fafafa;
    }
    .dash-input-date:focus {
      border-color: var(--color-blue);
      background: #ffffff;
    }
    .dash-role-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      color: #2563eb;
      background-color: #eff6ff;
      border: 1px solid rgba(37, 99, 235, 0.15);
      white-space: nowrap;
      display: inline-block;
      width: fit-content;
    }
    .dash-plan-fixed-box {
      font-size: 11px;
      background-color: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 6px 8px;
      text-align: left;
      color: #475569;
      display: inline-block;
      min-width: 70px;
    }
    .dash-plan-fixed-box .plan-item {
      white-space: nowrap;
    }
    .details-list-view {
      position: relative;
      padding-right: 28px;
    }
    .dash-detail-edit-btn {
      position: absolute;
      right: 0;
      top: 0;
      background-color: #f1f5f9;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s ease;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .details-list-view:hover .dash-detail-edit-btn {
      opacity: 1;
    }
    .dash-detail-edit-btn:hover {
      background-color: var(--color-blue-light);
      color: var(--color-blue);
      border-color: rgba(49, 130, 246, 0.2);
    }
    
    /* 퀵 에디터 모달 스타일 */
    .wbs-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }
    .wbs-modal-content {
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideUp 0.2s ease;
      text-align: left;
    }
    .wbs-modal-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .wbs-modal-desc {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    /* 견적 연동 읽기전용 WBS 잠금 스타일 */
    .dash-textarea-input.readonly-task {
      border-color: transparent !important;
      background: transparent !important;
      box-shadow: none !important;
      cursor: default;
    }
    .dash-textarea-input.readonly-task:hover {
      background: transparent !important;
      border-color: transparent !important;
    }
  `}</style>
);
