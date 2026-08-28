function DriverSelectionScreen({ drivers, onSelectDriver, onBack }) {
  return (
    <div className="driver-selection-screen">
      <h1>Assign Driver</h1>
      {drivers.filter((driver) => driver.status === 'available').map((driver) => (
        <button type="button" className="driver-card" key={driver.id} onClick={() => onSelectDriver(driver.id)}>
          <span>{driver.name}</span>
          <small>Available</small>
        </button>
      ))}
      <button type="button" className="back-button" onClick={onBack}>Back</button>
    </div>
  )
}

export default DriverSelectionScreen
