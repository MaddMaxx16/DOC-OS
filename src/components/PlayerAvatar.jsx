// P2.4.4.3B.6.3A — Notion Avatar Maker renderer audition
// Source artwork: Mayandev/notion-avatar. Repository: MIT. Avatar assets: CC0.
// This audition intentionally keeps the locked DOC OS onboarding shell unchanged
// while replacing only the employee-photo renderer and its compatible controls.

const NOTION_ASSET_BASE =
  'https://raw.githubusercontent.com/Mayandev/notion-avatar/main/public/avatar/preview'

function numberedOptions(count, prefix, { noneAtZero = false } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    value: String(index),
    label: noneAtZero && index === 0 ? 'None' : `${prefix} ${String(index + 1).padStart(2, '0')}`,
  }))
}

export const APPEARANCE_OPTIONS = {
  face: numberedOptions(16, 'Face'),
  hair: numberedOptions(59, 'Hair', { noneAtZero: true }),
  brows: numberedOptions(16, 'Brows'),
  eyes: numberedOptions(14, 'Eyes'),
  nose: numberedOptions(14, 'Nose'),
  mouth: numberedOptions(20, 'Mouth'),
  facialHair: numberedOptions(17, 'Beard', { noneAtZero: true }),
  glasses: numberedOptions(15, 'Glasses', { noneAtZero: true }),
  details: numberedOptions(14, 'Detail', { noneAtZero: true }),
  accessories: numberedOptions(15, 'Accessory', { noneAtZero: true }),
}

export const APPEARANCE_CATEGORIES = [
  { key: 'face', label: 'Face' },
  { key: 'hair', label: 'Hair' },
  { key: 'brows', label: 'Brows' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'nose', label: 'Nose' },
  { key: 'mouth', label: 'Mouth' },
  { key: 'facialHair', label: 'Facial Hair' },
  { key: 'glasses', label: 'Glasses' },
  { key: 'details', label: 'Details' },
  { key: 'accessories', label: 'Accessories' },
]

export const DEFAULT_APPEARANCE = {
  face: '0',
  hair: '12',
  brows: '0',
  eyes: '0',
  nose: '0',
  mouth: '0',
  facialHair: '0',
  glasses: '0',
  details: '0',
  accessories: '0',
}

const NOTION_LAYER_ORDER = [
  ['face', 'face'],
  ['nose', 'nose'],
  ['mouth', 'mouth'],
  ['eyes', 'eyes'],
  ['brows', 'eyebrows'],
  ['glasses', 'glasses'],
  ['hair', 'hair'],
  ['accessories', 'accessories'],
  ['details', 'details'],
  ['facialHair', 'beard'],
]

function safeIndex(group, value) {
  const options = APPEARANCE_OPTIONS[group]
  return options.some((option) => option.value === String(value))
    ? String(value)
    : DEFAULT_APPEARANCE[group]
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  return (
    <div
      className={className}
      role="img"
      aria-label="Customized Metroline employee portrait — Notion Avatar Maker audition"
      data-avatar-engine="notion-avatar-maker-audition"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#f7f5ef',
      }}
    >
      {NOTION_LAYER_ORDER.map(([appearanceKey, assetKey]) => {
        const index = safeIndex(appearanceKey, appearance[appearanceKey])
        return (
          <img
            key={appearanceKey}
            src={`${NOTION_ASSET_BASE}/${assetKey}/${index}.svg`}
            alt=""
            aria-hidden="true"
            draggable="false"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
        )
      })}
    </div>
  )
}

export default PlayerAvatar
