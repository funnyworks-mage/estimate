import { useState, useEffect, useMemo } from 'react';
import type { CostItem, CostPackage, EstimateProject } from '../types/estimate';
import { StorageAPI } from '../utils/storage';

export function useLibrary() {
  const [libraryItems, setLibraryItems] = useState<CostItem[]>([]);
  const [libraryPackages, setLibraryPackages] = useState<CostPackage[]>([]);
  
  // 드롭다운 설정 상태
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [unitsList, setUnitsList] = useState<string[]>([]);
  const [namesList, setNamesList] = useState<Record<string, string[]>>({});
  
  const [isItemCreateModalOpen, setIsItemCreateModalOpen] = useState(false);
  const [isPackageCreateModalOpen, setIsPackageCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<CostPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 데이터 로딩
  useEffect(() => {
    async function loadLibraryData() {
      try {
        setIsLoading(true);
        const items = await StorageAPI.getCostItems();
        const pkgs = await StorageAPI.getCostPackages();
        const settings = await StorageAPI.getSettings();
        
        setLibraryItems(items);
        setLibraryPackages(pkgs);
        setCategoriesList(settings.categories);
        setUnitsList(settings.units);
        setNamesList(settings.namesList);
      } catch (e) {
        console.error('라이브러리 데이터 로딩 실패:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadLibraryData();
  }, []);

  // --- 항목 라이브러리 CRUD (Library Tab) ---
  const handleSaveCostItem = async (item: CostItem | CostItem[]) => {
    let updated: CostItem[] = [...libraryItems];
    
    if (Array.isArray(item)) {
      // 5대 등급 일괄 저장 처리
      updated = [...item, ...updated];
      setLibraryItems(updated);
      await StorageAPI.saveCostItem(item);
    } else {
      // 단일 저장 및 수정 처리
      const isHR = item.category.includes('인건비');
      const hasRank = item.rank && item.rank !== '해당 없음';

      if (isHR && hasRank) {
        const RANK_MULTIPLIERS: Record<string, number> = {
          'L1 Support': 0.8,
          'L2 Operator': 1.0,
          'L3 Specialist': 1.5,
          'L4 Lead': 2.0,
          'L5 Director': 3.0
        };
        const mult = RANK_MULTIPLIERS[item.rank!] || 1.0;
        const basePrice = item.rank === 'L2 Operator' ? item.defaultPrice : Math.round(item.defaultPrice / mult);

        const groupItems = libraryItems.filter(i => i.name === item.name && i.rank && i.rank !== '해당 없음');
        
        if (groupItems.length > 0) {
          const updatedGroup = groupItems.map(gi => {
            const giMult = RANK_MULTIPLIERS[gi.rank!] || 1.0;
            const newPrice = Math.round(basePrice * giMult);
            
            if (gi.id === item.id) {
              return {
                ...item,
                basePrice
              };
            }
            return {
              ...gi,
              basePrice,
              defaultPrice: newPrice,
              unit: item.unit,
              category: item.category,
              vatType: item.vatType,
              formulaType: item.formulaType
            };
          });

          updated = libraryItems.map(i => {
            const matched = updatedGroup.find(ug => ug.id === i.id);
            return matched || i;
          });

          const isBrandNew = !groupItems.some(gi => gi.id === item.id);
          if (isBrandNew) {
            updated = [{ ...item, basePrice }, ...updated];
          }

          setLibraryItems(updated);
          await StorageAPI.saveCostItem(updatedGroup);
        } else {
          const itemWithBase = { ...item, basePrice };
          const idx = libraryItems.findIndex(i => i.id === item.id);
          if (idx > -1) {
            updated[idx] = itemWithBase;
          } else {
            updated = [itemWithBase, ...updated];
          }
          setLibraryItems(updated);
          await StorageAPI.saveCostItem(itemWithBase);
        }
      } else {
        const idx = libraryItems.findIndex(i => i.id === item.id);
        if (idx > -1) {
          updated[idx] = item;
        } else {
          updated = [item, ...updated];
        }
        setLibraryItems(updated);
        await StorageAPI.saveCostItem(item);
      }
    }
    
    setIsItemCreateModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteCostItem = async (id: string) => {
    if (confirm('이 항목을 라이브러리에서 정말 삭제하시겠습니까? (이미 작성된 견적서에는 영향을 주지 않습니다)')) {
      const updated = libraryItems.filter(i => i.id !== id);
      setLibraryItems(updated);
      await StorageAPI.deleteCostItem(id);
    }
  };

  const handleDeleteHRGroup = async (name: string) => {
    if (confirm(`'${name}' 인력 항목의 5대 레벨 단가 전체를 라이브러리에서 일괄 삭제하시겠습니까? (이미 작성된 견적서에는 영향을 주지 않습니다)`)) {
      const updated = libraryItems.filter(i => i.name !== name);
      setLibraryItems(updated);
      
      const toDelete = libraryItems.filter(i => i.name === name);
      for (const item of toDelete) {
        await StorageAPI.deleteCostItem(item.id);
      }
    }
  };

  // --- 드롭다운 설정 CRUD 및 Cascade 전파 핸들러 ---
  const handleUpdateSettings = async (updatedSettings: { categories: string[]; units: string[]; namesList: Record<string, string[]> }) => {
    setCategoriesList(updatedSettings.categories);
    setUnitsList(updatedSettings.units);
    setNamesList(updatedSettings.namesList);
    await StorageAPI.saveSettings(updatedSettings);
  };

  const handleCategoryRename = async (
    oldVal: string, 
    newVal: string,
    projects: EstimateProject[],
    updateProjectsState: (newProjects: EstimateProject[]) => Promise<void>
  ) => {
    const trimmed = newVal.trim();
    if (!trimmed || oldVal === trimmed) return;

    const updatedCats = categoriesList.map(c => c === oldVal ? trimmed : c);
    
    const updatedNames = { ...namesList };
    if (updatedNames[oldVal]) {
      updatedNames[trimmed] = updatedNames[oldVal];
      delete updatedNames[oldVal];
    } else {
      updatedNames[trimmed] = [];
    }

    setCategoriesList(updatedCats);
    setNamesList(updatedNames);
    await StorageAPI.saveSettings({
      categories: updatedCats,
      units: unitsList,
      namesList: updatedNames
    });

    const updatedLibraryItems = libraryItems.map(item => {
      if (item.category === oldVal) {
        return { ...item, category: trimmed };
      }
      return item;
    });
    setLibraryItems(updatedLibraryItems);
    await StorageAPI.saveCostItems(updatedLibraryItems);

    const updatedProjects = projects.map(proj => {
      const updatedSections = proj.sections.map(sec => {
        const updatedRows = sec.rows.map(row => {
          if (row.category === oldVal) {
            return { ...row, category: trimmed };
          }
          return row;
        });
        return { ...sec, rows: updatedRows };
      });
      return { ...proj, sections: updatedSections };
    });
    await updateProjectsState(updatedProjects);
  };

  const handleUnitRename = async (
    oldVal: string, 
    newVal: string,
    projects: EstimateProject[],
    updateProjectsState: (newProjects: EstimateProject[]) => Promise<void>
  ) => {
    const trimmed = newVal.trim();
    if (!trimmed || oldVal === trimmed) return;

    const updatedUnits = unitsList.map(u => u === oldVal ? trimmed : u);
    setUnitsList(updatedUnits);
    await StorageAPI.saveSettings({
      categories: categoriesList,
      units: updatedUnits,
      namesList
    });

    const updatedLibraryItems = libraryItems.map(item => {
      if (item.unit === oldVal) {
        return { ...item, unit: trimmed };
      }
      return item;
    });
    setLibraryItems(updatedLibraryItems);
    await StorageAPI.saveCostItems(updatedLibraryItems);

    const updatedProjects = projects.map(proj => {
      const updatedSections = proj.sections.map(sec => {
        const updatedRows = sec.rows.map(row => {
          if (row.unit === oldVal) {
            return { ...row, unit: trimmed };
          }
          return row;
        });
        return { ...sec, rows: updatedRows };
      });
      return { ...proj, sections: updatedSections };
    });
    await updateProjectsState(updatedProjects);
  };

  // --- 패키지 라이브러리 CRUD (Library Tab) ---
  const handleSaveCostPackage = async (pkg: CostPackage) => {
    const idx = libraryPackages.findIndex(p => p.id === pkg.id);
    let updated: CostPackage[];
    if (idx > -1) {
      updated = [...libraryPackages];
      updated[idx] = pkg;
    } else {
      updated = [pkg, ...libraryPackages];
    }
    setLibraryPackages(updated);
    await StorageAPI.saveCostPackage(pkg);
    setIsPackageCreateModalOpen(false);
    setEditingPackage(null);
  };

  const handleDeleteCostPackage = async (id: string) => {
    if (confirm('이 패키지를 라이브러리에서 정말 삭제하시겠습니까?')) {
      const updated = libraryPackages.filter(p => p.id !== id);
      setLibraryPackages(updated);
      await StorageAPI.deleteCostPackage(id);
    }
  };

  // --- 라이브러리 품목의 비즈니스 기준별 그룹화 ---
  const groupedLibraryItems = useMemo(() => {
    const hrItems: CostItem[] = [];
    const designOutputItems: CostItem[] = [];
    const devOutputItems: CostItem[] = [];
    const productionOutputItems: CostItem[] = [];
    const otherOutputItems: CostItem[] = [];

    libraryItems.forEach(item => {
      const cat = item.category || '';
      const formula = item.formulaType;
      const lowerName = item.name.toLowerCase();

      const isHRItem = 
        cat === '인건비 기준 (용역 공수)' ||
        cat === '인건비' || 
        cat === '운영인력' || 
        formula === 'PEOPLE_x_DAYS_x_PRICE' || 
        formula === 'MD_x_PRICE' ||
        lowerName.includes('pm') || 
        lowerName.includes('디자이너 투입') ||
        lowerName.includes('개발자') ||
        lowerName.includes('스태프') ||
        lowerName.includes('운영 인력') ||
        lowerName.includes('기획 인력');

      const isDesignOutput = 
        !isHRItem && (
          cat === '디자인 결과물 기준' ||
          cat === '디자인' ||
          lowerName.includes('디자인 시안') ||
          lowerName.includes('시안')
        );

      const isDevOutput = 
        !isHRItem && 
        !isDesignOutput && (
          cat === '개발 결과물 기준' ||
          cat === '개발비' || 
          cat === '개발' || 
          cat === '유지보수' || 
          lowerName.includes('유지보수') || 
          lowerName.includes('유지관리') ||
          lowerName.includes('구축') ||
          lowerName.includes('시스템')
        );

      const isProductionOutput = 
        !isHRItem && 
        !isDesignOutput && 
        !isDevOutput && (
          cat === '생산 결과물 기준' ||
          cat === '제작비' || 
          cat === '시공' || 
          cat === '제작' || 
          lowerName.includes('제작') || 
          lowerName.includes('시공') || 
          lowerName.includes('생산') ||
          lowerName.includes('설치')
        );

      if (isHRItem) {
        hrItems.push(item);
      } 
      else if (isDesignOutput) {
        designOutputItems.push(item);
      } 
      else if (isDevOutput) {
        devOutputItems.push(item);
      } 
      else if (isProductionOutput) {
        productionOutputItems.push(item);
      }
      else {
        otherOutputItems.push(item);
      }
    });

    return { hrItems, designOutputItems, devOutputItems, productionOutputItems, otherOutputItems };
  }, [libraryItems]);

  const handleResetToDefaultCostItems = async () => {
    if (confirm('정말 사내 표준 단가표 프리셋(L1~L5 등급 완비 표준안)으로 단가 라이브러리를 초기화하시겠습니까?\n기존 견적서에 적용하셨던 단가 정보는 자동으로 역복원되어 보존됩니다.')) {
      const healed = StorageAPI.getHealedDefaultCostItems();
      setLibraryItems(healed);
      await StorageAPI.saveCostItems(healed);
      alert('과거 견적 단가를 복원하여 표준 단가표 초기화가 완료되었습니다!');
    }
  };

  return {
    libraryItems,
    setLibraryItems,
    libraryPackages,
    setLibraryPackages,
    categoriesList,
    unitsList,
    namesList,
    isItemCreateModalOpen,
    setIsItemCreateModalOpen,
    isPackageCreateModalOpen,
    setIsPackageCreateModalOpen,
    editingItem,
    setEditingItem,
    editingPackage,
    setEditingPackage,
    isLoading,
    groupedLibraryItems,
    
    // CRUD 핸들러
    handleSaveCostItem,
    handleDeleteCostItem,
    handleDeleteHRGroup,
    handleSaveCostPackage,
    handleDeleteCostPackage,
    handleUpdateSettings,
    handleCategoryRename,
    handleUnitRename,
    handleResetToDefaultCostItems
  };
}
