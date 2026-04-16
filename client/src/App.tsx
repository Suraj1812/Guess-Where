import { Navigate, Route, Routes } from "react-router-dom";
import JoinPage from "./pages/JoinPage";
import GameRoomPage from "./pages/GameRoomPage";

const App = () => (
  <Routes>
    <Route path="/" element={<JoinPage />} />
    <Route path="/game/:roomId" element={<GameRoomPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
