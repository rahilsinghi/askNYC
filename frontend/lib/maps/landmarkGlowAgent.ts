import { Landmark, LandmarkResolver, Coords } from './LandmarkResolver';

export interface RenderRules {
    preset: 'GOLD_HERO' | 'CYAN_HERO' | 'MINT_GLOW' | 'ELECTRIC_BLUE' | 'STANDARD_POI';
    glowColor: string;
    beamHeight: number;
    pulseFreq: number;
    shellRadius: number;
    emissiveIntensity: number;
    loadCustomModel: boolean;
    loadHollowShell: boolean;
    cameraPreset: 'CINEMATIC_FLY_IN' | 'ORBIT' | 'TOP_DOWN' | 'STREET_LEVEL';
    emphasisRadius: number;
}

export class LandmarkGlowAgent {
    /**
     * Resolves rendering rules for a given place.
     * If the place is in the hero registry, it uses those rules.
     * Otherwise, it generates dynamic rules based on place type and metadata.
     */
    static resolveRules(
        name: string,
        coords: Coords,
        placeType: string,
        city: string
    ): RenderRules {
        // 1. Check hero registry first
        const registered = LandmarkResolver.findNearest(coords, 100);
        if (registered) {
            return {
                preset: registered.visual_preset as any,
                glowColor: registered.glow_config.color,
                beamHeight: registered.glow_config.beamHeight,
                pulseFreq: registered.glow_config.pulseFreq,
                shellRadius: registered.glow_config.shellRadius,
                emissiveIntensity: registered.glow_config.emissiveIntensity,
                loadCustomModel: registered.priority >= 10,
                loadHollowShell: true,
                cameraPreset: 'CINEMATIC_FLY_IN',
                emphasisRadius: 200,
            };
        }

        // 2. Dynamic heuristics for non-registered places
        const isMajor = placeType.includes('stadium') || placeType.includes('airport') || placeType.includes('park');

        if (isMajor) {
            return {
                preset: 'ELECTRIC_BLUE',
                glowColor: '#3B82F6',
                beamHeight: 150,
                pulseFreq: 0.5,
                shellRadius: 30,
                emissiveIntensity: 1.0,
                loadCustomModel: false,
                loadHollowShell: true,
                cameraPreset: 'ORBIT',
                emphasisRadius: 150,
            };
        }

        // Default POI style
        return {
            preset: 'STANDARD_POI',
            glowColor: '#94A3B8',
            beamHeight: 0,
            pulseFreq: 0,
            shellRadius: 5,
            emissiveIntensity: 0.5,
            loadCustomModel: false,
            loadHollowShell: false,
            cameraPreset: 'TOP_DOWN',
            emphasisRadius: 50,
        };
    }
}
