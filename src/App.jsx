import './App.css'
import HomeScreen from './components/HomeScreen.jsx'
import StatusBar from './components/StatusBar.jsx'

function App() {
  return (
    <main className="app">
      <section className="phone-shell">
        <StatusBar />
        <HomeScreen />
      </section>
    </main>
  )
}

export default App
