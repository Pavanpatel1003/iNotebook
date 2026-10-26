import React from 'react';
import { Link } from 'react-router-dom';

const About = () => (
    <>
        <section className="about-hero">
            <p className="eyebrow">A notebook for everyday life</p>
            <h1>Less juggling. More thinking.</h1>
            <p>iNotebook gives your ideas, reminders, and little moments a simple place to live. Add a note, find it later, and keep moving.</p>
            <Link className="button button-primary mt-4" to="/">Go to my notes</Link>
        </section>

        <section className="feature-grid" aria-label="iNotebook features">
            <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">01</div>
                <h2>Capture quickly</h2>
                <p>Write down a thought while it is fresh, with a title, details, and an optional tag.</p>
            </article>
            <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">02</div>
                <h2>Keep it organized</h2>
                <p>Add an optional due date and keep each idea easy to scan in your notebook.</p>
            </article>
            <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">03</div>
                <h2>Bring your files</h2>
                <p>Attach images, PDFs, and videos to add useful context to your notes.</p>
            </article>
            <article className="feature-card">
                <div className="feature-icon" aria-hidden="true">04</div>
                <h2>Make changes anytime</h2>
                <p>Update a note when plans change, or remove it when you no longer need it.</p>
            </article>
        </section>
    </>
);

export default About;
