import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { EstimateProject } from '../types/estimate';

interface ClientStatCalendarProps {
  projects: EstimateProject[];
  onSelectProject: (projectId: string) => void;
}

export default function ClientStatCalendar({ projects, onSelectProject }: ClientStatCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // 이전 달로 이동
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // 다음 달로 이동
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // 오늘 날짜로 이동
  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  // 프로젝트 날짜별 그룹핑
  const calendarData = useMemo(() => {
    const billingMap: Record<string, EstimateProject[]> = {};
    const paymentMap: Record<string, EstimateProject[]> = {};

    projects.forEach(proj => {
      // WBS 공급금액 + 부가세 총액 산출
      let supply = 0;
      let vat = 0;
      proj.sections.forEach(sec => {
        sec.rows.forEach(row => {
          if (row.isSelected) {
            supply += row.supplyPrice;
            vat += row.vat;
          }
        });
      });
      const correctionRate = proj.totalCorrectionRate || 0;
      const finalSupply = supply + Math.round(supply * correctionRate);
      const finalVat = correctionRate !== 0 ? Math.floor(finalSupply * 0.1) : vat;
      const grandTotal = finalSupply + finalVat;
      
      // 임시 프로퍼티 주입 (원화 최종 합계 금액 보관)
      const projectWithAmount = { ...proj, tempGrandTotal: grandTotal };

      if (proj.billingDate) {
        if (!billingMap[proj.billingDate]) billingMap[proj.billingDate] = [];
        billingMap[proj.billingDate].push(projectWithAmount);
      }
      if (proj.paymentDueDate) {
        if (!paymentMap[proj.paymentDueDate]) paymentMap[proj.paymentDueDate] = [];
        paymentMap[proj.paymentDueDate].push(projectWithAmount);
      }
    });

    return { billingMap, paymentMap };
  }, [projects]);

  // 해당 월의 첫 번째 날 요일과 총 일수 구하기
  const { daysInMonth, startDayOfWeek, prevMonthDays } = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const prevLastDay = new Date(currentYear, currentMonth, 0);
    
    return {
      daysInMonth: lastDay.getDate(),
      startDayOfWeek: firstDay.getDay(), // 0: 일요일, 6: 토요일
      prevMonthDays: prevLastDay.getDate()
    };
  }, [currentYear, currentMonth]);

  // 이번 달 자금 흐름 현황 요약
  const monthlySummary = useMemo(() => {
    let totalBilling = 0;
    let totalPayment = 0;
    let totalOverdue = 0; // 미수금 (지불 완료가 아니면서 수금 예정일이 오늘 이전인 경우)
    
    const todayStr = new Date().toISOString().split('T')[0];

    projects.forEach(proj => {
      // 금액 산출
      let supply = 0;
      let vat = 0;
      proj.sections.forEach(sec => {
        sec.rows.forEach(row => {
          if (row.isSelected) {
            supply += row.supplyPrice;
            vat += row.vat;
          }
        });
      });
      const correctionRate = proj.totalCorrectionRate || 0;
      const finalSupply = supply + Math.round(supply * correctionRate);
      const finalVat = correctionRate !== 0 ? Math.floor(finalSupply * 0.1) : vat;
      const grandTotal = finalSupply + finalVat;

      // 이번달 범위 판정
      if (proj.billingDate) {
        const bDate = new Date(proj.billingDate);
        if (bDate.getFullYear() === currentYear && bDate.getMonth() === currentMonth) {
          totalBilling += grandTotal;
        }
      }

      if (proj.paymentDueDate) {
        const pDate = new Date(proj.paymentDueDate);
        if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
          totalPayment += grandTotal;
        }
        
        // 미수금 조건: 미완료 상태 && 수금 예정일이 오늘보다 과거
        if (proj.status !== 'completed' && proj.paymentDueDate < todayStr) {
          totalOverdue += grandTotal;
        }
      }
    });

    return { totalBilling, totalPayment, totalOverdue };
  }, [projects, currentYear, currentMonth]);

  // 캘린더 그리드 아이템 배열 구성
  const calendarCells = useMemo(() => {
    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // 1. 이전 달 날짜 채우기
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const d = prevMonthDays - i;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // 2. 이번 달 날짜 채우기
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // 3. 다음 달 날짜 채우기 (총 42칸 기준 맞추기)
    const totalCells = cells.length;
    const remainingCells = 42 - totalCells;
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return cells;
  }, [currentYear, currentMonth, daysInMonth, startDayOfWeek, prevMonthDays]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="calendar-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* A. 자금 흐름 현황 요약 카드 대시보드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* 청구 예정 카드 */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #1976d2', borderRadius: '8px' }}>
          <div style={{ backgroundColor: '#e3f2fd', color: '#1976d2', borderRadius: '50%', padding: '10px', display: 'flex' }}>
            <ArrowUpRight size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{currentMonth + 1}월 청구 예정 총액</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              ₩{monthlySummary.totalBilling.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 수금 예정 카드 */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid #2e7d32', borderRadius: '8px' }}>
          <div style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '50%', padding: '10px', display: 'flex' }}>
            <ArrowDownRight size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{currentMonth + 1}월 수금 예정 총액</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              ₩{monthlySummary.totalPayment.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 미수금 누적 경고 카드 */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${monthlySummary.totalOverdue > 0 ? '#d32f2f' : 'var(--border-color)'}`, borderRadius: '8px' }}>
          <div style={{ backgroundColor: monthlySummary.totalOverdue > 0 ? '#ffebee' : 'var(--bg-secondary)', color: monthlySummary.totalOverdue > 0 ? '#d32f2f' : 'var(--text-tertiary)', borderRadius: '50%', padding: '10px', display: 'flex' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>미수금 누적액 (기한 경과)</span>
              {monthlySummary.totalOverdue > 0 && (
                <span style={{ backgroundColor: '#d32f2f', color: '#fff', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>경고</span>
              )}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: monthlySummary.totalOverdue > 0 ? '#d32f2f' : 'var(--text-primary)', marginTop: '4px' }}>
              ₩{monthlySummary.totalOverdue.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* B. 캘린더 바디 */}
      <div className="card" style={{ padding: '24px', borderRadius: '12px' }}>
        {/* 캘린더 컨트롤러 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} className="color-blue" />
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
              {currentYear}년 {String(currentMonth + 1).padStart(2, '0')}월 자금 일정표
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleGoToToday} style={{ fontWeight: '600' }}>
              오늘
            </button>
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <button 
                type="button" 
                onClick={handlePrevMonth} 
                style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                className="hover-bg-sub"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                type="button" 
                onClick={handleNextMonth} 
                style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', borderLeft: '1px solid var(--border-color)' }}
                className="hover-bg-sub"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: '700', fontSize: '12px', color: 'var(--text-secondary)', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ color: '#d32f2f' }}>일</div>
          <div>월</div>
          <div>화</div>
          <div>수</div>
          <div>목</div>
          <div>금</div>
          <div style={{ color: '#1976d2' }}>토</div>
        </div>

        {/* 캘린더 일 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(110px, auto)', gap: '4px', marginTop: '4px' }}>
          {calendarCells.map((cell, index) => {
            const { dateStr, dayNum, isCurrentMonth } = cell;
            const billingList = calendarData.billingMap[dateStr] || [];
            const paymentList = calendarData.paymentMap[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSunday = index % 7 === 0;
            const isSaturday = index % 7 === 6;

            return (
              <div 
                key={dateStr} 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  padding: '6px', 
                  backgroundColor: isToday ? '#e3f2fd' : isCurrentMonth ? 'transparent' : 'var(--bg-secondary)', 
                  opacity: isCurrentMonth ? 1 : 0.4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  position: 'relative'
                }}
              >
                {/* 날짜 표시 */}
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: isToday ? '700' : '500', 
                  color: isToday ? '#1976d2' : isSunday ? '#d32f2f' : isSaturday ? '#1976d2' : 'var(--text-primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{dayNum}</span>
                  {isToday && (
                    <span style={{ fontSize: '9px', backgroundColor: '#1976d2', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: '700' }}>TODAY</span>
                  )}
                </div>

                {/* 일정 뱃지 목록 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px', overflowY: 'auto', maxHeight: '80px' }}>
                  {/* 청구 칩 */}
                  {billingList.map(proj => {
                    const amt = (proj as any).tempGrandTotal || 0;
                    const amtText = amt >= 100000000 
                      ? `${(amt / 100000000).toFixed(1)}억` 
                      : amt >= 10000 
                      ? `${(amt / 10000).toLocaleString()}만` 
                      : `${amt.toLocaleString()}원`;

                    return (
                      <div 
                        key={`b-${proj.id}`}
                        onClick={() => onSelectProject(proj.id)}
                        title={`[청구] ${proj.title} - ₩${amt.toLocaleString()}`}
                        style={{ 
                          fontSize: '10px', 
                          backgroundColor: '#e3f2fd', 
                          color: '#0d47a1', 
                          padding: '2px 4px', 
                          borderRadius: '4px', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          border: '1px solid #bbdefb'
                        }}
                        className="calendar-chip hover-opacity"
                      >
                        청구: {proj.clientName} ({amtText})
                      </div>
                    );
                  })}

                  {/* 수금 칩 */}
                  {paymentList.map(proj => {
                    const amt = (proj as any).tempGrandTotal || 0;
                    const amtText = amt >= 100000000 
                      ? `${(amt / 100000000).toFixed(1)}억` 
                      : amt >= 10000 
                      ? `${(amt / 10000).toLocaleString()}만` 
                      : `${amt.toLocaleString()}원`;

                    // 미수금 여부 판정
                    const isOverdue = proj.status !== 'completed' && dateStr < todayStr;

                    return (
                      <div 
                        key={`p-${proj.id}`}
                        onClick={() => onSelectProject(proj.id)}
                        title={`[수금] ${proj.title} - ₩${amt.toLocaleString()} (${isOverdue ? '미수금 상태' : proj.status === 'completed' ? '지불완료' : '지불대기'})`}
                        style={{ 
                          fontSize: '10px', 
                          backgroundColor: isOverdue ? '#ffebee' : proj.status === 'completed' ? '#e8f5e9' : '#fff3e0', 
                          color: isOverdue ? '#b71c1c' : proj.status === 'completed' ? '#1b5e20' : '#e65100', 
                          padding: '2px 4px', 
                          borderRadius: '4px', 
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          border: `1px solid ${isOverdue ? '#ffcdd2' : proj.status === 'completed' ? '#c8e6c9' : '#ffe0b2'}`
                        }}
                        className="calendar-chip hover-opacity"
                      >
                        {isOverdue ? '⚠️미수: ' : '수금: '}{proj.clientName} ({amtText})
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .hover-bg-sub:hover {
          background-color: var(--bg-secondary) !important;
        }
        .calendar-chip:hover {
          filter: brightness(0.95);
        }
        .hover-opacity:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
