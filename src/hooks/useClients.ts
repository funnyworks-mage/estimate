import { useState, useEffect } from 'react';
import type { ClientInfo } from '../types/estimate';
import { StorageAPI } from '../utils/storage';

export function useClients() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [isClientCreateModalOpen, setIsClientCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientInfo | null>(null);

  // 초기 거래처 데이터 로드 및 기존 프로젝트로부터 고객사명 자동 이관 마이그레이션
  useEffect(() => {
    async function initLoadClients() {
      try {
        const cls = await StorageAPI.getClients();
        const projs = await StorageAPI.getProjects();
        
        let clientsMigrated = false;
        const updatedClients = [...cls];
        
        projs.forEach(proj => {
          if (proj.clientName && proj.clientName.trim() !== '') {
            const nameTrimmed = proj.clientName.trim();
            const exists = updatedClients.some(c => c.name.trim() === nameTrimmed);
            if (!exists) {
              const newCl: ClientInfo = {
                id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: nameTrimmed,
                bizNumber: '',
                ownerName: '',
                address: '',
                managerName: '',
                managerTel: '',
                memo: '기존 프로젝트에서 자동 이관됨'
              };
              updatedClients.push(newCl);
              clientsMigrated = true;
            }
          }
        });

        if (clientsMigrated) {
          await StorageAPI.saveClients(updatedClients);
          setClients(updatedClients);
        } else {
          setClients(cls);
        }
      } catch (e) {
        console.error('거래처 주소록 초기 로딩 및 마이그레이션 실패:', e);
      }
    }
    initLoadClients();
  }, []);

  const handleSaveClient = async (client: ClientInfo) => {
    const idx = clients.findIndex(c => c.id === client.id);
    let updated: ClientInfo[];
    if (idx > -1) {
      updated = [...clients];
      updated[idx] = client;
    } else {
      updated = [client, ...clients];
    }
    setClients(updated);
    await StorageAPI.saveClient(client);
    setIsClientCreateModalOpen(false);
    setEditingClient(null);
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('이 고객사를 주소록에서 정말 삭제하시겠습니까?')) {
      const updated = clients.filter(c => c.id !== id);
      setClients(updated);
      await StorageAPI.deleteClient(id);
    }
  };

  return {
    clients,
    setClients,
    isClientCreateModalOpen,
    setIsClientCreateModalOpen,
    editingClient,
    setEditingClient,
    handleSaveClient,
    handleDeleteClient
  };
}
