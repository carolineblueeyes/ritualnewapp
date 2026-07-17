import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface GeoPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

class GeolocationService {
  private watchId: number | string | null = null;
  private accumulatedPoints: GeoPoint[] = [];

  async requestPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const status = await Geolocation.requestPermissions();
      return status.location === 'granted';
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { enableHighAccuracy: true }
      );
    });
  }

  async getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
        });
        return { lat: position.coords.latitude, lng: position.coords.longitude };
      }

      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true }
        );
      });
    } catch {
      return null;
    }
  }

  startTracking(callback: (point: GeoPoint) => void): void {
    this.accumulatedPoints = [];
    const handler = (coords: { latitude: number; longitude: number }, ts: number) => {
      const point: GeoPoint = {
        lat: coords.latitude,
        lng: coords.longitude,
        timestamp: ts,
      };
      this.accumulatedPoints.push(point);
      callback(point);
    };

    try {
      if (Capacitor.isNativePlatform()) {
        Geolocation.watchPosition(
          { enableHighAccuracy: true, interval: 3000, minimumUpdateInterval: 2000 },
          (position, err) => {
            if (!err && position) {
              handler(position.coords, position.timestamp);
            }
          }
        ).then((id) => {
          this.watchId = id;
        }).catch((err) => {
          console.warn('[GeolocationService] watchPosition failed:', err);
        });
      } else {
        this.watchId = navigator.geolocation.watchPosition(
          (pos) => handler(pos.coords, pos.timestamp),
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      }
    } catch (e) {
      console.warn('[GeolocationService] startTracking failed:', e);
    }
  }

  stopTracking(): GeoPoint[] {
    try {
      if (this.watchId !== null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: this.watchId as string }).catch(() => {});
        } else {
          navigator.geolocation.clearWatch(this.watchId as number);
        }
        this.watchId = null;
      }
    } catch (e) {
      console.warn('[GeolocationService] stopTracking failed:', e);
    }

    return [...this.accumulatedPoints];
  }

  getTotalDistance(points: GeoPoint[]): number {
    if (points.length < 2) return 0;

    const R = 6371;
    let total = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const dLat = this.toRad(curr.lat - prev.lat);
      const dLng = this.toRad(curr.lng - prev.lng);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(prev.lat)) *
          Math.cos(this.toRad(curr.lat)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }

    return total;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}

export const geolocationService = new GeolocationService();
