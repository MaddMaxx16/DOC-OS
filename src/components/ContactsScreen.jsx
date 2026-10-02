function ContactsScreen({ drivers = [], carriers = [], onOpenThread }) {
  return (
    <div className="phone-page contacts-screen">
      <header className="device-home-header docos-ui-header">
        <span className="docos-ui-kicker">YOUR PEOPLE</span>
        <h1>Contacts</h1>
        <p>Your driver roster.</p>
      </header>
      {drivers.length === 0 ? <p>No driver contacts yet.</p> : (
        <div className="contacts-list">
          {drivers.map((driver) => {
            const name = driver.fullName || driver.name || 'Driver'
            const carrier = carriers.find((item) => item.id === driver.carrierId)
            return (
              <button type="button" className="contact-row" key={driver.id} onClick={() => onOpenThread?.(driver.id)} aria-label={`Message ${name}`}>
                <span className="driver-thread-avatar">{name.charAt(0).toUpperCase()}</span>
                <span><strong>{name}</strong><small>{carrier?.name || 'Driver'}</small></span>
                <span aria-hidden="true">›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ContactsScreen
