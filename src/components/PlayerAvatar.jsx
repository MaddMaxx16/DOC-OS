// P2.4.4.3B.6.1 — Toon Head creator foundation
// Toon Head is the locked DOC OS player-avatar art direction. Keep player-facing
// options limited to components the style actually supports.
export const APPEARANCE_OPTIONS = {
  skinTone: [
    { value: 'porcelain', label: 'Porcelain', color: '#f2c7aa' },
    { value: 'light', label: 'Light', color: '#dfaa86' },
    { value: 'warm', label: 'Warm', color: '#c98962' },
    { value: 'tan', label: 'Tan', color: '#a96545' },
    { value: 'brown', label: 'Brown', color: '#774630' },
    { value: 'deep', label: 'Deep', color: '#4b2b23' },
  ],
  hair: [
    { value: 'sidepart', label: 'Side Part' },
    { value: 'undercut', label: 'Undercut' },
    { value: 'spiky', label: 'Spiky' },
    { value: 'bun', label: 'Bun' },
    { value: 'longStraight', label: 'Long Straight' },
    { value: 'longWavy', label: 'Long Wavy' },
    { value: 'neckHigh', label: 'Neck Length' },
    { value: 'shoulderHigh', label: 'Shoulder Length' },
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
    { value: 'neutral', label: 'Natural' },
    { value: 'happy', label: 'Soft Arch' },
    { value: 'raised', label: 'Raised' },
    { value: 'sad', label: 'Downturned' },
    { value: 'angry', label: 'Strong' },
  ],
  eyes: [
    { value: 'humble', label: 'Natural' },
    { value: 'happy', label: 'Friendly' },
    { value: 'wide', label: 'Wide' },
    { value: 'bow', label: 'Bow' },
    { value: 'wink', label: 'Wink' },
  ],
  mouth: [
    { value: 'smile', label: 'Soft Smile' },
    { value: 'laugh', label: 'Laugh' },
    { value: 'agape', label: 'Open' },
    { value: 'sad', label: 'Downturned' },
    { value: 'angry', label: 'Firm' },
  ],
  facialHair: [
    { value: 'none', label: 'Clean Shaven' },
    { value: 'chin', label: 'Chin Beard' },
    { value: 'chinMoustache', label: 'Goatee + Mustache' },
    { value: 'moustacheTwirl', label: 'Mustache' },
    { value: 'fullBeard', label: 'Full Beard' },
    { value: 'longBeard', label: 'Long Beard' },
  ],
  outfit: [
    { value: 'shirt', label: 'Work Shirt' },
    { value: 'openJacket', label: 'Open Jacket' },
    { value: 'tShirt', label: 'Crew Tee' },
    { value: 'turtleNeck', label: 'Turtleneck' },
    { value: 'dress', label: 'Tailored Dress' },
  ],
}

export const APPEARANCE_CATEGORIES = [
  { key: 'skinTone', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair Color' },
  { key: 'brows', label: 'Brows' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'mouth', label: 'Mouth' },
  { key: 'facialHair', label: 'Facial Hair' },
  { key: 'outfit', label: 'Outfit' },
]

export const DEFAULT_APPEARANCE = {
  skinTone: 'warm',
  hair: 'sidepart',
  hairColor: 'espresso',
  brows: 'neutral',
  eyes: 'humble',
  mouth: 'smile',
  facialHair: 'none',
  outfit: 'shirt',
}

const DICEBEAR_TOON_HEAD = 'https://api.dicebear.com/10.x/toon-head/svg'
const METROLINE_PORTRAIT_BACKGROUND = '0b2a45'
const METROLINE_OUTFIT_COLOR = '101f31'

const HAIR_CONFIG = {
  sidepart: { front: 'sideComed', rear: null },
  undercut: { front: 'undercut', rear: null },
  spiky: { front: 'spiky', rear: null },
  bun: { front: 'bun', rear: null },
  longStraight: { front: 'sideComed', rear: 'longStraight' },
  longWavy: { front: 'sideComed', rear: 'longWavy' },
  neckHigh: { front: 'sideComed', rear: 'neckHigh' },
  shoulderHigh: { front: 'sideComed', rear: 'shoulderHigh' },
  bald: { front: null, rear: null },
}

function optionColor(group, value, fallback) {
  return (APPEARANCE_OPTIONS[group].find((option) => option.value === value)?.color || fallback)
    .replace('#', '')
}

function validOption(group, value, fallback) {
  return APPEARANCE_OPTIONS[group].some((option) => option.value === value) ? value : fallback
}

function buildToonHeadPortrait(appearance) {
  const skinTone = validOption('skinTone', appearance.skinTone, DEFAULT_APPEARANCE.skinTone)
  const hairChoice = validOption('hair', appearance.hair, DEFAULT_APPEARANCE.hair)
  const hairColorChoice = validOption('hairColor', appearance.hairColor, DEFAULT_APPEARANCE.hairColor)
  const brows = validOption('brows', appearance.brows, DEFAULT_APPEARANCE.brows)
  const eyes = validOption('eyes', appearance.eyes, DEFAULT_APPEARANCE.eyes)
  const mouth = validOption('mouth', appearance.mouth, DEFAULT_APPEARANCE.mouth)
  const facialHair = validOption('facialHair', appearance.facialHair, DEFAULT_APPEARANCE.facialHair)
  const outfit = validOption('outfit', appearance.outfit, DEFAULT_APPEARANCE.outfit)

  const hair = HAIR_CONFIG[hairChoice] || HAIR_CONFIG[DEFAULT_APPEARANCE.hair]
  const hairColor = optionColor('hairColor', hairColorChoice, '#35251f')
  const skinColor = optionColor('skinTone', skinTone, '#c98962')
  const hasFacialHair = facialHair !== 'none'

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    backgroundColor: METROLINE_PORTRAIT_BACKGROUND,
    skinColor,
    hairColor,
    clothesColor: METROLINE_OUTFIT_COLOR,
    eyebrowsVariant: brows,
    eyesVariant: eyes,
    mouthVariant: mouth,
    clothesVariant: outfit,
    beardProbability: hasFacialHair ? '100' : '0',
    hairProbability: hair.front ? '100' : '0',
    rearHairProbability: hair.rear ? '100' : '0',
  })

  if (hair.front) params.set('hairVariant', hair.front)
  if (hair.rear) params.set('rearHairVariant', hair.rear)
  if (hasFacialHair) params.set('beardVariant', facialHair)

  return {
    src: `${DICEBEAR_TOON_HEAD}?${params.toString()}`,
    skinTone,
  }
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const portrait = buildToonHeadPortrait(appearance)

  return (
    <img
      className={className}
      src={portrait.src}
      width="260"
      height="320"
      role="img"
      alt=""
      aria-label={`Customized Metroline employee portrait — ${portrait.skinTone} skin tone`}
      data-avatar-engine="dicebear-toon-head"
      data-skin-tone={portrait.skinTone}
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
    />
  )
}

export default PlayerAvatar
