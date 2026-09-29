// P2.4.4.3B.6.2A — hybrid DiceBear component audition
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
    { value: 'hybridMicahFonze', label: 'Micah · Short' },
    { value: 'hybridMicahMrT', label: 'Micah · Fade' },
    { value: 'hybridMiniClassic', label: 'Miniavs · Classic' },
    { value: 'hybridMiniCurly', label: 'Miniavs · Curly' },
    { value: 'hybridMiniStylish', label: 'Miniavs · Stylish' },
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
    { value: 'hybridAvaSquint', label: 'Avataaars · Squint' },
    { value: 'hybridAvaSide', label: 'Avataaars · Side' },
    { value: 'hybridAvaHappy', label: 'Avataaars · Happy' },
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
  hybridMicahFonze: { custom: 'micahFonze', front: null, rear: null },
  hybridMicahMrT: { custom: 'micahMrT', front: null, rear: null },
  hybridMiniClassic: { custom: 'miniClassic', front: null, rear: null },
  hybridMiniCurly: { custom: 'miniCurly', front: null, rear: null },
  hybridMiniStylish: { custom: 'miniStylish', front: null, rear: null },
  bun: { front: 'bun', rear: null },
  longStraight: { front: 'sideComed', rear: 'longStraight' },
  longWavy: { front: 'sideComed', rear: 'longWavy' },
  neckHigh: { front: 'sideComed', rear: 'neckHigh' },
  shoulderHigh: { front: 'sideComed', rear: 'shoulderHigh' },
  bald: { front: null, rear: null },
}

// Hybrid audition sources:
// - Micah by Micah Lanier, CC BY 4.0
// - Miniavs by Webpixels, CC BY 4.0
// - Avataaars by Pablo Stanley, free for personal and commercial use
// These donor components are transformed onto Toon Head's 768px canvas for fit testing.
const CUSTOM_EYES = new Set(['hybridAvaDefault', 'hybridAvaSquint', 'hybridAvaSide', 'hybridAvaHappy'])

