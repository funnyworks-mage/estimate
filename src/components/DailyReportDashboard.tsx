import { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, FileText, CheckCircle2, Clipboard, Printer, Trash2, ArrowLeft } from 'lucide-react';
import type { EstimateProject, DailyReport } from '../types/estimate';
import { StorageAPI } from '../utils/storage';

interface DailyReportDashboardProps {
  projects: EstimateProject[];
}

export default function DailyReportDashboard({ projects }: DailyReportDashboardProps) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase/로컬 스토리지로부터 보고서 리스트 로드
  const loadReports = async () => {
    setIsLoading(true);
    try {
      const list = await StorageAPI.getDailyReports();
      setReports(list);
    } catch (e) {
      console.error('보고서 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [projects]);

  // 과거 보고서나 누락된 건에 대한 실시간 WBS 상세 내역 매핑 도우미 (Fallback)
  const getTaskDetailsWithFallback = (t: { projectId: string; taskId: string; taskDetails?: string[] }) => {
    if (t.taskDetails && t.taskDetails.length > 0) {
      return t.taskDetails;
    }
    const project = projects.find(p => p.id === t.projectId);
    if (project && project.wbs) {
      for (const cat of project.wbs) {
        if (cat.tasks) {
          const foundTask = cat.tasks.find(task => task.id === t.taskId);
          if (foundTask && foundTask.details && Array.isArray(foundTask.details)) {
            return foundTask.details
              .filter((_, idx) => foundTask.checkedDetails?.[idx] === true)
              .map(line => line.replace(/^[•\-\*\s]+/, ''));
          }
        }
      }
    }
    return [];
  };

  // 특정 프로젝트의 WBS 전체 진행 상황 통계 산출 (태스크 건수 및 소모 MD)
  const getProjectWbsStats = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    let totalTasksCount = 0;
    let completedTasksCount = 0;
    let totalPlannedMd = 0;
    let completedMd = 0;

    if (project && project.wbs) {
      project.wbs.forEach(cat => {
        if (cat.tasks) {
          cat.tasks.forEach(task => {
            totalTasksCount++;
            totalPlannedMd += task.md || 0;
            if (task.status === 'completed') {
              completedTasksCount++;
              completedMd += task.md || 0;
            }
          });
        }
      });
    }

    return {
      totalTasksCount,
      completedTasksCount,
      totalPlannedMd: parseFloat(totalPlannedMd.toFixed(1)),
      completedMd: parseFloat(completedMd.toFixed(1))
    };
  };

  // 오늘 날짜 구하기 (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // 오늘 완료된 WBS 태스크 수 계산
  const todayCompletedCount = useMemo(() => {
    let count = 0;
    projects.forEach(proj => {
      if (proj.wbs) {
        proj.wbs.forEach(cat => {
          if (cat.tasks) {
            cat.tasks.forEach(task => {
              if (task.status === 'completed' && task.actualEndDate === todayStr) {
                count++;
              }
            });
          }
        });
      }
    });
    return count;
  }, [projects, todayStr]);

  // 1. 오늘의 업무 보고서 자동 생성 및 Supabase DB 저장
  const handleCreateTodayReport = async () => {
    const completedTasks: DailyReport['completedTasks'] = [];

    // 모든 프로젝트 WBS 중 실제 완료일이 오늘인 세부 작업 취합
    projects.forEach(proj => {
      if (proj.wbs && Array.isArray(proj.wbs)) {
        proj.wbs.forEach(cat => {
          if (cat.tasks && Array.isArray(cat.tasks)) {
            cat.tasks.forEach(task => {
              if (task.status === 'completed' && task.actualEndDate === todayStr) {
                // 체크박스가 선택된 상세 세부내역 수집
                const taskDetails = task.details && Array.isArray(task.details)
                  ? task.details
                      .filter((_, idx) => task.checkedDetails?.[idx] === true)
                      .map(line => line.replace(/^[•\-\*\s]+/, '')) // 불릿 문자 제거하고 수집
                  : [];

                completedTasks.push({
                  projectId: proj.id,
                  projectTitle: proj.title,
                  taskId: task.id,
                  taskName: task.name,
                  role: task.role || '해당없음',
                  actualEndDate: task.actualEndDate,
                  memo: task.memo || '',
                  taskDetails: taskDetails.length > 0 ? taskDetails : undefined
                });
              }
            });
          }
        });
      }
    });

    if (completedTasks.length === 0) {
      alert('오늘 날짜로 실제 완료(실제 완료일이 오늘인) 처리된 WBS 작업이 없습니다.\n"WBS 통합 일정 관리" 메뉴에서 오늘 완료한 항목들의 일자를 확인 및 입력한 후 생성해 주세요.');
      return;
    }

    const exists = reports.find(r => r.reportDate === todayStr);
    if (exists) {
      if (!confirm('오늘 날짜로 이미 생성된 일일 보고서가 Supabase DB에 존재합니다.\n오늘 완료 처리된 최신 데이터로 기존 보고서를 덮어쓰시겠습니까?')) {
        return;
      }
    }

    const newReport: DailyReport = {
      id: exists ? exists.id : `report_${Date.now()}`,
      reportDate: todayStr,
      title: `${todayStr} 일일 업무 보고서`,
      completedTasks,
      createdAt: exists ? exists.createdAt : new Date().toISOString()
    };

    await StorageAPI.saveDailyReport(newReport);
    alert('오늘의 일일 업무 보고서가 Supabase 데이터베이스에 실시간 저장 완료되었습니다.');
    
    // 리스트 리로드
    await loadReports();
    
    // 생성한 보고서 즉시 상세 보기로 전환
    const freshList = await StorageAPI.getDailyReports();
    const target = freshList.find(r => r.reportDate === todayStr);
    if (target) setSelectedReport(target);
  };

  // 2. 보고서 삭제
  const handleDeleteReport = async (reportId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 카드 클릭 상세 보기 이동 방지
    if (!confirm('해당 일일 업무 보고서를 데이터베이스에서 영구 삭제하시겠습니까?')) {
      return;
    }
    await StorageAPI.deleteDailyReport(reportId);
    if (selectedReport?.id === reportId) {
      setSelectedReport(null);
    }
    await loadReports();
  };

  // 3. 보고서 클립보드 텍스트 복사 기능
  const handleCopyReportToClipboard = (report: DailyReport) => {
    let text = `=========================================\n`;
    text += `📢 ${report.title}\n`;
    text += `📅 작성일: ${report.reportDate}\n`;
    text += `=========================================\n\n`;
    
    // 프로젝트별 그룹화
    const group: Record<string, typeof report.completedTasks> = {};
    report.completedTasks.forEach(t => {
      if (!group[t.projectTitle]) group[t.projectTitle] = [];
      group[t.projectTitle].push(t);
    });

    Object.entries(group).forEach(([projTitle, tasks], idx) => {
      const firstTask = tasks[0];
      const stats = firstTask ? getProjectWbsStats(firstTask.projectId) : { totalTasksCount: 0, completedTasksCount: 0, totalPlannedMd: 0, completedMd: 0 };
      
      text += `${idx + 1}. [프로젝트] ${projTitle} (태스크: ${stats.completedTasksCount}/${stats.totalTasksCount}건 완료, 공수: ${stats.completedMd}/${stats.totalPlannedMd} MD 소모)\n`;
      tasks.forEach(t => {
        text += `  ✔ [${t.role}] ${t.taskName}`;
        if (t.memo) text += ` (메모: ${t.memo})`;
        text += `\n`;
        // 완료된 상세 세부내역 추가 (실시간 Fallback 적용)
        const details = getTaskDetailsWithFallback(t);
        if (details.length > 0) {
          details.forEach(detail => {
            text += `     - ${detail}\n`;
          });
        }
      });
      text += `\n`;
    });
    
    text += `-----------------------------------------\n`;
    text += `위와 같이 오늘의 업무 완료 실적을 보고합니다.\n`;

    navigator.clipboard.writeText(text);
    alert('보고서 텍스트 내용이 클립보드에 복사되었습니다!\n협업 툴(메신저, 메일 등)에 붙여넣어 공유하세요.');
  };

  // 4. 인쇄/PDF 저장용 새 창 열기 (A4 템플릿 - 컴팩트 최적화 버전)
  const handlePrintReport = (report: DailyReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // 프로젝트별 그룹화
    const group: Record<string, typeof report.completedTasks> = {};
    report.completedTasks.forEach(t => {
      if (!group[t.projectTitle]) group[t.projectTitle] = [];
      group[t.projectTitle].push(t);
    });

    const htmlContent = `
      <html>
      <head>
        <title>${report.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; 
            padding: 20px; 
            color: #1e293b; 
            line-height: 1.4; 
            background-color: #ffffff;
            font-size: 11px;
          }
          .report-header-card { 
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #2563eb 100%);
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 18px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          }
          .report-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.15);
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 6px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            letter-spacing: 0.5px;
          }
          .report-title { 
            font-size: 18px; 
            font-weight: 800; 
            margin: 0 0 6px 0; 
            letter-spacing: -0.5px;
          }
          .report-date { 
            font-size: 11px; 
            opacity: 0.9;
          }
          
          .section-project { 
            margin-bottom: 24px; 
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            background-color: #ffffff;
          }
          .project-title { 
            font-size: 13px; 
            font-weight: 900; 
            border-left: 4px solid #2563eb; 
            padding-left: 10px; 
            margin-bottom: 14px; 
            color: #1e3a8a; 
          }
          
          /* 인쇄용 대시보드 미니 카드 (높이 및 마진 대폭 축소) */
          .print-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 14px;
            background-color: #f8fafc;
            padding: 8px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .print-stat-card {
            background: #ffffff;
            padding: 6px 10px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .print-stat-label {
            font-size: 8.5px;
            font-weight: bold;
            color: #64748b;
            margin-bottom: 2px;
          }
          .print-stat-value {
            font-size: 12px;
            font-weight: bold;
            color: #0f172a;
          }
          .print-stat-value.blue { color: #2563eb; }
          .print-stat-value.green { color: #10b981; }
          
          .task-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px;
          }
          .task-table th, .task-table td { 
            border: 1px solid #e2e8f0; 
            padding: 8px 10px; 
            text-align: left; 
            font-size: 10.5px; 
            vertical-align: middle;
          }
          .task-table th { 
            background-color: #f1f5f9; 
            font-weight: 700; 
            color: #334155;
          }
          .task-table tr {
            page-break-inside: avoid; /* 개별 행이 잘리지 않도록 설정 */
          }
          .task-table td.role-col { 
            font-weight: bold; 
            width: 100px; 
            color: #4f46e5; 
          }
          .role-badge {
            background-color: #f5f3ff;
            border: 1px solid rgba(79, 70, 229, 0.1);
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 10px;
            display: inline-block;
          }
          .task-table td.memo-col { 
            color: #64748b; 
            font-style: italic; 
            width: 140px;
            word-break: break-all;
          }
          .detail-list {
            margin: 4px 0 0 0;
            padding-left: 14px;
            font-size: 10px;
            color: #475569;
            list-style-type: disc;
          }
          .detail-list li {
            margin-bottom: 2px;
          }
          .report-footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 11px; 
            border-top: 1px solid #e2e8f0; 
            padding-top: 18px; 
            color: #64748b; 
          }
          
          @media print {
            body { padding: 0; }
            .section-project { box-shadow: none; }
            .print-stats-grid { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .report-header-card { background: #1e3a8a !important; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="report-header-card">
          <div class="report-badge">BUSINESS REPORT</div>
          <div class="report-title">${report.title}</div>
          <div class="report-date">작성 기준일: <strong>${report.reportDate}</strong> | 총 완료 실적: <strong>${report.completedTasks.length}건</strong></div>
        </div>
        
        ${Object.entries(group).map(([projTitle, tasks]) => {
          const firstTask = tasks[0];
          const stats = firstTask ? getProjectWbsStats(firstTask.projectId) : { totalTasksCount: 0, completedTasksCount: 0, totalPlannedMd: 0, completedMd: 0 };
          const taskProgress = stats.totalTasksCount > 0 ? Math.round((stats.completedTasksCount / stats.totalTasksCount) * 100) : 0;
          
          return `
          <div class="section-project">
            <div class="project-title">${projTitle}</div>
            
            <!-- 인쇄용 대시보드 통계 카드 -->
            <div class="print-stats-grid">
              <div class="print-stat-card">
                <span class="print-stat-label">진척율</span>
                <span class="print-stat-value blue">${taskProgress}%</span>
              </div>
              <div class="print-stat-card">
                <span class="print-stat-label">태스크 현황</span>
                <span class="print-stat-value">${stats.completedTasksCount} / ${stats.totalTasksCount}건</span>
              </div>
              <div class="print-stat-card" style="border-left: 3px solid #10b981;">
                <span class="print-stat-label">공수 소모</span>
                <span class="print-stat-value green">${stats.completedMd} / ${stats.totalPlannedMd} MD</span>
              </div>
            </div>

            <table class="task-table">
              <thead>
                <tr>
                  <th style="width: 15%;">연동 역할군</th>
                  <th style="width: 60%;">완료된 세부 작업 내용</th>
                  <th style="width: 25%;">작업 비고 (메모)</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.map(t => {
                  const details = getTaskDetailsWithFallback(t);
                  return `
                  <tr>
                    <td class="role-col">
                      <span class="role-badge">${t.role}</span>
                    </td>
                    <td>
                      <div style="font-weight: bold; color: #0f172a; margin-bottom: ${details.length > 0 ? '4px' : '0px'};">${t.taskName}</div>
                      ${details.length > 0 
                        ? `<ul class="detail-list">
                            ${details.map(d => `<li>${d}</li>`).join('')}
                           </ul>` 
                        : ''
                      }
                    </td>
                    <td class="memo-col">${t.memo || '-'}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          `;
        }).join('')}

        <div class="report-footer">
          위와 같이 오늘의 업무 완료 사항을 정식 보고합니다.<br>
          <strong style="display: block; margin-top: 10px; font-size: 15px; color: #0f172a;">보고 일자: ${new Date().toLocaleDateString()}</strong>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="workspace">
      {/* CSS 스타일 영역 */}
      <style>{`
        .report-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }
        .report-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 160px;
        }
        .report-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-blue);
        }
        .report-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .report-card-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.4;
        }
        .report-card-meta {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        .report-card-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }
        .today-trigger-box {
          background-color: var(--color-blue-light);
          border: 1px dashed rgba(49, 130, 246, 0.3);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .today-trigger-info h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-blue-dark);
          margin: 0 0 6px 0;
        }
        .today-trigger-info p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }
        .detail-view-container {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 35px;
          box-shadow: var(--shadow-md);
        }
        .detail-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        /* 프리미엄 리포트 헤더 배너 스타일 */
        .report-header-section {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #3b82f6 100%);
          border-radius: 16px;
          padding: 35px 40px;
          color: #ffffff;
          margin-bottom: 35px;
          box-shadow: 0 12px 30px -10px rgba(30, 41, 59, 0.15);
          position: relative;
          overflow: hidden;
        }
        .report-header-section::after {
          content: '';
          position: absolute;
          top: -40%;
          right: -10%;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 80%);
          border-radius: 50%;
          pointer-events: none;
        }
        .report-header-badge {
          display: inline-block;
          background: rgba(59, 130, 246, 0.2);
          backdrop-filter: blur(8px);
          padding: 5px 12px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 14px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        }
        .report-header-title {
          font-size: 26px;
          font-weight: 900;
          margin: 0 0 14px 0;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .report-header-meta {
          display: flex;
          gap: 24px;
          font-size: 13px;
          opacity: 0.9;
          flex-wrap: wrap;
        }
        .report-header-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* 프로젝트 통계 미니 대시보드 카드 */
        .project-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          background: #f8fafc;
          padding: 18px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .project-stat-card {
          background: #ffffff;
          padding: 16px 20px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.01);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 90px;
          transition: all 0.2s ease;
        }
        .project-stat-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.03);
          border-color: #cbd5e1;
        }
        .project-stat-label {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .project-stat-value {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
        }
        .project-stat-sub {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 6px;
        }

        .detail-proj-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.04);
          margin-bottom: 35px;
          overflow: hidden;
          padding: 24px;
        }
        .detail-proj-title {
          background: transparent !important;
          padding: 0 0 16px 0 !important;
          font-size: 18px !important;
          font-weight: 900 !important;
          color: #1e3a8a !important;
          border-bottom: 2px solid #f1f5f9 !important;
          border-left: none !important;
          margin-bottom: 20px;
        }
        .detail-task-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .detail-task-table th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          padding: 12px 16px;
          border-bottom: 2px solid #cbd5e1;
          text-align: left;
          font-size: 12px;
        }
        .detail-task-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
          background-color: #ffffff;
        }
        .detail-task-table tr:last-child td {
          border-bottom: none;
        }
      `}</style>

      {selectedReport ? (
        /* --- A. 보고서 상세 보기 화면 --- */
        <div className="detail-view-container">
          <div className="detail-header-bar">
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => setSelectedReport(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={14} /> 목록으로 돌아가기
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => handleCopyReportToClipboard(selectedReport)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Clipboard size={14} /> 텍스트 복사
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={() => handlePrintReport(selectedReport)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={14} /> 인쇄 및 PDF 저장
              </button>
            </div>
          </div>

          {/* 프리미엄 대시보드식 헤더 배너 */}
          <div className="report-header-section">
            <span className="report-header-badge">BUSINESS REPORT</span>
            <h2 className="report-header-title">{selectedReport.title}</h2>
            <div className="report-header-meta">
              <div className="report-header-meta-item">
                <Calendar size={14} style={{ color: '#60a5fa' }} />
                작성 기준일: <strong>{selectedReport.reportDate}</strong>
              </div>
              <div className="report-header-meta-item">
                <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                금일 완료 실적: <strong>{selectedReport.completedTasks.length}건</strong>
              </div>
            </div>
          </div>

          {/* 프로젝트 단위로 그룹화하여 완료된 태스크 렌더링 */}
          {(() => {
            const group: Record<string, typeof selectedReport.completedTasks> = {};
            selectedReport.completedTasks.forEach(t => {
              if (!group[t.projectTitle]) group[t.projectTitle] = [];
              group[t.projectTitle].push(t);
            });

            return Object.entries(group).map(([projTitle, tasks]) => {
              const firstTask = tasks[0];
              const stats = firstTask ? getProjectWbsStats(firstTask.projectId) : { totalTasksCount: 0, completedTasksCount: 0, totalPlannedMd: 0, completedMd: 0 };
              const taskProgress = stats.totalTasksCount > 0 ? Math.round((stats.completedTasksCount / stats.totalTasksCount) * 100) : 0;
              const mdUsageProgress = stats.totalPlannedMd > 0 ? Math.round((stats.completedMd / stats.totalPlannedMd) * 100) : 0;

              return (
                <div key={projTitle} className="detail-proj-section">
                  <div className="detail-proj-title" style={{ borderLeft: '6px solid #2563eb', paddingLeft: '14px' }}>
                    {projTitle}
                  </div>
                  
                  {/* 프로젝트별 태스크 & MD 공수 시각화 대시보드 카드 그리드 */}
                  <div className="project-stats-grid">
                    <div className="project-stat-card">
                      <div className="project-stat-label">진척율 (태스크 완료율)</div>
                      <div className="project-stat-value" style={{ color: '#2563eb' }}>{taskProgress}%</div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                        <div style={{ width: `${taskProgress}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>
                    
                    <div className="project-stat-card">
                      <div className="project-stat-label">태스크 진행 현황</div>
                      <div className="project-stat-value">{stats.completedTasksCount} / {stats.totalTasksCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>건 완료</span></div>
                      <div className="project-stat-sub">전체 WBS 등록 항목 수 대비 완료 실적</div>
                    </div>
                    
                    <div className="project-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                      <div className="project-stat-label" style={{ color: '#047857' }}>계약 공수 소모량 (MD)</div>
                      <div className="project-stat-value" style={{ color: '#10b981' }}>{stats.completedMd} / {stats.totalPlannedMd} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#047857' }}>MD 소모</span></div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e6f4ea', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                        <div style={{ width: `${mdUsageProgress}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>
                  </div>

                  <table className="detail-task-table">
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>연동 역할군</th>
                      <th style={{ width: '55%' }}>완료된 세부 작업 내용</th>
                      <th style={{ width: '25%' }}>비고 (메모)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(t => {
                      const details = getTaskDetailsWithFallback(t);
                      return (
                        <tr key={t.taskId}>
                          <td style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>{t.role}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: details.length > 0 ? '6px' : '0px' }}>
                              {t.taskName}
                            </div>
                            {details.length > 0 && (
                              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', listStyleType: 'disc' }}>
                                {details.map((detail, dIdx) => (
                                  <li key={dIdx} style={{ marginTop: '3px' }}>{detail}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '12px' }}>{t.memo || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          });
        })()}

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '40px', paddingTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            위와 같이 오늘의 업무 완료 사항을 정식 보고합니다.
          </div>
        </div>
      ) : (
        /* --- B. 보고서 목록 메인 화면 --- */
        <>
          <div className="workspace-header">
            <div>
              <h1 className="workspace-title">일일 업무 보고서 관리</h1>
              <p className="workspace-subtitle">매일 완료 처리된 WBS 실적들을 Supabase DB에서 자동으로 취합하여 일일 업무 보고서를 작성하고 누적 보관합니다.</p>
            </div>
          </div>

          {/* 오늘 생성 트리거 배너 */}
          <div className="today-trigger-box">
            <div className="today-trigger-info">
              <h3>{todayStr} 업무 실적 자동 취합</h3>
              <p>
                {todayCompletedCount > 0 
                  ? `오늘 날짜로 실제 완료(actualEndDate) 처리된 작업이 총 ${todayCompletedCount}건 존재합니다.`
                  : '오늘 날짜로 실제 완료 처리된 WBS 작업이 아직 없습니다. 완료된 작업을 체크해 주세요.'
                }
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleCreateTodayReport}
              disabled={todayCompletedCount === 0}
              style={{ padding: '12px 20px', fontSize: '14px' }}
            >
              <Plus size={16} /> 오늘의 일일 보고서 자동 생성
            </button>
          </div>

          {/* 과거 보고서 아카이브 그리드 */}
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>역대 작성된 업무 보고서 ({reports.length}건)</h2>
          
          <div className="report-grid">
            {reports.map(report => (
              <div 
                key={report.id} 
                className="report-card"
                onClick={() => setSelectedReport(report)}
              >
                <div>
                  <div className="report-card-header">
                    <span className="library-card-badge" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>일일 보고서</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{report.reportDate}</span>
                  </div>
                  <div className="report-card-title">{report.title}</div>
                  <div className="report-card-meta">
                    총 완료 태스크: <span style={{ fontWeight: '700', color: '#4f46e5' }}>{report.completedTasks.length}건</span>
                  </div>
                </div>
                
                <div className="report-card-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-xs"
                    onClick={(e) => { e.stopPropagation(); handleCopyReportToClipboard(report); }}
                    title="보고서 텍스트 복사"
                  >
                    복사
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-xs"
                    onClick={(e) => { e.stopPropagation(); handlePrintReport(report); }}
                    title="인쇄 및 PDF 파일 저장"
                  >
                    인쇄
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger btn-xs"
                    style={{ padding: '4px' }}
                    onClick={(e) => handleDeleteReport(report.id, e)}
                    title="보고서 영구 삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {reports.length === 0 && !isLoading && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-tertiary)' }}>
                <FileText size={40} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                <span>데이터베이스에 저장된 일일 업무 보고서가 없습니다.</span>
                <span style={{ fontSize: '12px', marginTop: '4px' }}>WBS 통합 대시보드에서 완료 일자를 기입한 후 오늘의 보고서를 신규 생성해 주세요.</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
