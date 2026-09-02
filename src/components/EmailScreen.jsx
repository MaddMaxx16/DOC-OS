function EmailScreen({ messages, carriers, onOpenMessage, onBack }) {
  return <div className="phone-page"><div className="screen-header"><button type="button" onClick={onBack}>‹</button><h2>EMAIL</h2></div><p>Inbox</p>{messages.length === 0 && <p>No messages.</p>}{messages.map((message) => { const carrier = carriers.find((item) => item.id === message.carrierId); return <button type="button" className={`document-card ${message.read ? '' : 'unread'}`} key={message.id} onClick={() => onOpenMessage(message)}><strong>{carrier?.name || message.carrierId}</strong><span>{message.subject}</span><small>{message.read ? '' : 'Unread'}</small></button> })}</div>
}
export default EmailScreen
