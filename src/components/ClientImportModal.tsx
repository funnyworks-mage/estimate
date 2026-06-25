import { useState } from 'react';
import { Search, X, Building2, User, MapPin } from 'lucide-react';
import type { ClientInfo } from '../types/estimate';

interface ClientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientInfo[];
  onSelectClient: (client: ClientInfo) => void;
}

export default function ClientImportModal({
  isOpen,
  onClose,
  clients,
  onSelectClient
}: ClientImportModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.bizNumber && client.bizNumber.includes(searchQuery)) ||
    (client.managerName && client.managerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-container" style={{ maxWidth: '600px', width: '95%' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} className="color-blue" />
            고객사 불러오기
          </h2>
          <button type="button" className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            자주 거래하는 고객사를 불러와 견적서 수신인 정보를 자동으로 채웁니다.
          </p>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              className="input-text"
              placeholder="고객사명, 사업자번호, 담당자명 검색..."
              style={{ paddingLeft: '36px', width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div 
            style={{ 
              maxHeight: '320px', 
              overflowY: 'auto', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)'
            }}
          >
            {filteredClients.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredClients.map((client) => (
                  <div 
                    key={client.id}
                    onClick={() => {
                      onSelectClient(client);
                      onClose();
                    }}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                    className="client-item-row"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                        {client.name}
                      </span>
                      {client.bizNumber && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                          {client.bizNumber}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {client.ownerName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> 대표: {client.ownerName}
                        </span>
                      )}
                      {client.managerName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> 담당: {client.managerName} {client.managerTel ? `(${client.managerTel})` : ''}
                        </span>
                      )}
                    </div>

                    {client.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={12} /> {client.address}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                검색 결과와 일치하는 고객사가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end', padding: '16px 20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
      
      <style>{`
        .client-item-row:hover {
          background-color: var(--bg-secondary);
        }
        .client-item-row:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
