import { useState, useMemo } from 'react';
import { Layers, Activity, Clock } from 'lucide-react';
import type { WbsCategory, WbsTask } from '../types/estimate';

interface GanttChartProps {
  wbs: WbsCategory[];
  onUpdateTask: (categoryId: string, taskId: string, fields: Partial<WbsTask>) => void;
}

export default function GanttChart({ wbs, onUpdateTask }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // 모든 날짜가 입력된 태스크 평탄화 및 수집
  const tasksWithDates = useMemo(() => {
    const list: { categoryTitle: string; categoryId: string; task: WbsTask }[] = [];
    wbs.forEach(cat => {
      cat.no;
      cat.tasks.forEach(t => {
        if (t.startDate && t.endDate) {
          list.push({
            categoryTitle: cat.title,
            categoryId: cat.id,
            task: t
          });
        }
      });
    });
    return list;
  }, [wbs]);

  // 타임라인 범위 산출 (최소 시작일 ~ 최대 종료일)
  const timelineRange = useMemo(() => {
    if (tasksWithDates.length === 0) {
      // 날짜 정보가 없는 경우 기본값 (오늘 기준 앞뒤 2주)
      const start = new Date();
      start.setDate(start.getDate() - 14);
      const end = new Date();
      end.setDate(end.getDate() + 14);
      return { start, end, totalDays: 28 };
    }

    let minDate = new Date(tasksWithDates[0].task.startDate!);
    let maxDate = new Date(tasksWithDates[0].task.endDate!);

    tasksWithDates.forEach(item => {
      const s = new Date(item.task.startDate!);
      const e = new Date(item.task.endDate!);
      if (!isNaN(s.getTime()) && s < minDate) minDate = s;
      if (!isNaN(e.getTime()) && e > maxDate) maxDate = e;
    });

    // 버퍼로 앞뒤 3일씩 추가
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 5);

    const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return { start: minDate, end: maxDate, totalDays };
  }, [tasksWithDates]);

  // 날짜 배열 생성
  const dateList = useMemo(() => {
    const list: Date[] = [];
    const current = new Date(timelineRange.start);
    for (let i = 0; i < timelineRange.totalDays; i++) {
      list.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return list;
  }, [timelineRange]);

  // 가로 셀 너비 (모드에 따라 분기)
  const cellWidth = viewMode === 'week' ? 36 : 14;

  // 날짜별 오프셋 계산 유틸
  const getDayOffset = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    const diffTime = d.getTime() - timelineRange.start.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  // 날짜별 기간 일수 계산 유틸
  const getDurationDays = (startStr: string, endStr: string) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diffTime = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  };

  // 월별 경계 구획 산출 (그리드 세로선 구분선 렌더링용)
  const monthDividers = useMemo(() => {
    const dividers: { offset: number; label: string }[] = [];
    let prevMonthStr = '';
    dateList.forEach((date, idx) => {
      const mStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
      if (mStr !== prevMonthStr) {
        dividers.push({ offset: idx, label: mStr });
        prevMonthStr = mStr;
      }
    });
    return dividers;
  }, [dateList]);

  // 주별 경계 (일요일 기준) 산출
  const weekDividers = useMemo(() => {
    const dividers: number[] = [];
    dateList.forEach((date, idx) => {
      if (date.getDay() === 0) { // 일요일
        dividers.push(idx);
      }
    });
    return dividers;
  }, [dateList]);

  if (wbs.length === 0) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <Layers size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <div>등록된 WBS 대분류 항목이 없습니다. 먼저 WBS 항목을 구성해주세요.</div>
      </div>
    );
  }

  return (
    <div className="gantt-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 컨트롤 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          <Activity size={18} className="color-blue" />
          <span>WBS 공정 관리 및 타임라인 시각화</span>
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
          <button 
            type="button"
            onClick={() => setViewMode('week')}
            className={`btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 0, padding: '6px 12px', fontSize: '12px', fontWeight: '700', border: 'none' }}
          >
            주간 뷰 (넓게)
          </button>
          <button 
            type="button"
            onClick={() => setViewMode('month')}
            className={`btn-sm ${viewMode === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 0, padding: '6px 12px', fontSize: '12px', fontWeight: '700', border: 'none', borderLeft: '1px solid var(--border-color)' }}
          >
            월간 뷰 (좁게)
          </button>
        </div>
      </div>

      {tasksWithDates.length === 0 ? (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', backgroundColor: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
          <Clock size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>간트 차트 미활성화 상태</h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: '1.6' }}>
            우측의 <strong>업무 범위 명세서 (WBS)</strong> 작성 화면에서 세부 작업 행들의 <strong>[시작일]</strong>과 <strong>[종료일]</strong>을 기입하시면, 전체 일정을 조율할 수 있는 우아한 타임라인 막대 그래프가 여기에 자동으로 렌더링됩니다.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {/* 전체 그리드 스크롤 컨테이너 */}
          <div style={{ display: 'flex', overflowX: 'auto', width: '100%' }}>
            
            {/* 좌측: 태스크 리스트 패널 고정 */}
            <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', zIndex: 2 }}>
              {/* 헤더 */}
              <div style={{ height: '54px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                WBS 세부 작업 및 대분류
              </div>
              
              {/* 목록 행 */}
              {tasksWithDates.map((item, idx) => (
                <div 
                  key={`name-${item.task.id}-${idx}`}
                  style={{ 
                    height: '42px', 
                    borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    padding: '0 12px',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    backgroundColor: '#fff'
                  }}
                  title={`[${item.categoryTitle}] ${item.task.name}`}
                >
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {item.task.name}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {item.categoryTitle} • {item.task.role}
                  </div>
                </div>
              ))}
            </div>

            {/* 우측: 간트 타임라인 그리드 패널 (SVG 연동) */}
            <div style={{ flexGrow: 1, position: 'relative' }}>
              
              {/* SVG 캔버스 동적 가로폭 계산 */}
              <svg 
                width={timelineRange.totalDays * cellWidth} 
                height={54 + (tasksWithDates.length * 42)}
                style={{ display: 'block' }}
              >
                {/* 1. 세로 격자 그리드 및 헤더 */}
                <g>
                  {/* 날짜축 배경 */}
                  <rect width={timelineRange.totalDays * cellWidth} height="54" fill="var(--bg-secondary)" />
                  
                  {/* 월 구분 안내 레이블 및 경계선 */}
                  {monthDividers.map((div, i) => (
                    <g key={`month-div-${i}`}>
                      <line 
                        x1={div.offset * cellWidth} 
                        y1="0" 
                        x2={div.offset * cellWidth} 
                        y2={54 + (tasksWithDates.length * 42)} 
                        stroke="var(--border-color)" 
                        strokeWidth="2" 
                      />
                      <text 
                        x={(div.offset * cellWidth) + 8} 
                        y="20" 
                        fill="var(--text-primary)" 
                        fontSize="11" 
                        fontWeight="700"
                      >
                        {div.label}
                      </text>
                    </g>
                  ))}

                  {/* 주간 뷰일 경우 개별 일요일/토요일 경계선 및 세부 날짜 숫자 표기 */}
                  {dateList.map((date, idx) => {
                    const isSunday = date.getDay() === 0;
                    const isSaturday = date.getDay() === 6;
                    const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

                    return (
                      <g key={`day-grid-${idx}`}>
                        {/* 격자 세로선 */}
                        {viewMode === 'week' && idx > 0 && !isSunday && (
                          <line 
                            x1={idx * cellWidth} 
                            y1="32" 
                            x2={idx * cellWidth} 
                            y2={54 + (tasksWithDates.length * 42)} 
                            stroke="var(--border-color)" 
                            strokeWidth="0.5" 
                            strokeDasharray="2 2"
                          />
                        )}
                        
                        {/* 일요일/토요일 세로 그리드 배경 */}
                        {viewMode === 'week' && (isSunday || isSaturday) && (
                          <rect 
                            x={idx * cellWidth} 
                            y="32" 
                            width={cellWidth} 
                            height={22 + (tasksWithDates.length * 42)} 
                            fill={isSunday ? 'rgba(211, 47, 47, 0.03)' : 'rgba(25, 118, 210, 0.02)'} 
                          />
                        )}

                        {/* 오늘 날짜 하이라이트 세로 띠 */}
                        {isToday && (
                          <rect 
                            x={idx * cellWidth} 
                            y="32" 
                            width={cellWidth} 
                            height={22 + (tasksWithDates.length * 42)} 
                            fill="rgba(25, 118, 210, 0.08)" 
                          />
                        )}

                        {/* 주간 뷰의 날짜 숫자 표출 */}
                        {viewMode === 'week' && (
                          <text 
                            x={(idx * cellWidth) + (cellWidth / 2)} 
                            y="46" 
                            textAnchor="middle" 
                            fontSize="9" 
                            fontWeight={isToday ? '700' : '500'} 
                            fill={isToday ? '#1976d2' : isSunday ? '#d32f2f' : isSaturday ? '#1976d2' : 'var(--text-secondary)'}
                          >
                            {date.getDate()}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* 주간 단위 굵은 그리드선 (월간 뷰이거나 주간 뷰의 일요일 위치) */}
                  {weekDividers.map((offset, i) => (
                    <line 
                      key={`week-div-${i}`}
                      x1={offset * cellWidth} 
                      y1="32" 
                      x2={offset * cellWidth} 
                      y2={54 + (tasksWithDates.length * 42)} 
                      stroke="var(--border-color)" 
                      strokeWidth="1.2" 
                    />
                  ))}
                  
                  {/* 헤더 하단 경계선 */}
                  <line x1="0" y1="54" x2={timelineRange.totalDays * cellWidth} y2="54" stroke="var(--border-color)" strokeWidth="1.5" />
                </g>

                {/* 2. 간트 바(Bar) 렌더링 */}
                <g transform="translate(0, 54)">
                  {tasksWithDates.map((item, idx) => {
                    const offset = getDayOffset(item.task.startDate!);
                    const duration = getDurationDays(item.task.startDate!, item.task.endDate!);
                    const progress = item.task.progress || 0;
                    
                    const barX = offset * cellWidth;
                    const barWidth = duration * cellWidth;
                    const barHeight = 16;
                    const barY = (idx * 42) + 13; // 행 중심 배치
                    
                    // 역할군별 파스텔톤 계열 색상 추출
                    const roleColorMap: Record<string, { bg: string; fill: string }> = {
                      '기획/PM': { bg: '#bbdefb', fill: '#1976d2' },
                      'UI/UX 디자인': { bg: '#f8bbd0', fill: '#d81b60' },
                      '프론트엔드 개발': { bg: '#e1bee7', fill: '#8e24aa' },
                      '백엔드 개발': { bg: '#c8e6c9', fill: '#2e7d32' },
                      'QA/품질검증': { bg: '#ffe0b2', fill: '#f57c00' },
                      '기타': { bg: '#cfd8dc', fill: '#546e7a' }
                    };
                    const color = roleColorMap[item.task.role] || roleColorMap['기타'];

                    return (
                      <g key={`bar-group-${item.task.id}-${idx}`}>
                        {/* 행 뒷배경 가로 구분선 */}
                        <line 
                          x1="0" 
                          y1={(idx * 42) + 42} 
                          x2={timelineRange.totalDays * cellWidth} 
                          y2={(idx * 42) + 42} 
                          stroke="var(--border-color)" 
                          strokeWidth="0.5" 
                        />
                        
                        {/* 타임라인 바 껍데기 (미도달 배경) */}
                        <rect 
                          x={barX} 
                          y={barY} 
                          width={barWidth} 
                          height={barHeight} 
                          rx="4" 
                          ry="4" 
                          fill={color.bg} 
                          opacity="0.5" 
                          style={{ cursor: 'pointer' }}
                        />

                        {/* 진척도(Progress) 도달 막대 */}
                        <rect 
                          x={barX} 
                          y={barY} 
                          width={barWidth * (progress / 100)} 
                          height={barHeight} 
                          rx="4" 
                          ry="4" 
                          fill={color.fill} 
                          style={{ cursor: 'pointer' }}
                        />

                        {/* 인터랙티브 진척도 슬라이더 대체 텍스트 혹은 라벨 */}
                        <text
                          x={barX + barWidth + 8}
                          y={barY + 12}
                          fontSize="10"
                          fontWeight="600"
                          fill="var(--text-primary)"
                        >
                          {progress}% ({duration}d)
                        </text>

                        {/* 간트 바 내부 진척도 조정 조작 영역 제공 (간이 슬라이더 버튼 역할 구현) */}
                        <g 
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const newProg = prompt(`"${item.task.name}" 작업의 새로운 진척도(0~100)를 입력하세요.`, String(progress));
                            if (newProg !== null) {
                              const val = Math.min(100, Math.max(0, parseInt(newProg) || 0));
                              onUpdateTask(item.categoryId, item.task.id, { progress: val });
                            }
                          }}
                        >
                          {/* 마우스 호버 영역 확장을 위한 투명 오버레이 */}
                          <rect 
                            x={barX} 
                            y={barY - 4} 
                            width={barWidth} 
                            height={barHeight + 8} 
                            fill="transparent" 
                          />
                        </g>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
