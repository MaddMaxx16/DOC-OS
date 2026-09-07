function DispatchAgreementScreen({ carrier, onAccept, onBack }) {
  const fee = carrier?.dispatchAgreement?.percentage ?? 8
  return (
    <div className="phone-page dispatch-agreement-screen">
      <header className="agreement-toolbar"><button type="button" onClick={onBack} aria-label="Back to email">‹</button><div><span>ATTACHMENT</span><strong>Dispatch Service Agreement</strong></div></header>
      <div className="agreement-scroll">
        <article className="agreement-document">
          <div className="agreement-document-heading"><span>DISPATCH SERVICE AGREEMENT</span><h2>{carrier?.name || 'Metroline Transport'}</h2><p>Independent dispatch services · New York market</p></div>
          <section><h3>1. Services</h3><p>Dispatcher may source freight, coordinate appointments, communicate with brokers, plan trips, maintain load records, and support day-to-day driver operations for the carrier.</p></section>
          <section><h3>2. Dispatch compensation</h3><div className="agreement-key-term"><span>DISPATCH FEE</span><strong>{fee}%</strong><small>of carrier gross for completed dispatched loads</small></div><p>Payment is due within 1 day of invoice according to the account payment terms.</p></section>
          <section><h3>3. Carrier responsibilities</h3><p>Carrier maintains operating authority, insurance, equipment, driver compliance, and final authority over accepted freight and driver operations.</p></section>
          <section><h3>4. Dispatcher responsibilities</h3><p>Dispatcher will act within carrier authorization, communicate material load information, maintain operational records, and use reasonable care when coordinating freight.</p></section>
          <section><h3>5. Authorization</h3><p>Carrier authorizes the dispatcher to communicate with brokers and facilities for dispatch-related activity. The dispatcher does not take ownership of freight or equipment.</p></section>
          <section><h3>6. Ending the relationship</h3><p>Either party may end dispatch services with written notice. Fees already earned on completed loads remain due.</p></section>
          <section className="agreement-signature"><span>ACCEPTANCE</span><p>By accepting, DOC OS records this agreement as active for the carrier account.</p></section>
        </article>
      </div>
      <div className="agreement-action-bar"><button type="button" className="docos-primary-action" onClick={onAccept}>ACCEPT AGREEMENT</button></div>
    </div>
  )
}
export default DispatchAgreementScreen
