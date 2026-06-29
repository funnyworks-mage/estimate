import React, { useState, useEffect } from 'react';
import type { VendorInfo } from './types/estimate';
import { StorageAPI } from './utils/storage';

// 컴포넌트 임포트
import Sidebar from './components/Sidebar';
import EstimatesDashboard from './components/EstimatesDashboard';
import LibraryDashboard from './components/LibraryDashboard';
import ClientsDashboard from './components/ClientsDashboard';
import WbsDashboard from './components/WbsDashboard';
import DailyReportDashboard from './components/DailyReportDashboard';
import SettingsTab from './components/SettingsTab';
import AccountRoleDashboard from './components/AccountRoleDashboard';
import MyProfileDashboard from './components/MyProfileDashboard';
import AuthContainer from './components/AuthContainer';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';

// 커스텀 훅 임포트
import { useLibrary } from './hooks/useLibrary';
import { useEstimateProjects } from './hooks/useEstimateProjects';
import { useClients } from './hooks/useClients';

export default function App() {
  // --- 탭 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'estimates' | 'library' | 'settings' | 'clients' | 'wbs_manage' | 'reports' | 'accounts' | 'profile'>('estimates');
  
  // --- 사용자 인증 및 권한 상태 ---
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'member' | 'admin' | 'super_admin' | null>(null);

  // --- 사내 공급자 정보 상태 ---
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>({
    companyName: '',
    bizNumber: '',
    ownerName: '',
    address: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // --- 사용자 표시 이름 동적 바인딩 헬퍼 ---
  const getUserDisplayName = (usr: any) => {
    if (!usr) return '알 수 없음';
    if (usr.user_metadata?.name) return usr.user_metadata.name;
    const emailStr = usr.email || '';
    if (emailStr.toLowerCase().trim() === 'fun@funnyworks.co.kr') return '박성훈';
    return emailStr.split('@')[0];
  };

  // --- 1. 라이브러리 상태 및 로직 훅 ---
  const libraryState = useLibrary();

  // --- 2. 견적 프로젝트 상태 및 로직 훅 ---
  const estimatesState = useEstimateProjects({
    user,
    libraryItems: libraryState.libraryItems
  });

  // --- 3. 거래처 주소록 상태 및 로직 훅 ---
  const clientsState = useClients();

  // --- Supabase Auth 세션 체크 및 역할(Role) 자동 관리 ---
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // 1. 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserRole(session.user.id, session.user.email);
      } else {
        setIsLoading(false);
      }
    });

    // 2. 세션 변경 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserRole(session.user.id, session.user.email);
      } else {
        setUser(null);
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string, email?: string) => {
    const isMasterEmail = email?.toLowerCase().trim() === 'fun@funnyworks.co.kr';

    // [무적의 마스터 가드] 마스터 이메일은 즉시 슈퍼관리자 권한을 강제 부여하여 DB/RLS 장벽을 우회합니다.
    if (isMasterEmail) {
      setUserRole('super_admin');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setUserRole(data.role as 'member' | 'admin' | 'super_admin');
      } else {
        // 일반 사용자의 프로필 누락 시 기본 member 자동 생성 및 저장 시도
        if (email) {
          await supabase
            .from('user_profiles')
            .upsert({
              id: userId,
              email: email,
              role: 'member'
            });
        }
        setUserRole('member');
      }
    } catch (err) {
      console.error('역할 조회 실패:', err);
      setUserRole('member');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 권한별 탭 접근 통제 및 강제 리다이렉트 가드 ---
  useEffect(() => {
    if (!userRole) return;
    
    if (userRole === 'member') {
      // 일반 회원은 WBS 일정, 일일 보고서, 개인정보 페이지만 접근 가능
      if (activeTab !== 'wbs_manage' && activeTab !== 'reports' && activeTab !== 'profile') {
        setActiveTab('wbs_manage');
      }
    } else if (userRole === 'admin') {
      // 관리자는 계정권한관리(accounts) 외 모든 메뉴 가능
      if (activeTab === 'accounts') {
        setActiveTab('estimates');
      }
    }
  }, [userRole, activeTab]);

  // --- 사내 공급자 설정 데이터 초기 로딩 ---
  useEffect(() => {
    async function loadVendorInfo() {
      try {
        const vendor = await StorageAPI.getVendorInfo();
        setVendorInfo(vendor);
      } catch (e) {
        console.error('공급자 정보 로딩 실패:', e);
      }
    }
    loadVendorInfo();
  }, []);

  // --- 프로젝트 훅으로 불러온 데이터가 동기화된 후 거래처 및 공급자 동기화 ---
  useEffect(() => {
    if (estimatesState.projects.length > 0) {
      // 훅 내부의 로딩 상태와 동기화가 필요한 경우 수입
      if (libraryState.libraryItems.length > 0) {
        // 라이브러리 및 거래처 전역 연동
        StorageAPI.getClients().then(cls => {
          if (clientsState.clients.length === 0 && cls.length > 0) {
            clientsState.setClients(cls);
          }
        });
      }
    }
  }, [estimatesState.projects, libraryState.libraryItems]);

  // --- 설정 (공급자 정보) 저장 핸들러 ---
  const handleSaveVendorInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await StorageAPI.saveVendorInfo(vendorInfo);
    alert('사내 정보가 성공적으로 저장되었습니다.');
    
    if (estimatesState.activeProject) {
      estimatesState.handleUpdateProjectField('vendorInfo', vendorInfo);
    }
  };

  const handleSealImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVendorInfo({ ...vendorInfo, sealImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVendorInfo({ ...vendorInfo, logoImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 데이터 백업 / 복원 액션 ---
  const handleExportData = async () => {
    const dataStr = await StorageAPI.exportData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;
    const exportFileDefaultName = `estimate_backup_${localDateStr}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        const res = await StorageAPI.importData(result);
        if (res.success) {
          alert('데이터가 성공적으로 복원되었습니다.');
          window.location.reload();
        } else {
          alert(`일부 데이터 복원에 실패했습니다.\n\n실패 사유:\n${res.error}`);
        }
      };
      reader.readAsText(file);
    }
  };

  // --- 로그아웃 핸들러 ---
  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setUserRole(null);
  };

  // --- 로딩 스피너 ---
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8f9fa', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--color-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>스마트 견적 솔루션을 로딩하고 있습니다...</span>
      </div>
    );
  }

  // --- 비로그인 세션 가드 ---
  if (!user) {
    return <AuthContainer onAuthSuccess={(usr) => setUser(usr)} />;
  }

  return (
    <div className="app-container">
      {/* 좌측 글로벌 내비게이션 사이드바 */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        userRole={userRole} 
        getUserDisplayName={getUserDisplayName}
        setSelectedProjectId={estimatesState.setSelectedProjectId}
        handleExportData={handleExportData}
        handleImportData={handleImportData}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 우측 도메인별 메인 워크스페이스 컨텐츠 영역 */}
      
      {/* A. 견적서 리스트 & 상세 편집 에디터 대시보드 */}
      {activeTab === 'estimates' && (
        <EstimatesDashboard 
          clients={clientsState.clients}
          categoriesList={libraryState.categoriesList}
          libraryItems={libraryState.libraryItems}
          estimatesState={estimatesState}
        />
      )}

      {/* B. 품목 & 패키지 단가 라이브러리 대시보드 */}
      {activeTab === 'library' && (
        <LibraryDashboard 
          libraryState={libraryState}
          projects={estimatesState.projects}
          updateProjectsState={estimatesState.updateProjectsState}
        />
      )}

      {/* C. 고객사(거래처) 정보 관리 대시보드 */}
      {activeTab === 'clients' && (
        <ClientsDashboard 
          clients={clientsState.clients}
          projects={estimatesState.projects}
          onSaveClient={clientsState.handleSaveClient}
          onDeleteClient={clientsState.handleDeleteClient}
          isClientCreateModalOpen={clientsState.isClientCreateModalOpen}
          setIsClientCreateModalOpen={clientsState.setIsClientCreateModalOpen}
          editingClient={clientsState.editingClient}
          setEditingClient={clientsState.setEditingClient}
        />
      )}

      {/* D. WBS 통합 업무일정 관리 대시보드 */}
      {activeTab === 'wbs_manage' && (
        <WbsDashboard 
          projects={estimatesState.projects} 
          onUpdateProjects={estimatesState.updateProjectsState} 
          user={user} 
        />
      )}

      {/* E. 일일 업무 보고서 대시보드 */}
      {activeTab === 'reports' && (
        <DailyReportDashboard 
          projects={estimatesState.projects} 
        />
      )}

      {/* F. 회사 표준 공급자 정보 및 직인 설정 */}
      {activeTab === 'settings' && (userRole === 'admin' || userRole === 'super_admin') && (
        <SettingsTab 
          vendorInfo={vendorInfo}
          setVendorInfo={setVendorInfo}
          onSave={handleSaveVendorInfo}
          onSealUpload={handleSealImageUpload}
          onLogoUpload={handleLogoImageUpload}
        />
      )}

      {/* G. 슈퍼관리자 전용 계정 권한 제어 */}
      {activeTab === 'accounts' && userRole === 'super_admin' && (
        <AccountRoleDashboard 
          currentUser={user} 
        />
      )}

      {/* H. 사용자 개인 정보 및 비밀번호 수정 */}
      {activeTab === 'profile' && (
        <MyProfileDashboard 
          currentUser={user} 
          userRole={userRole} 
          onProfileUpdate={(updatedUser) => setUser(updatedUser)} 
        />
      )}
    </div>
  );
}
