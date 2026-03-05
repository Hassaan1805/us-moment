import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import JoinPage from './pages/JoinPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/join/:roomId" element={<JoinPage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
    </Routes>
  );
}
