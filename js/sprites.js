/* ============================================================
   PIXELPERSONAGES · Bob (uit de date-site), Noah en Leon
   Elk personage is opgebouwd uit losse onderdelen (hoofd, romp,
   armen, benen), zodat ze los kunnen bewegen.
   ============================================================ */

// Rijen centreren op een vaste breedte, zodat elke kaart even breed is
const padRows = (rows, w) => rows.map((r) => { const l = Math.floor((w - r.length) / 2); return '.'.repeat(l) + r + '.'.repeat(w - r.length - l); });

const PAL_HIM = {
  D: '#1e150e', // haar
  d: '#35251a', // haar krul-hooglicht
  S: '#c08a5f', // huid
  s: '#9c6a43', // huid schaduw
  L: '#d9a67f', // huid hooglicht (wangen, onderlip)
  o: '#4a3020', // wenkbrauw
  E: '#17100a', // oog
  a: '#f4f6f8', // airpod
  m: '#7a4b2c', // mond
  B: '#5b3d2c', // bruin overhemd
  b: '#412b1e', // overhemd schaduw
  n: '#dfe4ea', // ketting
  P: '#e2d4bd', // beige broek
  p: '#c6b59a', // broek schaduw
  F: '#fdfdfb', // sneaker
  OUT: '#1a120b'
};


/* ---------- HIJ ---------- */
const HIM = {
  pal: PAL_HIM,
  headOff: { x: -2, y: -4 },
  head: [
    '.......DDDDDDDD.......',
    '.....DDdDDDDdDDDD.....',
    '....DdDDDdDDDdDDdD....',
    '...DDdDDdDDDdDDDdDD...',
    '..DDdDDDdDDDDdDDdDDD..',
    '..DdDDdDDDdDDDdDDDdD..',
    '..DDDDDDDDDDDDDDDDDD..',
    '..DDDSSSSSSSSSSSSDDD..',
    '..DDSSSSSSSSSSSSSSDD..',
    '..DDSSSSSSSSSSSSSSDD..',
    '..DDSSoooSSSSoooSSDD..',
    '..DSSSSSSSSSSSSSSSSD..',
    '..sSSSEEESSSSEEESSSs..',
    '..sSSSEEESSSSEEESSSs..',
    '..sSSSSSSSSSSSSSSSSs..',
    '...DSSSSSSssSSSSSSD...',
    '...DSSSmSSSSSSmSSSD...',
    '....SSSSmmmmmmSSSS....',
    '....SSSSSSSSSSSSSS....',
    '.....sSSSSSSSSSSs.....',
    '.......sSSSSSSs.......',
    '........sSSSSs........'
  ],
  torso: [
    '..BBBBBBBBBBBB..',
    '.BBBnSSSSSSnBBB.',
    '.BBBBnSSSSnBBBB.',
    '.BBBBBnSSnBBBBB.',
    '.BBBBBBnnBBBBBB.',
    '.BBBBBBBbBBBBBB.',
    '.BBBBBBBbBBBBBB.',
    '.BBBBBBBbBBBBBB.',
    '.BBBBBBBbBBBBBB.',
    '.BBBBBBBbBBBBBB.',
    '.BBBBBBBbBBBBBB.',
    '..BBBBBBbBBBBB..',
    '..BBBBBBBBBBBB..',
    '..PPPPPPPPPPPP..'
  ],
  arm: [
    'BBBB','BBBB','BBBB','BBBB','bbbb',
    '.SS.','.SS.','.SS.','.SS.','.SS.','SSSS','.SS.'
  ],
  leg: [
    'PPPp','PPPp','PPPp','PPPp','PPPp','PPPp','PPPp','PPPp','PPPp','PPPp',
    'pppp','FFFF','FFFF'
  ]
};


/* ============================================================
   RENDERER
   ============================================================ */
function px(x, y, w, h, fill) {
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>';
}

function buildPart(map, pal, withOutline, ox, oy) {
  ox = ox || 0; oy = oy || 0;
  const h = map.length, w = map[0].length;
  const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? '.' : map[y][x];
  let out = '';

  if (withOutline && pal.OUT) {
    for (let y = -1; y <= h; y++) {
      let run = null;
      for (let x = -1; x <= w + 1; x++) {
        let edge = false;
        if (at(x, y) === '.') {
          for (let dy = -1; dy <= 1 && !edge; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (at(x + dx, y + dy) !== '.') { edge = true; break; }
            }
          }
        }
        if (edge && run === null) run = x;
        if (!edge && run !== null) { out += px(ox + run, oy + y, x - run, 1, pal.OUT); run = null; }
      }
    }
  }

  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const c = map[y][x];
      if (c === '.') { x++; continue; }
      let x2 = x;
      while (x2 < w && map[y][x2] === c) x2++;
      out += px(ox + x, oy + y, x2 - x, 1, pal[c] || '#ff00ff');
      x = x2;
    }
  }
  return out;
}

