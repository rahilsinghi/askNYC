export interface CameraKeyframe {
    center: { lat: number; lng: number };
    zoom: number;
    tilt: number;
    heading: number;
    duration: number;
}

export class CameraDirector {
    private map: google.maps.Map | null = null;

    constructor(map: google.maps.Map | null = null) {
        this.map = map;
    }

    setMap(map: google.maps.Map) {
        this.map = map;
    }

    /**
     * Performs an "Establish Shot" - wide view of the city.
     */
    async establishShot() {
        if (!this.map) return;
        this.map.moveCamera({
            tilt: 45,
            heading: 0,
            zoom: 12,
        });
    }

    /**
     * Fly to a specific landmark with cinematic easing.
     */
    async flyToLandmark(lat: number, lng: number, zoom: number = 17, tilt: number = 65) {
        if (!this.map) return;

        // First fly to area
        this.map.panTo({ lat, lng });

        // Google Maps moveCamera / panTo is usually enough for a fly-in if eased by the API.
        this.map.moveCamera({
            center: { lat, lng },
            zoom: zoom,
            tilt: tilt,
            heading: (this.map.getHeading() || 0) + 45,
        });
    }

    /**
     * Subtle orbit animation around the current center.
     */
    orbit(speed: number = 0.1) {
        if (!this.map) return;
        const currentHeading = this.map.getHeading() || 0;
        this.map.setHeading(currentHeading + speed);
    }
}
