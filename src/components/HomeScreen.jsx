function HomeScreen({ onOpenLoadBoard }) {
  return (
    <div className="home-screen">
      <h1>DOC OS</h1>

      <button type="button" className="app-icon" onClick={onOpenLoadBoard}>
        <div className="app-icon-square">LB</div>
        <span>Load Board</span>
      </button>
    </div>
  )
}

export default HomeScreen
