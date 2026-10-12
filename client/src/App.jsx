import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import MyBooks from "./pages/MyBooks.jsx";
import NewTicket from "./pages/NewTicket.jsx";
import MyTickets from "./pages/MyTickets.jsx";
import AdminQueue from "./pages/AdminQueue.jsx";
import AdminTicket from "./pages/AdminTicket.jsx";

/** Route guard: redirects anonymous users to /login and wrong-role users to their home. */
function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/books"} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  const home = user ? (user.role === "admin" ? "/admin" : "/books") : "/login";
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/books" element={<Guard role="author"><MyBooks /></Guard>} />
      <Route path="/tickets/new" element={<Guard role="author"><NewTicket /></Guard>} />
      <Route path="/tickets" element={<Guard role="author"><MyTickets /></Guard>} />
      <Route path="/admin" element={<Guard role="admin"><AdminQueue /></Guard>} />
      <Route path="/admin/tickets/:id" element={<Guard role="admin"><AdminTicket /></Guard>} />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
