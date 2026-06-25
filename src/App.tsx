import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Database, 
  Settings, 
  Plus, 
  Trash2, 
  Printer, 
  Eye, 
  Copy, 
  X,
  ArrowLeft, 
  Upload, 
  Download,
  Terminal,
  Palette,
  Hammer,
  HelpCircle
} from 'lucide-react';
import type { 
  CostItem, 
  CostPackage, 
  EstimateProject, 
  EstimateRow, 
  EstimateSection, 
  VendorInfo
} from './types/estimate';
import { StorageAPI, calculateRowAmounts } from './utils/storage';

// 컴포넌트 임포트
import ItemFormModal from './components/ItemFormModal';
import PackageFormModal from './components/PackageFormModal';
import { LibraryCard, EmptyGroupMessage } from './components/LibraryCard';
import LibraryImportModal from './components/LibraryImportModal';
import PackageImportModal from './components/PackageImportModal';
import SettingsTab from './components/SettingsTab';
import EstimatePreviewModal from './components/EstimatePreviewModal';

// 등급별 추천 배수 정의 (에디터 내 실시간 연동용)
const APP_RANK_MULTIPLIERS: Record<string, number> = {
  'Junior': 1.0,
  'Associate': 1.3,
  'Professional': 1.7,
  'Senior': 2.3,
  'Lead': 3.0
};

