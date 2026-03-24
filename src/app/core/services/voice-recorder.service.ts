import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VoiceRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  readonly isRecording = signal(false);
  readonly recordingTime = signal(0);
  private timerInterval: any;

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.startTimer();
    } catch (err) {
      console.error('Could not start recording', err);
      throw err;
    }
  }

  stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve('');
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        
        // Stop all tracks to release the microphone
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.stop();
      this.isRecording.set(false);
      this.stopTimer();
    });
  }

  cancelRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    this.isRecording.set(false);
    this.stopTimer();
    this.audioChunks = [];
  }

  private startTimer(): void {
    this.recordingTime.set(0);
    this.timerInterval = setInterval(() => {
      this.recordingTime.update(t => t + 1);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
