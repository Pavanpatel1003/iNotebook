import React from 'react';

const AuthPreview = () => (
    <div className="auth-preview" aria-hidden="true">
        <span className="preview-orb preview-orb-one"></span>
        <span className="preview-orb preview-orb-two"></span>
        <div className="preview-note">
            <div className="preview-note-top">
                <span className="preview-note-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M5 4.5h10l4 4v11H5z" />
                        <path d="M14.5 4.5v4h4m-10 4h6m-6 3h6" />
                    </svg>
                </span>
                <span className="preview-dots">•••</span>
            </div>
            <span className="preview-line preview-line-title"></span>
            <span className="preview-line preview-line-long"></span>
            <span className="preview-line preview-line-short"></span>
            <span className="preview-chip">A little inspiration</span>
        </div>
        <div className="preview-float preview-float-top">
            <span className="preview-check">✓</span>
            Saved for later
        </div>
        <div className="preview-float preview-float-bottom">
            <span className="preview-sparkle">✦</span>
            Your next big idea
        </div>
    </div>
);

export default AuthPreview;
