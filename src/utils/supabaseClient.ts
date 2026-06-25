import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 플레이스홀더 키이거나 값이 없는지 검사
const isPlaceholder = supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE' || !supabaseAnonKey;

if (isPlaceholder) {
  console.warn(
    '[Supabase] Anon Public API Key가 설정되지 않았거나 기본 플레이스홀더 상태입니다. ' +
    '프로젝트 루트의 .env 파일에 실제 API Key를 기입할 때까지 로컬 스토리지(오프라인) 모드로 자동 폴백 구동됩니다.'
  );
}

// 유효한 설정 상태인지 플래그 제공
export const isSupabaseConfigured = !isPlaceholder && !!supabaseUrl && supabaseAnonKey.startsWith('eyJ');

// Supabase 라이브러리가 초기화 시 빈 값이나 잘못된 형식에 에러를 내는 것을 방지하는 안전장치
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.dummy';

export const supabase = createClient(safeUrl, safeKey);
