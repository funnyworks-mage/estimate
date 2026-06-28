import React, { useState, useEffect } from 'react';
import { User, Lock, Shield, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface MyProfileDashboardProps {
  currentUser: any;
  userRole: 'member' | 'admin' | 'super_admin' | null;
  onProfileUpdate: (updatedUser: any) => void;
}

export default function MyProfileDashboard({ currentUser, userRole, onProfileUpdate }: MyProfileDashboardProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  
  const [messageName, setMessageName] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [messagePassword, setMessagePassword] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 현재 로그인한 사용자의 이름 메타데이터 바인딩
  useEffect(() => {
    if (currentUser) {
      const metadataName = currentUser.user_metadata?.name;
      if (metadataName) {
        setName(metadataName);
      } else if (currentUser.email === 'fun@funnyworks.co.kr') {
        setName('박성훈');
      } else {
        setName(currentUser.email.split('@')[0]);
      }
    }
  }, [currentUser]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoadingName(true);
    setMessageName(null);

    try {
      // Supabase Auth 메타데이터 업데이트 API (이름 저장)
      const { data, error } = await supabase.auth.updateUser({
        data: { name: name.trim() }
      });

      if (error) throw error;

      if (data.user) {
        onProfileUpdate(data.user);
        setMessageName({ type: 'success', text: '이름이 성공적으로 변경되었습니다.' });
      }
    } catch (err: any) {
      console.error('이름 변경 실패:', err);
      setMessageName({ type: 'error', text: err.message || '이름 변경 처리에 실패했습니다.' });
    } finally {
      setLoadingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    if (password.length < 6) {
      setMessagePassword({ type: 'error', text: '비밀번호는 최소 6자리 이상이어야 합니다.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessagePassword({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }

    setLoadingPassword(true);
    setMessagePassword(null);

    try {
      // Supabase Auth 비밀번호 업데이트 API
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      if (data.user) {
        setMessagePassword({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      console.error('비밀번호 변경 실패:', err);
      setMessagePassword({ type: 'error', text: err.message || '비밀번호 변경 처리에 실패했습니다.' });
    } finally {
      setLoadingPassword(false);
    }
  };

  const getRoleLabel = (role: typeof userRole) => {
    switch (role) {
      case 'super_admin':
        return '슈퍼관리자';
      case 'admin':
        return '관리자';
      case 'member':
        return '일반 회원';
      default:
        return '미정';
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={22} className="color-blue" />
          개인정보 관리
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
          성명(이름)을 변경하거나 비밀번호를 재설정하여 계정 보안을 유지합니다.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* 카드 1: 기본 정보 및 이름 변경 */}
        <div className="card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} className="color-blue" />
            프로필 정보 설정
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 계정 이메일 (읽기 전용) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>계정 ID (이메일)</label>
              <input 
                type="text" 
                className="input-text" 
                value={currentUser?.email || ''} 
                disabled 
                style={{ backgroundColor: '#f1f3f5', cursor: 'not-allowed', color: 'var(--text-secondary)', fontWeight: '500' }} 
              />
            </div>

            {/* 계정 등급 (읽기 전용) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>계정 등급</label>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '6px 12px', 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                width: 'fit-content'
              }}>
                <Shield size={14} className="color-blue" />
                {getRoleLabel(userRole)}
              </div>
            </div>

            <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              {/* 이름 변경 */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600' }}>성명 (이름)</label>
                <input 
                  type="text" 
                  className="input-text" 
                  placeholder="실명을 입력해주세요" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                  disabled={loadingName}
                />
              </div>

              {messageName && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: messageName.type === 'success' ? '#2e7d32' : '#c62828',
                  backgroundColor: messageName.type === 'success' ? '#e8f5e9' : '#ffebee',
                  padding: '8px 12px',
                  borderRadius: '6px'
                }}>
                  {messageName.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                  {messageName.text}
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loadingName || !name.trim()} 
                style={{ alignSelf: 'flex-start', height: '36px', padding: '0 16px', fontSize: '12px', fontWeight: '700' }}
              >
                {loadingName ? '변경 중...' : '이름 저장하기'}
              </button>
            </form>
          </div>
        </div>

        {/* 카드 2: 비밀번호 변경 */}
        <div className="card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} className="color-blue" />
            비밀번호 변경
          </h2>

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 새 비밀번호 */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600' }}>새 비밀번호</label>
              <input 
                type="password" 
                className="input-text" 
                placeholder="새로운 비밀번호 (6자리 이상)" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                disabled={loadingPassword}
                minLength={6}
              />
            </div>

            {/* 새 비밀번호 확인 */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600' }}>새 비밀번호 확인</label>
              <input 
                type="password" 
                className="input-text" 
                placeholder="비밀번호를 한번 더 입력해주세요" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required
                disabled={loadingPassword}
                minLength={6}
              />
            </div>

            {messagePassword && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '12px', 
                fontWeight: '600',
                color: messagePassword.type === 'success' ? '#2e7d32' : '#c62828',
                backgroundColor: messagePassword.type === 'success' ? '#e8f5e9' : '#ffebee',
                padding: '8px 12px',
                borderRadius: '6px'
              }}>
                {messagePassword.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                {messagePassword.text}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loadingPassword || !password} 
              style={{ alignSelf: 'flex-start', height: '36px', padding: '0 16px', fontSize: '12px', fontWeight: '700' }}
            >
              {loadingPassword ? '변경 중...' : '비밀번호 변경하기'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
