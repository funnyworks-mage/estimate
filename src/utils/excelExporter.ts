import * as XLSX from 'xlsx-js-style';
import type { EstimateProject, WbsTask, CostItem } from '../types/estimate';

// 역할군별 단가를 견적서 본문 및 라이브러리에서 조회하는 헬퍼
function getTaskRolePrice(task: WbsTask, project: EstimateProject, libraryItems: CostItem[]): number {
  const taskRole = (task.role || '').toLowerCase().trim();
  
  // 1. 견적서 본문 세션에서 단가 매핑 시도
  for (const sec of project.sections) {
    for (const row of sec.rows) {
      const rowName = (row.name || '').toLowerCase();
      if (
        (taskRole.includes('백엔드') && rowName.includes('백엔드')) ||
        (taskRole.includes('프론트') && rowName.includes('프론트')) ||
        (taskRole.includes('기획') && rowName.includes('기획')) ||
        (taskRole.includes('디자인') && rowName.includes('디자인')) ||
        (taskRole.includes('qa') && rowName.includes('qa'))
      ) {
        return row.price;
      }
    }
  }

  // 2. 사내 단가표 라이브러리에서 매핑 시도
  for (const item of libraryItems) {
    const itemName = item.name.toLowerCase();
    if (
      (taskRole.includes('백엔드') && itemName.includes('백엔드')) ||
      (taskRole.includes('프론트') && itemName.includes('프론트')) ||
      (taskRole.includes('기획') && itemName.includes('기획')) ||
      (taskRole.includes('디자인') && itemName.includes('디자인')) ||
      (taskRole.includes('qa') && itemName.includes('qa'))
    ) {
      return item.defaultPrice;
    }
  }

  return 300000; // 기본 대체 노임단가
}

// 엑셀 셀 주소를 숫자 좌표(0-indexed)에서 문자열로 변환 (예: 0,0 -> "A1")
function encodeCell(r: number, c: number): string {
  let colStr = '';
  let temp = c;
  while (temp >= 0) {
    colStr = String.fromCharCode((temp % 26) + 65) + colStr;
    temp = Math.floor(temp / 26) - 1;
  }
  return `${colStr}${r + 1}`;
}

// 엑셀 셀 주소 문자열을 숫자 좌표(0-indexed)로 파싱 (예: "A1" -> 0,0)
function parseCellRef(ref: string): { r: number; c: number } | null {
  const match = ref.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  
  const colStr = match[1];
  const rowStr = match[2];
  
  let c = 0;
  for (let i = 0; i < colStr.length; i++) {
    c = c * 26 + (colStr.charCodeAt(i) - 64);
  }
  c = c - 1; // 0-indexed로 보정
  const r = parseInt(rowStr, 10) - 1;
  return { r, c };
}

