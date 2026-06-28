import React from 'react';
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
  Upload 
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
  onLogout
}: SidebarProps) {
  return (
    <div className="sidebar no-print">
      <div className="sidebar-logo">
        <FileText size={24} />
        <span>estimate</span>
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
              <FileText size={18} />
              견적 프로젝트
            </div>
            <div 
              className={`menu-item ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => setActiveTab('library')}
            >
              <Database size={18} />
              항목 라이브러리
            </div>
            <div 
              className={`menu-item ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveTab('clients')}
            >
              <Users size={18} />
              고객사 관리
            </div>
          </>
        )}

        {/* WBS 통합 일정 및 일일 보고서: 모든 역할 공통 노출 */}
        <div 
          className={`menu-item ${activeTab === 'wbs_manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('wbs_manage')}
        >
          <ListTodo size={18} />
          WBS 통합 일정 관리
        </div>
        <div 
          className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <ClipboardList size={18} />
          일일 업무 보고서
        </div>

        {/* 설정 및 관리: 관리자 또는 슈퍼관리자만 노출 */}
        {(userRole === 'admin' || userRole === 'super_admin') && (
          <div 
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            설정 및 관리
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {user && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '11px' }}>
              <Shield size={14} className="color-blue" style={{ flexShrink: 0 }} />
              <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{getUserDisplayName(user)}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '1px', fontWeight: '500' }}>{user.email}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '9px', marginTop: '1px', fontWeight: '500' }}>
                  {userRole === 'super_admin' ? '슈퍼관리자' : userRole === 'admin' ? '관리자 권한' : '팀원 권한'}
                </div>
              </div>
            </div>

            {/* 개인정보 관리 버튼 (모든 사용자 공통) */}
            <button
              type="button"
              className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab('profile')}
              style={{ 
                width: '100%', 
                gap: '6px', 
                justifyContent: 'center', 
                height: '32px', 
                fontSize: '11px', 
                fontWeight: '700',
                border: activeTab === 'profile' ? 'none' : '1px solid var(--border-color)',
                transition: 'all 0.2s',
                marginBottom: '2px'
              }}
            >
              <User size={13} /> 개인정보 관리
            </button>

            {/* 슈퍼관리자 메뉴 버튼: 슈퍼관리자일 때 개인정보 관리 바로 아래, 로그아웃 위에 배치 */}
            {userRole === 'super_admin' && (
              <button
                type="button"
                className={`btn ${activeTab === 'accounts' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setActiveTab('accounts')}
                style={{ 
                  width: '100%', 
                  gap: '6px', 
                  justifyContent: 'center', 
                  height: '32px', 
                  fontSize: '11px', 
                  fontWeight: '700',
                  border: activeTab === 'accounts' ? 'none' : '1px solid var(--border-color)',
                  transition: 'all 0.2s',
                  marginBottom: '2px'
                }}
              >
                <Shield size={13} /> 슈퍼관리자 메뉴
              </button>
            )}

            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onLogout}
              style={{ width: '100%', gap: '6px', justifyContent: 'center', height: '32px', fontSize: '11px', fontWeight: '700' }}
            >
              <LogOut size={13} /> 로그아웃
            </button>
          </div>
        )}
        
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportData}>
          <Download size={14} /> 데이터 백업
        </button>
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex' }}>
          <Upload size={14} /> 데이터 복원
          <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
}
