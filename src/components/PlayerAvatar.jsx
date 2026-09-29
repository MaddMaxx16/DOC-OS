import { useEffect, useMemo, useState } from 'react'

// P2.4.4.3B.6.3A.1 — Notion Avatar Maker renderer hotfix
// Source artwork: Mayandev/notion-avatar. Repository: MIT. Avatar assets: CC0.
// The upstream editor composes the individual SVGs into one SVG and explicitly
// fills the face white. Loading each source SVG as a separate <img> loses that
// inherited face fill and turns the head into a black silhouette.

const NOTION_ASSET_BASE =
  'https://raw.githubusercontent.com/Mayandev/notion-avatar/main/public/avatar/preview'

const NOTION_SVG_FILTER = `<defs>
  <filter id="notion-avatar-outline" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="linearRGB">
    <feMorphology operator="dilate" radius="20 20" in="SourceAlpha" result="morphology"/>
    <feFlood flood-color="#ffffff" flood-opacity="1" result="flood"/>
    <feComposite in="flood" in2="morphology" operator="in" result="composite"/>
    <feMerge result="merge">
      <feMergeNode in="composite" result="mergeNode"/>
      <feMergeNode in="SourceGraphic" result="mergeNode1"/>
    </feMerge>
  </filter>
</defs>`

const NOTION_ASSET_CACHE = new Map()

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

function loadNotionAsset(assetKey, index) {
  const url = `${NOTION_ASSET_BASE}/${assetKey}/${index}.svg`

  if (!NOTION_ASSET_CACHE.has(url)) {
    NOTION_ASSET_CACHE.set(
      url,
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(`Unable to load Notion avatar asset: ${url}`)
        return response.text()
      }),
    )
  }

  return NOTION_ASSET_CACHE.get(url)
}

function stripOuterSvg(svg) {
  return svg
    .replace(/^\s*<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
}

function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, className = '' }) {
  const [previewSvg, setPreviewSvg] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)

  const selection = useMemo(
    () =>
      NOTION_LAYER_ORDER.map(([appearanceKey, assetKey]) => ({
        appearanceKey,
        assetKey,
        index: safeIndex(appearanceKey, appearance[appearanceKey]),
      })),
    [appearance],
  )

  const selectionKey = selection
    .map(({ appearanceKey, index }) => `${appearanceKey}:${index}`)
    .join('|')

  useEffect(() => {
    let cancelled = false
    setLoadFailed(false)

    Promise.all(
      selection.map(async ({ appearanceKey, assetKey, index }) => {
        const rawSvg = await loadNotionAsset(assetKey, index)
        const faceFill = appearanceKey === 'face' ? ' fill="#ffffff"' : ''
        return `<g id="docos-notion-${assetKey}"${faceFill}>${stripOuterSvg(rawSvg)}</g>`
      }),
    )
      .then((groups) => {
        if (cancelled) return

        setPreviewSvg(
          `<svg viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${NOTION_SVG_FILTER}
            <g id="docos-notion-avatar" filter="url(#notion-avatar-outline)">
              ${groups.join('\n')}
            </g>
          </svg>`,
        )
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [selectionKey])

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
      {previewSvg && !loadFailed ? (
        <div
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: previewSvg }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
            color: '#60758a',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textAlign: 'center',
          }}
        >
          {loadFailed ? 'PORTRAIT UNAVAILABLE' : 'LOADING PORTRAIT'}
        </div>
      )}
    </div>
  )
}

export default PlayerAvatar
