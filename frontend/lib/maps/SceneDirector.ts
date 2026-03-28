import * as THREE from 'three';
import { RenderRules } from './landmarkGlowAgent';

export class SceneDirector {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer | null = null;
    public landmarks: Map<string, THREE.Group> = new Map();
    public highlights: Set<string> = new Set();
    private clock: THREE.Clock = new THREE.Clock();

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000000); // Far plane for earth scale

        // Add ambient light for minor visibility of shells
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Add a directional light for some highlights
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(1, 2, 1);
        this.scene.add(sun);
    }

    setRenderer(renderer: THREE.WebGLRenderer) {
        this.renderer = renderer;
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    /**
     * Adds or updates a landmark in the 3D scene.
     */
    addLandmark(id: string, rules: RenderRules, position: THREE.Vector3) {
        if (this.landmarks.has(id)) {
            this.removeLandmark(id);
        }

        const group = new THREE.Group();
        group.position.copy(position);

        // 1. Vertical Light Beam
        if (rules.beamHeight > 0) {
            const beamGeom = new THREE.CylinderGeometry(0.5, rules.shellRadius * 1.5, rules.beamHeight, 32, 1, true);
            beamGeom.translate(0, rules.beamHeight / 2, 0);
            const beamMat = new THREE.MeshBasicMaterial({
                color: rules.glowColor,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            const beam = new THREE.Mesh(beamGeom, beamMat);
            group.add(beam);
        }

        // 2. Glowing Shell (Hollow)
        if (rules.loadHollowShell) {
            const shellGeom = new THREE.SphereGeometry(rules.shellRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
            const shellMat = new THREE.MeshPhongMaterial({
                color: rules.glowColor,
                transparent: true,
                opacity: 0.15,
                emissive: rules.glowColor,
                emissiveIntensity: rules.emissiveIntensity,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const shell = new THREE.Mesh(shellGeom, shellMat);
            group.add(shell);

            // Add a pulse ring at the base
            const ringGeom = new THREE.RingGeometry(rules.shellRadius * 0.95, rules.shellRadius * 1.05, 64);
            ringGeom.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({
                color: rules.glowColor,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            group.add(ring);
        }

        this.scene.add(group);
        this.landmarks.set(id, group);
    }

    removeLandmark(id: string) {
        const group = this.landmarks.get(id);
        if (group) {
            this.scene.remove(group);
            this.landmarks.delete(id);
        }
    }

    setHighlight(id: string, active: boolean) {
        if (active) {
            this.highlights.add(id);
        } else {
            this.highlights.delete(id);
        }
    }

    update() {
        const elapsed = this.clock.getElapsedTime();

        // Animate landmarks (pulse, rotate)
        this.landmarks.forEach((group, id) => {
            const isHighlighted = this.highlights.has(id);
            const pulseSpeed = isHighlighted ? 4 : 2;
            const pulseBase = isHighlighted ? 1.0 : 0.8;
            const pulseRange = isHighlighted ? 0.4 : 0.2;

            group.children.forEach((child) => {
                if (child instanceof THREE.Mesh) {
                    const mat = child.material as any;
                    if (mat.opacity !== undefined) {
                        const pulse = Math.sin(elapsed * pulseSpeed) * pulseRange + pulseBase;

                        if (child.geometry instanceof THREE.CylinderGeometry) {
                            mat.opacity = (isHighlighted ? 0.6 : 0.3) * pulse;
                        } else if (child.geometry instanceof THREE.RingGeometry) {
                            mat.opacity = (isHighlighted ? 1.0 : 0.6) * pulse;
                            if (isHighlighted) {
                                child.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.1);
                            } else {
                                child.scale.setScalar(1);
                            }
                        } else if (child.geometry instanceof THREE.SphereGeometry) {
                            mat.emissiveIntensity = (isHighlighted ? 2.0 : 0.5) * pulse;
                        }
                    }
                }
            });
        });
    }
}
