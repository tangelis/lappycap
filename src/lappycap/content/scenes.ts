/** scene.v1 for Sunday Morning Vibes; cues reference presets `sunrise-glow` and `sunset-haze`. */
export const sundayMorningVibesSceneV1 = `schema: scene.v1
id: sunday-morning-vibes
name: Sunday Morning Vibes
target_bpm: 90-120
cycle_mode: hybrid
default_transition: crossfade(cosine,8s)

[cues]
1: sunrise-glow duration=45-90s intensity=low
2: sunset-haze duration=60-120s intensity=medium

[overlays]
film_grain=0.03
vignette=0.08`;
