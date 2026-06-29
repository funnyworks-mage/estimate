import { useState, useEffect, useMemo } from 'react';
import type { 
  EstimateProject, 
  EstimateRow, 
  EstimateSection, 
  CostItem, 
  CostPackage 
} from '../types/estimate';
import { StorageAPI, calculateRowAmounts } from '../utils/storage';
import { exportProjectToExcel } from '../utils/excelExporter';

interface UseEstimateProjectsProps {
  user: any;
  libraryItems: CostItem[];
}

export function useEstimateProjects({ user, libraryItems }: UseEstimateProjectsProps) {
  const [projects, setProjects] = useState<EstimateProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'estimate' | 'wbs'>('estimate');
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  
  // 모달 상태
  const [isFormSelectModalOpen, setIsFormSelectModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  // --- 초기 프로젝트 데이터 로드 및 정밀 마이그레이션 ---
  useEffect(() => {
    if (!user) return;

    async function loadProjects() {
      try {
        const projs = await StorageAPI.getProjects();
        const vendor = await StorageAPI.getVendorInfo();
        
        let hasMigrated = false;
        const migratedProjs = projs.map(proj => {
          let updatedProj = { ...proj };
          let changed = false;

          // 1. 공급자 정보 강제 정화
          if (proj.vendorInfo && (proj.vendorInfo.ownerName === '홍길동' || proj.vendorInfo.address?.includes('5층') || proj.vendorInfo.ownerName !== vendor.ownerName || proj.vendorInfo.address !== vendor.address)) {
            updatedProj.vendorInfo = vendor;
            changed = true;
          }

          // 2. 레거시 상태값 ('published')을 신규 3단계 상태값 ('invoicing')으로 마이그레이션
          if ((proj.status as string) === 'published') {
            updatedProj.status = 'invoicing';
            changed = true;
          }

          // 3. 섹션 이름 앞의 숫자 접두사 ("1. ", "2. " 등) 제거 마이그레이션
          const hasNumberedSection = proj.sections.some(sec => /^\d+\.\s*/.test(sec.name));
          if (hasNumberedSection) {
            updatedProj.sections = proj.sections.map(sec => ({
              ...sec,
              name: sec.name.replace(/^\d+\.\s*/, '')
            }));
            changed = true;
          }

          if (changed) {
            hasMigrated = true;
            return updatedProj;
          }
          return proj;
        });

        if (hasMigrated) {
          setProjects(migratedProjs);
          await StorageAPI.saveProjects(migratedProjs);
        } else {
          setProjects(projs);
        }
      } catch (e) {
        console.error('프로젝트 데이터 초기 로딩 및 마이그레이션 실패:', e);
      }
    }
    loadProjects();
  }, [user]);

  useEffect(() => {
    setActiveSubTab('estimate');
  }, [selectedProjectId]);

  // 등급별 추천 배수 정의 (에디터 내 실시간 연동용)
  const APP_RANK_MULTIPLIERS: Record<string, number> = {
    'L1 Support': 0.8,
    'L2 Operator': 1.0,
    'L3 Specialist': 1.5,
    'L4 Lead': 2.0,
    'L5 Director': 3.0
  };

  // --- 현재 선택된 프로젝트 정보 ---
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // --- 데이터 변경 시 저장 핸들러 ---
  const updateProjectsState = async (newProjects: EstimateProject[]) => {
    setProjects(newProjects);
    await StorageAPI.saveProjects(newProjects);
  };

  // --- 견적서 프로젝트 CRUD ---
  const handleCreateNewProject = async (type: 'IT' | 'DESIGN' | 'BUILD' | 'OTHER') => {
    const defaultVendor = await StorageAPI.getVendorInfo();
    
    let initialSections: EstimateSection[] = [];
    let titlePlaceholder = '새 견적 프로젝트';
    
    if (type === 'IT') {
      titlePlaceholder = 'IT 시스템 구축 및 개발 용역 견적';
      initialSections = [
        {
          id: `sec-it-1`,
          name: '기획 및 디자인 부문 (디자인/컨설팅)',
          rows: []
        },
        {
          id: `sec-it-2`,
          name: '시스템 구축 및 소프트웨어 개발 부문',
          rows: []
        }
      ];
    } else if (type === 'DESIGN') {
      titlePlaceholder = '브랜드 디자인 및 어플리케이션 제작 견적';
      initialSections = [
        {
          id: `sec-design-1`,
          name: '브랜드 시각 아이덴티티(BI/BX) 디자인 부문',
          rows: []
        },
        {
          id: `sec-design-2`,
          name: '제작 어플리케이션 및 최종 산출물 부문',
          rows: []
        }
      ];
    } else if (type === 'BUILD') {
      titlePlaceholder = '인테리어 시공 및 부스 자재 납품 견적';
      initialSections = [
        {
          id: `sec-build-1`,
          name: '자재 및 원부자재 하드웨어 공급 부문',
          rows: []
        },
        {
          id: `sec-build-2`,
          name: '현장 제작 및 설치 시공 인건비 부문',
          rows: []
        }
      ];
    } else {
      titlePlaceholder = '일반 품목 및 서비스 납품 견적';
      initialSections = [
        {
          id: `sec-other-1`,
          name: '일반 공급 및 서비스 부문',
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
    await updateProjectsState(updated);
    setSelectedProjectId(newProj.id);
    setIsFormSelectModalOpen(false);
  };

  const handleDuplicateProject = async (proj: EstimateProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated: EstimateProject = {
      ...JSON.parse(JSON.stringify(proj)),
      id: `proj-${Date.now()}`,
      title: `${proj.title} (복사본)`,
      createdAt: new Date().toISOString(),
      status: 'draft'
    };
    const updated = [duplicated, ...projects];
    await updateProjectsState(updated);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 견적 프로젝트를 정말 삭제하시겠습니까?')) {
      try {
        await StorageAPI.deleteProject(id);
      } catch (err) {
        console.warn('[DB] 프로젝트 실제 삭제 실패 (스킵 후 로컬 동기화):', err);
      }
      const updated = projects.filter(p => p.id !== id);
      await updateProjectsState(updated);
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
    }
  };

  const handleUpdateProjectField = <K extends keyof EstimateProject>(field: K, value: EstimateProject[K]) => {
    if (!activeProject) return;

    // 견적 발행일자 변경 시 유효기간을 30일 뒤 날짜로 자동 연동 갱신
    if (field === 'estimateDate' && typeof value === 'string' && value) {
      try {
        const estDate = new Date(value);
        if (!isNaN(estDate.getTime())) {
          estDate.setDate(estDate.getDate() + 30);
          const expiryString = estDate.toISOString().split('T')[0];
          
          handleUpdateProjectFields({
            estimateDate: value,
            expiryDate: expiryString
          });
          return;
        }
      } catch (e) {
        console.warn('[AutoExpiry] Failed to auto-calculate expiry date:', e);
      }
    }

    const updated = projects.map(p => {
      if (p.id === activeProject.id) {
        return { ...p, [field]: value };
      }
      return p;
    });
    updateProjectsState(updated);
  };

  const handleUpdateProjectFields = (fields: Partial<EstimateProject>) => {
    if (!activeProject) return;
    const updated = projects.map(p => {
      if (p.id === activeProject.id) {
        return { ...p, ...fields };
      }
      return p;
    });
    updateProjectsState(updated);
  };

  const handleUpdateProjectApproval = (status: 'draft' | 'requested' | 'approved' | 'rejected', reason?: string) => {
    if (!activeProject) return;
    const createdBy = user ? user.id : undefined;
    handleUpdateProjectFields({
      approvalStatus: status,
      rejectReason: reason || undefined,
      createdBy: createdBy || activeProject.createdBy
    });

    if (status === 'requested') {
      alert('관리자에게 결재 요청이 전송되었습니다.\n승인이 완료될 때까지 견적서 수정이 불가능합니다.');
    } else if (status === 'approved') {
      alert('견적서 결재가 최종 승인 처리되었습니다.');
    } else if (status === 'rejected') {
      alert(`견적서 결재가 반려 처리되었습니다.\n반려 사유: ${reason}`);
    }
  };

  const handleSyncWbsToEstimate = () => {
    if (!activeProject || !activeProject.wbs || activeProject.wbs.length === 0) {
      alert('동기화할 WBS 데이터가 존재하지 않습니다.');
      return;
    }

    const getWbsRoleKey = (roleName: string): string => {
      const name = roleName.replace(/\s+/g, '').toLowerCase();
      if (name.includes('pm') || name.includes('기획')) return '기획';
      if (name.includes('디자인') || name.includes('디자이너') || name.includes('ui/ux') || name.includes('ux') || name.includes('ui')) return '디자인';
      if (name.includes('프론트') || name.includes('fe') || name.includes('front')) return '프론트엔드';
      if (name.includes('백엔드') || name.includes('be') || name.includes('back')) return '백엔드';
      if (name.includes('qa') || name.includes('테스트') || name.includes('검증') || name.includes('품질')) return 'qa';
      return '기타';
    };

    const getRowRoleKey = (rowName: string): string => {
      const name = rowName.replace(/\s+/g, '').toLowerCase();
      if (name.includes('pm') || name.includes('기획')) return '기획';
      if (name.includes('디자인') || name.includes('디자이너') || name.includes('ui/ux') || name.includes('ux') || name.includes('ui')) return '디자인';
      if (name.includes('프론트') || name.includes('fe') || name.includes('front')) return '프론트엔드';
      if (name.includes('백엔드') || name.includes('be') || name.includes('back')) return '백엔드';
      if (name.includes('qa') || name.includes('테스트') || name.includes('검증') || name.includes('품질')) return 'qa';
      return '기타';
    };

    const roleTotals: Record<string, number> = {
      기획: 0,
      디자인: 0,
      프론트엔드: 0,
      백엔드: 0,
      qa: 0
    };

    activeProject.wbs.forEach(cat => {
      cat.tasks.forEach(task => {
        const roles = task.roles && task.roles.length > 0 ? task.roles : [task.role];
        roles.forEach(r => {
          if (r === '해당없음') return;
          const key = getWbsRoleKey(r);
          if (roleTotals[key] !== undefined) {
            const taskTotal = (task.manpower * task.md) / roles.length;
            roleTotals[key] += taskTotal;
          }
        });
      });
    });

    let syncCount = 0;

    const updatedSections = activeProject.sections.map(section => {
      const updatedRows = section.rows.map(row => {
        const isHR = row.formulaType === 'PEOPLE_x_DAYS_x_PRICE' || (row.category && row.category.includes('인건비'));
        if (isHR) {
          const rowRoleKey = getRowRoleKey(row.name);
          const wbsTotalMd = roleTotals[rowRoleKey];
          if (wbsTotalMd !== undefined && wbsTotalMd > 0) {
            syncCount++;
            const people = row.people || 1;
            const days = Math.round((wbsTotalMd / people) * 10) / 10;
            const quantity = Math.round((people * days) * 10) / 10;
            
            const calculated = calculateRowAmounts({
              ...row,
              people,
              days,
              quantity
            });

            return {
              ...row,
              ...calculated
            };
          }
        }
        return row;
      });
      return { ...section, rows: updatedRows };
    });

    if (syncCount === 0) {
      alert('WBS 공수와 매핑할 수 있는 견적서 내 인건비 항목을 찾지 못했습니다.\n견적서 품목명에 기획, 디자인, 프론트엔드, 백엔드 등 역할군 이름이 포함되어 있는지 확인해 주십시오.');
      return;
    }

    handleUpdateProjectField('sections', updatedSections);
    alert(`WBS 통합 공수 기준 총 ${syncCount}개 인건비 항목의 공수(MD)가 견적서에 성공적으로 자동 반영되었습니다.`);
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
            
            if (row.formulaType === 'PEOPLE_x_DAYS_x_PRICE') {
              if (field === 'quantity') {
                const qVal = Number(value) || 0;
                const people = row.people || 1;
                updatedRow.days = Math.round((qVal / people) * 10) / 10;
              } else if (field === 'people') {
                const pVal = Number(value) || 0;
                const days = row.days || 0;
                updatedRow.quantity = Math.round((pVal * days) * 10) / 10;
              } else if (field === 'days') {
                const dVal = Number(value) || 0;
                const people = row.people || 0;
                updatedRow.quantity = Math.round((people * dVal) * 10) / 10;
              }
            }
            
            if (field === 'rank') {
              if (value && value !== '해당 없음') {
                const newRank = value as string;
                const mult = APP_RANK_MULTIPLIERS[newRank] || 1.0;
                
                if (updatedRow.basePrice) {
                  updatedRow.price = Math.round(updatedRow.basePrice * mult);
                } else {
                  const currentRank = row.rank || 'L2 Operator';
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

  // --- 스마트 섹션 분배 알고리즘 ---
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
    if (!activeProject) {
      return { 
        supplyTotal: 0, 
        vatTotal: 0, 
        grandTotal: 0,
        totalCorrectionRate: 0,
        totalCorrectionName: '',
        totalCorrectionAmount: 0,
        finalSupplyTotal: 0,
        finalVatTotal: 0,
        finalGrandTotal: 0
      };
    }
    
    const isForeign = !!activeProject.useForeignCurrency;
    let supplyTotal = 0;
    let vatTotal = 0;

    activeProject.sections.forEach(sec => {
      sec.rows.forEach(row => {
        if (row.isSelected) {
          supplyTotal += row.supplyPrice;
          vatTotal += isForeign ? 0 : row.vat;
        }
      });
    });

    const totalCorrectionRate = activeProject.totalCorrectionRate || 0;
    const totalCorrectionName = activeProject.totalCorrectionName || '';
    
    const totalCorrectionAmount = Math.round(supplyTotal * totalCorrectionRate);
    const finalSupplyTotal = supplyTotal + totalCorrectionAmount;
    
    const finalVatTotal = isForeign 
      ? 0 
      : (totalCorrectionRate !== 0 
          ? Math.floor(finalSupplyTotal * 0.1)
          : vatTotal);
      
    const finalGrandTotal = finalSupplyTotal + finalVatTotal;

    return {
      supplyTotal,
      vatTotal,
      grandTotal: supplyTotal + vatTotal,
      totalCorrectionRate,
      totalCorrectionName,
      totalCorrectionAmount,
      finalSupplyTotal,
      finalVatTotal,
      finalGrandTotal
    };
  }, [activeProject]);

  // 수동 입력 바인딩 제어
  useEffect(() => {
    if (!activeProject) {
      setCustomAmountInput('');
      return;
    }
    
    if (activeProject.totalCorrectionName === '수동 금액 조정') {
      const grandTotal = projectSummary.finalGrandTotal ?? projectSummary.grandTotal;
      if (activeProject.useForeignCurrency && activeProject.exchangeRate) {
        const foreignVal = grandTotal / activeProject.exchangeRate;
        setCustomAmountInput(foreignVal.toFixed(2));
      } else {
        setCustomAmountInput(grandTotal.toString());
      }
    } else {
      setCustomAmountInput('');
    }
  }, [
    activeProject?.id, 
    activeProject?.totalCorrectionName, 
    activeProject?.useForeignCurrency, 
    activeProject?.exchangeRate,
    projectSummary.finalGrandTotal
  ]);

  // 수동 조정 비율 역산 동기화 핸들러 (유저 타이핑 시에만 구동하여 진동 루프 완벽 제거)
  const handleCustomAmountInputChange = (inputValue: string) => {
    setCustomAmountInput(inputValue);
    if (!activeProject || activeProject.totalCorrectionName !== '수동 금액 조정') return;
    if (!inputValue) return;

    const numVal = Number(inputValue);
    if (isNaN(numVal) || numVal <= 0) return;

    const supplyTotal = projectSummary.supplyTotal;
    let customGrandTotalInKRW = numVal;

    if (activeProject.useForeignCurrency && activeProject.exchangeRate) {
      customGrandTotalInKRW = Math.round(numVal * activeProject.exchangeRate);
    }

    const finalSupply = activeProject.useForeignCurrency
      ? customGrandTotalInKRW
      : Math.round(customGrandTotalInKRW / 1.1);

    const totalCorrectionAmount = finalSupply - supplyTotal;
    const rate = supplyTotal > 0 ? totalCorrectionAmount / supplyTotal : 0;

    handleUpdateProjectField('totalCorrectionRate', rate);
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: 'draft' | 'invoicing' | 'completed') => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return { ...p, status: newStatus };
      }
      return p;
    });
    await updateProjectsState(updated);
  };

  // 다른 견적서로부터 섹션 및 WBS 상세 일정 데이터 병합 복제
  const handleImportSectionsFromProject = async (
    targetProjectId: string,
    sectionIds: string[],
    importWbs: boolean
  ) => {
    if (!activeProject) return;

    const targetProj = projects.find(p => p.id === targetProjectId);
    if (!targetProj) return;

    // 1. 가져올 섹션 필터링
    const sourceSections = targetProj.sections.filter(sec => sectionIds.includes(sec.id));
    if (sourceSections.length === 0) return;

    // ID 충돌 방지를 위한 고유 ID 발급 헬퍼
    const generateId = () => `imported-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 새 고유 ID를 발급하여 섹션 및 행(Row) 복제
    const clonedSections = sourceSections.map(sec => {
      return {
        ...sec,
        id: generateId(),
        rows: sec.rows.map(row => ({
          ...row,
          id: generateId(),
          isSelected: true // 복제된 데이터는 기본적으로 견적 포함 처리
        }))
      };
    });

    const updatedSections = [...activeProject.sections, ...clonedSections];

    // 2. WBS 복제 및 맵핑 병합
    let updatedWbs = activeProject.wbs ? JSON.parse(JSON.stringify(activeProject.wbs)) : [];

    if (importWbs && targetProj.wbs && targetProj.wbs.length > 0) {
      targetProj.wbs.forEach((cat) => {
        // 동일한 대분류(카테고리)명이 기존 9차에 존재하는지 감지
        const existingCat = updatedWbs.find((c: any) => c.title.trim() === cat.title.trim());

        const clonedTasks = cat.tasks.map(task => ({
          ...task,
          id: generateId(),
          status: 'planned' // 진행 전으로 초기화하여 이식
        }));

        if (existingCat) {
          // 이미 존재하는 대분류이면 하위 태스크 목록만 합류
          existingCat.tasks = [...existingCat.tasks, ...clonedTasks];
        } else {
          // 신규 대분류 카테고리로 안전하게 병합
          updatedWbs.push({
            ...cat,
            id: generateId(),
            no: updatedWbs.length + 1,
            tasks: clonedTasks
          });
        }
      });
    }

    // 3. 전체 프로젝트 상태 갱신 및 DB 저장 동기화
    const updatedProjects = projects.map(p => {
      if (p.id === activeProject.id) {
        return {
          ...p,
          sections: updatedSections,
          wbs: updatedWbs
        };
      }
      return p;
    });

    await updateProjectsState(updatedProjects);
  };

  const handleExportToExcel = () => {
    if (!activeProject) return;
    exportProjectToExcel(activeProject, libraryItems);
  };

  return {
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    activeSubTab,
    setActiveSubTab,
    customAmountInput,
    setCustomAmountInput,
    handleCustomAmountInputChange,
    targetSectionId,
    activeProject,
    projectSummary,
    
    // 모달 관리
    isFormSelectModalOpen,
    setIsFormSelectModalOpen,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    isLibraryModalOpen,
    setIsLibraryModalOpen,
    isPackageModalOpen,
    setIsPackageModalOpen,

    // 동작 메소드
    handleCreateNewProject,
    handleDuplicateProject,
    handleDeleteProject,
    handleUpdateProjectField,
    handleUpdateProjectFields,
    handleUpdateProjectApproval,
    handleSyncWbsToEstimate,
    handleUpdateRowField,
    handleDeleteRow,
    handleOpenLibraryModal,
    handleImportSelectedItems,
    handleOpenPackageModal,
    handleImportPackage,
    handleUpdateProjectStatus,
    handleImportSectionsFromProject,
    handleExportToExcel,
    updateProjectsState
  };
}
