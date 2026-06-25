import React, { useState } from 'react';
import { Mail, Lock, LogIn, HelpCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface AuthContainerProps {
  onAuthSuccess: (user: any) => void;
  onSkipAuth: () => void;
}

export default function AuthContainer({ onAuthSuccess, onSkipAuth }: AuthContainerProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        // 1. 회원가입
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. user_profiles 테이블에 역할(Role) 추가 등록
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: authData.user.id,
              email: email,
              role: role
            });

          if (profileError) {
            console.error('프로필 등록 에러:', profileError);
          }

          alert('회원가입이 완료되었습니다! 가입하신 정보로 로그인해주세요.');
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        // 로그인
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) throw authError;

        if (authData.user) {
          onAuthSuccess(authData.user);
        }
      }
    } catch (error: any) {
      console.error('인증 처리 에러:', error);
      setErrorMsg(error.message || '인증 처리에 실패했습니다. 입력값을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '32px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
        {/* 서비스 타이틀 */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: '#e3f2fd', 
            color: '#1976d2', 
            width: '54px', 
            height: '54px', 
            borderRadius: '14px',
            marginBottom: '14px'
          }}>
            <LogIn size={26} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            {isSignUp ? '워크스페이스 계정 생성' : '협업 워크스페이스 로그인'}
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
            {isSignUp ? '팀원 역할을 선택하고 회원가입을 완료하세요' : 'Supabase 클라우드 데이터베이스와 즉시 연동됩니다'}
          </p>
        </div>

        {errorMsg && (
          <div style={{ 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            padding: '10px 12px', 
            borderRadius: '6px', 
            fontSize: '12px', 
            fontWeight: '600',
            marginBottom: '16px',
            border: '1px solid #ffcdd2'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 이메일 */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} /> 이메일 주소
            </label>
            <input 
              type="email" 
              className="input-text" 
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* 비밀번호 */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> 비밀번호
            </label>
            <input 
              type="password" 
              className="input-text" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {/* 회원가입 시 역할 선택 */}
          {isSignUp && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={14} /> 담당 역할 (Role)
              </label>
              <select 
                className="select-input"
                value={role}
                onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
                disabled={loading}
              >
                <option value="member">팀원 (견적서 작성 및 결재 요청)</option>
                <option value="admin">관리자 (견적서 심사 및 결재 승인)</option>
              </select>
            </div>
          )}

          {/* 제출 버튼 */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', height: '40px', justifyContent: 'center', fontWeight: '700', fontSize: '13px', marginTop: '6px' }}
            disabled={loading}
          >
            {loading ? '인증 처리 중...' : isSignUp ? '계정 만들기' : '로그인'}
          </button>
        </form>

        {/* 폼 하단 전환 링크 */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? '이미 계정이 있으신가요?' : '새로운 팀원이신가요?'}
          </span>
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#1976d2', 
              fontWeight: '700', 
              cursor: 'pointer',
              marginLeft: '6px',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? '로그인하기' : '회원가입하기'}
          </button>
        </div>

        {/* 게스트 모드 스킵 버튼 (로컬 게스트 진입) */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
          <button 
            type="button" 
            onClick={onSkipAuth}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              fontSize: '11px', 
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px'
            }}
            className="hover-bg-sub"
          >
            로그인 없이 오프라인 게스트 모드로 계속하기
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
      <style>{`
        .hover-bg-sub:hover {
          background-color: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
}
