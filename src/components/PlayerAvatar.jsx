export const APPEARANCE_OPTIONS = {
  skinTone: [
    { value: 'porcelain', label: 'Porcelain', color: '#f2c7aa' },
    { value: 'light', label: 'Light', color: '#dfaa86' },
    { value: 'warm', label: 'Warm', color: '#c98962' },
    { value: 'tan', label: 'Tan', color: '#a96545' },
    { value: 'brown', label: 'Brown', color: '#774630' },
    { value: 'deep', label: 'Deep', color: '#4b2b23' },
  ],
  face: [
    { value: 'oval', label: 'Oval' },
    { value: 'round', label: 'Round' },
    { value: 'square', label: 'Square' },
    { value: 'long', label: 'Long' },
    { value: 'soft', label: 'Soft Angular' },
    { value: 'heart', label: 'Heart' },
  ],
  hair: [
    { value: 'crop', label: 'Textured Crop' },
    { value: 'fade', label: 'Fade' },
    { value: 'sidepart', label: 'Side Part' },
    { value: 'waves', label: 'Waves' },
    { value: 'curls', label: 'Curls' },
    { value: 'bun', label: 'Top Bun' },
    { value: 'long', label: 'Long' },
    { value: 'buzz', label: 'Buzz' },
    { value: 'bald', label: 'Bald' },
  ],
  hairColor: [
    { value: 'black', label: 'Black', color: '#17191e' },
    { value: 'espresso', label: 'Espresso', color: '#35251f' },
    { value: 'brown', label: 'Brown', color: '#624333' },
    { value: 'auburn', label: 'Auburn', color: '#7a3e2b' },
    { value: 'blonde', label: 'Blonde', color: '#c7a565' },
    { value: 'silver', label: 'Silver', color: '#aab0b6' },
  ],
  brows: [
    { value: 'natural', label: 'Natural' },
    { value: 'soft', label: 'Soft' },
    { value: 'defined', label: 'Defined' },
    { value: 'straight', label: 'Straight' },
    { value: 'full', label: 'Full' },
  ],
  eyes: [
    { value: 'standard', label: 'Almond' },
    { value: 'soft', label: 'Soft' },
    { value: 'narrow', label: 'Narrow' },
    { value: 'round', label: 'Round' },
    { value: 'upturned', label: 'Upturned' },
  ],
  eyeColor: [
    { value: 'brown', label: 'Brown', color: '#6b4b35' },
    { value: 'hazel', label: 'Hazel', color: '#8b7542' },
    { value: 'green', label: 'Green', color: '#5d7862' },
    { value: 'blue', label: 'Blue', color: '#5d819e' },
    { value: 'gray', label: 'Gray', color: '#7f8d96' },
  ],
  nose: [
    { value: 'soft', label: 'Soft' },
    { value: 'straight', label: 'Straight' },
    { value: 'wide', label: 'Wide' },
    { value: 'button', label: 'Button' },
    { value: 'defined', label: 'Defined' },
  ],
  mouth: [
    { value: 'neutral', label: 'Neutral' },
    { value: 'soft', label: 'Soft Smile' },
    { value: 'full', label: 'Full' },
    { value: 'smile', label: 'Smile' },
    { value: 'wide', label: 'Wide' },
  ],
  facialHair: [
    { value: 'none', label: 'Clean Shaven' },
    { value: 'stubble', label: 'Stubble' },
    { value: 'mustache', label: 'Mustache' },
    { value: 'goatee', label: 'Goatee' },
    { value: 'beard', label: 'Short Beard' },
    { value: 'fullbeard', label: 'Full Beard' },
  ],
  glasses: [
    { value: 'none', label: 'None' },
    { value: 'square', label: 'Square' },
    { value: 'round', label: 'Round' },
    { value: 'aviator', label: 'Aviator' },
  ],
  outfit: [
    { value: 'polo', label: 'Metroline Polo' },
    { value: 'buttondown', label: 'Button Down' },
    { value: 'sweater', label: 'Crew Sweater' },
    { value: 'hoodie', label: 'Metroline Hoodie' },
  ],
}

