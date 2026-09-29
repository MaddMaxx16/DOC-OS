import { PLAYER_SKIN_ASSETS } from '../assets/playerSkinAssets.js'

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

export const APPEARANCE_CATEGORIES = [
  { key: 'skinTone', label: 'Skin' },
  { key: 'face', label: 'Face' },
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair Color' },
  { key: 'brows', label: 'Brows' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'eyeColor', label: 'Eye Color' },
  { key: 'nose', label: 'Nose' },
  { key: 'mouth', label: 'Mouth' },
  { key: 'facialHair', label: 'Facial Hair' },
  { key: 'glasses', label: 'Glasses' },
  { key: 'outfit', label: 'Outfit' },
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

// P2.4.4.3B.4C — authored skin portrait asset system.
// Skin tone selection now swaps finished portrait assets. No runtime pixel recoloring.
const MASTER_PORTRAIT = 'data:image/webp;base64,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'
const PLAYER_PORTRAITS = {
  ...PLAYER_SKIN_ASSETS,
  warm: MASTER_PORTRAIT,
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '', onDebug }) {
  const skinTone = PLAYER_PORTRAITS[appearance.skinTone]
    ? appearance.skinTone
    : DEFAULT_APPEARANCE.skinTone
  const portraitSrc = PLAYER_PORTRAITS[skinTone] || MASTER_PORTRAIT

  return (
    <img
      className={className}
      src={portraitSrc}
      width="260"
      height="320"
      role="img"
      alt=""
      aria-label={`Customized Metroline employee portrait — ${skinTone} skin tone`}
      data-skin-tone={skinTone}
      onLoad={(event) => onDebug?.({
        stage: 'asset-ready',
        skinTone,
        mode: skinTone === 'warm' ? 'approved-master' : 'authored-portrait',
        naturalSize: `${event.currentTarget.naturalWidth}x${event.currentTarget.naturalHeight}`,
      })}
      onError={() => onDebug?.({
        stage: 'asset-error',
        skinTone,
        mode: skinTone === 'warm' ? 'approved-master' : 'authored-portrait',
      })}
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
    />
  )
}

export default PlayerAvatar
