import officeBackdrop from '../assets/docos-title-office.png'

function StartOfficeBackdrop() {
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
