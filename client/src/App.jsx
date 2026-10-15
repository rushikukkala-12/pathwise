import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { GuestRoute, FullScreenLoader } from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateTrip = lazy(() => import('./pages/CreateTrip'));
const Trips = lazy(() => import('./pages/Trips'));
const TripDetails = lazy(() => import('./pages/TripDetails'));
const Explore = lazy(() => import('./pages/Explore'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminTrips = lazy(() => import('./pages/admin/AdminTrips'));
const AdminPlaces = lazy(() => import('./pages/admin/AdminPlaces'));
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<Profile />} />
          <Route element={<ProtectedRoute roles={['user']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-trip" element={<CreateTrip />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/trips/:id" element={<TripDetails />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/expenses" element={<Expenses />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/trips" element={<AdminTrips />} />
            <Route path="/admin/places" element={<AdminPlaces />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
