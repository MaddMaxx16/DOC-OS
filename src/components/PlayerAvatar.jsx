// P2.4.4.3B.6.2 — DOC OS Toon Head expansion
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
    { value: 'docCrew', label: 'Crew Cut' },
    { value: 'docBuzz', label: 'Buzz Cut' },
    { value: 'docCrop', label: 'Textured Crop' },
    { value: 'docCurls', label: 'Short Curls' },
    { value: 'docFade', label: 'Classic Fade' },
    { value: 'docSlick', label: 'Slick Back' },
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
    { value: 'docFocused', label: 'Focused' },
    { value: 'docRelaxed', label: 'Relaxed' },
    { value: 'docDeepSet', label: 'Deep Set' },
    { value: 'docSoft', label: 'Soft' },
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
  docCrew: { custom: 'crew', front: null, rear: null },
  docBuzz: { custom: 'buzz', front: null, rear: null },
  docCrop: { custom: 'crop', front: null, rear: null },
  docCurls: { custom: 'curls', front: null, rear: null },
  docFade: { custom: 'fade', front: null, rear: null },
  docSlick: { custom: 'slick', front: null, rear: null },
  bun: { front: 'bun', rear: null },
  longStraight: { front: 'sideComed', rear: 'longStraight' },
  longWavy: { front: 'sideComed', rear: 'longWavy' },
  neckHigh: { front: 'sideComed', rear: 'neckHigh' },
  shoulderHigh: { front: 'sideComed', rear: 'shoulderHigh' },
  bald: { front: null, rear: null },
}

const CUSTOM_EYES = new Set(['docFocused', 'docRelaxed', 'docDeepSet', 'docSoft'])

function CustomHair({ variant, color }) {
  const common = { fill: color, stroke: '#000000', strokeWidth: 2, strokeLinejoin: 'round' }

  if (variant === 'crew') {
    return (
      <g transform="translate(158.2 0)">
        <path {...common} d="M67 318c3-99 49-177 133-199 87-23 170 16 196 103 8 27 8 62 3 96l-28 12c-2-64-19-111-55-139-28 17-66 28-112 31-43 3-80-3-111-17-15 34-22 74-22 121z" />
        <path d="M93 205c50 23 151 25 223-14" fill="none" stroke="#000000" strokeOpacity=".2" strokeWidth="16" strokeLinecap="round" />
      </g>
    )
  }

  if (variant === 'buzz') {
    return (
      <g transform="translate(158.2 0)">
        <path {...common} d="M73 306c4-106 59-184 150-194 94-11 165 50 174 151 2 19 1 39-1 58l-27 8c-2-71-22-124-60-154-26-20-55-29-88-27-71 4-115 57-122 153l-2 27-25-9z" />
        <path d="M104 190c71-51 170-49 238 4M91 226c83-45 190-42 275 5" fill="none" stroke="#000000" strokeOpacity=".16" strokeWidth="5" strokeLinecap="round" />
      </g>
    )
  }

  if (variant === 'crop') {
    return (
      <g transform="translate(158.2 0)">
        <path {...common} d="M62 323c4-89 30-151 78-187 30-23 67-34 111-34 71 0 126 32 153 94 13 30 17 71 10 122l-31 12c-2-47-11-85-27-113l-26 23-22-32-35 28-28-35-35 31-30-32-32 31-25-29-25 28-18-14c-7 28-11 63-12 105z" />
        <path d="M115 178c60-42 157-49 224 1" fill="none" stroke="#000000" strokeOpacity=".18" strokeWidth="12" strokeLinecap="round" />
      </g>
    )
  }

  if (variant === 'curls') {
    return (
      <g transform="translate(158.2 0)" {...common}>
        <path d="M65 326c1-62 12-112 34-149 27-45 70-69 129-72 66-4 118 20 149 69 25 39 34 90 26 151l-31 7c-3-60-17-101-43-124-24 22-58 33-102 34-43 1-79-9-108-31-18 30-27 69-28 118z" />
        <circle cx="119" cy="177" r="42" />
        <circle cx="166" cy="140" r="45" />
        <circle cx="219" cy="126" r="47" />
        <circle cx="273" cy="132" r="46" />
        <circle cx="326" cy="157" r="43" />
        <circle cx="365" cy="196" r="37" />
        <path d="M128 190c54 31 146 35 205 3" fill="none" stroke="#000000" strokeOpacity=".18" strokeWidth="11" strokeLinecap="round" />
      </g>
    )
  }

  if (variant === 'fade') {
    return (
      <g transform="translate(158.2 0)">
        <path {...common} d="M74 322c0-78 17-136 50-175 35-42 84-62 147-58 69 5 118 39 139 101 11 32 12 74 4 127l-31 12c-2-68-18-117-48-148-42 28-102 42-180 39-30-1-54-5-72-12-7 31-10 69-9 114z" />
        <path d="M83 208c55 18 174 21 252-27" fill="none" stroke="#000000" strokeOpacity=".22" strokeWidth="18" strokeLinecap="round" />
        <path d="M78 250c37 12 62 15 86 15M373 239c-23 14-45 20-68 23" fill="none" stroke="#000000" strokeOpacity=".16" strokeWidth="12" strokeLinecap="round" />
      </g>
    )
  }

  if (variant === 'slick') {
    return (
      <g transform="translate(158.2 0)">
        <path {...common} d="M68 325c0-83 18-146 55-188 37-43 91-62 161-55 62 6 107 35 135 86-55-25-111-25-168 0 54 1 101 15 141 43-77-20-146-10-207 29-32 20-64 31-96 33-7 16-11 35-13 57z" />
        <path d="M122 183c74-60 173-71 249-24M112 218c79-47 168-54 244-21" fill="none" stroke="#000000" strokeOpacity=".18" strokeWidth="10" strokeLinecap="round" />
      </g>
    )
  }

  return null
}

