import { Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import DraftProfilePage from './pages/DraftProfilePage';
import HomePage from './pages/HomePage';
import MyProfilesPage from './pages/MyProfilesPage';
import NotFoundPage from './pages/NotFoundPage';
import PetProfilePage from './pages/PetProfilePage';
import ProfileSurveyPage from './pages/ProfileSurveyPage';
import UserEditPage from './pages/UserEditPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/start" element={<ProfileSurveyPage />} />
      <Route path="/draft/:draftId" element={<DraftProfilePage />} />
      <Route path="/my-profiles" element={<MyProfilesPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/edit/:slug" element={<UserEditPage />} />
      <Route path="/:slug" element={<PetProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
