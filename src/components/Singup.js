import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import getApiUrl from '../config';
import AuthPreview from './AuthPreview';

const Singup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Your passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl('/api/auth/createuser'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), email: email.trim(), password, cpassword: confirmPassword })
            });
            const data = await response.json();
            const succeeded = data.success ?? data.sucess;

            if (!response.ok || !succeeded) {
                throw new Error(data.message || data.error || 'We could not create your account.');
            }

            const token = data.authtoken || data.authToken;
            if (token) {
                localStorage.setItem('token', token);
                navigate('/', { replace: true });
            } else {
                navigate('/login', { replace: true });
            }
        } catch (requestError) {
            setError(requestError.message || 'Unable to connect. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-layout">
            <section className="auth-intro">
                <p className="eyebrow">A fresh start</p>
                <h2>Make a little space for your next big idea.</h2>
                <p>Create your account and give all those thoughts somewhere to land.</p>
                <div className="auth-benefit"><span className="benefit-check" aria-hidden="true">✓</span> Your notes stay together in one simple place</div>
                <AuthPreview />
            </section>

            <section className="auth-card" aria-labelledby="signup-heading">
                <h1 id="signup-heading">Create your account</h1>
                <p>It only takes a moment to get started.</p>
                <form onSubmit={handleSubmit}>
                    {error && <div className="error-message" role="alert">{error}</div>}
                    <div className="field">
                        <label htmlFor="signup-name">Name</label>
                        <input
                            id="signup-name"
                            type="text"
                            autoComplete="name"
                            placeholder="Your name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={80}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="signup-email">Email address</label>
                        <input
                            id="signup-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="signup-password">Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="At least 5 characters"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            minLength={5}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="signup-confirm-password">Confirm password</label>
                        <input
                            id="signup-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Enter your password again"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            minLength={5}
                            required
                        />
                    </div>
                    <button className="button button-primary" type="submit" disabled={submitting}>
                        {submitting ? 'Creating account…' : 'Create account'}
                    </button>
                </form>
                <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
            </section>
        </div>
    );
};

export default Singup;
