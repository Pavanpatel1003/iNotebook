import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import AuthPreview from './AuthPreview';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password })
            });
            const data = await response.json();
            const succeeded = data.success ?? data.sucess;
            const token = data.authtoken || data.authToken;

            if (!response.ok || !succeeded || !token) {
                throw new Error(data.message || data.error || 'Those login details could not be verified.');
            }

            localStorage.setItem('token', token);
            navigate('/', { replace: true });
        } catch (requestError) {
            setError(requestError.message || 'Unable to connect. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-layout">
            <section className="auth-intro">
                <p className="eyebrow">Welcome back</p>
                <h2>Your thoughts, right where you left them.</h2>
                <p>Sign in to keep your notes organized and ready whenever inspiration strikes.</p>
                <div className="auth-benefit"><span className="benefit-check" aria-hidden="true">✓</span> A calm place for everything on your mind</div>
                <AuthPreview />
            </section>

            <section className="auth-card" aria-labelledby="login-heading">
                <h1 id="login-heading">Log in</h1>
                <p>Enter your details to continue to iNotebook.</p>
                <form onSubmit={handleSubmit}>
                    {error && <div className="error-message" role="alert">{error}</div>}
                    <div className="field">
                        <label htmlFor="login-email">Email address</label>
                        <input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </div>
                    <button className="button button-primary" type="submit" disabled={submitting}>
                        {submitting ? 'Logging in…' : 'Log in'}
                    </button>
                </form>
                <p className="auth-switch">New to iNotebook? <Link to="/signup">Create an account</Link></p>
            </section>
        </div>
    );
};

export default Login;
