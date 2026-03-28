import landmarks from '../../data/maps/landmarks.json';

export interface Coords {
    lat: number;
    lng: number;
}

export interface Landmark {
    id: string;
    name: string;
    coords: Coords;
    category: string;
    visual_preset: string;
    glow_config: {
        color: string;
        beamHeight: number;
        pulseFreq: number;
        shellRadius: number;
        emissiveIntensity: number;
    };
    priority: number;
}

/**
 * LandmarkResolver handles spatial matching of locations to the hero registry.
 */
export class LandmarkResolver {
    private static registry: Landmark[] = landmarks as Landmark[];

    /**
     * Finds the nearest registered landmark within a specific radius (meters).
     */
    static findNearest(target: Coords, radiusMeters: number = 200): Landmark | null {
        let nearest: Landmark | null = null;
        let minDistance = Infinity;

        for (const landmark of this.registry) {
            const dist = this.getDistance(target, landmark.coords);
            if (dist < radiusMeters && dist < minDistance) {
                minDistance = dist;
                nearest = landmark;
            }
        }

        return nearest;
    }

    /**
     * Harvesine distance calculation.
     */
    private static getDistance(p1: Coords, p2: Coords): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = p1.lat * Math.PI / 180;
        const φ2 = p2.lat * Math.PI / 180;
        const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
        const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    static getById(id: string): Landmark | undefined {
        return this.registry.find(l => l.id === id);
    }

    static getAll(): Landmark[] {
        return this.registry;
    }
}