function CustomEyes({ variant }) {
  const ink = '#4b2422'
  const white = '#f6f1e4'

  if (variant === 'docFocused') {
    return (
      <g transform="translate(253 367)">
        <path d="M9 39c20-27 64-34 87-4-15 31-65 36-87 4Z" fill={white} />
        <circle cx="60" cy="38" r="21" fill={ink} />
        <path d="M9 39c24-25 62-29 87-4M165 35c25-25 63-21 87 4" fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" />
        <path d="M165 35c23-30 67-23 87 4-22 32-72 27-87-4Z" fill={white} />
        <circle cx="201" cy="38" r="21" fill={ink} />
      </g>
    )
  }

  if (variant === 'docRelaxed') {
    return (
      <g transform="translate(253 367)" fill="none" stroke={ink} strokeWidth="12" strokeLinecap="round">
        <path d="M12 39c24 18 58 18 82-2" />
        <path d="M167 37c24 20 58 20 82 2" />
      </g>
    )
  }

  if (variant === 'docDeepSet') {
    return (
      <g transform="translate(253 367)">
        <path d="M14 35c18-18 56-24 79 1-17 25-60 28-79-1ZM168 36c23-25 61-19 79-1-19 29-62 26-79 1Z" fill={white} />
        <circle cx="58" cy="38" r="17" fill={ink} />
        <circle cx="203" cy="38" r="17" fill={ink} />
        <path d="M17 23c22-13 50-14 73-2M171 21c23-12 51-11 73 2" fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round" />
      </g>
    )
  }

  if (variant === 'docSoft') {
    return (
      <g transform="translate(253 367)">
        <path d="M11 37c20-24 61-28 84 0-19 27-65 30-84 0ZM166 37c23-28 64-24 84 0-19 30-65 27-84 0Z" fill={white} />
        <circle cx="59" cy="39" r="19" fill={ink} />
        <circle cx="202" cy="39" r="19" fill={ink} />
        <circle cx="52" cy="32" r="5" fill={white} />
        <circle cx="195" cy="32" r="5" fill={white} />
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
