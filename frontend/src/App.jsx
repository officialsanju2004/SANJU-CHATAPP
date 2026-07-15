import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Chat from './pages/Chat.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { CallProvider } from './context/CallContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <SocketProvider>
                <CallProvider>
                  <Chat />
                </CallProvider>
              </SocketProvider>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
