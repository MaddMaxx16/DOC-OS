import { formatCompactDate, formatTime } from '../utils/gameTime.js'
function EmailDetailScreen({ message, carrier, onReview, onBack }) {
  if (!message) return <div className="phone-page"><p>Message unavailable.</p><button type="button" onClick={onBack}>BACK</button></div>
  return <div className="phone-page"><div className="screen-header"><button type="button" onClick={onBack}>‹</button><h2>{carrier?.name?.toUpperCase()}</h2></div><h3>{message.subject}</h3><p>Received: {formatCompactDate(Math.floor(message.receivedGameMinute / 1440))} • {formatTime(message.receivedGameMinute % 1440)}</p><p>We reviewed your application and would like to move forward with dispatch services.</p><h3>PROPOSED AGREEMENT</h3><p>Dispatch Fee<br />8%</p><p>Payment Terms<br />1 Day</p><p>Equipment<br />53' Dry Van</p><p>Service Area<br />Northeast</p><button type="button" onClick={onReview}>REVIEW AGREEMENT</button></div>
}
export default EmailDetailScreen
