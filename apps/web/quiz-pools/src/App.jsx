import './App.css'
import { useMemo, useState } from 'react'
import HomePage from './pages/HomePage.jsx'
import JoinPage from './pages/JoinPage.jsx'
import WaitingPage from './pages/WaitingPage.jsx'

function App() {
  const [route, setRoute] = useState('home')

  const page = useMemo(() => {
    switch (route) {
      case 'join':
        return <JoinPage />
      case 'waiting':
        return <WaitingPage />
      case 'home':
      default:
        return <HomePage />
    }
  }, [route])

  return (
    <>
      <header className="qp-header">
        <div className="qp-header__brand" aria-label="Quiz Pools">
          Quiz Pools
        </div>
        <nav className="qp-header__nav" aria-label="Mockup screens">
          <button
            className={route === 'home' ? 'qp-navBtn isActive' : 'qp-navBtn'}
            type="button"
            onClick={() => setRoute('home')}
          >
            Home
          </button>
          <button
            className={route === 'join' ? 'qp-navBtn isActive' : 'qp-navBtn'}
            type="button"
            onClick={() => setRoute('join')}
          >
            Join
          </button>
          <button
            className={route === 'waiting' ? 'qp-navBtn isActive' : 'qp-navBtn'}
            type="button"
            onClick={() => setRoute('waiting')}
          >
            Waiting
          </button>
        </nav>
      </header>

      <main className="qp-main">{page}</main>
    </>
  )
}

export default App
