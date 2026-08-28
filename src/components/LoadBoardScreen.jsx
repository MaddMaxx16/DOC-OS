function LoadBoardScreen({ onBack }) {
  return (
    <div className="load-board-screen">
      <h1>Load Board</h1>
      <p>No loads available yet.</p>
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>
    </div>
  )
}

export default LoadBoardScreen
