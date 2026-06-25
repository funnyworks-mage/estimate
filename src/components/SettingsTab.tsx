import React from 'react';
import { Upload } from 'lucide-react';
import type { VendorInfo } from '../types/estimate';

interface SettingsTabProps {
  vendorInfo: VendorInfo;
  setVendorInfo: React.Dispatch<React.SetStateAction<VendorInfo>>;
  onSave: (e: React.FormEvent) => void;
  onSealUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SettingsTab({
  vendorInfo,
  setVendorInfo,
  onSave,
  onSealUpload,
  onLogoUpload
}: SettingsTabProps) {
  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">설정 및 사내 정보</h1>
          <p className="workspace-subtitle">견적서에 공급자로 자동 날인될 정보와 법적 정보들을 기입하세요.</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        
        <form className="card" onSubmit={onSave}>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>공급자 정보 설정</div>
          
          <div className="form-group">
            <label className="form-label">상호 / 회사명</label>
            <input 
              type="text" 
              className="input-text" 
              required
              value={vendorInfo.companyName}
              onChange={(e) => setVendorInfo({ ...vendorInfo, companyName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">사업자등록번호</label>
            <input 
              type="text" 
              className="input-text" 
              required
              placeholder="예: 000-00-00000"
              value={vendorInfo.bizNumber}
              onChange={(e) => setVendorInfo({ ...vendorInfo, bizNumber: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">대표자 성명</label>
            <input 
              type="text" 
              className="input-text" 
              required
              value={vendorInfo.ownerName}
              onChange={(e) => setVendorInfo({ ...vendorInfo, ownerName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">소재지 주소</label>
            <input 
              type="text" 
              className="input-text" 
              required
              value={vendorInfo.address}
              onChange={(e) => setVendorInfo({ ...vendorInfo, address: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">대표 연락처</label>
              <input 
                type="text" 
                className="input-text" 
                value={vendorInfo.tel || ''}
                onChange={(e) => setVendorInfo({ ...vendorInfo, tel: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">이메일</label>
              <input 
                type="email" 
                className="input-text" 
                value={vendorInfo.email || ''}
                onChange={(e) => setVendorInfo({ ...vendorInfo, email: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            설정 저장하기
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          <div className="card">
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>회사 직인 (도장) 등록</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              A4로 발행되는 견적서 원장 공급자명 우측에 날인될 도장 이미지를 등록합니다. 투명 배경(PNG)에 붉은색 도장 이미지를 권장합니다.
            </p>

            <div 
              style={{ 
                border: '2px dashed var(--border-color)', 
                borderRadius: 'var(--radius-lg)', 
                height: '180px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'var(--bg-primary)',
                marginBottom: '20px',
                position: 'relative'
              }}
            >
              {vendorInfo.sealImage ? (
                <img 
                  src={vendorInfo.sealImage} 
                  alt="회사 직인 도장" 
                  style={{ height: '120px', width: '120px', objectFit: 'contain' }} 
                />
              ) : (
                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>등록된 도장 없음</span>
              )}
            </div>

            <label className="btn btn-secondary" style={{ width: '100%', cursor: 'pointer' }}>
              <Upload size={16} /> 도장 이미지 파일 선택 (.png, .jpg)
              <input 
                type="file" 
                accept="image/*" 
                onChange={onSealUpload} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>

          <div className="card">
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>회사 로고 등록</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              A4로 발행되는 견적서 원장 좌측 상단에 표시될 로고 이미지를 등록합니다. 투명 배경(PNG)의 가로형 로고 이미지를 권장합니다.
            </p>

            <div 
              style={{ 
                border: '2px dashed var(--border-color)', 
                borderRadius: 'var(--radius-lg)', 
                height: '120px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'var(--bg-primary)',
                marginBottom: '20px',
                position: 'relative'
              }}
            >
              {vendorInfo.logoImage ? (
                <img 
                  src={vendorInfo.logoImage} 
                  alt="회사 로고" 
                  style={{ maxHeight: '80px', maxWidth: '240px', objectFit: 'contain' }} 
                />
              ) : (
                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>등록된 로고 없음</span>
              )}
            </div>

            <label className="btn btn-secondary" style={{ width: '100%', cursor: 'pointer' }}>
              <Upload size={16} /> 로고 이미지 파일 선택 (.png, .jpg)
              <input 
                type="file" 
                accept="image/*" 
                onChange={onLogoUpload} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}
