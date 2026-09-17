// IR code database + protocol encoders.
// Encoders return { frequency, pattern } where pattern is an array of
// alternating mark/space durations in microseconds, ready for
// ConsumerIrManager.transmit(frequency, pattern).

function necPatternLSB(bytes) {
  const FREQUENCY = 38000;
  const pattern = [9000, 4500];
  for (const byte of bytes) {
    for (let bit = 0; bit < 8; bit++) {
      const isOne = (byte >> bit) & 1;
      pattern.push(560);
      pattern.push(isOne ? 1690 : 560);
    }
  }
  pattern.push(560);
  return { frequency: FREQUENCY, pattern };
}

function necPatternMSB32(value) {
  const FREQUENCY = 38000;
  const pattern = [9000, 4500];
  for (let bit = 31; bit >= 0; bit--) {
    const isOne = (value >> bit) & 1;
    pattern.push(560);
    pattern.push(isOne ? 1690 : 560);
  }
  pattern.push(560);
  return { frequency: FREQUENCY, pattern };
}

function sircPattern(value, bits) {
  const FREQUENCY = 40000;
  const pattern = [2400, 600];
  for (let bit = 0; bit < bits; bit++) {
    const isOne = (value >> bit) & 1;
    pattern.push(isOne ? 1200 : 600);
    pattern.push(600);
  }
  return { frequency: FREQUENCY, pattern };
}

function prontoToPattern(prontoText) {
  const words = prontoText
    .trim()
    .split(/\s+/)
    .map((w) => parseInt(w, 16));
  if (words.length < 4) throw new Error('Пронто код тым қысқа');
  const [format, freqCode] = words;
  if (format !== 0) throw new Error('Тек "raw" (0000) Pronto кодтары қолдау көрсетіледі');
  const frequency = Math.round(1000000 / (freqCode * 0.241246));
  const data = words.slice(4);
  const pattern = data.map((v) => Math.round((v * 1000000) / frequency));
  return { frequency, pattern };
}

/**
 * Classic "standard" NEC frame: address, inverted address, command,
 * inverted command. This is the format most non-Samsung remotes use —
 * used here for the brute-force auto-scan feature.
 */
function necStandard(address, command) {
  const addr = address & 0xff;
  const cmd = command & 0xff;
  return necPatternLSB([addr, (~addr) & 0xff, cmd, (~cmd) & 0xff]);
}

const SAMSUNG_TV = {
  name: 'Samsung',
  buttons: {
    power: () => necPatternLSB([0x07, 0x07, 0x02, 0xfd]),
    volup: () => necPatternLSB([0x07, 0x07, 0x07, 0xf8]),
    voldown: () => necPatternLSB([0x07, 0x07, 0x0b, 0xf4]),
    chup: () => necPatternLSB([0x07, 0x07, 0x12, 0xed]),
    chdown: () => necPatternLSB([0x07, 0x07, 0x10, 0xef]),
    mute: () => necPatternLSB([0x07, 0x07, 0x0d, 0xf2]),
  },
};

const LG_TV = {
  name: 'LG',
  buttons: {
    power: () => necPatternMSB32(0x20df10ef),
    volup: () => necPatternMSB32(0x20df40bf),
    voldown: () => necPatternMSB32(0x20dfc03f),
    chup: () => necPatternMSB32(0x20df00ff),
    chdown: () => necPatternMSB32(0x20df807f),
    mute: () => necPatternMSB32(0x20df906f),
  },
};

const SONY_TV = {
  name: 'Sony',
  buttons: {
    power: () => sircPattern(0xa90, 12),
    mute: () => sircPattern(0x290, 12),
  },
};

const TV_BRANDS = {
  samsung: SAMSUNG_TV,
  lg: LG_TV,
  sony: SONY_TV,
};

const BUTTON_LABELS = {
  power: 'Қосу / өшіру',
  volup: 'Дауыс +',
  voldown: 'Дауыс −',
  chup: 'Арна +',
  chdown: 'Арна −',
  mute: 'Дыбыссыз',
};

// Best-effort list of NEC "power" command bytes seen across a range of
// budget/generic remotes. Not guaranteed for any specific model — this is
// what the auto-scan feature cycles through.
const SCAN_POWER_COMMANDS = [
  0x02, 0x08, 0x0c, 0x10, 0x12, 0x1a, 0x1c, 0x40, 0x45, 0x59, 0x5f, 0x15,
];

window.IR = {
  TV_BRANDS,
  BUTTON_LABELS,
  prontoToPattern,
  necStandard,
  SCAN_POWER_COMMANDS,
};
