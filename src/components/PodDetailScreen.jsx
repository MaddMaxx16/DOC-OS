import { formatCompactDate, formatTime } from '../utils/gameTime.js'

function PodDetailScreen({ load, driver, delivery, onBack }) {
  const received = Math.round(load.pod.receivedGameMinute); const day = Math.floor(received / 1440); const minute = received % 1440
  return <div className="phone-page pod-detail-screen"><header><button type="button" onClick={onBack}>‹</button><strong>PROOF OF DELIVERY</strong></header><h2>{load.id}</h2><p>Driver<br /><strong>{driver?.name || 'Unknown'}</strong></p><p>Receiver<br /><strong>{delivery?.name || 'Unknown'}</strong></p><p>Delivered<br /><strong>{formatCompactDate(day)} • {formatTime(minute)}</strong></p><p>Pieces<br /><strong>{load.pod.piecesReceived} / {load.pod.piecesExpected}</strong></p><p>Damage<br /><strong>{load.pod.damage}</strong></p><p>Signed By<br /><strong>{load.pod.signedBy}</strong></p><div className="pod-status">POD STATUS<br /><strong>COMPLETE</strong></div></div>
}
export default PodDetailScreen
