import deskBackdrop from '../assets/docos-title-cubicle-p2403.png'

function StartOfficeBackdrop() {
  return (
    <div className="start-office-backdrop" aria-hidden="true">
      <img
        className="start-office-backdrop-image"
        src={deskBackdrop}
        alt=""
      />
      <div className="start-office-backdrop-tone" />
    </div>
  )
}

export default StartOfficeBackdrop
