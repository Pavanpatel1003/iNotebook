import React, { useState } from 'react';
import NoteAttachment from './NoteAttachment';

const Noteitem = ({ note, updateNote, deleteNote }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const dueDate = note.dueDate
        ? new Date(`${note.dueDate}T12:00:00`).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : '';

    return (
        <article className="note-card">
            <div>
                <h3>{note.title}</h3>
                <p className={!isExpanded && note.description.length > 220 ? 'note-description is-clamped' : 'note-description'}>
                    {note.description}
                </p>
                {note.description.length > 220 && (
                    <button className="note-read-more" type="button" onClick={() => setIsExpanded((expanded) => !expanded)}>
                        {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                )}
                {note.tag && <span className="note-tag">{note.tag}</span>}
                {dueDate && <p className="note-due-date"><span aria-hidden="true">◷</span> Due {dueDate}</p>}
                {note.attachments?.length > 0 && (
                    <ul className="note-attachments" aria-label="Note attachments">
                        {note.attachments.map((attachment) => (
                            <NoteAttachment key={attachment.id} attachment={attachment} />
                        ))}
                    </ul>
                )}
            </div>
            <div className="note-actions">
                <button type="button" onClick={() => updateNote(note)} aria-label={`Edit ${note.title}`}>Edit</button>
                <button
                    type="button"
                    className="delete-action"
                    onClick={() => deleteNote(note._id)}
                    aria-label={`Delete ${note.title}`}
                >
                    Delete
                </button>
            </div>
        </article>
    );
};

export default Noteitem;