function CustomHair({ variant, color }) {
  if (variant === 'micahFonze') {
    return (
      <g transform="translate(155 78) scale(1.58)">
        <path d="M235.18 61.4c-1.27 6.05-4.6 11.32-9.43 15.9 9.4 34.06 9.6 53.87 4.38 57.65l-14.8-49.99c-31.94 18.74-91.69 21.94-106.65 21.94q-2.32.26-4.43.67c-14.65 9-2.6 52.12 11.75 70.43l-11 2c-5.14-24.97-17.41-22.92-26.61-21.38l-.32.05c2.2 13.63 6.72 27.74 10.45 39.32q1.44 4.5 2.66 8.4c-.79.11-1.48.3-2.12.48-5.5 1.53-7.41 2.06-33.38-61.97-6.47-15.95-6.03-30.16-.97-42.62-4.78-4.8-14.37-7.14-19.71-7.78 10.44-6.12 20.58-4.87 25.54-3.1q.75-1.12 1.56-2.22c-.97-4.41-7.96-9.46-12.11-11.82 8.56-4.3 18.62-2.03 23-.2C92.62 59.13 122.02 47.05 147 41c48.82-11.83 67.5-28.5 67.5-28.5 20.68 8.5 25.62 25.22 20.68 48.9Z" fill={color} fillRule="evenodd" clipRule="evenodd" stroke="#000" strokeWidth="4" />
      </g>
    )
  }

  if (variant === 'micahMrT') {
    return (
      <g transform="translate(185 120) scale(1.7)">
        <path d="M212.99 89.17c-8-6.4-21.84-7-27.5-6.5l-8-26.5c13.6 3.2 32 24 35.5 33" fill={color} opacity=".22" />
        <path d="M110.8 23.76s5.73-3.96 29.95-10.06 33.04-3.72 33.04-3.72l11.79 72.84s-8.04-.18-28.03 4.19-29.56 9.67-29.56 9.67zM73.99 98.68c-6.8-41.6 23.33-68.17 37-75.5l17 73.5c-19.2-39.6-45.34-15.17-54 2" fill={color} />
        <path d="M92.49 142.67c-7.2-27.2 22-41.83 35.5-46-7-16.33-23-31-42.5-13-18 30.5-11 54-5.5 72z" fill={color} opacity=".22" />
      </g>
    )
  }

  if (variant === 'miniClassic') {
    return <path d="M28.96 23.2c5.62 1.86 13.4 4.45 21.54-3.7 4-4-14-21-28.5-11.5-11.33 1.68-10.69 8.47-10.19 13.71.1 1 .2 1.95.2 2.8q0 .78.2 1.2a27 27 0 0 0-.2 3.3 4 4 0 0 0 8.02 0A4 4 0 0 0 23.88 24H24a4 4 0 0 0 3.05-1.42z" fill={color} fillRule="evenodd" clipRule="evenodd" transform="translate(150 82) scale(8.5)" />
  }

  if (variant === 'miniCurly') {
    return (
      <g transform="translate(150 72) scale(8.2)" fill={color}>
        <path d="M45.97 29.48a4 4 0 0 0 1.78-4.88 4 4 0 0 0-2.97-7.41c1.42 3.67 1.32 8.22 1.19 12.3" fillRule="evenodd" clipRule="evenodd" />
        <path d="M37.5 0a6.5 6.5 0 0 1 6.01 4.03 4 4 0 0 1 3.44 4.58 7.3 7.3 0 0 1 3.05 5.9c0 4.13-3.58 7.49-8 7.49a8.3 8.3 0 0 1-5.7-2.24 5 5 0 0 1-6.36.2 7 7 0 0 1-7 1.74q-.4.43-.88.73a3.98 3.98 0 0 1-1.35 6.19q.3.37.3.88c0 .83-.65 1.5-1.5 1.5h-.02a4 4 0 0 1-7.3-3.17 4 4 0 0 1 0-5.66 4 4 0 0 1 .75-3.71 7 7 0 0 1 4.1-10.17v-.31a4 4 0 0 1 5.94-3.51 7 7 0 0 1 9.8-2.42A6.5 6.5 0 0 1 37.5 0" />
      </g>
    )
  }

  if (variant === 'miniStylish') {
    return <path d="M20.67 25.22v6.02c0 .76-.67 1.76-1.17 2.26s-2 1.5-2.85 1.5-3.54-.45-4.83-2.26c-1.28-1.8-.9-11.32 0-13.54S16 12.32 20.67 8.75a26 26 0 0 1 12.88-5.34C58.48.4 49.22 18 46 22.5c-5.5-2-9.5-2.5-16.72-1.52s-8.01 1.98-8.6 4.24" fill={color} transform="translate(150 74) scale(8.5)" />
  }

  return null
}

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

  if (variant === 'hybridAvaSquint') {
    return (
      <g transform={transform}>
        <g transform="translate(2 5)" fill="#fff">
          <ellipse cx="14" cy="7.72" rx="14" ry="7.72" />
          <ellipse cx="66" cy="7.72" rx="14" ry="7.72" />
        </g>
        <path d="M18.82 20.3a25 25 0 0 1-5.64 0 6 6 0 1 1 5.64 0m52 0a25 25 0 0 1-5.64 0 6 6 0 1 1 5.64 0" fill={ink} />
      </g>
    )
  }

  if (variant === 'hybridAvaSide') {
    return <path d="M13 8c-4.84 0-9 2.65-10.84 6.45-.54 1.1.39 1.85 1.28 1.12a15 15 0 0 1 9.8-3.22 6 6 0 1 0 10.7 2.8 2 2 0 0 0-.12-.74l-.15-.38a6 6 0 0 0-1.64-2.48C19.9 9.32 16.5 8 13 8m58 0c-4.84 0-9 2.65-10.84 6.45-.54 1.1.39 1.85 1.28 1.12a15 15 0 0 1 9.8-3.22 6 6 0 1 0 10.7 2.8 2 2 0 0 0-.12-.74l-.15-.38a6 6 0 0 0-1.64-2.48C77.9 9.32 74.5 8 71 8" fill={ink} transform={transform} />
  }

  if (variant === 'hybridAvaHappy') {
    return <path d="M2.16 14.45C4.01 10.65 8.16 8 13 8c4.81 0 8.96 2.63 10.82 6.4.55 1.13-.24 2.05-1.03 1.37A15 15 0 0 0 13 12.34c-3.73 0-7.12 1.24-9.55 3.23-.9.73-1.82-.01-1.28-1.12m57.99 0C62.01 10.65 66.16 8 71 8c4.81 0 8.96 2.63 10.82 6.4.55 1.13-.24 2.05-1.03 1.37A15 15 0 0 0 71 12.34c-3.73 0-7.12 1.24-9.55 3.23-.9.73-1.82-.01-1.28-1.12" fill={ink} fillRule="evenodd" clipRule="evenodd" transform={transform} />
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
    hairProbability: hair.custom ? '0' : (hair.front ? '100' : '0'),
    rearHairProbability: hair.custom ? '0' : (hair.rear ? '100' : '0'),
  })

  if (!customEyes) params.set('eyesVariant', eyes)
  if (hair.front) params.set('hairVariant', hair.front)
  if (hair.rear) params.set('rearHairVariant', hair.rear)
  if (hasFacialHair) params.set('beardVariant', facialHair)

  return {
    src: `${DICEBEAR_TOON_HEAD}?${params.toString()}`,
    skinTone,
    hairColor: `#${hairColor}`,
    customHair: hair.custom || null,
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
      {(portrait.customHair || portrait.customEyes) && (
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
          {portrait.customEyes && <CustomEyes variant={portrait.customEyes} />}
          {portrait.customHair && <CustomHair variant={portrait.customHair} color={portrait.hairColor} />}
        </svg>
      )}
    </div>
  )
}

export default PlayerAvatar