export default function App() {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'estimates' | 'library' | 'settings'>('estimates');
  
  // 데이터 상태
  const [projects, setProjects] = useState<EstimateProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<CostItem[]>([]);
  const [libraryPackages, setLibraryPackages] = useState<CostPackage[]>([]);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>({
    companyName: '',
    bizNumber: '',
    ownerName: '',
    address: ''
  });

  // UI / 모달 상태
  const [isFormSelectModalOpen, setIsFormSelectModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  
  // 라이브러리 탭 관리용 상태
  const [librarySubTab, setLibrarySubTab] = useState<'items' | 'packages'>('items');
  const [isItemCreateModalOpen, setIsItemCreateModalOpen] = useState(false);
  const [isPackageCreateModalOpen, setIsPackageCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<CostPackage | null>(null);

  // --- 초기 데이터 로드 ---
  useEffect(() => {
    setProjects(StorageAPI.getProjects());
    setLibraryItems(StorageAPI.getCostItems());
    setLibraryPackages(StorageAPI.getCostPackages());
    setVendorInfo(StorageAPI.getVendorInfo());
  }, []);

  // --- 현재 선택된 프로젝트 정보 ---
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // --- 데이터 변경 시 저장 핸들러 ---
  const updateProjectsState = (newProjects: EstimateProject[]) => {
    setProjects(newProjects);
    StorageAPI.saveProjects(newProjects);
  };

  const updateLibraryItemsState = (newItems: CostItem[]) => {
    setLibraryItems(newItems);
    StorageAPI.saveCostItems(newItems);
  };

  const updateLibraryPackagesState = (newPackages: CostPackage[]) => {
    setLibraryPackages(newPackages);
    StorageAPI.saveCostPackages(newPackages);
  };

  // --- 견적서 프로젝트 CRUD ---
  const handleCreateNewProject = (type: 'IT' | 'DESIGN' | 'BUILD' | 'OTHER') => {
    const defaultVendor = StorageAPI.getVendorInfo();
    
    // 타입별 최적화된 초기 섹션 셋업
    let initialSections: EstimateSection[] = [];
    let titlePlaceholder = '새 견적 프로젝트';
    
    if (type === 'IT') {
      titlePlaceholder = 'IT 시스템 구축 및 개발 용역 견적';
      initialSections = [
        {
          id: `sec-it-1`,
          name: '1. 기획 및 디자인 부문 (디자인/컨설팅)',
          rows: []
        },
        {
          id: `sec-it-2`,
          name: '2. 시스템 구축 및 소프트웨어 개발 부문',
          rows: []
        }
      ];
    } else if (type === 'DESIGN') {
      titlePlaceholder = '브랜드 디자인 및 어플리케이션 제작 견적';
      initialSections = [
        {
          id: `sec-design-1`,
          name: '1. 브랜드 시각 아이덴티티(BI/BX) 디자인 부문',
          rows: []
        },
        {
          id: `sec-design-2`,
          name: '2. 제작 어플리케이션 및 최종 산출물 부문',
          rows: []
        }
      ];
    } else if (type === 'BUILD') {
      titlePlaceholder = '인테리어 시공 및 부스 자재 납품 견적';
      initialSections = [
        {
          id: `sec-build-1`,
          name: '1. 자재 및 원부자재 하드웨어 공급 부문',
          rows: []
        },
        {
          id: `sec-build-2`,
          name: '2. 현장 제작 및 설치 시공 인건비 부문',
          rows: []
        }
      ];
    } else {
      titlePlaceholder = '일반 품목 및 서비스 납품 견적';
      initialSections = [
        {
          id: `sec-other-1`,
          name: '1. 일반 공급 및 서비스 부문',
          rows: []
        }
      ];
    }

    const newProj: EstimateProject = {
      id: `proj-${Date.now()}`,
      projectType: type,
      title: titlePlaceholder,
      clientName: '고객사 귀중',
      estimateDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      vendorInfo: defaultVendor,
      remarks: '1. 본 견적은 발행일 기준 30일간 유효합니다.\n2. 공급 조건 및 원부자재 변동 시 견적 금액이 조정될 수 있습니다.',
      status: 'draft',
      createdAt: new Date().toISOString(),
      sections: initialSections
    };

    const updated = [newProj, ...projects];
    updateProjectsState(updated);
    setSelectedProjectId(newProj.id);
    setIsFormSelectModalOpen(false);
  };

  const handleDuplicateProject = (proj: EstimateProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated: EstimateProject = {
      ...JSON.parse(JSON.stringify(proj)),
      id: `proj-${Date.now()}`,
      title: `${proj.title} (복사본)`,
      createdAt: new Date().toISOString(),
      status: 'draft'
    };
    const updated = [duplicated, ...projects];
    updateProjectsState(updated);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 견적 프로젝트를 정말 삭제하시겠습니까?')) {
      const updated = projects.filter(p => p.id !== id);
      updateProjectsState(updated);
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
    }
  };

  const handleUpdateProjectField = <K extends keyof EstimateProject>(field: K, value: EstimateProject[K]) => {
    if (!activeProject) return;
    const updated = projects.map(p => {
      if (p.id === activeProject.id) {
        return { ...p, [field]: value };
      }
      return p;
    });
    updateProjectsState(updated);
  };

  // --- 섹션 관리 ---
  const handleAddSection = () => {
    if (!activeProject) return;
    const newSection: EstimateSection = {
      id: `sec-${Date.now()}`,
      name: `${activeProject.sections.length + 1}. 새로운 섹션 부문`,
      rows: []
    };
    const updatedSections = [...activeProject.sections, newSection];
    handleUpdateProjectField('sections', updatedSections);
  };

  const handleUpdateSectionName = (sectionId: string, newName: string) => {
    if (!activeProject) return;
    const updatedSections = activeProject.sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, name: newName };
      }
      return sec;
    });
    handleUpdateProjectField('sections', updatedSections);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!activeProject) return;
    if (confirm('이 섹션과 포함된 모든 항목을 정말 삭제하시겠습니까?')) {
      const updatedSections = activeProject.sections.filter(sec => sec.id !== sectionId);
      handleUpdateProjectField('sections', updatedSections);
    }
  };

  // --- 테이블 행(Row) 관리 ---
  const handleAddManualRow = (sectionId: string) => {
    if (!activeProject) return;
    const newRow: EstimateRow = {
      id: `row-${Date.now()}`,
      isSelected: true,
      category: '직접 입력',
      name: '새 항목명',
      size: activeProject.projectType === 'BUILD' ? '규격 지정' : undefined,
      unit: 'EA',
      quantity: 1,
      price: 0,
      supplyPrice: 0,
      vat: 0,
      totalPrice: 0,
      formulaType: activeProject.projectType === 'IT' || activeProject.projectType === 'DESIGN' ? 'PEOPLE_x_DAYS_x_PRICE' : 'QTY_x_PRICE',
      vatType: 'TAX',
      description: ''
    };

    const updatedSections = activeProject.sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, rows: [...sec.rows, newRow] };
      }
      return sec;
    });
    handleUpdateProjectField('sections', updatedSections);
  };

  const handleUpdateRowField = (
    sectionId: string, 
    rowId: string, 
    field: keyof EstimateRow, 
    value: any
  ) => {
    if (!activeProject) return;
    const updatedSections = activeProject.sections.map(sec => {
      if (sec.id === sectionId) {
        const updatedRows = sec.rows.map(row => {
          if (row.id === rowId) {
            let updatedRow = { ...row, [field]: value };
            
            // 등급(rank) 변경 시 실시간 단가 연동 계산 엔진 (하위 호환 역산 내장)
            if (field === 'rank') {
              if (value && value !== '해당 없음') {
                const newRank = value as string;
                const mult = APP_RANK_MULTIPLIERS[newRank] || 1.0;
                
                if (updatedRow.basePrice) {
                  updatedRow.price = Math.round(updatedRow.basePrice * mult);
                } else {
                  const currentRank = row.rank || 'Junior';
                  const currentMult = APP_RANK_MULTIPLIERS[currentRank] || 1.0;
                  const estimatedBase = Math.round(row.price / currentMult);
                  updatedRow.basePrice = estimatedBase;
                  updatedRow.price = Math.round(estimatedBase * mult);
                }
              } else {
                updatedRow.basePrice = undefined;
              }
            }
            
            if (
              field === 'quantity' || 
              field === 'price' || 
              field === 'rank' || 
              field === 'people' || 
              field === 'days' || 
              field === 'formulaType' || 
              field === 'vatType'
            ) {
              const amounts = calculateRowAmounts(updatedRow);
              return { ...updatedRow, ...amounts };
            }
            return updatedRow;
          }
          return row;
        });
        return { ...sec, rows: updatedRows };
      }
      return sec;
    });
    handleUpdateProjectField('sections', updatedSections);
  };

  const handleDeleteRow = (sectionId: string, rowId: string) => {
    if (!activeProject) return;
    const updatedSections = activeProject.sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, rows: sec.rows.filter(row => row.id !== rowId) };
      }
      return sec;
    });
    handleUpdateProjectField('sections', updatedSections);
  };

  // --- 스마트 섹션 분배 알고리즘 (Smart Auto-Routing) ---
  const findBestSectionForCategory = (
    itemCategory: string,
    sections: EstimateSection[],
    fallbackSectionId: string
  ): string => {
    const cat = itemCategory.toLowerCase();
    
    for (const sec of sections) {
      const secName = sec.name.toLowerCase();
      
      if (cat.includes('개발') || cat.includes('기술') || cat.includes('be') || cat.includes('fe')) {
        if (secName.includes('개발') || secName.includes('구축') || secName.includes('시스템') || secName.includes('소프트웨어')) {
          return sec.id;
        }
      }
      
      if (cat.includes('디자인') || cat.includes('시각') || cat.includes('기획')) {
        if (secName.includes('디자인') || secName.includes('기획') || secName.includes('컨설팅') || secName.includes('시각') || secName.includes('ui') || secName.includes('ux')) {
          return sec.id;
        }
      }
      
      if (cat.includes('인건비') || cat.includes('인력') || cat.includes('운영')) {
        if (secName.includes('인건비') || secName.includes('인력') || secName.includes('용역') || secName.includes('기획') || secName.includes('스태프') || secName.includes('현장')) {
          return sec.id;
        }
      }
      
      if (cat.includes('식음료') || cat.includes('자재') || cat.includes('원자재') || cat.includes('재료')) {
        if (secName.includes('식음료') || secName.includes('자재') || secName.includes('f&b') || secName.includes('공급') || secName.includes('재료')) {
          return sec.id;
        }
      }

      if (cat.includes('시공') || cat.includes('제작') || cat.includes('설치')) {
        if (secName.includes('시공') || secName.includes('제작') || secName.includes('설치') || secName.includes('현장') || secName.includes('부스')) {
          return sec.id;
        }
      }
    }
    
    return fallbackSectionId;
  };

  // --- 라이브러리 항목 불러오기 실행 ---
  const handleOpenLibraryModal = (sectionId: string) => {
    setTargetSectionId(sectionId);
    setIsLibraryModalOpen(true);
  };

  const handleImportSelectedItems = (selectedModalItemIds: string[]) => {
    if (!activeProject || !targetSectionId) return;
    
    const selectedItems = libraryItems.filter(item => selectedModalItemIds.includes(item.id));
    
    const sectionRowsMap: Record<string, EstimateRow[]> = {};
    activeProject.sections.forEach(sec => {
      sectionRowsMap[sec.id] = [];
    });

    selectedItems.forEach((item, idx) => {
      const bestSectionId = findBestSectionForCategory(
        item.category,
        activeProject.sections,
        targetSectionId
      );

      const baseRow: Omit<EstimateRow, 'supplyPrice' | 'vat' | 'totalPrice'> = {
        id: `row-${Date.now()}-${idx}`,
        isSelected: true,
        category: item.category,
        name: item.name,
        size: activeProject.projectType === 'BUILD' ? '기본 규격' : undefined,
        unit: item.unit,
        quantity: 1,
        people: item.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? 1 : undefined,
        days: item.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? 1 : undefined,
        price: item.defaultPrice,
        rank: item.rank,
        basePrice: item.basePrice,
        formulaType: item.formulaType,
        vatType: item.vatType,
        description: item.description || ''
      };
      
      const amounts = calculateRowAmounts(baseRow);
      const fullRow = { ...baseRow, ...amounts } as EstimateRow;
      
      sectionRowsMap[bestSectionId].push(fullRow);
    });

    const updatedSections = activeProject.sections.map(sec => {
      const rowsToAdd = sectionRowsMap[sec.id] || [];
      if (rowsToAdd.length > 0) {
        return { ...sec, rows: [...sec.rows, ...rowsToAdd] };
      }
      return sec;
    });

    handleUpdateProjectField('sections', updatedSections);
    setIsLibraryModalOpen(false);
  };

  // --- 패키지 불러오기 실행 ---
  const handleOpenPackageModal = (sectionId: string) => {
    setTargetSectionId(sectionId);
    setIsPackageModalOpen(true);
  };

  const handleImportPackage = (pkg: CostPackage) => {
    if (!activeProject || !targetSectionId) return;

    const sectionRowsMap: Record<string, EstimateRow[]> = {};
    activeProject.sections.forEach(sec => {
      sectionRowsMap[sec.id] = [];
    });

    pkg.items.forEach((pkgItem, idx) => {
      const origItem = libraryItems.find(i => i.id === pkgItem.itemId);
      if (!origItem) return;

      const bestSectionId = findBestSectionForCategory(
        origItem.category,
        activeProject.sections,
        targetSectionId
      );

      const baseRow: Omit<EstimateRow, 'supplyPrice' | 'vat' | 'totalPrice'> = {
        id: `row-pkg-${Date.now()}-${idx}`,
        isSelected: true,
        category: origItem.category,
        name: origItem.name,
        size: activeProject.projectType === 'BUILD' ? '기본 규격' : undefined,
        unit: origItem.unit,
        quantity: pkgItem.defaultQuantity,
        people: pkgItem.defaultPeople,
        days: pkgItem.defaultDays,
        price: origItem.defaultPrice,
        formulaType: origItem.formulaType,
        vatType: origItem.vatType,
        description: origItem.description || ''
      };

      const amounts = calculateRowAmounts(baseRow);
      const fullRow = { ...baseRow, ...amounts } as EstimateRow;
      
      sectionRowsMap[bestSectionId].push(fullRow);
    });

    const updatedSections = activeProject.sections.map(sec => {
      const rowsToAdd = sectionRowsMap[sec.id] || [];
      if (rowsToAdd.length > 0) {
        return { ...sec, rows: [...sec.rows, ...rowsToAdd] };
      }
      return sec;
    });

    handleUpdateProjectField('sections', updatedSections);
    setIsPackageModalOpen(false);
  };

  // --- 금액 요약 연산 ---
  const projectSummary = useMemo(() => {
    if (!activeProject) return { supplyTotal: 0, vatTotal: 0, grandTotal: 0 };
    
    let supplyTotal = 0;
    let vatTotal = 0;

    activeProject.sections.forEach(sec => {
      sec.rows.forEach(row => {
        if (row.isSelected) {
          supplyTotal += row.supplyPrice;
          vatTotal += row.vat;
        }
      });
    });

    return {
      supplyTotal,
      vatTotal,
      grandTotal: supplyTotal + vatTotal
    };
  }, [activeProject]);

  // --- 설정 (공급자 정보) 저장 ---
  const handleSaveVendorInfo = (e: React.FormEvent) => {
    e.preventDefault();
    StorageAPI.saveVendorInfo(vendorInfo);
    alert('사내 정보가 성공적으로 저장되었습니다.');
    
    if (activeProject) {
      handleUpdateProjectField('vendorInfo', vendorInfo);
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

  // --- 백업 복구 액션 ---
  const handleExportData = () => {
    const dataStr = StorageAPI.exportData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `estimate_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (StorageAPI.importData(result)) {
          alert('데이터가 성공적으로 복원되었습니다.');
          window.location.reload();
        } else {
          alert('복원에 실패했습니다. 파일 형식을 확인해주세요.');
        }
      };
      reader.readAsText(file);
    }
  };

  // --- 항목 라이브러리 CRUD (Library Tab) ---
  const handleSaveCostItem = (item: CostItem | CostItem[]) => {
    let updated: CostItem[] = [...libraryItems];
    if (Array.isArray(item)) {
      // 5대 등급 일괄 저장 처리
      updated = [...item, ...updated];
    } else {
      // 단일 저장 및 수정 처리
      const idx = libraryItems.findIndex(i => i.id === item.id);
      if (idx > -1) {
        updated[idx] = item;
      } else {
        updated = [item, ...updated];
      }
    }
    updateLibraryItemsState(updated);
    setIsItemCreateModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteCostItem = (id: string) => {
    if (confirm('이 항목을 라이브러리에서 정말 삭제하시겠습니까? (이미 작성된 견적서에는 영향을 주지 않습니다)')) {
      const updated = libraryItems.filter(i => i.id !== id);
      updateLibraryItemsState(updated);
    }
  };

  // --- 패키지 라이브러리 CRUD (Library Tab) ---
  const handleSaveCostPackage = (pkg: CostPackage) => {
    const idx = libraryPackages.findIndex(p => p.id === pkg.id);
    let updated: CostPackage[];
    if (idx > -1) {
      updated = [...libraryPackages];
      updated[idx] = pkg;
    } else {
      updated = [pkg, ...libraryPackages];
    }
    updateLibraryPackagesState(updated);
    setIsPackageCreateModalOpen(false);
    setEditingPackage(null);
  };

  const handleDeleteCostPackage = (id: string) => {
    if (confirm('이 패키지를 라이브러리에서 정말 삭제하시겠습니까?')) {
      const updated = libraryPackages.filter(p => p.id !== id);
      updateLibraryPackagesState(updated);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // --- 테이블에 인건비용 (인원, 기간) 컬럼을 노출할지 여부 결정 ---
  const shouldShowHRColumns = useMemo(() => {
    if (!activeProject) return false;
    return activeProject.projectType === 'IT' || 
           activeProject.projectType === 'DESIGN' ||
           activeProject.sections.some(s => s.rows.some(r => r.formulaType === 'PEOPLE_x_DAYS_x_PRICE'));
  }, [activeProject]);

  // --- 라이브러리 품목의 비즈니스 기준별 그룹화 (인건비, 디자인 결과물, 개발 결과물, 생산 결과물, 기타 결과물) ---
  const groupedLibraryItems = useMemo(() => {
    const hrItems: CostItem[] = [];           // 1. 인건비 기준 (PM, 기획, 디자이너, 개발자, 운영인력 등)
    const designOutputItems: CostItem[] = []; // 2. 디자인 결과물 기준 (디자인 시안 등)
    const devOutputItems: CostItem[] = [];    // 3. 개발 결과물 기준 (월 유지보수, 시스템 구축 등 결과물/서비스)
    const productionOutputItems: CostItem[] = []; // 4. 생산 결과물 기준 (시공 자재 제작 등 생산/제작류)
    const otherOutputItems: CostItem[] = [];  // 5. 기타 결과물 기준 (식음료, 외주 번역 등)

    libraryItems.forEach(item => {
      const cat = item.category || '';
      const formula = item.formulaType;
      const lowerName = item.name.toLowerCase();

      // 1. 인건비 기준 (용역 공수) 매핑 (신규 카테고리 최우선 + 구버전/특성 하위 호환)
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

      // 2. 디자인 결과물 기준 매핑 (신규 카테고리 + 구버전 디자인/시안 호환)
      const isDesignOutput = 
        !isHRItem && (
          cat === '디자인 결과물 기준' ||
          cat === '디자인' ||
          lowerName.includes('디자인 시안') ||
          lowerName.includes('시안')
        );

      // 3. 개발 결과물 기준 매핑 (신규 카테고리 + 구버전 개발/유지보수/구축 호환)
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

      // 4. 생산 결과물 기준 매핑 (신규 카테고리 + 레거시 제작비/시공/설치 호환)
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

  return (
    <div className="app-container">
      
      {/* 1. 좌측 사이드바 내비게이션 */}
      <div className="sidebar no-print">
        <div className="sidebar-logo">
          <FileText size={24} />
          <span>estimate</span>
        </div>
        
        <div className="sidebar-menu">
          <div className="menu-section-title">서비스 메뉴</div>
          <div 
            className={`menu-item ${activeTab === 'estimates' ? 'active' : ''}`}
            onClick={() => { setActiveTab('estimates'); setSelectedProjectId(null); }}
          >
            <FileText size={18} />
            견적 프로젝트
          </div>
          <div 
            className={`menu-item ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <Database size={18} />
            항목 라이브러리
          </div>
          <div 
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            설정 및 관리
          </div>
        </div>

        <div className="sidebar-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportData}>
            <Download size={14} /> 데이터 백업
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex' }}>
            <Upload size={14} /> 데이터 복원
            <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="main-content">
        
        {/* --- A. 견적서 메인 탭 --- */}
        {activeTab === 'estimates' && (
          <div className="workspace">
            {selectedProjectId === null ? (
              // 프로젝트 목록 화면
              <>
                <div className="workspace-header">
                  <div>
                    <h1 className="workspace-title">견적 프로젝트</h1>
                    <p className="workspace-subtitle">도메인에 특화된 기본 폼을 선택하고 회사의 단가 프리셋을 활용해 고품질의 견적서를 빠르게 작성하세요.</p>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => setIsFormSelectModalOpen(true)}>
                    <Plus size={16} /> 새 견적서 작성
                  </button>
                </div>

                <div className="project-list-grid">
                  {projects.map(proj => {
                    let total = 0;
                    proj.sections.forEach(sec => {
                      sec.rows.forEach(row => {
                        if (row.isSelected) total += row.supplyPrice + row.vat;
                      });
                    });

                    return (
                      <div 
                        key={proj.id} 
                        className="project-card"
                        onClick={() => setSelectedProjectId(proj.id)}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className={`project-card-badge ${proj.projectType}`}>
                              {proj.projectType === 'IT' ? 'IT 개발' :
                               proj.projectType === 'DESIGN' ? '디자인' :
                               proj.projectType === 'BUILD' ? '제작/시공' : '기타'}
                            </span>
                          </div>
                          <div className="project-card-title">{proj.title}</div>
                          <div className="project-card-client">{proj.clientName}</div>
                        </div>
                        
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-blue)', marginBottom: '8px' }}>
                          ₩{total.toLocaleString()}
                        </div>

                        <div className="project-card-footer">
                          <span className="project-card-date">
                            견적일: {proj.estimateDate}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              type="button"
                              className="btn-icon-only" 
                              onClick={(e) => handleDuplicateProject(proj, e)}
                              title="견적 복제"
                            >
                              <Copy size={14} />
                            </button>
                            <button 
                              type="button"
                              className="btn-icon-only" 
                              style={{ color: 'var(--color-red)' }}
                              onClick={(e) => handleDeleteProject(proj.id, e)}
                              title="견적 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {projects.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
                      등록된 견적 프로젝트가 없습니다. 우측 상단의 새 견적서 작성 버튼을 클릭하세요.
                    </div>
                  )}
                </div>
              </>
            ) : (
              // 견적서 에디터 화면
              activeProject && (
                <>
                  <div className="workspace-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button type="button" className="btn btn-secondary btn-icon-only" onClick={() => setSelectedProjectId(null)}>
                        <ArrowLeft size={18} />
                      </button>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`project-card-badge ${activeProject.projectType}`} style={{ position: 'static' }}>
                            {activeProject.projectType === 'IT' ? 'IT 개발 폼' :
                             activeProject.projectType === 'DESIGN' ? '디자인 폼' :
                             activeProject.projectType === 'BUILD' ? '제작/시공 폼' : '기타 폼'}
                          </span>
                          <h1 className="workspace-title">{activeProject.title}</h1>
                        </div>
                        <p className="workspace-subtitle">해당 기본 폼 구조에 맞는 맞춤형 테이블 필드가 제공됩니다.</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setIsPreviewModalOpen(true)}>
                        <Eye size={16} /> 발행 미리보기
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => { setIsPreviewModalOpen(true); setTimeout(handlePrint, 300); }}>
                        <Printer size={16} /> 바로 인쇄 / PDF 저장
                      </button>
                    </div>
                  </div>

                  <div className="editor-layout">
                    {/* 에디터 본문 */}
                    <div className="editor-main">
                      
                      {/* 기본 정보 */}
                      <div className="card">
                        <div className="grid-2">
                          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">프로젝트명 / 견적서 제목</label>
                            <input 
                              type="text" 
                              className="input-text"
                              value={activeProject.title}
                              onChange={(e) => handleUpdateProjectField('title', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">수신처 (고객사명)</label>
                            <input 
                              type="text" 
                              className="input-text"
                              value={activeProject.clientName}
                              onChange={(e) => handleUpdateProjectField('clientName', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">견적 발행일</label>
                            <input 
                              type="date" 
                              className="input-text"
                              value={activeProject.estimateDate}
                              onChange={(e) => handleUpdateProjectField('estimateDate', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">견적 유효기간</label>
                            <input 
                              type="date" 
                              className="input-text"
                              value={activeProject.expiryDate}
                              onChange={(e) => handleUpdateProjectField('expiryDate', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 섹션 반복 */}
                      {activeProject.sections.map((section) => {
                        let secSupply = 0;
                        let secVat = 0;
                        section.rows.forEach(r => {
                          if (r.isSelected) {
                            secSupply += r.supplyPrice;
                            secVat += r.vat;
                          }
                        });

                        return (
                          <div key={section.id} className="editor-section-card">
                            <div className="section-title-bar">
                              <input 
                                type="text"
                                className="section-title-input"
                                value={section.name}
                                onChange={(e) => handleUpdateSectionName(section.id, e.target.value)}
                              />
                              <button 
                                type="button"
                                className="btn-icon-only" 
                                style={{ color: 'var(--color-red)' }}
                                onClick={() => handleDeleteSection(section.id)}
                                title="섹션 삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="table-container">
                              <table className="estimate-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: '40px' }} className="text-center">선택</th>
                                    <th style={{ width: '100px' }}>구분</th>
                                    <th>항목명</th>
                                    
                                    {/* 제작/시공 폼에서만 규격 컬럼 활성화 */}
                                    {activeProject.projectType === 'BUILD' && (
                                      <th style={{ width: '130px' }}>규격 / 사이즈</th>
                                    )}
                                    
                                    <th style={{ width: '60px' }} className="text-center">단위</th>
                                    <th style={{ width: '85px' }} className="text-right">수량 / 공수</th>
                                    
                                    {/* IT, 디자인 등 인력형 활성화 시 인원/기간 헤더 노출 */}
                                    {shouldShowHRColumns && (
                                      <>
                                        <th style={{ width: '70px' }} className="text-right">인원</th>
                                        <th style={{ width: '70px' }} className="text-right">기간(일)</th>
                                      </>
                                    )}
                                    
                                    <th style={{ width: '110px' }} className="text-right">단가</th>
                                    <th style={{ width: '120px' }} className="text-right">공급가액</th>
                                    <th style={{ width: '90px' }} className="text-right">부가세</th>
                                    <th style={{ width: '50px' }} className="text-center">삭제</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.rows.map(row => (
                                    <tr key={row.id} style={{ opacity: row.isSelected ? 1 : 0.5 }}>
                                      <td className="text-center">
                                        <input 
                                          type="checkbox" 
                                          checked={row.isSelected}
                                          onChange={(e) => handleUpdateRowField(section.id, row.id, 'isSelected', e.target.checked)}
                                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-blue)' }}
                                        />
                                      </td>
                                      <td>
                                        <input 
                                          type="text"
                                          className="table-input"
                                          value={row.category}
                                          onChange={(e) => handleUpdateRowField(section.id, row.id, 'category', e.target.value)}
                                        />
                                      </td>
                                      <td>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          <input 
                                            type="text"
                                            className="table-input"
                                            value={row.name}
                                            onChange={(e) => handleUpdateRowField(section.id, row.id, 'name', e.target.value)}
                                            placeholder="품명 및 항목명"
                                            style={{ flex: 1 }}
                                          />
                                          {(row.category.includes('인건비') || row.formulaType === 'PEOPLE_x_DAYS_x_PRICE') && (
                                            <select
                                              value={row.rank || '해당 없음'}
                                              onChange={(e) => handleUpdateRowField(section.id, row.id, 'rank', e.target.value)}
                                              style={{
                                                padding: '2px 6px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                color: 'var(--color-blue)',
                                                backgroundColor: 'var(--color-blue-light)',
                                                border: '1px solid rgba(49, 130, 246, 0.2)',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                width: '90px',
                                                height: '24px',
                                                flexShrink: 0
                                              }}
                                              title="등급 변경 시 단가가 실시간 배수 연동되어 재산출됩니다"
                                            >
                                              <option value="해당 없음">해당 없음</option>
                                              <option value="Junior">Junior</option>
                                              <option value="Associate">Associate</option>
                                              <option value="Professional">Professional</option>
                                              <option value="Senior">Senior</option>
                                              <option value="Lead">Lead</option>
                                            </select>
                                          )}
                                        </div>
                                      </td>
                                      
                                      {/* 제작/시공 규격 입력 지원 */}
                                      {activeProject.projectType === 'BUILD' && (
                                        <td>
                                          <input 
                                            type="text"
                                            className="table-input"
                                            value={row.size || ''}
                                            onChange={(e) => handleUpdateRowField(section.id, row.id, 'size', e.target.value)}
                                            placeholder="가로x세로 또는 자재 스펙"
                                          />
                                        </td>
                                      )}
                                      
                                      <td>
                                        <input 
                                          type="text"
                                          className="table-input text-center"
                                          value={row.unit}
                                          onChange={(e) => handleUpdateRowField(section.id, row.id, 'unit', e.target.value)}
                                        />
                                      </td>
                                      
                                      <td>
                                        <input 
                                          type="number"
                                          className="table-input num"
                                          value={row.quantity}
                                          disabled={row.formulaType === 'PEOPLE_x_DAYS_x_PRICE'}
                                          onChange={(e) => handleUpdateRowField(section.id, row.id, 'quantity', Number(e.target.value))}
                                          style={{
                                            backgroundColor: row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? '#f0f1f3' : '#ffffff',
                                            color: row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? 'var(--text-secondary)' : 'var(--text-primary)',
                                            fontWeight: row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? '600' : 'normal',
                                            cursor: row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? 'not-allowed' : 'text'
                                          }}
                                          title={row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? '인원과 기간을 기입하면 공수(MD)가 자동 산출됩니다' : '수량 직접 수정 가능'}
                                        />
                                      </td>
                                      
                                      {/* 인원 및 기간 입력 지원 */}
                                      {shouldShowHRColumns && (
                                        <>
                                          <td>
                                            {row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? (
                                              <input 
                                                type="number"
                                                className="table-input num"
                                                value={row.people || 0}
                                                onChange={(e) => handleUpdateRowField(section.id, row.id, 'people', Number(e.target.value))}
                                              />
                                            ) : (
                                              <span style={{ color: 'var(--text-tertiary)', display: 'block', textAlign: 'right', paddingRight: '12px' }}>-</span>
                                            )}
                                          </td>
                                          <td>
                                            {row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' ? (
                                              <input 
                                                type="number"
                                                className="table-input num"
                                                value={row.days || 0}
                                                onChange={(e) => handleUpdateRowField(section.id, row.id, 'days', Number(e.target.value))}
                                              />
                                            ) : (
                                              <span style={{ color: 'var(--text-tertiary)', display: 'block', textAlign: 'right', paddingRight: '12px' }}>-</span>
                                            )}
                                          </td>
                                        </>
                                      )}
                                      
                                      <td>
                                        <input 
                                          type="number"
                                          className="table-input price"
                                          value={row.price}
                                          onChange={(e) => handleUpdateRowField(section.id, row.id, 'price', Number(e.target.value))}
                                        />
                                      </td>
                                      <td className="row-subtotal">
                                        ₩{row.supplyPrice.toLocaleString()}
                                      </td>
                                      <td className="text-right" style={{ color: 'var(--text-secondary)' }}>
                                        ₩{row.vat.toLocaleString()}
                                      </td>
                                      <td className="text-center">
                                        <button 
                                          type="button"
                                          className="btn-icon-only"
                                          style={{ color: 'var(--color-red)' }}
                                          onClick={() => handleDeleteRow(section.id, row.id)}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}

                                  {section.rows.length === 0 && (
                                    <tr>
                                      <td colSpan={shouldShowHRColumns ? (activeProject.projectType === 'BUILD' ? 14 : 13) : (activeProject.projectType === 'BUILD' ? 12 : 11)} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                                        등록된 항목이 없습니다. 아래 버튼을 이용해 항목을 추가하세요.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="table-action-row">
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAddManualRow(section.id)}>
                                <Plus size={12} /> 직접 입력 추가
                              </button>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleOpenLibraryModal(section.id)}>
                                <Database size={12} /> 라이브러리에서 추가
                              </button>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleOpenPackageModal(section.id)}>
                                <Plus size={12} /> 패키지 세트 추가
                              </button>
                            </div>

                            <div className="section-footer-summary">
                              <div>공급가액: <span>₩{secSupply.toLocaleString()}</span></div>
                              <div>부가세: <span>₩{secVat.toLocaleString()}</span></div>
                              <div>합계: <span style={{ color: 'var(--color-blue)' }}>₩{(secSupply + secVat).toLocaleString()}</span></div>
                            </div>
                          </div>
                        );
                      })}

                      <button type="button" className="btn btn-secondary" style={{ borderStyle: 'dashed', width: '100%', padding: '16px' }} onClick={handleAddSection}>
                        <Plus size={16} /> 새로운 견적 섹션 추가
                      </button>

                      {/* 비고란 카드 */}
                      <div className="card">
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">견적 조건 및 비고 (견적서 하단에 출력됩니다)</label>
                          <textarea 
                            className="textarea-input"
                            value={activeProject.remarks}
                            onChange={(e) => handleUpdateProjectField('remarks', e.target.value)}
                            placeholder="예: 대금 지급 조건, 계약 유효기간 등"
                            style={{ minHeight: '120px' }}
                          />
                        </div>
                      </div>

                    </div>

                    {/* 우측 요약 패널 */}
                    <div className="editor-aside">
                      <div className="summary-panel">
                        <div className="summary-title">실시간 견적 요약</div>
                        
                        <div className="summary-row">
                          <span>선택 항목 수</span>
                          <span>
                            {activeProject.sections.reduce((acc, sec) => acc + sec.rows.filter(r => r.isSelected).length, 0)}개
                          </span>
                        </div>

                        <div className="summary-row">
                          <span>총 공급가액</span>
                          <span>₩{projectSummary.supplyTotal.toLocaleString()}</span>
                        </div>

                        <div className="summary-row">
                          <span>총 부가세</span>
                          <span>₩{projectSummary.vatTotal.toLocaleString()}</span>
                        </div>

                        <div className="summary-row total">
                          <span>최종 합계</span>
                          <span>₩{projectSummary.grandTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="summary-panel" style={{ backgroundColor: 'var(--color-blue-light)', borderColor: 'rgba(49,130,246,0.2)' }}>
                        <div className="summary-title" style={{ color: 'var(--color-blue)', borderBottomColor: 'rgba(49,130,246,0.1)' }}>발행 상태</div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                          현재 문서는 초안 상태입니다. 발행 미리보기를 통해 오탈자를 확인하고 정식 문서를 발행하십시오.
                        </p>
                        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setIsPreviewModalOpen(true)}>
                          <Printer size={16} /> 정식 견적서 인쇄
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )
            )}
          </div>
        )}

        {/* --- B. 항목 라이브러리 관리 탭 --- */}
        {activeTab === 'library' && (
          <div className="workspace">
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">단가 및 항목 라이브러리</h1>
                <p className="workspace-subtitle">자주 반복되는 인건비 단가와 제품 단가를 저장하여 견적 오차를 제로화하세요.</p>
              </div>
              <div>
                {librarySubTab === 'items' ? (
                  <button type="button" className="btn btn-primary" onClick={() => { setEditingItem(null); setIsItemCreateModalOpen(true); }}>
                    <Plus size={16} /> 새 기준 단가 등록
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => { setEditingPackage(null); setIsPackageCreateModalOpen(true); }}>
                    <Plus size={16} /> 새 패키지 세트 구성
                  </button>
                )}
              </div>
            </div>

            <div className="tab-nav">
              <button 
                type="button"
                className={`tab-button ${librarySubTab === 'items' ? 'active' : ''}`}
                onClick={() => setLibrarySubTab('items')}
              >
                단일 항목 (단가표)
              </button>
              <button 
                type="button"
                className={`tab-button ${librarySubTab === 'packages' ? 'active' : ''}`}
                onClick={() => setLibrarySubTab('packages')}
              >
                항목 세트 (패키지 상품)
              </button>
            </div>

            {/* 단일 항목 탭 내용 (4대 비즈니스 기준 분할) */}
            {librarySubTab === 'items' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* 1. 인건비 기준 (용역 공수) */}
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '16px', backgroundColor: 'var(--color-blue)', borderRadius: '2px' }}></div>
                    인건비 기준 (용역 공수)
                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>({groupedLibraryItems.hrItems.length}개 항목)</span>
                  </div>
                  <div className="library-grid">
                    {groupedLibraryItems.hrItems.map(item => (
                      <LibraryCard key={item.id} item={item} onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }} onDelete={handleDeleteCostItem} />
                    ))}
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
                    {groupedLibraryItems.designOutputItems.map(item => (
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
                    {groupedLibraryItems.devOutputItems.map(item => (
                      <LibraryCard key={item.id} item={item} onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }} onDelete={handleDeleteCostItem} />
                    ))}
                    {groupedLibraryItems.devOutputItems.length === 0 && <EmptyGroupMessage />}
                  </div>
                </div>

                {/* 4. 생산 결과물 기준 (토스 그린 컬러 적용) */}
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '16px', backgroundColor: '#2ecc71', borderRadius: '2px' }}></div>
                    생산 결과물 기준
                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>({groupedLibraryItems.productionOutputItems.length}개 항목)</span>
                  </div>
                  <div className="library-grid">
                    {groupedLibraryItems.productionOutputItems.map(item => (
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
                    {groupedLibraryItems.otherOutputItems.map(item => (
                      <LibraryCard key={item.id} item={item} onEdit={(i) => { setEditingItem(i); setIsItemCreateModalOpen(true); }} onDelete={handleDeleteCostItem} />
                    ))}
                    {groupedLibraryItems.otherOutputItems.length === 0 && <EmptyGroupMessage />}
                  </div>
                </div>

              </div>
            )}

            {/* 패키지 탭 내용 */}
            {librarySubTab === 'packages' && (
              <div className="library-grid">
                {libraryPackages.map(pkg => (
                  <div key={pkg.id} className="library-card" style={{ minHeight: '200px' }}>
                    <div>
                      <div className="library-card-header">
                        <span className="library-card-badge">{pkg.category}</span>
                      </div>
                      <div className="library-card-title" style={{ fontSize: '16px', marginBottom: '6px' }}>{pkg.name}</div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{pkg.description}</p>
                      
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>구성 품목:</div>
                        <ul style={{ fontSize: '11px', paddingLeft: '16px', color: 'var(--text-secondary)' }}>
                          {pkg.items.map((pi, idx) => {
                            const item = libraryItems.find(i => i.id === pi.itemId);
                            return (
                              <li key={idx}>
                                {item ? item.name : '알 수 없는 품목'} 
                                ({pi.defaultQuantity > 0 ? `${pi.defaultQuantity}${item?.unit}` : ''} 
                                {pi.defaultPeople ? `${pi.defaultPeople}명` : ''} 
                                {pi.defaultDays ? ` × ${pi.defaultDays}일` : ''})
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>

                    <div className="library-card-footer" style={{ marginTop: '16px' }}>
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setEditingPackage(pkg); setIsPackageCreateModalOpen(true); }}
                      >
                        수정
                      </button>
                      <button 
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteCostPackage(pkg.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- C. 설정 탭 (SettingsTab 컴포넌트로 대체) --- */}
        {activeTab === 'settings' && (
          <SettingsTab 
            vendorInfo={vendorInfo}
            setVendorInfo={setVendorInfo}
            onSave={handleSaveVendorInfo}
            onSealUpload={handleSealImageUpload}
          />
        )}

      </div>

      {/* --- 신규 견적서: 도메인 템플릿 선택 모달 --- */}
      {isFormSelectModalOpen && (
        <div className="modal-overlay no-print">
          <div className="modal-container" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">견적서 기본 폼 선택</h2>
              <button type="button" className="btn-icon-only" onClick={() => setIsFormSelectModalOpen(false)}>
                <X size={18} style={{ display: 'none' }} /> {/* 필요 시 대비 */}
                <span>닫기</span>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                작성하려는 견적 업무 도메인을 선택해 주십시오. 선택한 폼에 맞추어 최적화된 테이블 컬럼과 초기 섹션이 자동으로 구성됩니다.
              </p>
              
              <div className="grid-2">
                <div 
                  className="card animate-hover" 
                  style={{ 
                    cursor: 'pointer', 
                    borderWidth: '1.5px',
                    borderColor: 'var(--border-color)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleCreateNewProject('IT')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#e8f3ff', color: 'var(--color-blue)' }}>
                      <Terminal size={20} />
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>IT 개발 폼</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    기획, UI/UX 디자인, 소프트웨어 개발 용역에 최적화. **인원, 기간(일) 컬럼**을 적으면 **MD 공수가 자동 계산**되어 화면에 동시 노출됩니다.
                  </p>
                </div>

                <div 
                  className="card animate-hover" 
                  style={{ 
                    cursor: 'pointer', 
                    borderWidth: '1.5px',
                    borderColor: 'var(--border-color)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleCreateNewProject('DESIGN')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#fdf0f2', color: 'var(--color-red)' }}>
                      <Palette size={20} />
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>디자인 폼</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    시안 제작, 편집 디자인에 최적화. 인건비성 전문 인력이 포함될 시 **인원, 기간에 맞추어 MD로 자동 전환 연산**되는 똑똑한 그리드를 제공합니다.
                  </p>
                </div>

                <div 
                  className="card animate-hover" 
                  style={{ 
                    cursor: 'pointer', 
                    borderWidth: '1.5px',
                    borderColor: 'var(--border-color)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleCreateNewProject('BUILD')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#eafaf1', color: '#2ecc71' }}>
                      <Hammer size={20} />
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>제작 / 시공 폼</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    원자재 공급, 부스 설치, 인테리어 시공에 최적화. 물리적인 스펙 기입을 위한 **"규격 / 사이즈" 텍스트 컬럼**이 테이블 내에 기본 노출됩니다.
                  </p>
                </div>

                <div 
                  className="card animate-hover" 
                  style={{ 
                    cursor: 'pointer', 
                    borderWidth: '1.5px',
                    borderColor: 'var(--border-color)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleCreateNewProject('OTHER')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#f4f5f7', color: 'var(--text-secondary)' }}>
                      <HelpCircle size={20} />
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>기타 (기본형) 폼</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    일반적인 납품 및 서비스 제공에 범용적으로 사용. 인건비나 규격 칼럼 없이 심플하고 표준적인 견적 테이블로 즉시 구성됩니다.
                  </p>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsFormSelectModalOpen(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- A. 에디터: 단일 항목 라이브러리 호출 모달 (모듈화 컴포넌트) --- */}
      <LibraryImportModal 
        isOpen={isLibraryModalOpen}
        libraryItems={libraryItems}
        onClose={() => setIsLibraryModalOpen(false)}
        onImport={handleImportSelectedItems}
      />

      {/* --- B. 에디터: 패키지 세트 호출 모달 (모듈화 컴포넌트) --- */}
      <PackageImportModal 
        isOpen={isPackageModalOpen}
        libraryPackages={libraryPackages}
        libraryItems={libraryItems}
        onClose={() => setIsPackageModalOpen(false)}
        onImport={handleImportPackage}
      />

      {/* --- C. 라이브러리 탭: 단일 기준단가 등록/편집 모달 --- */}
      {isItemCreateModalOpen && (
        <ItemFormModal 
          item={editingItem}
          categories={Array.from(new Set(libraryItems.map(i => i.category)))}
          onClose={() => setIsItemCreateModalOpen(false)}
          onSave={handleSaveCostItem}
        />
      )}

      {/* --- D. 라이브러리 탭: 패키지 세트 등록/편집 모달 --- */}
      {isPackageCreateModalOpen && (
        <PackageFormModal 
          pkg={editingPackage}
          libraryItems={libraryItems}
          onClose={() => setIsPackageCreateModalOpen(false)}
          onSave={handleSaveCostPackage}
        />
      )}

      {/* --- E. 정식 A4 견적서 발행 미리보기 및 인쇄 모달 (모듈화 컴포넌트) --- */}
      <EstimatePreviewModal 
        isOpen={isPreviewModalOpen}
        activeProject={activeProject}
        projectSummary={projectSummary}
        onClose={() => setIsPreviewModalOpen(false)}
        onPrint={handlePrint}
      />

    </div>
  );
}
