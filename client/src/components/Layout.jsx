import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Icon from "./Icon.jsx";

const initials = (name) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === "admin";
  const links = isAdmin
    ? [["/admin", "Ticket queue", "list"]]
    : [["/books", "My books", "book"], ["/tickets/new", "Raise a query", "plus"], ["/tickets", "My tickets", "chat"]];

  const signOut = () => { logout(); navigate("/login"); };

  return (
    <div className="shell">
      <a href="#main" className="skip">Skip to content</a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">B</span>
            <span>BookLeaf<small>{isAdmin ? "Operations" : "Author support"}</small></span>
          </Link>
          <nav className="nav" aria-label="Main">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? "active" : "")}>{label}</NavLink>
            ))}
          </nav>
          <div className="user">
            <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
            <span className="user-name">{user.name}</span>
            <button className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="logout" /></button>
          </div>
        </div>
      </header>

      <main id="main" className="page">{children}</main>

      {links.length > 1 && (
        <nav className="bottom-nav" aria-label="Main (mobile)">
          {links.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon name={icon} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
