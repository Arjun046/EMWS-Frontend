import { Component, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSliderModule, FormsModule],
  template: `
    <div class="audio-player" [class.audio-player--played]="hasPlayed()">
      <div class="play-btn-wrapper">
        <button mat-mini-fab color="primary" (click)="togglePlay()" class="play-btn">
          <mat-icon>{{ isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
        </button>
      </div>
      
      <div class="player-body">
        <div class="slider-container">
          <mat-slider min="0" [max]="duration() || 100" step="0.1" class="custom-slider">
            <input matSliderThumb [ngModel]="currentTime()" (ngModelChange)="seek($event)">
          </mat-slider>
        </div>
        <div class="player-footer">
          <span class="time">{{ formatTime(currentTime()) }}</span>
          <div class="playback-controls">
             <button class="speed-btn" (click)="toggleSpeed()">{{ playbackSpeed() }}x</button>
             <button class="transcribe-btn" (click)="transcribe()" [disabled]="isTranscribing()">
                {{ isTranscribing() ? 'Transcribing...' : (transcription() ? 'Hide Text' : 'Transcribe') }}
             </button>
             <mat-icon class="status-mic" [class.active]="hasPlayed()">mic</mat-icon>
          </div>
        </div>
      </div>

      <div class="user-avatar-small">
         <mat-icon>account_circle</mat-icon>
      </div>
    </div>
    <div class="transcription-text" *ngIf="transcription() && !isTranscribing()">
       <mat-icon>subtitles</mat-icon>
       <p>{{ transcription() }}</p>
    </div>
  `,
  styles: [`
    .audio-player { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0.6rem; min-width: 240px; }
    .play-btn-wrapper { flex-shrink: 0; }
    .play-btn { width: 36px !important; height: 36px !important; display: grid; place-items: center; background: #2563eb !important; }
    .play-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    
    .player-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .slider-container { height: 24px; display: flex; align-items: center; }
    .custom-slider { width: 100%; margin: 0 -8px; }
    
    .player-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0; padding-top: 4px; }
    .time { font-size: 0.7rem; color: #64748b; font-weight: 500; }
    
    .playback-controls { display: flex; align-items: center; gap: 12px; position: relative; z-index: 10; }
    .speed-btn { background: #f1f5f9; border: none; border-radius: 12px; padding: 2px 10px; font-size: 0.7rem; font-weight: 700; cursor: pointer; color: #475569; transition: background 0.2s; }
    .speed-btn:hover { background: #e2e8f0; }
    
    .transcribe-btn { background: none; border: none; font-size: 0.7rem; color: #2563eb; cursor: pointer; font-weight: 600; padding: 0; }
    .transcribe-btn:disabled { color: #94a3b8; }

    .status-mic { font-size: 14px; width: 14px; height: 14px; color: #94a3b8; }
    .status-mic.active { color: #2563eb; }
    
    .user-avatar-small { color: #cbd5e1; }
    
    .transcription-text { margin-top: 0.5rem; background: rgba(255,255,255,0.5); padding: 0.5rem; border-radius: 0.4rem; display: flex; gap: 0.5rem; border-left: 3px solid #2563eb; animation: fadeIn 0.3s; }
    .transcription-text mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #2563eb; margin-top: 2px; }
    .transcription-text p { margin: 0; font-size: 0.8rem; color: #334155; font-style: italic; text-align: left; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    ::ng-deep .custom-slider .mdc-slider__track--active_fill { border-color: #2563eb !important; }
    ::ng-deep .custom-slider .mdc-slider__thumb-knob { background-color: #2563eb !important; }
  `]
})
export class AudioPlayerComponent implements OnInit {
  private _src = '';

  @Input() set src(val: string) {
    if (val && val !== this._src) {
      this._src = val;
      this.audio.src = val;
      this.audio.load();
      this.currentTime.set(0);
      this.isPlaying.set(false);
    }
  }
  get src(): string {
    return this._src;
  }
  
  protected readonly isPlaying = signal(false);
  protected readonly hasPlayed = signal(false);
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);
  protected readonly playbackSpeed = signal(1);
  protected readonly transcription = signal<string | null>(null);
  protected readonly isTranscribing = signal(false);

  private audio = new Audio();

  ngOnInit() {
    this.audio.onloadedmetadata = () => this.duration.set(this.audio.duration || 0);
    this.audio.ontimeupdate = () => this.currentTime.set(this.audio.currentTime);
    this.audio.onended = () => {
      this.isPlaying.set(false);
      this.hasPlayed.set(true);
    };
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.audio.pause();
    } else {
      this.audio.play();
      this.hasPlayed.set(true);
    }
    this.isPlaying.set(!this.isPlaying());
  }

  toggleSpeed() {
    const current = this.playbackSpeed();
    let next = 1;
    if (current === 1) next = 1.5;
    else if (current === 1.5) next = 2;
    else next = 1;
    
    this.playbackSpeed.set(next);
    this.audio.playbackRate = next;
  }

  seek(val: number) {
    this.audio.currentTime = val;
  }

  async transcribe() {
     if (this.transcription()) {
        this.transcription.set(null);
        return;
     }

     this.isTranscribing.set(true);
     // Simulate AI delay
     await new Promise(r => setTimeout(r, 2000));
     this.transcription.set("This is a simulated transcription of the voice note. In a production environment, this would be processed by an AI model like Whisper or Google Speech-to-Text.");
     this.isTranscribing.set(false);
  }

  formatTime(seconds: number): string {
    if (!seconds && seconds !== 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