export function exportProjectToExcel(project: EstimateProject, libraryItems: CostItem[] = []): void {
  const wbs = project.wbs || [];
  const wb = XLSX.utils.book_new();
  const aoa: any[][] = [];
  
  // 1. 헤더 영역 채우기
  aoa[0] = ['견 적 서', '', '', '', '', '', '', '', ''];
  aoa[1] = ['', '', '', '', '', '', '', '', ''];
  
  // 공급받는 자 정보 (좌측)
  aoa[2] = [`고객사 귀하: ${project.clientName || '귀중'}`, '', '', '', '', '', '공 급 자', '', ''];
  aoa[3] = [`프로젝트명: ${project.title}`, '', '', '', '', '', `상  호: ${project.vendorInfo?.companyName || ''}`, '', ''];
  aoa[4] = [`견적일자: ${project.estimateDate || ''}`, '', '', '', '', '', `대  표: ${project.vendorInfo?.ownerName || ''}`, '', ''];
  aoa[5] = [`유효기간: 발행일로부터 30일`, '', '', '', '', '', `주  소: ${project.vendorInfo?.address || ''}`, '', ''];
  aoa[6] = ['', '', '', '', '', '', '', '', ''];
  
  // 합계금액 듀얼 노출용 계산
  let totalKrw = 0;
  wbs.forEach((cat) => {
    (cat.tasks || []).forEach((task) => {
      const price = getTaskRolePrice(task, project, libraryItems);
      totalKrw += task.manpower * task.md * price;
    });
  });

  const formattedKrw = new Intl.NumberFormat('ko-KR').format(totalKrw);
  let summaryText = `합계금액: 일금 ${formatToKoreanNumber(totalKrw)}원정 (₩${formattedKrw} - 부가세 별도)`;
  
  if (project.useForeignCurrency && project.foreignCurrency && project.exchangeRate) {
    const totalForeign = Math.round((totalKrw / project.exchangeRate) * 100) / 100;
    const formattedForeign = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(totalForeign);
    const currencyUnit = project.foreignCurrency === 'EUR' ? '€' : project.foreignCurrency === 'USD' ? '$' : project.foreignCurrency;
    summaryText += ` / [외화 환산 계]: ${currencyUnit} ${formattedForeign}`;
  }
  
  aoa[7] = [summaryText, '', '', '', '', '', '', '', ''];
  aoa[8] = ['', '', '', '', '', '', '', '', ''];
  
  // 테이블 헤더 (10행)
  aoa[9] = [
    'No.', 
    '항목', 
    '작업내용', 
    '상세', 
    '투입인력(명)', 
    '투입일수(MD)', 
    '일노임단가', 
    '금액(VAT별도)', 
    '비고'
  ];
  
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 8 } }, // 타이틀
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // 공급받는자
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
    { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } }, // 공급자
    { s: { r: 3, c: 6 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 8 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 8 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 8 } }, // 합계금액
  ];
  
  let currentRow = 10;
  
  // 2. WBS 세부 행 추가
  wbs.forEach((cat) => {
    const tasks = cat.tasks || [];
    if (tasks.length === 0) return;
    
    const startRow = currentRow;
    const endRow = startRow + tasks.length - 1;
    
    merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
    merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });
    
    tasks.forEach((task, index) => {
      const price = getTaskRolePrice(task, project, libraryItems);
      
      // 기존 텍스트 내 중복 불릿점 완벽 정화 처리
      const detailsText = Array.isArray(task.details) && task.details.length > 0
        ? task.details
            .map(d => {
              const cleaned = d.replace(/^[\s•\-*.*:]+/, '').trim();
              return cleaned ? `• ${cleaned}` : '';
            })
            .filter(Boolean)
            .join('\n')
        : '';
        
      const excelRowIndex = currentRow + 1; // 엑셀 1-indexed 좌표
      
      aoa[currentRow] = [
        index === 0 ? cat.no : '',
        index === 0 ? cat.title : '',
        task.name || '',
        detailsText,
        task.manpower || 0,
        task.md || 0,
        price,
        // H열: 곱셈 수식으로 세팅하여 엑셀 자동 연산 처리 (투입인력 * 투입일수 * 단가)
        { f: `E${excelRowIndex}*F${excelRowIndex}*G${excelRowIndex}` },
        task.memo || ''
      ];
      currentRow++;
    });
  });
  
  const wbsStartRow = 11;
  const wbsEndRow = currentRow; // 마지막 데이터행 엑셀 번호
  
  // 3. 계(원화) 행 추가
  const totalRowIndex = currentRow;
  aoa[totalRowIndex] = [
    '계(원화)', '', '', '', '', '', '', 
    { f: `SUM(H${wbsStartRow}:H${wbsEndRow})` }, // 진짜 작동하는 엑셀 수식
    ''
  ];
  merges.push({ s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 6 } });
  currentRow++;
  
  // 4. 계(외화) 행 추가
  let exchangeRowIndex = -1;
  if (project.useForeignCurrency && project.foreignCurrency && project.exchangeRate) {
    exchangeRowIndex = currentRow;
    const currencyUnit = project.foreignCurrency === 'EUR' ? '유로' : project.foreignCurrency === 'USD' ? '달러' : project.foreignCurrency;
    const rateText = `계(${project.foreignCurrency})   *적용환율: 1 ${currencyUnit} = ${project.exchangeRate}원 (고시환율 기준)`;
    
    aoa[exchangeRowIndex] = [
      rateText, '', '', '', '', '', '', 
      { f: `ROUND(H${totalRowIndex + 1}/${project.exchangeRate}, 2)` }, // 진짜 작동하는 엑셀 수식
      ''
    ];
    merges.push({ s: { r: exchangeRowIndex, c: 0 }, e: { r: exchangeRowIndex, c: 6 } });
    currentRow++;
  }
  
  // 5. 시트 객체로 변환
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  
  // 6. 테두리 및 폰트 9pt 일괄 주입 스타일링 엔진
  const commonFont = { name: '맑은 고딕', size: 9 };
  const borderThin = {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } }
  };
  
  Object.keys(ws).forEach((key) => {
    if (key.startsWith('!')) return;
    
    const cell = ws[key];
    const parsedRef = parseCellRef(key);
    if (!parsedRef) return;
    
    const { r, c } = parsedRef;
    
    // 기본 셀 스타일 셋업 (9pt, 얇은 회색 테두리)
    cell.s = {
      font: { ...commonFont },
      alignment: { vertical: 'center' },
      border: { ...borderThin }
    };
    
    // A. 타이틀 스타일 (0행 ~ 1행)
    if (r >= 0 && r <= 1) {
      cell.s.font = { name: '맑은 고딕', size: 18, bold: true, underline: true };
      cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      delete cell.s.border; // 테두리 제거
      return;
    }
    
    // B. 정보 영역 스타일 (2행 ~ 6행)
    if (r >= 2 && r <= 6) {
      cell.s.font = { name: '맑은 고딕', size: 9 };
      delete cell.s.border; // 테두리 제거
      if (c >= 6) { // 공급자 우측 정렬
        cell.s.alignment = { horizontal: 'right', vertical: 'center' };
      }
      return;
    }
    
    // C. 합계금액 요약 바 스타일 (7행)
    if (r === 7) {
      cell.s.font = { name: '맑은 고딕', size: 10, bold: true };
      cell.s.fill = { fgColor: { rgb: 'E2EFDA' } }; // 연두색 배경
      cell.s.alignment = { horizontal: 'left', vertical: 'center' };
      cell.s.border = {
        top: { style: 'medium', color: { rgb: '555555' } },
        bottom: { style: 'medium', color: { rgb: '555555' } }
      };
      return;
    }
    
    // D. 테이블 헤더 스타일 (9행)
    if (r === 9) {
      cell.s.font = { name: '맑은 고딕', size: 9, bold: true };
      cell.s.fill = { fgColor: { rgb: 'F2F2F2' } }; // 회색 배경
      cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      cell.s.border = {
        top: { style: 'medium', color: { rgb: '555555' } },
        bottom: { style: 'medium', color: { rgb: '555555' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
      };
      return;
    }
    
    // E. 최하단 계(원화, 외화) 행 스타일
    if (r >= totalRowIndex) {
      cell.s.font = { name: '맑은 고딕', size: 9, bold: true };
      cell.s.border = {
        top: { style: 'thin', color: { rgb: '555555' } },
        bottom: { style: 'double', color: { rgb: '555555' } } // 회계식 이중 테두리선
      };
      if (c === 7) {
        cell.s.alignment = { horizontal: 'right', vertical: 'center' };
      } else {
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }
      return;
    }
    
    // F. 데이터 행 정렬 가이드 (10행 ~ totalRowIndex - 1)
    if (r >= 10 && r < totalRowIndex) {
      if (c === 0 || c === 1 || c === 4 || c === 5) {
        cell.s.alignment.horizontal = 'center';
      } else if (c === 2 || c === 3) {
        cell.s.alignment.horizontal = 'left';
        cell.s.alignment.wrapText = true; // 줄바꿈 활성화
      } else if (c === 6 || c === 7) {
        cell.s.alignment.horizontal = 'right';
      }
    }
  });

  // 7. 열 가로폭(width) 튜닝 (텍스트 잘림 절대 방지)
  ws['!cols'] = [
    { wch: 6 },   // No.
    { wch: 22 },  // 항목 (대분류)
    { wch: 25 },  // 작업내용
    { wch: 70 },  // 상세 (60에서 70으로 넓혀 충분한 공간 확보)
    { wch: 13 },  // 투입인력(명)
    { wch: 14 },  // 투입일수(MD)
    { wch: 14 },  // 일노임단가
    { wch: 16 },  // 금액(VAT별도)
    { wch: 12 }   // 비고
  ];
  
  // 8. 서식 포맷팅 (원화/외화 통화 콤마 기호 입히기)
  for (let r = 10; r < currentRow; r++) {
    const priceCellRef = encodeCell(r, 6);
    if (ws[priceCellRef] && typeof ws[priceCellRef].v === 'number') {
      ws[priceCellRef].z = '"₩"#,##0';
    }
    
    const amountCellRef = encodeCell(r, 7);
    if (ws[amountCellRef]) {
      const isForeign = (exchangeRowIndex !== -1 && r === exchangeRowIndex);
      if (isForeign && project.foreignCurrency) {
        const symbol = project.foreignCurrency === 'EUR' ? '€' : project.foreignCurrency === 'USD' ? '$' : '';
        ws[amountCellRef].z = `"${symbol}"#,##0.00`;
      } else {
        ws[amountCellRef].z = '"₩"#,##0';
      }
    }
  }

  // 9. 워크북 파일 쓰기 및 내보내기
  XLSX.utils.book_append_sheet(wb, ws, '견적서 명세');
  const fileName = `${project.title || '견적서'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 원화 숫자 금액을 한글 음독으로 표기해주는 유틸 (예: 12540000 -> 일천이백오십사만)
function formatToKoreanNumber(num: number): string {
  if (num === 0) return '영';
  
  const units = ['', '만', '억', '조'];
  const nums = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const positions = ['', '십', '백', '천'];
  
  let result = '';
  let division = num;
  let unitIndex = 0;
  
  while (division > 0) {
    const part = division % 10000;
    division = Math.floor(division / 10000);
    
    if (part === 0) {
      unitIndex++;
      continue;
    }
    
    let partStr = '';
    let tempPart = part;
    for (let i = 0; i < 4; i++) {
      const digit = tempPart % 10;
      tempPart = Math.floor(tempPart / 10);
      
      if (digit > 0) {
        const digitStr = nums[digit];
        const posStr = positions[i];
        if (digit === 1 && i > 0) {
          partStr = posStr + partStr;
        } else {
          partStr = digitStr + posStr + partStr;
        }
      }
    }
    
    result = partStr + units[unitIndex] + result;
    unitIndex++;
  }
  
  return result;
}
