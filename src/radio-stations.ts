export interface RadioStation {
  name: string;
  genre: string;
  url: string;
  homepage: string;
}

const R2_BASE = 'https://pub-71c7000d74e7419593b3a776ccd3af7e.r2.dev';

export const djSets: RadioStation[] = [
  // LBL House Party recordings — hosted on Cloudflare R2
  {
    name: 'XDJ-AZ — REC214',
    genre: 'DJ Set / 2h24m',
    url: `${R2_BASE}/sets/REC214.mp3`,
    homepage: '',
  },
  {
    name: 'XDJ-AZ — REC218',
    genre: 'DJ Set / 2h59m',
    url: `${R2_BASE}/sets/REC218.mp3`,
    homepage: '',
  },
  {
    name: 'XDJ-AZ — REC222',
    genre: 'DJ Set / 2h43m',
    url: `${R2_BASE}/sets/REC222.mp3`,
    homepage: '',
  },
  {
    name: 'XDJ-AZ — REC225',
    genre: 'DJ Set / 2h33m',
    url: `${R2_BASE}/sets/REC225.mp3`,
    homepage: '',
  },
  {
    name: 'XDJ-AZ — REC230',
    genre: 'DJ Set / 2h28m',
    url: `${R2_BASE}/sets/REC230.mp3`,
    homepage: '',
  },
  {
    name: 'XDJ-AZ — REC234',
    genre: 'DJ Set / 1h30m',
    url: `${R2_BASE}/sets/REC234.mp3`,
    homepage: '',
  },
  {
    name: 'XDJ-AZ — REC235',
    genre: 'DJ Set / 1h37m',
    url: `${R2_BASE}/sets/REC235.mp3`,
    homepage: '',
  },
  {
    name: 'XDJ-AZ — REC236',
    genre: 'DJ Set / 2h01m',
    url: `${R2_BASE}/sets/REC236.mp3`,
    homepage: '',
  },
];

export const radioStations: RadioStation[] = [
  // SomaFM — all streams serve CORS headers
  {
    name: 'Groove Salad',
    genre: 'Ambient / Chill',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    homepage: 'https://somafm.com/groovesalad/',
  },
  {
    name: 'Groove Salad Classic',
    genre: 'Ambient / Downtempo',
    url: 'https://ice1.somafm.com/gsclassic-128-mp3',
    homepage: 'https://somafm.com/gsclassic/',
  },
  {
    name: 'Lush',
    genre: 'Electronic / Mellow',
    url: 'https://ice1.somafm.com/lush-128-mp3',
    homepage: 'https://somafm.com/lush/',
  },
  {
    name: 'Deep Space One',
    genre: 'Deep Ambient',
    url: 'https://ice1.somafm.com/deepspaceone-128-mp3',
    homepage: 'https://somafm.com/deepspaceone/',
  },
  {
    name: 'Drone Zone',
    genre: 'Atmospheric Ambient',
    url: 'https://ice1.somafm.com/dronezone-128-mp3',
    homepage: 'https://somafm.com/dronezone/',
  },
  {
    name: 'Space Station Soma',
    genre: 'Mid-tempo / Electronic',
    url: 'https://ice1.somafm.com/spacestation-128-mp3',
    homepage: 'https://somafm.com/spacestation/',
  },
  {
    name: 'Left Coast 70s',
    genre: '70s Funk / Soul',
    url: 'https://ice1.somafm.com/seventies-128-mp3',
    homepage: 'https://somafm.com/seventies/',
  },
  {
    name: 'Underground 80s',
    genre: '80s New Wave / Synth',
    url: 'https://ice1.somafm.com/u80s-128-mp3',
    homepage: 'https://somafm.com/u80s/',
  },
  {
    name: 'The Trip',
    genre: 'Progressive Electronic',
    url: 'https://ice1.somafm.com/thetrip-128-mp3',
    homepage: 'https://somafm.com/thetrip/',
  },
  {
    name: 'Fluid',
    genre: 'Instrumental Hip-Hop',
    url: 'https://ice1.somafm.com/fluid-128-mp3',
    homepage: 'https://somafm.com/fluid/',
  },
  {
    name: 'DEF CON Radio',
    genre: 'Electronic / Hacker',
    url: 'https://ice1.somafm.com/defcon-128-mp3',
    homepage: 'https://somafm.com/defcon/',
  },
  {
    name: 'Boot Liquor',
    genre: 'Americana / Roots',
    url: 'https://ice1.somafm.com/bootliquor-128-mp3',
    homepage: 'https://somafm.com/bootliquor/',
  },
  {
    name: 'cliqhop idm',
    genre: 'IDM / Glitch',
    url: 'https://ice1.somafm.com/cliqhop-128-mp3',
    homepage: 'https://somafm.com/cliqhop/',
  },
  {
    name: 'Sonic Universe',
    genre: 'Jazz / Fusion',
    url: 'https://ice1.somafm.com/sonicuniverse-128-mp3',
    homepage: 'https://somafm.com/sonicuniverse/',
  },
  {
    name: 'Illinois Street Lounge',
    genre: 'Lounge / Exotica',
    url: 'https://ice1.somafm.com/illstreet-128-mp3',
    homepage: 'https://somafm.com/illstreet/',
  },
  {
    name: 'Vaporwaves',
    genre: 'Vaporwave / Future Funk',
    url: 'https://ice1.somafm.com/vaporwaves-128-mp3',
    homepage: 'https://somafm.com/vaporwaves/',
  },
];

/** First-click / Cast-receiver default stream (DJ set on R2 for CORS + visuals). */
export const defaultPlaybackStation: RadioStation =
  djSets.find((s) => /REC225/i.test(s.name)) ?? djSets[0] ?? radioStations[0];

export function findStationByUrl(url: string): RadioStation | undefined {
  return djSets.find((s) => s.url === url) ?? radioStations.find((s) => s.url === url);
}

export function findStationByName(name: string): RadioStation | undefined {
  const lower = name.trim().toLowerCase();
  return (
    radioStations.find((r) => r.name.toLowerCase() === lower) ??
    djSets.find((r) => r.name.toLowerCase() === lower)
  );
}
