/** preset.v1 source for id `sunrise-glow` (Sunday Morning Vibes cue 1). */
export const sunriseGlowPresetV1 = `schema: preset.v1
id: sunrise-glow
name: Sunrise Glow
bpm: 90-120
tags: mellow,sunrise,warm

[palette]
base=#201a2e
accent=#ffb36b
highlight=#ffe9b5

[audio]
low=blob_scale*0.25
mid=fractal_mix*0.40
high=bloom_gain*0.30
wave=phase_shift*0.20

[stages]
stage1=gradient_horizon(speed=0.08, drift=0.12)
stage2=film_grain(amount=0.05)`;

/** preset.v1 source for id `sunset-haze` (Sunday Morning Vibes cue 2). */
export const sunsetHazePresetV1 = `schema: preset.v1
id: sunset-haze
name: Sunset Haze
bpm: 90-120
tags: mellow,sunset,warm

[palette]
base=#1f1933
accent=#f28772
highlight=#ffd4b8

[audio]
low=blob_scale*0.30
mid=fractal_mix*0.25
high=bloom_gain*0.35
wave=phase_shift*0.15

[stages]
stage1=gradient_horizon(speed=0.06, drift=0.10)
stage2=film_grain(amount=0.06)`;
