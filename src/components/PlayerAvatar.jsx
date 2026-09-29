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

// P2.4.4.3B.5 — DiceBear proof of concept.
// Keep the test deliberately small: every visible category below is genuinely live.
export const APPEARANCE_CATEGORIES = [
  { key: 'skinTone', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair Color' },
  { key: 'facialHair', label: 'Facial Hair' },
]

export const DEFAULT_APPEARANCE = {
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

const DICEBEAR_PERSONAS_ENDPOINT = 'https://api.dicebear.com/10.x/personas/svg'

const HAIR_VARIANTS = {
  crop: 'shortCombover',
  fade: 'fade',
  sidepart: 'shortComboverChops',
  waves: 'curly',
  curls: 'curlyHighTop',
  bun: 'straightBun',
  long: 'long',
  buzz: 'buzzcut',
  bald: 'bald',
}

const FACIAL_HAIR_VARIANTS = {
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

function buildDiceBearPortrait(appearance) {
  const skinTone = APPEARANCE_OPTIONS.skinTone.some(({ value }) => value === appearance.skinTone)
    ? appearance.skinTone
    : DEFAULT_APPEARANCE.skinTone
  const hair = HAIR_VARIANTS[appearance.hair] || HAIR_VARIANTS[DEFAULT_APPEARANCE.hair]
  const hairColor = optionColor('hairColor', appearance.hairColor, '#35251f')
  const skinColor = optionColor('skinTone', skinTone, '#c98962')
  const facialHair = FACIAL_HAIR_VARIANTS[appearance.facialHair]

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    skinColor,
    hairVariant: hair,
    hairColor,
    eyesVariant: 'open',
    mouthVariant: 'smile',
    noseVariant: 'mediumRound',
    clothesVariant: 'rounded',
    clothingColor: '101f31',
    backgroundColor: '0b2a45',
    facialHairProbability: facialHair ? '100' : '0',
    facialHairColor: hairColor,
  })

  if (facialHair) params.set('facialHairVariant', facialHair)

  return {
    src: `${DICEBEAR_PERSONAS_ENDPOINT}?${params.toString()}`,
    skinTone,
  }
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const portrait = buildDiceBearPortrait(appearance)

  return (
    <img
      className={className}
      src={portrait.src}
      width="260"
      height="320"
      role="img"
      alt=""
      aria-label={`Customized Metroline employee portrait — DiceBear Personas, ${portrait.skinTone} skin tone`}
      data-avatar-engine="dicebear-personas-poc"
      data-skin-tone={portrait.skinTone}
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
    />
  )
}

export default PlayerAvatar
