// P2.4.4.3B.6.2B — expanded DiceBear eye audition
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
    { value: 'hybridAvaDefault', label: 'Avataaars · Standard' },
    { value: 'hybridAvaSide', label: 'Avataaars · Side' },
    { value: 'hybridAvaHappy', label: 'Avataaars · Happy' },
    { value: 'hybridAvaClosed', label: 'Avataaars · Closed' },
    { value: 'hybridAvaEyeRoll', label: 'Avataaars · Eye Roll' },
    { value: 'hybridAvaSurprised', label: 'Avataaars · Surprised' },
    { value: 'hybridAvaWink', label: 'Avataaars · Wink' },
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

// Eye audition source: Avataaars by Pablo Stanley.
// DiceBear lists Avataaars as free for personal and commercial use.
// Keep Toon Head as the base portrait; only the donor eye component is overlaid.
const CUSTOM_EYES = new Set([
  'hybridAvaDefault',
  'hybridAvaSide',
  'hybridAvaHappy',
  'hybridAvaClosed',
  'hybridAvaEyeRoll',
  'hybridAvaSurprised',
  'hybridAvaWink',
])

function CustomEyes({ variant }) {
  const ink = '#4b2422'
  const transform = 'translate(248 374) scale(3.2)'

  if (variant === 'hybridAvaDefault') {
    return (
      <g transform={transform} fill={ink} fillOpacity=".92">
        <circle cx="16" cy="14" r="6" />
        <circle cx="68" cy="14" r="6" />
      </g>
    )
  }

  if (variant === 'hybridAvaSide') {
    return <path d="M13 8c-4.84 0-9 2.65-10.84 6.45-.54 1.1.39 1.85 1.28 1.12a15 15 0 0 1 9.8-3.22 6 6 0 1 0 10.7 2.8 2 2 0 0 0-.12-.74l-.15-.38a6 6 0 0 0-1.64-2.48C19.9 9.32 16.5 8 13 8m58 0c-4.84 0-9 2.65-10.84 6.45-.54 1.1.39 1.85 1.28 1.12a15 15 0 0 1 9.8-3.22 6 6 0 1 0 10.7 2.8 2 2 0 0 0-.12-.74l-.15-.38a6 6 0 0 0-1.64-2.48C77.9 9.32 74.5 8 71 8" fill={ink} transform={transform} />
  }

  if (variant === 'hybridAvaHappy') {
    return <path d="M2.16 14.45C4.01 10.65 8.16 8 13 8c4.81 0 8.96 2.63 10.82 6.4.55 1.13-.24 2.05-1.03 1.37A15 15 0 0 0 13 12.34c-3.73 0-7.12 1.24-9.55 3.23-.9.73-1.82-.01-1.28-1.12m57.99 0C62.01 10.65 66.16 8 71 8c4.81 0 8.96 2.63 10.82 6.4.55 1.13-.24 2.05-1.03 1.37A15 15 0 0 0 71 12.34c-3.73 0-7.12 1.24-9.55 3.23-.9.73-1.82-.01-1.28-1.12" fill={ink} fillRule="evenodd" clipRule="evenodd" transform={transform} />
  }

  if (variant === 'hybridAvaClosed') {
    return <path d="M2.16 19.55C4.01 23.35 8.16 26 13 26c4.81 0 8.96-2.63 10.82-6.4.55-1.13-.24-2.05-1.03-1.37A15 15 0 0 1 13 21.66c-3.73 0-7.12-1.24-9.55-3.23-.91-.73-1.83.01-1.29 1.12m58 0c1.85 3.8 6 6.45 10.84 6.45 4.81 0 8.96-2.63 10.82-6.4.55-1.13-.24-2.05-1.03-1.37A15 15 0 0 1 71 21.66c-3.73 0-7.12-1.24-9.55-3.23-.9-.73-1.82.01-1.28 1.12" fill={ink} fillRule="evenodd" clipRule="evenodd" transform={transform} />
  }

  if (variant === 'hybridAvaEyeRoll') {
    return (
      <g transform={transform}>
        <g transform="translate(2)" fill="#fff">
          <circle cx="14" cy="14" r="14" />
          <circle cx="66" cy="14" r="14" />
        </g>
        <g transform="translate(10)" fill={ink} fillOpacity=".92">
          <circle cx="6" cy="6" r="6" />
          <circle cx="58" cy="6" r="6" />
        </g>
      </g>
    )
  }

  if (variant === 'hybridAvaSurprised') {
    return (
      <g transform={transform}>
        <g transform="translate(2)" fill="#fff">
          <circle cx="14" cy="14" r="14" />
          <circle cx="66" cy="14" r="14" />
        </g>
        <g transform="translate(10 8)" fill={ink} fillOpacity=".92">
          <circle cx="6" cy="6" r="6" />
          <circle cx="58" cy="6" r="6" />
        </g>
      </g>
    )
  }

  if (variant === 'hybridAvaWink') {
    return (
      <g transform={transform}>
        <g transform="translate(10 8)" fill={ink} fillOpacity=".92">
          <circle cx="6" cy="6" r="6" />
          <path d="M46.6 8.96c1.59-3.92 5.55-6.86 10.37-7.2 4.8-.33 9.12 2 11.24 5.64.63 1.09-.1 2.06-.93 1.43-2.59-1.93-6.15-3-10-2.73a15 15 0 0 0-9.33 3.9c-.84.79-1.81.11-1.35-1.03" />
        </g>
      </g>
    )
  }

  return null
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
  const customEyes = CUSTOM_EYES.has(eyes)

  const params = new URLSearchParams({
    seed: 'doc-os-metroline-player',
    backgroundColor: METROLINE_PORTRAIT_BACKGROUND,
    skinColor,
    hairColor,
    clothesColor: METROLINE_OUTFIT_COLOR,
    eyebrowsVariant: brows,
    mouthVariant: mouth,
    clothesVariant: outfit,
    beardProbability: hasFacialHair ? '100' : '0',
    eyesProbability: customEyes ? '0' : '100',
    hairProbability: hair.front ? '100' : '0',
    rearHairProbability: hair.rear ? '100' : '0',
  })

  if (!customEyes) params.set('eyesVariant', eyes)
  if (hair.front) params.set('hairVariant', hair.front)
  if (hair.rear) params.set('rearHairVariant', hair.rear)
  if (hasFacialHair) params.set('beardVariant', facialHair)

  return {
    src: `${DICEBEAR_TOON_HEAD}?${params.toString()}`,
    skinTone,
    customEyes: customEyes ? eyes : null,
  }
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const portrait = buildToonHeadPortrait(appearance)

  return (
    <div
      className={className}
      role="img"
      aria-label={`Customized Metroline employee portrait — ${portrait.skinTone} skin tone`}
      data-avatar-engine="dicebear-toon-head-docos-expanded"
      data-skin-tone={portrait.skinTone}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <img
        src={portrait.src}
        width="260"
        height="320"
        alt=""
        aria-hidden="true"
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
      />
      {portrait.customEyes && (
        <svg
          viewBox="0 0 768 768"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
          }}
        >
          <CustomEyes variant={portrait.customEyes} />
        </svg>
      )}
    </div>
  )
}

export default PlayerAvatar
