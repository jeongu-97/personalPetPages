import { Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PetProfilePage from './pages/PetProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/:slug" element={<PetProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
