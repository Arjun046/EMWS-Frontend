import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  readonly currentPosition = signal<{ lat: number; lng: number } | null>(null);
  private watchId: number | null = null;

  getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          this.currentPosition.set(coords);
          resolve(coords);
        },
        (err) => reject(err)
      );
    });
  }

  startLiveLocation(callback: (coords: { lat: number; lng: number }) => void): void {
    if (!navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.currentPosition.set(coords);
        callback(coords);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }

  stopLiveLocation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getStaticMapUrl(lat: number, lng: number): string {
    // Using a public static map provider (e.g. OpenStreetMap via staticmaps.xyz or similar)
    // For this demo, we'll return a placeholder that looks like a map
    return `https://www.google.com/maps/vt/pb=!1m4!1m3!1i15!2i${Math.floor(lng)}!3i${Math.floor(lat)}!2m3!1e0!2sm!3i420120488!3m17!2sen!3sUS!5e18!12m4!1e68!2m2!1sset!2sRoadmap!12m3!1e37!2m1!1ssmartmaps!12m3!1e12!2m1!1s1!15m3!1s!2s!7e81!20m9!1e3!2m2!1s1f567!2i1!3m1!2sen!6m6!1e12!2i2!26m1!4b1!44e1!50e0!23i1301875`;
  }
}
