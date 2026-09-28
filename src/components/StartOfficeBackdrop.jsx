import deskBackdrop from '../assets/docos-title-cubicle-p2403.png'
import legacyBackdrop from '../assets/docos-title-office.png'

function StartOfficeBackdrop({ variant = 'desk' }) {
  const officeBackdrop = variant === 'legacy' ? legacyBackdrop : deskBackdrop

  return (
    <div className="start-office-backdrop" aria-hidden="true">
      <img
        className="start-office-backdrop-image"
        src={officeBackdrop}
        alt=""
      />
      <div className="start-office-backdrop-tone" />
    </div>
  )
}

export default StartOfficeBackdrop
