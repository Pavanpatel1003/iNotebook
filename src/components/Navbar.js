import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = ({ theme, onToggleTheme }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const isLoggedIn = Boolean(localStorage.getItem('token'));
    const closeMenu = () => setMenuOpen(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        closeMenu();
        navigate('/login');
    };

    return (
        <header className="site-nav">
            <nav className="nav-inner" aria-label="Main navigation">
                <Link className="brand" to="/" onClick={closeMenu}>
                    <span className="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                            <path d="M3.5 6.8c3.2-1 5.9-.4 8.5 1.5v11c-2.6-1.9-5.3-2.5-8.5-1.5v-11Zm17 0c-3.2-1-5.9-.4-8.5 1.5v11c2.6-1.9 5.3-2.5 8.5-1.5v-11Z" />
                            <path d="M6.5 10.2c1.4-.3 2.5-.1 3.7.5m7.3-.5c-1.4-.3-2.5-.1-3.7.5" />
                        </svg>
                    </span>
                    <span>iNotebook</span>
                </Link>

                <button
                    className="menu-toggle"
                    type="button"
                    aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? '×' : '☰'}
                </button>

                <div className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
                    <Link className={location.pathname === '/' ? 'active' : ''} to="/" onClick={closeMenu}>My notes</Link>
                    <Link className={location.pathname === '/about' ? 'active' : ''} to="/about" onClick={closeMenu}>About</Link>
                </div>

                <div className={`nav-actions ${menuOpen ? 'is-open' : ''}`}>
                    <button
                        className="theme-toggle"
                        type="button"
                        onClick={onToggleTheme}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        aria-pressed={theme === 'dark'}
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />
                                <path d="m16.5 4 .5 1.5 1.5.5-1.5.5-.5 1.5L16 6.5l-1.5-.5 1.5-.5.5-1.5Z" />
                            </svg>
                        )}
                        <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                    </button>
                    {isLoggedIn ? (
                        <button className="nav-logout" type="button" onClick={handleLogout}>Log out</button>
                    ) : (
                        <>
                            <Link to="/login" onClick={closeMenu}>Log in</Link>
                            <Link className="nav-primary" to="/signup" onClick={closeMenu}>Create account</Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Navbar;
