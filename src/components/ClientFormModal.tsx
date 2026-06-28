import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, MapPin, Clipboard } from 'lucide-react';
import type { ClientInfo } from '../types/estimate';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: ClientInfo) => void;
  editingClient: ClientInfo | null;
}

export default function ClientFormModal({
  isOpen,
  onClose,
  onSave,
  editingClient
}: ClientFormModalProps) {
  const [name, setName] = useState('');
  const [bizNumber, setBizNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerTel, setManagerTel] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (editingClient) {
      setName(editingClient.name || '');
      setBizNumber(editingClient.bizNumber || '');
      setOwnerName(editingClient.ownerName || '');
      setAddress(editingClient.address || '');
      setManagerName(editingClient.managerName || '');
      setManagerTel(editingClient.managerTel || '');
      setMemo(editingClient.memo || '');
    } else {
      setName('');
      setBizNumber('');
      setOwnerName('');
      setAddress('');
      setManagerName('');
      setManagerTel('');
      setMemo('');
    }
  }, [editingClient, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('고객사명은 필수 입력 항목입니다.');
      return;
    }

    const clientData: ClientInfo = {
      id: editingClient?.id || `client-${Date.now()}`,
      name: name.trim(),
      bizNumber: bizNumber.trim(),
      ownerName: ownerName.trim(),
      address: address.trim(),
      managerName: managerName.trim(),
      managerTel: managerTel.trim(),
      memo: memo.trim()
    };

    onSave(clientData);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-container" style={{ maxWidth: '550px', width: '95%' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} className="color-blue" />
            {editingClient ? '고객사 정보 수정' : '신규 고객사 등록'}
          </h2>
          <button type="button" className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 고객사명 */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>고객사명 (필수)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                  <Building2 size={15} />
                </span>
                <input 
                  type="text" 
                  className="input-text" 
                  placeholder="예: 주식회사 퍼니웍스" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '36px', width: '100%' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* 사업자 번호 */}
              <div className="form-group">
                <label className="form-label">사업자등록번호</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                    <Clipboard size={15} />
                  </span>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="000-00-00000" 
                    value={bizNumber}
                    onChange={(e) => setBizNumber(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                  />
                </div>
              </div>

              {/* 대표자명 */}
              <div className="form-group">
                <label className="form-label">대표자명</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                    <User size={15} />
                  </span>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="예: 홍길동" 
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* 회사 주소 */}
            <div className="form-group">
              <label className="form-label">회사 주소</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                  <MapPin size={15} />
                </span>
                <input 
                  type="text" 
                  className="input-text" 
                  placeholder="도로명 또는 지번 주소 입력" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ paddingLeft: '36px', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* 담당자명 */}
              <div className="form-group">
                <label className="form-label">담당자 이름</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                    <User size={15} />
                  </span>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="예: 김철수 대리" 
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                  />
                </div>
              </div>

              {/* 담당자 연락처 */}
              <div className="form-group">
                <label className="form-label">담당자 연락처</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                    <Phone size={15} />
                  </span>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="010-0000-0000" 
                    value={managerTel}
                    onChange={(e) => setManagerTel(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* 메모 */}
            <div className="form-group">
              <label className="form-label">고객사 특이사항 (메모)</label>
              <textarea 
                className="input-text" 
                placeholder="결제 조건이나 특이사항을 적어주세요." 
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                style={{ minHeight: '80px', resize: 'none', padding: '10px 12px', width: '100%' }}
              />
            </div>

          </div>

          <div className="modal-footer" style={{ justifyContent: 'flex-end', padding: '16px 20px', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn-primary">
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
