import { 
  FileText, 
  Database, 
  Users, 
  ListTodo, 
  ClipboardList, 
  Settings, 
  Shield, 
  User, 
  LogOut, 
  Download, 
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'estimates' | 'library' | 'settings' | 'clients' | 'wbs_manage' | 'reports' | 'accounts' | 'profile';
  setActiveTab: (tab: 'estimates' | 'library' | 'settings' | 'clients' | 'wbs_manage' | 'reports' | 'accounts' | 'profile') => void;
  user: any;
  userRole: 'member' | 'admin' | 'super_admin' | null;
  getUserDisplayName: (usr: any) => string;
  setSelectedProjectId: (id: string | null) => void;
  handleExportData: () => void;
  handleImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  userRole,
  getUserDisplayName,
  setSelectedProjectId,
  handleExportData,
  handleImportData,
  onLogout,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  return (
    <div className={`sidebar no-print ${isCollapsed ? 'collapsed' : ''}`}>
      {/* 사이드바 접기/펴기 프리미엄 플로팅 토글 버튼 */}
      <button 
        type="button" 
        className="sidebar-toggle-btn no-print" 
        onClick={onToggleCollapse}
        title={isCollapsed ? '사이드바 펴기' : '사이드바 접기'}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div className="sidebar-logo">
        <FileText size={24} style={{ flexShrink: 0 }} />
        <span className="sidebar-text" style={{ marginLeft: '10px', fontWeight: '800', fontSize: '18px' }}>estimate</span>
      </div>
      
      <div className="sidebar-menu">
        <div className="menu-section-title">서비스 메뉴</div>
        
        {/* 견적, 라이브러리, 거래처: 관리자 또는 슈퍼관리자만 노출 */}
        {(userRole === 'admin' || userRole === 'super_admin') && (
          <>
            <div 
              className={`menu-item ${activeTab === 'estimates' ? 'active' : ''}`}
              onClick={() => { setActiveTab('estimates'); setSelectedProjectId(null); }}
            >
              <FileText size={18} style={{ flexShrink: 0 }} />
              <span className="sidebar-text" style={{ marginLeft: '12px' }}>견적 프로젝트</span>
            </div>
            <div 
              className={`menu-item ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => setActiveTab('library')}
            >
              <Database size={18} style={{ flexShrink: 0 }} />
              <span className="sidebar-text" style={{ marginLeft: '12px' }}>항목 라이브러리</span>
            </div>
            <div 
              className={`menu-item ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveTab('clients')}
            >
              <Users size={18} style={{ flexShrink: 0 }} />
              <span className="sidebar-text" style={{ marginLeft: '12px' }}>고객사 관리</span>
            </div>
          </>
        )}

        {/* WBS 통합 일정 및 일일 보고서: 모든 역할 공통 노출 */}
        <div 
          className={`menu-item ${activeTab === 'wbs_manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('wbs_manage')}
        >
          <ListTodo size={18} style={{ flexShrink: 0 }} />
          <span className="sidebar-text" style={{ marginLeft: '12px' }}>WBS 통합 일정 관리</span>
        </div>
        <div 
          className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <ClipboardList size={18} style={{ flexShrink: 0 }} />
          <span className="sidebar-text" style={{ marginLeft: '12px' }}>일일 업무 보고서</span>
        </div>

        {/* 설정 및 관리: 관리자 또는 슈퍼관리자만 노출 */}
        {(userRole === 'admin' || userRole === 'super_admin') && (
          <div 
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} style={{ flexShrink: 0 }} />
            <span className="sidebar-text" style={{ marginLeft: '12px' }}>설정 및 관리</span>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {user && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
            
            {/* 프로필 카드 영역 (접혔을 때는 간결하게 아이콘 정렬) */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '8px', 
              padding: isCollapsed ? '10px 0' : '10px 12px', 
              backgroundColor: 'var(--bg-secondary)', 
              border: isCollapsed ? 'none' : '1px solid var(--border-color)',
              borderRadius: '6px', 
              fontSize: '11px',
              transition: 'all 0.2s'
            }}>
              <Shield size={14} className="color-blue" style={{ flexShrink: 0 }} />
              <div className="sidebar-text" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, marginLeft: '4px' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{getUserDisplayName(user)}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '1px', fontWeight: '500' }}>{user.email}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '9px', marginTop: '1px', fontWeight: '500' }}>
                  {userRole === 'super_admin' ? '슈퍼관리자' : userRole === 'admin' ? '관리자 권한' : '팀원 권한'}
                </div>
              </div>
            </div>

            {/* 개인정보 관리 버튼 */}
            <button
              type="button"
              className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'} btn-sm sidebar-footer-btn`}
              onClick={() => setActiveTab('profile')}
              style={{ 
                justifyContent: isCollapsed ? 'center' : 'flex-start', 
                height: '32px', 
                fontSize: '11px', 
                fontWeight: '700',
                border: activeTab === 'profile' ? 'none' : '1px solid var(--border-color)',
                transition: 'all 0.2s',
                padding: isCollapsed ? '0' : '0 12px'
              }}
            >
              <User size={13} style={{ flexShrink: 0 }} /> 
              <span className="sidebar-text" style={{ marginLeft: '6px' }}>개인정보 관리</span>
            </button>

            {/* 슈퍼관리자 메뉴 버튼 */}
            {userRole === 'super_admin' && (
              <button
                type="button"
                className={`btn ${activeTab === 'accounts' ? 'btn-primary' : 'btn-secondary'} btn-sm sidebar-footer-btn`}
                onClick={() => setActiveTab('accounts')}
                style={{ 
                  justifyContent: isCollapsed ? 'center' : 'flex-start', 
                  height: '32px', 
                  fontSize: '11px', 
                  fontWeight: '700',
                  border: activeTab === 'accounts' ? 'none' : '1px solid var(--border-color)',
                  transition: 'all 0.2s',
                  padding: isCollapsed ? '0' : '0 12px'
                }}
              >
                <Shield size={13} style={{ flexShrink: 0 }} /> 
                <span className="sidebar-text" style={{ marginLeft: '6px' }}>슈퍼관리자 메뉴</span>
              </button>
            )}

            {/* 로그아웃 버튼 */}
            <button 
              type="button" 
              className="btn btn-secondary btn-sm sidebar-footer-btn" 
              onClick={onLogout}
              style={{ 
                justifyContent: isCollapsed ? 'center' : 'flex-start', 
                height: '32px', 
                fontSize: '11px', 
                fontWeight: '700',
                transition: 'all 0.2s',
                padding: isCollapsed ? '0' : '0 12px'
              }}
            >
              <LogOut size={13} style={{ flexShrink: 0 }} /> 
              <span className="sidebar-text" style={{ marginLeft: '6px' }}>로그아웃</span>
            </button>
          </div>
        )}
        
        {/* 데이터 백업 버튼 */}
        <button 
          type="button" 
          className="btn btn-secondary btn-sm sidebar-footer-btn" 
          onClick={handleExportData}
          style={{ 
            justifyContent: isCollapsed ? 'center' : 'flex-start', 
            padding: isCollapsed ? '0' : '0 12px' 
          }}
        >
          <Download size={14} style={{ flexShrink: 0 }} /> 
          <span className="sidebar-text" style={{ marginLeft: '6px' }}>데이터 백업</span>
        </button>

        {/* 데이터 복원 버튼 */}
        <label 
          className="btn btn-secondary btn-sm sidebar-footer-btn" 
          style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '0' : '0 12px'
          }}
        >
          <Upload size={14} style={{ flexShrink: 0 }} /> 
          <span className="sidebar-text" style={{ marginLeft: '6px' }}>데이터 복원</span>
          <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
}