// B.5.1 art-direction audition: keep the proven modular controls small while
// comparing four distinct DiceBear illustration systems inside DOC OS.
export const APPEARANCE_CATEGORIES = [
  { key: 'skinTone', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair Color' },
  { key: 'facialHair', label: 'Facial Hair' },
]

export const AVATAR_STYLE_OPTIONS = [
  { value: 'micah', label: 'Micah' },
  { value: 'toon-head', label: 'Toon Head' },
  { value: 'notionists', label: 'Notionists' },
  { value: 'open-peeps', label: 'Open Peeps' },
]

export const DEFAULT_APPEARANCE = {
  avatarStyle: 'micah',
  skinTone: 'warm',
  face: 'oval',
  hair: 'sidepart',
  hairColor: 'espresso',
  brows: 'natural',
  eyes: 'standard',
  eyeColor: 'brown',
  nose: 'straight',
  mouth: 'soft',
  facialHair: 'none',
  glasses: 'none',
  outfit: 'polo',
}

const DICEBEAR_BASE = 'https://api.dicebear.com/10.x'

const STYLE_HAIR = {
  micah: {
    crop: 'fonze', fade: 'mrT', sidepart: 'dannyPhantom',
    waves: 'full', curls: 'pixie', bun: 'dougFunny',
    long: 'full', buzz: 'mrT', bald: 'mrClean',
  },
  'toon-head': {
    crop: 'sideComed', fade: 'undercut', sidepart: 'sideComed',
    waves: 'spiky', curls: 'spiky', bun: 'bun',
    long: 'bun', buzz: 'undercut', bald: 'undercut',
  },
  notionists: {
    crop: 'variant08', fade: 'variant16', sidepart: 'variant23',
    waves: 'variant31', curls: 'variant38', bun: 'variant45',
    long: 'variant52', buzz: 'variant05', bald: 'variant01',
  },
  'open-peeps': {
    crop: 'short3', fade: 'shaved2', sidepart: 'short5',
    waves: 'medium3', curls: 'longCurly', bun: 'bun',
    long: 'long', buzz: 'shaved1', bald: 'noHair1',
  },
}

const STYLE_FACIAL_HAIR = {
  micah: {
    stubble: 'scruff', mustache: 'beard', goatee: 'beard',
    beard: 'beard', fullbeard: 'beard',
  },
  'toon-head': {
    stubble: 'chin', mustache: 'moustacheTwirl', goatee: 'chinMoustache',
    beard: 'fullBeard', fullbeard: 'longBeard',
  },
  notionists: {
    stubble: 'variant01', mustache: 'variant04', goatee: 'variant06',
    beard: 'variant09', fullbeard: 'variant12',
  },
  'open-peeps': {
    stubble: 'chin', mustache: 'moustache3', goatee: 'goatee1',
    beard: 'full2', fullbeard: 'full4',
  },
}

function optionColor(group, value, fallback) {
  return (APPEARANCE_OPTIONS[group].find((option) => option.value === value)?.color || fallback)
    .replace('#', '')
}

function buildDiceBearPortrait(appearance) {
  const style = AVATAR_STYLE_OPTIONS.some(({ value }) => value === appearance.avatarStyle)
    ? appearance.avatarStyle
    : DEFAULT_APPEARANCE.avatarStyle
  const skinTone = APPEARANCE_OPTIONS.skinTone.some(({ value }) => value === appearance.skinTone)
    ? appearance.skinTone
    : DEFAULT_APPEARANCE.skinTone
  const hairChoice = appearance.hair || DEFAULT_APPEARANCE.hair
  const hair = STYLE_HAIR[style][hairChoice] || STYLE_HAIR[style][DEFAULT_APPEARANCE.hair]
  const facialHair = STYLE_FACIAL_HAIR[style][appearance.facialHair]
  const hairColor = optionColor('hairColor', appearance.hairColor, '#35251f')
  const skinColor = optionColor('skinTone', skinTone, '#c98962')
  const hasFacialHair = Boolean(facialHair && appearance.facialHair !== 'none')

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    backgroundColor: '0b2a45',
  })

  if (style === 'micah') {
    params.set('baseColor', skinColor)
    params.set('hairVariant', hair)
    params.set('hairColor', hairColor)
    params.set('clothesVariant', 'collared')
    params.set('shirtColor', '101f31')
    params.set('mouthVariant', 'smile')
    params.set('eyesVariant', 'eyes')
    params.set('noseVariant', 'curve')
    params.set('facialHairProbability', hasFacialHair ? '100' : '0')
    params.set('facialHairColor', hairColor)
    if (hasFacialHair) params.set('facialHairVariant', facialHair)
  }

  if (style === 'toon-head') {
    params.set('skinColor', skinColor)
    params.set('hairVariant', hair)
    params.set('hairColor', hairColor)
    params.set('clothesVariant', 'shirt')
    params.set('clothesColor', '101f31')
    params.set('eyebrowsVariant', 'neutral')
    params.set('eyesVariant', 'humble')
    params.set('mouthVariant', 'smile')
    params.set('beardProbability', hasFacialHair ? '100' : '0')
    if (hasFacialHair) params.set('beardVariant', facialHair)

    if (hairChoice === 'long') params.set('rearHairVariant', 'longWavy')
    if (hairChoice === 'waves') params.set('rearHairVariant', 'neckHigh')
    if (hairChoice === 'bun') params.set('rearHairVariant', 'shoulderHigh')
  }

  if (style === 'notionists') {
    params.set('hairVariant', hair)
    params.set('clothesVariant', 'variant08')
    params.set('eyebrowsVariant', 'variant07')
    params.set('eyesVariant', 'variant03')
    params.set('mouthVariant', 'variant14')
    params.set('noseVariant', 'variant08')
    params.set('beardProbability', hasFacialHair ? '100' : '0')
    if (hasFacialHair) params.set('beardVariant', facialHair)
  }

  if (style === 'open-peeps') {
    params.set('skinColor', skinColor)
    params.set('headVariant', hair)
    params.set('headContrastColor', hairColor)
    params.set('clothingColor', '101f31')
    params.set('expressionVariant', 'calm')
    params.set('facialHairProbability', hasFacialHair ? '100' : '0')
    if (hasFacialHair) params.set('facialHairVariant', facialHair)
  }

  return {
    src: `${DICEBEAR_BASE}/${style}/svg?${params.toString()}`,
    skinTone,
    style,
  }
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const portrait = buildDiceBearPortrait(appearance)
  const styleLabel = AVATAR_STYLE_OPTIONS.find(({ value }) => value === portrait.style)?.label || portrait.style

  return (
    <img
      className={className}
      src={portrait.src}
      width="260"
      height="320"
      role="img"
      alt=""
      aria-label={`Customized Metroline employee portrait — ${styleLabel}, ${portrait.skinTone} skin tone`}
      data-avatar-engine={`dicebear-${portrait.style}-audition`}
      data-avatar-style={portrait.style}
      data-skin-tone={portrait.skinTone}
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
    />
  )
}

export default PlayerAvatar
