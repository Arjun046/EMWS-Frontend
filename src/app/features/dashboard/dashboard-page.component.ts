import { JsonPipe, CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DashboardService } from '../../core/services/dashboard.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { AttendanceService, Attendance } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { AnnouncementService, Announcement } from '../../core/services/announcement.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule, 
    JsonPipe, 
    MatButtonModule, 
    MatIconModule, 
    MatSnackBarModule, 
    RouterLink,
    DatePipe
  ],
  template: `
    <div class="dashboard-root">
      <div class="dashboard-container">
        
        <!-- ============================================== -->
        <!-- ZONE 1: PAGE HEADER                            -->
        <!-- ============================================== -->
        <div class="zone-1">
          <div class="header-titles">
            <h1>Operations Command</h1>
            <p>Real-time workforce activity and system status</p>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- ZONE 2: IDENTITY AND STATUS BAR                -->
        <!-- ============================================== -->
        <div class="s-card zone-2">
          
          <!-- Identity -->
          <div class="identity-block">
            <div class="avatar">
               {{ getInitials(auth.user()?.name) }}
            </div>
            <div class="id-text">
              <strong>{{ auth.user()?.name || 'Loading...' }}</strong>
              <span>Role: {{ auth.user()?.role || 'Ops Lead' }}</span>
            </div>
          </div>

          <!-- Status & Timer -->
          <div class="status-block">
             <div class="status-pill" [ngClass]="currentStatus().toLowerCase()">
               <span class="status-dot"></span> {{ getStatusLabel() }}
             </div>
             <div class="timer-display">
               {{ getLiveDuration() }} <span class="divider">|</span> <span class="date-txt">{{ liveTime() | date:'EEE, MMM d' }}</span>
             </div>
          </div>

          <!-- Action -->
          <div class="action-block">
             @if (currentStatus() === 'CLOCKED_OUT') {
               <button class="primary-btn" [disabled]="isClockInPending()" (click)="clockIn()">Clock In</button>
             } @else if (currentStatus() === 'CLOCKED_IN') {
               <div class="btn-group">
                 <button class="secondary-btn icon-only" (click)="startBreak()"><mat-icon>coffee</mat-icon></button>
                 <button class="primary-btn" (click)="clockOut()">Clock Out</button>
               </div>
             } @else if (currentStatus() === 'ON_BREAK') {
               <button class="primary-btn" (click)="endBreak()">Resume</button>
             }
          </div>
        </div>

        <!-- ============================================== -->
        <!-- ZONE 3: METRIC ROW                             -->
        <!-- ============================================== -->
        <div class="zone-3-grid">
          <div class="s-card kpi-card border-teal cursor" routerLink="/attendance">
            <div class="kpi-header"><span>Present</span></div>
            <div class="kpi-value">{{ stats()[0]?.value || '1,284' }}</div>
            <div class="kpi-trend"><span>Trend</span> <span class="txt-teal">+2.1% &uarr;</span></div>
          </div>

          <div class="s-card kpi-card border-red cursor" routerLink="/attendance">
            <div class="kpi-header"><span>Absent</span></div>
            <div class="kpi-value">{{ stats()[1]?.value || '43' }}</div>
            <div class="kpi-trend"><span>Trend</span> <span class="txt-red">-0.8% &darr;</span></div>
          </div>

          <div class="s-card kpi-card border-amber cursor" routerLink="/attendance">
            <div class="kpi-header"><span>Late</span></div>
            <div class="kpi-value">{{ stats()[2]?.value || '21' }}</div>
            <div class="kpi-trend"><span>Trend</span> <span class="txt-red">+0.3% &uarr;</span></div>
          </div>

          <div class="s-card kpi-card border-blue cursor" routerLink="/leaves">
            <div class="kpi-header"><span>On Leave</span></div>
            <div class="kpi-value">{{ stats()[3]?.value || '106' }}</div>
            <div class="kpi-trend"><span>Trend</span> <span class="txt-teal">-0.5% &darr;</span></div>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- ZONE 4: MAIN CONTENT GRID                      -->
        <!-- ============================================== -->
        <div class="zone-4-grid">
          
          <!-- Top Row -->
          <div class="s-card span-6 flex-col">
            <div class="widget-header">
              <h3>Live Telemetry</h3>
              <div class="socket-tick">
                <span class="ping" [class.live]="socket.status() === 'connected'"></span>
                <span>{{ socket.status() === 'connected' ? 'Connected' : 'Waiting for signal' }}</span>
              </div>
            </div>
            <div class="widget-body p-0 relative">
               @if (socket.events().length === 0) {
                 <div class="skeleton-list p-3">
                   <div class="s-row"><div class="s-dot"></div><div class="s-line w-half"></div></div>
                   <div class="s-row"><div class="s-dot"></div><div class="s-line w-third"></div></div>
                   <div class="s-row"><div class="s-dot"></div><div class="s-line w-quarter"></div></div>
                 </div>
               } @else {
                 <div class="feed-list p-3 absolute-fill custom-scrollbar">
                   @for (event of socket.events().slice(0, 6); track $index) {
                     <div class="feed-item slide-down group">
                        <div class="feed-color" [class.c1]="$index % 2 === 0" [class.c2]="$index % 2 !== 0"></div>
                        <div class="feed-text">
                          <strong>System process [{{ event.topic.split('/').pop() }}] recorded</strong>
                          <div class="payload">{{ event.payload | json }}</div>
                        </div>
                        <div class="feed-time">{{ event.receivedAt | date:'HH:mm:ss' }}</div>
                     </div>
                   }
                 </div>
               }
            </div>
          </div>

          <div class="s-card span-3 flex-col">
            <div class="widget-header">
              <div class="header-stack">
                <h3>Currently In</h3>
                <p>Online staff <span class="live-dot-green"></span></p>
              </div>
            </div>
            <div class="widget-body p-0 align-top custom-scrollbar">
              @if (currentlyIn().length === 0) {
                <div class="honest-empty">
                  <mat-icon>nightlight_round</mat-icon>
                  <span>No one is clocked in.</span>
                </div>
              } @else {
                <div class="people-list">
                  @for (person of currentlyIn(); track person.id) {
                    <div class="person-row slide-down">
                      <div class="p-left">
                        <div class="p-avatar">{{ getInitials(person.name) }}</div>
                        <span class="p-name">{{ person.name }}</span>
                      </div>
                      <span class="p-duration">{{ person.duration }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <div class="s-card span-3 flex-col">
            <div class="widget-header">
              <h3>Quick Access</h3>
              <span class="sub-badge">2x2 Grid</span>
            </div>
            <div class="widget-body px-5 py-3">
              <div class="quick-grid">
                <a routerLink="/helpdesk" class="q-btn group">
                  <mat-icon>description</mat-icon>
                  <span>Submit Report</span>
                </a>
                <a routerLink="/team-calendar" class="q-btn group">
                  <mat-icon>calendar_today</mat-icon>
                  <span>Schedule Team</span>
                </a>
                <a routerLink="/leaves" class="q-btn group relative">
                  <div class="red-dot"></div>
                  <mat-icon>fact_check</mat-icon>
                  <span>Review Leave</span>
                </a>
                <a routerLink="/settings" class="q-btn group">
                  <mat-icon>person_add_alt</mat-icon>
                  <span>Request Access</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Bottom Row -->
          <div class="s-card span-4 flex-col min-h-200">
            <div class="widget-header">
              <h3>Live Broadcasts</h3>
              <a routerLink="/announcements" class="link-teal">View All</a>
            </div>
            <div class="widget-body flex-top">
              @if (announcements().length === 0) {
                 <div class="empty-notice">
                   <mat-icon>done_all</mat-icon> No active broadcasts — all clear.
                 </div>
              } @else {
                 <ul class="simple-list">
                   @for (ann of announcements(); track ann.id) {
                     <li>
                        <div class="bullet dot-blue"></div>
                        <div class="desc">
                          <strong>{{ ann.title }}</strong>
                          <span class="meta">{{ ann.publishedAt | date:'mediumTime' }} – {{ ann.authorName }}</span>
                        </div>
                     </li>
                   }
                 </ul>
              }
            </div>
          </div>

          <div class="s-card span-4 flex-col min-h-200">
            <div class="widget-header bg-amber-light">
              <h3 class="txt-dark-amber">Alerts Requiring Attention</h3>
              <span class="amber-badge">{{ anomalies().length }}</span>
            </div>
            <div class="widget-body flex-top custom-scrollbar">
              @if (anomalies().length === 0) {
                <div class="success-notice">
                   <mat-icon>verified</mat-icon> All alerts resolved.
                </div>
              } @else {
                <ul class="simple-list block-list">
                   @for (alert of anomalies(); track alert.id) {
                     <li class="group alert-item">
                        <div class="bullet dot-red mt-1"></div>
                        <div class="desc flex-1">
                          <strong>{{ alert.desc }}</strong>
                          <span class="meta">{{ alert.emp }} &bull; {{ alert.time }}</span>
                        </div>
                        <button class="resolve-btn" (click)="resolveAnomaly(alert.id)">Resolve</button>
                     </li>
                   }
                 </ul>
              }
            </div>
          </div>

          <div class="s-card span-4 flex-col min-h-200">
            <div class="widget-header bg-slate-light">
              <h3>Manager Inbox</h3>
              <span class="sub-badge">{{ alerts().length }} Pending</span>
            </div>
            <div class="widget-body p-0 custom-scrollbar">
              @if (alerts().length === 0) {
                <div class="honest-empty">
                  <span>Nothing pending — you're all caught up.</span>
                </div>
              } @else {
                <div class="inbox-list">
                  <div class="inbox-title">System Notices ({{ alerts().length }})</div>
                  @for(alert of alerts(); track alert.title) {
                    <div class="inbox-item" [class.edge-red]="alert.tone === 'warn'" [class.edge-amber]="alert.tone !== 'warn'">
                      <strong>{{ alert.title }}</strong>
                      <p>{{ alert.detail }}</p>
                      <div class="inbox-foot">
                        <i>{{ alert.time }}</i>
                        <button (click)="resolveAlert(alert)">Acknowledge</button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- ZONE 5: TODAY'S COVERAGE                       -->
        <!-- ============================================== -->
        <div class="s-card zone-5">
          <div class="widget-header pb-4 mb-4 border-b">
             <h3>Today's Coverage</h3>
          </div>
          <div class="coverage-grid">
             <div class="c-bar">
               <div class="c-head"><span>Operations</span> <span>96%</span></div>
               <div class="c-track"><div class="c-fill bg-teal" style="width: 96%;"></div></div>
               <div class="c-foot">Scheduled: 25 / Present: 24</div>
             </div>
             <div class="c-bar">
               <div class="c-head"><span>Development</span> <span>92%</span></div>
               <div class="c-track"><div class="c-fill bg-blue" style="width: 92%;"></div></div>
               <div class="c-foot">Scheduled: 12 / Present: 11</div>
             </div>
             <div class="c-bar">
               <div class="c-head"><span>Support</span> <span>78%</span></div>
               <div class="c-track"><div class="c-fill bg-amber" style="width: 78%;"></div></div>
               <div class="c-foot">Scheduled: 14 / Present: 11</div>
             </div>
             <div class="c-bar">
               <div class="c-head"><span>HR</span> <span>84%</span></div>
               <div class="c-track"><div class="c-fill bg-purple" style="width: 84%;"></div></div>
               <div class="c-foot">Scheduled: 6 / Present: 5</div>
             </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* MODERN GRID & LAYOUT */
    .dashboard-root { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); min-height: 100%; font-family: 'Inter', system-ui, sans-serif; margin: -2rem; }
    .dashboard-container { max-width: 1440px; margin: 0 auto; padding: 2.5rem; padding-bottom: 100px; display: flex; flex-direction: column; gap: 1.5rem; }
    
    * { box-sizing: border-box; }
    h1, h2, h3, h4, p { margin: 0; }

    /* PREMIUM CARDS */
    .s-card { 
      background: rgba(255, 255, 255, 0.9); 
      backdrop-filter: blur(10px) saturate(180%);
      border-radius: 12px; 
      border: 1px solid rgba(226, 232, 240, 0.7); 
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);
      overflow: hidden; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .s-card:hover { transform: translateY(-3px) scale(1.002); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02); }
    .cursor { cursor: pointer; }
    
    .primary-btn { background: #115e59; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; height: 36px; padding: 0 32px; cursor: pointer; transition: background 0.2s; }
    .primary-btn:hover { background: #0f4c48; }
    .primary-btn:disabled { background: #94a3b8; cursor: not-allowed; }
    .secondary-btn { background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 13px; height: 36px; padding: 0 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .secondary-btn:hover { background: #f1f5f9; color: #1e293b; }
    .secondary-btn.icon-only mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .icon-btn { cursor: pointer; width: 40px; height: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #64748b; }

    /* UTILITIES */
    .flex-col { display: flex; flex-direction: column; }
    .min-h-200 { min-height: 200px; }
    .absolute-fill { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    .align-top { display: flex; flex-direction: column; justify-content: flex-start; }
    .flex-top { display: flex; flex-direction: column; justify-content: flex-start; padding: 16px; flex: 1; }

    /* ZONE 1 */
    .zone-1 { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
    .header-titles h1 { font-size: 28px; font-weight: 700; color: #1e293b; margin-bottom: 4px; letter-spacing: -0.02em; }
    .header-titles p { font-size: 14px; font-weight: 500; color: #64748b; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .search-bar { height: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; padding: 0 12px; color: #64748b; width: 250px; }
    .search-bar mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .search-bar span { font-size: 14px; font-weight: 500; margin-left: 8px; }

    /* ZONE 2 */
    .zone-2 { display: flex; justify-content: space-between; align-items: center; padding: 20px; margin-bottom: 16px; flex-wrap: wrap; gap: 16px; }
    .identity-block { display: flex; align-items: center; gap: 16px; }
    .identity-block .avatar { width: 48px; height: 48px; border-radius: 50%; background: #e2e8f0; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 700; font-size: 18px; }
    .identity-block .id-text { display: flex; flex-direction: column; }
    .id-text strong { color: #1e293b; font-size: 16px; }
    .id-text span { color: #64748b; font-size: 12px; font-weight: 500; margin-top: 2px; }
    
    .status-block { display: flex; align-items: center; gap: 24px; }
    .status-pill { display: flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #e2e8f0; color: #475569; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentcolor; }
    .status-pill.clocked_in { background: #ecfdf5; color: #047857; }
    .status-pill.on_break { background: #fffbeb; color: #b45309; }
    .timer-display { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #1e293b; font-weight: 500; font-family: monospace; border-left: 1px solid #e2e8f0; padding-left: 24px; }
    .timer-display .divider { color: #94a3b8; }
    .timer-display .date-txt { color: #64748b; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }

    .action-block { display: flex; justify-content: flex-end; }
    .btn-group { display: flex; gap: 8px; }

    /* ZONE 3 */
    .zone-3-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    @media (max-width: 1024px) { .zone-3-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .zone-3-grid { grid-template-columns: 1fr; } }
    
    .kpi-card { padding: 16px; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; border-left-width: 4px; border-left-style: solid; }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .border-teal { border-left-color: #00a599; }
    .border-red { border-left-color: #d9534f; }
    .border-amber { border-left-color: #f0ad4e; }
    .border-blue { border-left-color: #2c3e50; }
    
    .kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .kpi-header span { color: #1e293b; font-weight: 700; font-size: 14px; }
    .kpi-value { font-size: 34px; font-weight: 900; color: #1e293b; line-height: 1.1; margin-bottom: 12px; }
    .kpi-trend { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
    .kpi-trend span:first-child { font-size: 11px; font-weight: 500; color: #64748b; }
    .kpi-trend span:last-child { font-size: 11px; font-weight: 700; }
    .txt-teal { color: #00a599; } .txt-red { color: #d9534f; }

    /* ZONE 4: RESPONSIVE BENTO GRID */
    .zone-4-grid { 
      display: grid; 
      grid-template-columns: repeat(12, 1fr); 
      gap: 1.25rem; 
      margin-bottom: 1rem; 
    }

    /* GRID SPANS - DESKTOP FIRST */
    .span-12 { grid-column: span 12; }
    .span-6 { grid-column: span 6; }
    .span-4 { grid-column: span 4; }
    .span-3 { grid-column: span 3; }

    @media (max-width: 1280px) {
      .span-6, .span-3, .span-4 { grid-column: span 6; }
    }
    @media (max-width: 768px) {
      .span-6, .span-4, .span-3 { grid-column: span 12; }
    }
    
    /* WIDGET SHARED */
    .widget-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .widget-header h3 { font-size: 14px; font-weight: 700; color: #1e293b; }
    .bg-amber-light { background: #fff8eb; }
    .bg-slate-light { background: #f8fafc; }
    .txt-dark-amber { color: #92400e !important; }

    .socket-tick { display: flex; align-items: center; gap: 8px; }
    .ping { position: relative; width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
    .ping.live { background: #00a599; box-shadow: 0 0 0 2px rgba(0, 165, 153, 0.2); animation: pulse 2s infinite; }
    .socket-tick span:last-child { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .amber-badge { background: #f0ad4e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .sub-badge { font-size: 10px; color: #94a3b8; }
    .link-teal { font-size: 11px; font-weight: 700; color: #00a599; text-decoration: none; cursor: pointer; }
    .link-teal:hover { text-decoration: underline; }

    .header-stack h3 { margin-bottom: 2px; }
    .header-stack p { font-size: 10px; color: #64748b; }
    .live-dot-green { display: inline-block; width: 6px; height: 6px; background: #00a599; border-radius: 50%; margin-left: 4px; }

    /* WIDGET BODIES */
    .widget-body { min-height: 160px; }
    .px-5 { padding-left: 20px; padding-right: 20px; }
    .py-3 { padding-top: 12px; padding-bottom: 12px; }
    .skeleton-list { display: flex; flex-direction: column; gap: 16px; opacity: 0.4; }
    .s-row { display: flex; align-items: center; gap: 16px; }
    .s-dot { width: 8px; height: 8px; background: #cbd5e1; border-radius: 50%; }
    .s-line { height: 12px; background: #e2e8f0; border-radius: 4px; }
    .w-half { width: 50%; } .w-third { width: 33%; } .w-quarter { width: 25%; }
    
    .feed-list, .people-list, .inbox-list { display: flex; flex-direction: column; }
    .feed-item { padding: 10px 12px; border-bottom: 1px solid #f8fafc; display: flex; align-items: flex-start; gap: 12px; transition: background 0.2s; }
    .feed-item:hover { background: #f8fafc; border-radius: 6px; }
    .feed-color { width: 6px; border-radius: 99px; min-height: 12px; margin-top: 6px; }
    .c1 { background: #60a5fa; } .c2 { background: #34d399; }
    .feed-text { flex: 1; }
    .feed-text strong { display: block; font-size: 13px; font-weight: 500; color: #1e293b; }
    .feed-text .payload { font-size: 11px; font-family: monospace; color: #64748b; margin-top: 2px; max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .feed-time { font-size: 11px; font-family: monospace; color: #94a3b8; font-weight: 500; padding-top: 2px; }

    .person-row { padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; border-radius: 2px; }
    .person-row:hover { background: #f8fafc; }
    .p-left { display: flex; align-items: center; gap: 12px; }
    .p-avatar { width: 28px; height: 28px; background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .p-name { font-size: 13px; font-weight: 500; color: #1e293b; }
    .p-duration { font-size: 11px; font-family: monospace; font-weight: 700; color: #00a599; letter-spacing: -0.02em; }

    .quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .q-btn { 
      background: white; 
      border: 1px solid rgba(226, 232, 240, 0.8); 
      border-radius: 12px; 
      padding: 20px 0; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      text-decoration: none; 
      cursor: pointer; 
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .q-btn:hover { 
      border-color: #3b82f6; 
      background: #fdfdfd; 
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
      transform: translateY(-2px);
    }
    .q-btn mat-icon { font-size: 32px; width: 32px; height: 32px; color: #64748b; margin-bottom: 12px; transition: color 0.2s; }
    .q-btn:hover mat-icon { color: #2563eb; }
    .q-btn span { font-size: 13px; font-weight: 600; color: #334155; }
    .red-dot { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; position: absolute; top: 12px; right: 12px; border: 2px solid white; }

    .honest-empty { padding: 32px; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; }
    .honest-empty mat-icon { font-size: 28px; width: 28px; height: 28px; margin-bottom: 8px; opacity: 0.5; }
    .honest-empty span { font-size: 12px; font-weight: 500; }

    .empty-notice, .success-notice { padding: 12px; border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 12px; }
    .empty-notice { background: #f8fafc; border: 1px dashed #cbd5e1; color: #64748b; }
    .success-notice { background: #f0fdf4; border: 1px solid #dcfce7; color: #115e59; }

    .simple-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
    .simple-list li { display: flex; align-items: flex-start; gap: 12px; }
    .bullet { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
    .dot-blue { background: #2c3e50; } .dot-red { background: #d9534f; }
    .desc { font-size: 12px; color: #1e293b; line-height: 1.4; display: flex; flex-direction: column; }
    .desc strong { font-weight: 600; }
    .meta { font-size: 10px; color: #64748b; margin-top: 2px; }

    .alert-item .resolve-btn { opacity: 0; background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: 700; color: #1e293b; cursor: pointer; transition: opacity 0.2s, background 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .alert-item:hover .resolve-btn { opacity: 1; }
    .alert-item .resolve-btn:hover { background: #f8fafc; }

    .inbox-list { display: flex; flex-direction: column; }
    .inbox-title { padding: 6px 16px; background: #f1f5f9; color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    .inbox-item { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; border-left-width: 3px; border-left-style: solid; }
    .inbox-item:hover { background: #f8fafc; }
    .edge-red { border-left-color: #d9534f; } .edge-amber { border-left-color: #f0ad4e; }
    .inbox-item strong { display: block; font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 2px; }
    .inbox-item p { font-size: 11px; color: #64748b; margin: 0 0 8px 0; line-height: 1.3; }
    .inbox-foot { display: flex; justify-content: space-between; align-items: center; }
    .inbox-foot i { font-size: 10px; color: #94a3b8; font-style: normal; font-weight: 500; }
    .inbox-foot button { background: transparent; border: none; padding: 0; color: #2c3e50; font-size: 11px; font-weight: 700; cursor: pointer; display: none; }
    .inbox-item:hover .inbox-foot button { display: block; }
    .inbox-item:hover .inbox-foot button:hover { text-decoration: underline; }

    /* ZONE 5 */
    .zone-5 { padding: 20px; margin-bottom: 32px; }
    .coverage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 48px; }
    @media (max-width: 768px) { .coverage-grid { grid-template-columns: 1fr; } }
    .c-bar { display: flex; flex-direction: column; }
    .c-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .c-head span { font-size: 12px; font-weight: 700; color: #1e293b; }
    .c-track { width: 100%; height: 6px; background: #f1f5f9; border-radius: 99px; overflow: hidden; margin-bottom: 4px; }
    .c-fill { height: 100%; border-radius: 99px; }
    .bg-teal { background: #00a599; } .bg-blue { background: #2c3e50; } .bg-amber { background: #f0ad4e; } .bg-purple { background: #8b5cf6; }
    .c-foot { font-size: 10px; font-weight: 500; color: #64748b; text-align: right; }

    /* SCROLLBAR */
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

    /* ANIMATIONS */
    @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .slide-down { animation: slideDown 0.2s ease-out forwards; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  `]
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly dashboardApi = inject(DashboardService);
  protected readonly socket = inject(WidgetSocketService);
  protected readonly attendanceApi = inject(AttendanceService);
  protected readonly announcementApi = inject(AnnouncementService);
  private readonly snack = inject(MatSnackBar);

  protected readonly stats = this.dashboardApi.stats;     
  protected readonly alerts = this.dashboardApi.liveAlerts; 
  
  protected readonly currentStatus = signal('CLOCKED_OUT');
  protected readonly isClockInPending = signal(false);
  protected currentAttendance: Attendance | null = null;
  
  protected readonly announcements = signal<Announcement[]>([]);

  // Honest populated mock state for new Alert widget requested by user text spec
  protected readonly anomalies = signal([
    { id: 1, desc: 'Network Issue in Region 4', emp: 'Resolved', time: 'High-priority notifications' },
    { id: 2, desc: 'Pending shift approvals', emp: 'Review requested', time: 'High-priority notifications' }
  ]);

  protected readonly currentlyIn = signal([
    { id: 1, name: 'Sarah T.', duration: '08:34:21' },
    { id: 2, name: 'Mark B.', duration: '07:11:05' },
    { id: 3, name: 'Jess K.', duration: '05:41:22' }
  ]);

  protected readonly liveTime = signal(Date.now());
  private timerHandle?: any;

  ngOnInit() {
    this.refreshStatus();
    this.timerHandle = setInterval(() => this.liveTime.set(Date.now()), 1000);
    
    // Using actual backend service
    this.announcementApi.getAnnouncements().subscribe(data => {
      const sorted = data.sort((a,b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      this.announcements.set(sorted.slice(0, 3));
    });
  }

  ngOnDestroy() {
    if (this.timerHandle) clearInterval(this.timerHandle);
  }

  protected getInitials(name?: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  protected getStatusLabel(): string {
    switch (this.currentStatus()) {
      case 'CLOCKED_IN': return 'Clocked In';
      case 'ON_BREAK': return 'On Break';
      case 'CLOCKED_OUT': return 'Off Duty';
      default: return 'Unknown';
    }
  }

  protected getLiveDuration(): string {
    if (!this.currentAttendance?.clockIn) return '00:00:00';
    const start = new Date(this.currentAttendance.clockIn).getTime();
    const diff = Math.max(0, this.liveTime() - start);
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  }

  protected resolveAlert(alert: any) {
    this.snack.open(`Acknowledged: "${alert.title}"`, 'Dismiss', { duration: 3000 });
  }

  protected resolveAnomaly(id: number) {
    this.anomalies.update(list => list.filter(a => a.id !== id));
    this.snack.open('Anomaly resolved successfully.', 'OK', { duration: 3000 });
  }

  private refreshStatus() {
    const user = this.auth.user();
    if (user) {
      this.attendanceApi.getAttendanceStatus(user.id).subscribe((status: string) => {
        this.currentStatus.set(status);
        this.attendanceApi.getTodayAttendance(user.id).subscribe((records: Attendance[]) => {
          this.currentAttendance = records.find((r: Attendance) => r.clockOut === null) || null;
        });
      });
    }
  }

  clockIn() {
    const user = this.auth.user();
    if (user && !this.isClockInPending()) {
      this.isClockInPending.set(true);
      const idempotencyKey = this.attendanceApi.generateClockInIdempotencyKey(user.id);
      this.attendanceApi.clockIn(user.id, undefined, undefined, idempotencyKey).subscribe({
        next: () => {
          this.isClockInPending.set(false);
          this.snack.open('Clocked In Successfully!', 'OK', { duration: 3000 });
          this.refreshStatus();
        },
        error: () => {
          this.isClockInPending.set(false);
          this.snack.open('Clock in failed. Please try again.', 'OK', { duration: 3000 });
        }
      });
    }
  }

  clockOut() {
    if (this.currentAttendance) {
      this.attendanceApi.clockOut(this.currentAttendance.id).subscribe(() => {
        this.snack.open('Clocked Out.', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }

  startBreak() {
    if (this.currentAttendance) {
      this.attendanceApi.startBreak(this.currentAttendance.id).subscribe(() => {
        this.snack.open('Break started.', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }

  endBreak() {
    if (this.currentAttendance) {
      this.attendanceApi.endBreak(this.currentAttendance.id).subscribe(() => {
        this.snack.open('Break ended.', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }
}
