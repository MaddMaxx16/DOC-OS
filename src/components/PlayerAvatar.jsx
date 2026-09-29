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
  { value: 'personas', label: 'Personas' },
  { value: 'lorelei', label: 'Lorelei' },
  { value: 'micah', label: 'Micah' },
  { value: 'adventurer', label: 'Adventurer' },
]

export const DEFAULT_APPEARANCE = {
  avatarStyle: 'lorelei',
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
  personas: {
    crop: 'shortCombover', fade: 'fade', sidepart: 'shortComboverChops',
    waves: 'curly', curls: 'curlyHighTop', bun: 'straightBun',
    long: 'long', buzz: 'buzzcut', bald: 'bald',
  },
  lorelei: {
    crop: 'variant04', fade: 'variant09', sidepart: 'variant14',
    waves: 'variant22', curls: 'variant28', bun: 'variant34',
    long: 'variant41', buzz: 'variant07', bald: 'variant02',
  },
  micah: {
    crop: 'fonze', fade: 'mrT', sidepart: 'dannyPhantom',
    waves: 'full', curls: 'pixie', bun: 'dougFunny',
    long: 'full', buzz: 'mrT', bald: 'mrClean',
  },
  adventurer: {
    crop: 'short05', fade: 'short10', sidepart: 'short13',
    waves: 'short17', curls: 'long07', bun: 'long15',
    long: 'long22', buzz: 'short02', bald: 'short01',
  },
}

const PERSONAS_FACIAL_HAIR = {
  stubble: 'shadow',
  mustache: 'walrus',
  goatee: 'goatee',
  beard: 'beardMustache',
  fullbeard: 'pyramid',
}

function optionColor(group, value, fallback) {
  return (APPEARANCE_OPTIONS[group].find((option) => option.value === value)?.color || fallback)
    .replace('#', '')
}

function appendFacialHair(params, style, facialHair, hairColor) {
  const enabled = facialHair && facialHair !== 'none'

  if (style === 'personas') {
    const variant = PERSONAS_FACIAL_HAIR[facialHair]
    params.set('facialHairProbability', variant ? '100' : '0')
    params.set('facialHairColor', hairColor)
    if (variant) params.set('facialHairVariant', variant)
    return
  }

  if (style === 'lorelei') {
    params.set('beardProbability', enabled ? '100' : '0')
    if (enabled) params.set('beardVariant', facialHair === 'fullbeard' ? 'variant02' : 'variant01')
    return
  }

  if (style === 'micah') {
    params.set('facialHairProbability', enabled ? '100' : '0')
    params.set('facialHairColor', hairColor)
    if (enabled) params.set('facialHairVariant', facialHair === 'stubble' ? 'scruff' : 'beard')
    return
  }

  // Adventurer exposes a mustache detail rather than a full facial-hair layer.
  params.set('detailsProbability', enabled ? '100' : '0')
  if (enabled) params.set('detailsVariant', 'mustache')
}

function buildDiceBearPortrait(appearance) {
  const style = AVATAR_STYLE_OPTIONS.some(({ value }) => value === appearance.avatarStyle)
    ? appearance.avatarStyle
    : DEFAULT_APPEARANCE.avatarStyle
  const skinTone = APPEARANCE_OPTIONS.skinTone.some(({ value }) => value === appearance.skinTone)
    ? appearance.skinTone
    : DEFAULT_APPEARANCE.skinTone
  const hair = STYLE_HAIR[style][appearance.hair] || STYLE_HAIR[style][DEFAULT_APPEARANCE.hair]
  const hairColor = optionColor('hairColor', appearance.hairColor, '#35251f')
  const skinColor = optionColor('skinTone', skinTone, '#c98962')

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    backgroundColor: '0b2a45',
    hairVariant: hair,
    hairColor,
  })

  if (style === 'micah') {
    params.set('baseColor', skinColor)
    params.set('clothesVariant', 'collared')
    params.set('shirtColor', '101f31')
    params.set('mouthVariant', 'smile')
    params.set('eyesVariant', 'eyes')
    params.set('noseVariant', 'curve')
  } else {
    params.set('skinColor', skinColor)
  }

  if (style === 'personas') {
    params.set('eyesVariant', 'open')
    params.set('mouthVariant', 'smile')
    params.set('noseVariant', 'mediumRound')
    params.set('clothesVariant', 'rounded')
    params.set('clothingColor', '101f31')
  }

  if (style === 'lorelei') {
    params.set('eyesVariant', 'variant05')
    params.set('eyebrowsVariant', 'variant07')
    params.set('mouthVariant', 'happy07')
    params.set('noseVariant', 'variant03')
  }

  if (style === 'adventurer') {
    params.set('eyesVariant', 'variant09')
    params.set('eyebrowsVariant', 'variant07')
    params.set('mouthVariant', 'variant15')
  }

  appendFacialHair(params, style, appearance.facialHair, hairColor)

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