function checkMap(name, map) {
  const w = map[0].length;
  map.forEach((row, i) => {
    if (row.length !== w) console.error('MAP MISMATCH', name, 'rij', i, 'is', row.length, 'moet', w);
  });
}

/* ------------------------------------------------------------
   Layout. Elk onderdeel wordt met absolute coordinaten getekend
   (geen transform-attribuut) zodat CSS-transforms de positie
   niet overschrijven. MARGIN houdt ruimte voor de outline.
   ------------------------------------------------------------ */
const MARGIN_X = 9;
const MARGIN_Y = 5;
const LAYOUT = {
  hairBack: { x: 5,  y: 0  },
  legB:     { x: 11, y: 30 },
  legF:     { x: 17, y: 30 },
  armB:     { x: 5,  y: 18 },
  torso:    { x: 8,  y: 17 },
  head:     { x: 7,  y: 0  },
  armF:     { x: 23, y: 18 }
};

function part(cls, map, pal, pos, dx, dy) {
  return '<g class="' + cls + '">' +
    buildPart(map, pal, true, MARGIN_X + pos.x + (dx || 0), MARGIN_Y + pos.y + (dy || 0)) +
    '</g>';
}

function renderChar(def, opts) {
  opts = opts || {};
  const p = def.pal;

  ['leg','arm','torso','head'].forEach(k => checkMap(k, def[k]));

  let svg = '<ellipse class="shadow" cx="24.5" cy="48.4" rx="9" ry="1.7"/>';

  if (def.hairBack) {
    checkMap('hairBack', def.hairBack);
    svg += part('p-hairback', def.hairBack, p, LAYOUT.hairBack);
  }

  let inner = '';
  inner += part('p-leg p-legb', def.leg,   p, LAYOUT.legB);
  inner += part('p-leg p-legf', def.leg,   p, LAYOUT.legF);
  inner += part('p-arm p-armb', def.arm,   p, LAYOUT.armB);
  inner += part('p-torso',      def.torso, p, LAYOUT.torso);
  inner += part('p-head',       def.head,  p, LAYOUT.head, (def.headOff||{}).x, (def.headOff||{}).y);

  let front = buildPart(def.arm, p, true, MARGIN_X + LAYOUT.armF.x, MARGIN_Y + LAYOUT.armF.y);
  if (opts.bag && def.bag) {
    checkMap('bag', def.bag);
    front += '<g class="p-bag">' + buildPart(def.bag, p, true, MARGIN_X + LAYOUT.armF.x - 1, MARGIN_Y + LAYOUT.armF.y + 11) + '</g>';
  }
  if (opts.glass) {
    front += '<g class="p-glass">' + buildPart(GLASS, PAL_PROP, true, MARGIN_X + LAYOUT.armF.x, MARGIN_Y + LAYOUT.armF.y + 4) + '</g>';
  }
  inner += '<g class="p-arm p-armf">' + front + '</g>';

  if (def.hairSide) {
    checkMap('hairSide', def.hairSide);
    inner += part('p-hairside', def.hairSide, p, { x: LAYOUT.hairBack.x, y: 15 });
  }

  svg += '<g class="p-body">' + inner + '</g>';
  return '<svg class="sprite" viewBox="0 0 53 52" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' + svg + '</svg>';
}

