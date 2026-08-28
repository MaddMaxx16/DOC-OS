const marketLabels = {
  'new-york': 'NEW YORK',
}

function StatusBar({ selectedMarket }) {
  const marketName = marketLabels[selectedMarket] ?? selectedMarket?.toUpperCase() ?? ''

  return (
    <div className="status-bar">
      <span>9:41</span>
      <span>{marketName}</span>
      <span>DOC OS</span>
    </div>
  )
}

export default StatusBar
