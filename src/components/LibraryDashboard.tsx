import { Plus } from 'lucide-react';
import type { CostItem, EstimateProject } from '../types/estimate';
import { LibraryCard, HRGroupCard, EmptyGroupMessage } from './LibraryCard';
import ItemFormModal from './ItemFormModal';

interface LibraryDashboardProps {
  libraryState: any; // useLibrary 훅의 리턴 값
  projects: EstimateProject[];
  updateProjectsState: (newProjects: EstimateProject[]) => Promise<void>;
}

export default function LibraryDashboard({ 
  libraryState, 
  projects, 
  updateProjectsState 
}: LibraryDashboardProps) {
  const {
    categoriesList,
    unitsList,
    namesList,
    isItemCreateModalOpen,
    setIsItemCreateModalOpen,
    editingItem,
    setEditingItem,
    groupedLibraryItems,
    
    // CRUD 핸들러
    handleSaveCostItem,
    handleDeleteCostItem,
    handleDeleteHRGroup,
    handleUpdateSettings,
    handleCategoryRename,
    handleUnitRename
  } = libraryState;

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">단가 및 항목 라이브러리</h1>
          <p className="workspace-subtitle">자주 반복되는 인건비 단가와 제품 단가를 저장하여 견적 오차를 제로화하세요.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => { setEditingItem(null); setIsItemCreateModalOpen(true); }}
          >
            <Plus size={16} /> 새 기준 단가 등록
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* 1. 인건비 기준 (용역 공수) */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', backgroundColor: 'var(--color-blue)', borderRadius: '2px' }}></div>
            인건비 기준 (용역 공수)
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>({groupedLibraryItems.hrItems.length}개 항목)</span>
          </div>
          <div className="library-grid">
            {(() => {
              const groups: Record<string, CostItem[]> = {};
              const singleItems: CostItem[] = [];
              
              groupedLibraryItems.hrItems.forEach((item: CostItem) => {
                if (item.rank && item.rank !== '해당 없음') {
                  if (!groups[item.name]) {
                    groups[item.name] = [];
                  }
                  groups[item.name].push(item);
                } else {
                  singleItems.push(item);
                }
              });

              const RANK_ORDER: Record<string, number> = {
                'L1 Support': 1,
                'L2 Operator': 2,
                'L3 Specialist': 3,
                'L4 Lead': 4,
                'L5 Director': 5,
                '보조 스태프': 1,
                '운영 스태프': 2,
                '슈퍼바이저': 3,
                '운영 PM': 4,
                '테스터': 1,
                '엔지니어': 2,
                '리드': 3
              };

              // 정렬 처리
              Object.keys(groups).forEach(name => {
                groups[name].sort((a, b) => {
                  const rA = a.rank || '';
                  const rB = b.rank || '';
                  return (RANK_ORDER[rA] || 0) - (RANK_ORDER[rB] || 0);
                });
              });

              return (
                <>
                  {Object.keys(groups).map(name => {
                    const group = groups[name];
                    const repItem = group.find(g => 
                      g.rank === 'L2 Operator' || 
                      g.rank === '엔지니어' || 
                      g.rank === '운영 스태프'
                    ) || group[0];
                    return (
                      <HRGroupCard 
                        key={name}
                        name={name}
                        items={group}
                        repItem={repItem}
                        onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }}
                        onDeleteGroup={handleDeleteHRGroup}
                      />
                    );
                  })}
                  {singleItems.map(item => (
                    <LibraryCard 
                      key={item.id} 
                      item={item} 
                      onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }} 
                      onDelete={handleDeleteCostItem} 
                    />
                  ))}
                </>
              );
            })()}
            {groupedLibraryItems.hrItems.length === 0 && <EmptyGroupMessage />}
          </div>
        </div>

        {/* 2. 디자인 결과물 기준 */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', backgroundColor: 'var(--color-red)', borderRadius: '2px' }}></div>
            디자인 결과물 기준
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>({groupedLibraryItems.designOutputItems.length}개 항목)</span>
          </div>
          <div className="library-grid">
            {groupedLibraryItems.designOutputItems.map((item: CostItem) => (
              <LibraryCard key={item.id} item={item} onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }} onDelete={handleDeleteCostItem} />
            ))}
            {groupedLibraryItems.designOutputItems.length === 0 && <EmptyGroupMessage />}
          </div>
        </div>

        {/* 3. 개발 결과물 기준 */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', backgroundColor: '#9b59b6', borderRadius: '2px' }}></div>
            개발 결과물 기준
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>({groupedLibraryItems.devOutputItems.length}개 항목)</span>
          </div>
          <div className="library-grid">
            {groupedLibraryItems.devOutputItems.map((item: CostItem) => (
              <LibraryCard key={item.id} item={item} onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }} onDelete={handleDeleteCostItem} />
            ))}
            {groupedLibraryItems.devOutputItems.length === 0 && <EmptyGroupMessage />}
          </div>
        </div>

        {/* 4. 생산 결과물 기준 */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', backgroundColor: '#2ecc71', borderRadius: '2px' }}></div>
            생산 결과물 기준
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>({groupedLibraryItems.productionOutputItems.length}개 항목)</span>
          </div>
          <div className="library-grid">
            {groupedLibraryItems.productionOutputItems.map((item: CostItem) => (
              <LibraryCard key={item.id} item={item} onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }} onDelete={handleDeleteCostItem} />
            ))}
            {groupedLibraryItems.productionOutputItems.length === 0 && <EmptyGroupMessage />}
          </div>
        </div>

        {/* 5. 기타 결과물 기준 */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', backgroundColor: '#e67e22', borderRadius: '2px' }}></div>
            기타 결과물 기준
            <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>({groupedLibraryItems.otherOutputItems.length}개 항목)</span>
          </div>
          <div className="library-grid">
            {groupedLibraryItems.otherOutputItems.map((item: CostItem) => (
              <LibraryCard key={item.id} item={item} onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }} onDelete={handleDeleteCostItem} />
            ))}
            {groupedLibraryItems.otherOutputItems.length === 0 && <EmptyGroupMessage />}
          </div>
        </div>



      </div>

      {/* --- C. 라이브러리 탭: 단일 기준단가 등록/편집 모달 --- */}
      {isItemCreateModalOpen && (
        <ItemFormModal 
          item={editingItem}
          categoriesList={categoriesList}
          unitsList={unitsList}
          namesList={namesList}
          onClose={() => setIsItemCreateModalOpen(false)}
          onSave={handleSaveCostItem}
          onCategoryRename={(oldVal, newVal) => handleCategoryRename(oldVal, newVal, projects, updateProjectsState)}
          onUnitRename={(oldVal, newVal) => handleUnitRename(oldVal, newVal, projects, updateProjectsState)}
          onUpdateSettings={handleUpdateSettings}
        />
      )}


    </div>
  );
}
