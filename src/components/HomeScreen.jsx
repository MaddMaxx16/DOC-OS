function HomeScreen({ onOpenBrowser }) {
  return (
    <div className="home-screen">
      <h1>DOC OS</h1>

      <button type="button" className="app-icon" onClick={onOpenBrowser}>
        <div className="app-icon-square">WEB</div>
        <span>Browser</span>
      </button>
    </div>
  )
}

export default HomeScreen
