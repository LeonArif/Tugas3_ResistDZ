import Chat from './pages/Chat'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  const pathname = window.location.pathname

  if (pathname === '/login') {
    return <Login />
  }

  if (pathname === '/chat') {
    return <Chat />
  }

  return <Register />
}

export default App
