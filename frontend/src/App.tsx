import Chat from './pages/Chat'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  const pathname = window.location.pathname

  if (pathname === '/login') {
    return <Login />
  }

  if (pathname === '/register') {
    return <Register />
  }

  if (pathname === '/chat') {
    return <Chat />
  }

  window.location.replace('/login')
  return null
}

export default App