/* ---------- NOAH: krullen, zwarte polo, oorbelletje ---------- */
const NOAH = {
  pal: { D: '#3b2416', d: '#62402a', S: '#f1c7ad', s: '#d9a58a', o: '#4a2c1a', E: '#3a2414', h: '#ffffff', m: '#b9786a', g: '#cfd3d8',
    B: '#17181c', b: '#0b0c0f', n: '#2c2e35', k: '#3a3d45', P: '#2b3240', p: '#1f2530', F: '#f4f4f2', OUT: '#120c08' },
  headOff: { x: -2, y: -5 },
  head: padRows([
    'DDdDDdDDDdDD', 'DDdDDDdDDDdDDDdD', 'DdDDdDDDdDDdDDDdDD', 'DDdDDDdDDDdDDDdDDdDD', 'DdDDdDDdDDDdDDdDDDdD', 'DDDdDDDDdDDDdDDDdDDD',
    'DDdSdDDSdDDdSDDdSdDD', 'DDSSSSSSSSSSSSSSSSDD', 'DSSSSSSSSSSSSSSSSD', 'DSSoooSSSSSSoooSSD', 'DSSSSSSSSSSSSSSSSD',
    'sSSSEEESSSSEEESSSs', 'sSSShEESSSShEESSSs', 'gsSSSSSSSSSSSSSSSSs', 'SSSSSSSssSSSSSSS', 'SSSSSssssssSSSSS',
    'SSSSmmmmmmSSSS', 'SSSSSSSSSSSSSS', 'sSSSSSSSSSSs', 'sSSSSSSs', 'sSSSSs'
  ], 22),
  torso: padRows([
    'BBBBBBBBBBBB', 'BBBnnSSSSnnBBB', 'BBBBnnSSnnBBBB', 'BBBBBnBBnBBBBb', 'BBBBBBnnBBBBBb', 'BBBBBBBnBBBBBb', 'BBBBBBBBBBBBBb',
    'BBBBBBBnBBBBBb', 'BBBBBBBBBBBBBb', 'BBBBBBBBBBBBBb', 'BBBBBBBBBBBBBb', 'BBBBBBBBBBBB', 'BBBBBBBBBBBB', 'PPPPPPPPPPPP'
  ], 16),
  arm: ['BBBB', 'BBBB', 'BBBB', 'bbbb', '.SS.', '.SS.', '.SS.', '.SS.', 'kkkk', '.SS.', 'SSSS', '.SS.'],
  leg: ['PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'pppp', 'FFFF', 'FFFF']
};

/* ---------- LEON: zonnebril, snor, beige overhemd, gouden ketting ---------- */
const LEON = {
  pal: { D: '#1a120c', d: '#33241a', S: '#b07a55', s: '#8e5e3e', o: '#2a1a10', G: '#0d0d10', g: '#4a4e5a', M: '#2a1a10', m: '#6e4128',
    B: '#d9ccb4', b: '#bfae92', T: '#141416', n: '#d6b25e', W: '#c9ced6', P: '#17181c', p: '#0f1013', F: '#0b0b0d', OUT: '#120c08' },
  headOff: { x: -2, y: -3 },
  head: padRows([
    'DDdDDdDD', 'DdDDdDDdDDdD', 'DDdDDdDDdDDdDD', 'DDDdDDDdDDDdDDDD', 'DDSSSSSSSSSSSSSSDD', 'DSSSSSSSSSSSSSSSSD', 'DSSoooSSSSSSoooSSD',
    'sGGGGGGGGGGGGGGGGs', 'sSGgGGGGSSGgGGGGSs', 'sSGGGGGSSSSGGGGGSs', 'SSSSSSSSSSSSSSSSSS', 'SSSSSSSssSSSSSSS',
    'SSSSSMMMMMMSSSSS', 'SSSSSSmmmmSSSSSS', 'SSSSSSSSSSSSSS', 'sSSSSSSSSSSs', 'sSSSSSSs', 'sSSSSs'
  ], 22),
  torso: padRows([
    'BBBBBBBBBBBB', 'BbBBTTSSSSTTBBbB', 'BbBBTTnSSnTTBBbB', 'BbBBBTTnnTTBBBbB', 'BbBBBTTTTTTBBBbB', 'BbBBBTTTTTTBBBbB', 'BbBBBTTTTTTBBBbB',
    'BbBBBTTTTTTBBBbB', 'BbBBBTTTTTTBBBbB', 'BbBBBTTTTTTBBBbB', 'BbBBBTTTTTTBBBbB', 'BBBBBTTTTTTBBBB', 'BBBBTTTTTTBBBB', 'PPPPPPPPPPPP'
  ], 16),
  arm: ['BBBB', 'BbBB', 'BBBB', 'bbbb', '.SS.', '.SS.', '.SS.', '.SS.', '.SS.', 'WWWW', 'SSSS', '.SS.'],
  leg: ['PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'PPPp', 'pppp', 'FFFF', 'FFFF']
};

const PEOPLE = {
  bob: { name: 'Bob', role: 'Speler', def: HIM },
  noah: { name: 'Noah', role: 'Coach', def: NOAH },
  leon: { name: 'Leon', role: 'Coach', def: LEON },
};
