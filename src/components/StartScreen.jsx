function StartScreen({ onStart }) {
  return (
    <div className="entry-screen start-screen">
      <h1>DOC OS</h1>
      <p>Dispatch Operations Center</p>
      <button type="button" className="entry-button" onClick={onStart}>
        Start Game
      </button>
    </div>
  )
}

export default StartScreen
