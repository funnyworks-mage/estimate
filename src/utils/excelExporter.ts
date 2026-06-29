import * as XLSX from 'xlsx';
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

export function exportProjectToExcel(project: EstimateProject, libraryItems: CostItem[] = []): void {
  // WBS 데이터가 없을 때의 예외 방어
  const wbs = project.wbs || [];
  
  // 1. 엑셀 워크북 생성
  const wb = XLSX.utils.book_new();
  
  // 2. 시트 데이터 2차원 배열(AOA) 초기화
  const aoa: any[][] = [];
  
  // 타이틀 및 헤더 영역 셋업
  aoa[0] = ['견 적 서', '', '', '', '', '', '', '', ''];
  aoa[1] = ['', '', '', '', '', '', '', '', ''];
  
  // 공급받는 자 정보 (좌측)
  aoa[2] = [`고객사 귀하: ${project.clientName || '귀중'}`, '', '', '', '', '', '공 급 자', '', ''];
  aoa[3] = [`프로젝트명: ${project.title}`, '', '', '', '', '', `상  호: ${project.vendorInfo?.companyName || ''}`, '', ''];
  aoa[4] = [`견적일자: ${project.estimateDate || ''}`, '', '', '', '', '', `대  표: ${project.vendorInfo?.ownerName || ''}`, '', ''];
  aoa[5] = [`유효기간: 발행일로부터 30일`, '', '', '', '', '', `주  소: ${project.vendorInfo?.address || ''}`, '', ''];
  aoa[6] = ['', '', '', '', '', '', '', '', ''];
  
  // 외화 듀얼 환산 금액 산출 로직
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
  
  // 테이블 헤더
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
  
  // 3. WBS 데이터 행 채우기 & 병합 정보 수집
  const merges: XLSX.Range[] = [
    // 타이틀 병합 (A1:I2)
    { s: { r: 0, c: 0 }, e: { r: 1, c: 8 } },
    // 공급받는 자 병합
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
    // 공급자 병합 (상호, 대표, 주소 우측 병합)
    { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 8 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 8 } },
    // 합계금액 행 병합 (A8:I8)
    { s: { r: 7, c: 0 }, e: { r: 7, c: 8 } },
  ];
  
  let currentRow = 10;
  
  wbs.forEach((cat) => {
    const tasks = cat.tasks || [];
    if (tasks.length === 0) return;
    
    const startRow = currentRow;
    const endRow = startRow + tasks.length - 1;
    
    // No.와 항목 세로 병합 정보 주입
    merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
    merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });
    
    tasks.forEach((task, index) => {
      const price = getTaskRolePrice(task, project, libraryItems);
      const amount = task.manpower * task.md * price;
      
      // 상세 불릿 라인들 포맷팅 (Wrap text 유도)
      const detailsText = Array.isArray(task.details) && task.details.length > 0
        ? task.details.map(d => d.startsWith('•') || d.startsWith('-') ? d : `• ${d}`).join('\n')
        : '';
        
      aoa[currentRow] = [
        index === 0 ? cat.no : '',                         // No.
        index === 0 ? cat.title : '',                      // 항목 (대분류)
        task.name || '',                                   // 작업내용
        detailsText,                                       // 상세
        task.manpower || 0,                                // 투입인력
        task.md || 0,                                      // 투입일수
        price,                                             // 일노임단가
        amount,                                            // 금액(VAT별도)
        task.memo || ''                                    // 비고
      ];
      currentRow++;
    });
  });
  
  // 4. 최하단 계(원화) 및 계(외화) 행 추가
  const wbsStartRow = 11;
  const wbsEndRow = currentRow; // 엑셀 좌표용 1-indexed 보정 대상
  
  // 계(원화) 행
  const totalRowIndex = currentRow;
  aoa[totalRowIndex] = [
    '계(원화)', '', '', '', '', '', '', 
    `=SUM(H${wbsStartRow}:H${wbsEndRow})`, 
    ''
  ];
  merges.push({ s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 6 } });
  currentRow++;
  
  // 외화 사용 시 계(외화) 행 추가
  if (project.useForeignCurrency && project.foreignCurrency && project.exchangeRate) {
    const exchangeRowIndex = currentRow;
    const currencyUnit = project.foreignCurrency === 'EUR' ? '유로' : project.foreignCurrency === 'USD' ? '달러' : project.foreignCurrency;
    const rateText = `계(${project.foreignCurrency})   *적용환율: 1 ${currencyUnit} = ${project.exchangeRate}원 (고시환율 기준)`;
    
    aoa[exchangeRowIndex] = [
      rateText, '', '', '', '', '', '', 
      `=ROUND(H${totalRowIndex + 1}/${project.exchangeRate}, 2)`, 
      ''
    ];
    merges.push({ s: { r: exchangeRowIndex, c: 0 }, e: { r: exchangeRowIndex, c: 6 } });
    currentRow++;
  }
  
  // 5. 시트 생성 및 스타일 설정
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  
  // 열 가로폭(width) 지정
  ws['!cols'] = [
    { wch: 6 },   // No.
    { wch: 22 },  // 항목 (대분류)
    { wch: 25 },  // 작업내용
    { wch: 45 },  // 상세
    { wch: 11 },  // 투입인력
    { wch: 13 },  // 투입일수
    { wch: 14 },  // 일노임단가
    { wch: 16 },  // 금액(VAT별도)
    { wch: 12 }   // 비고
  ];
  
  // 셀 서식 (Number format) 지정 - 단가와 금액에 원화 통화 서식 입히기
  for (let r = 10; r < currentRow; r++) {
    // 단가 셀 서식 설정
    const priceCellRef = encodeCell(r, 6);
    if (ws[priceCellRef] && typeof ws[priceCellRef].v === 'number') {
      ws[priceCellRef].z = '"₩"#,##0';
    }
    // 금액 셀 서식 설정 (합계 수식 포함)
    const amountCellRef = encodeCell(r, 7);
    if (ws[amountCellRef]) {
      if (typeof ws[amountCellRef].v === 'number') {
        ws[amountCellRef].z = '"₩"#,##0';
      } else if (ws[amountCellRef].f) { // SUM/ROUND 수식인 경우
        const isForeign = r === (project.useForeignCurrency ? totalRowIndex + 1 : -1);
        if (isForeign && project.foreignCurrency) {
          const symbol = project.foreignCurrency === 'EUR' ? '€' : project.foreignCurrency === 'USD' ? '$' : '';
          ws[amountCellRef].z = `"${symbol}"#,##0.00`;
        } else {
          ws[amountCellRef].z = '"₩"#,##0';
        }
      }
    }
  }

  // 6. 워크북에 시트 추가 및 다운로드 파일 저장
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
        // '일십', '일백', '일천' 등에서 '일' 생략 처리 (단, '만'이나 '억' 앞의 '일'은 살림)
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
