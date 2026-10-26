import React, { useContext, useRef, useState } from 'react';
import noteContext from '../context/notes/noteContext';

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 200 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 200 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/webm'
]);

const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AddNote = () => {
    const { addNote } = useContext(noteContext);
    const [note, setNote] = useState({ title: '', description: '', tag: '', dueDate: '' });
    const [attachments, setAttachments] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const attachmentInputRef = useRef(null);

    const handleChange = (event) => {
        setNote((currentNote) => ({ ...currentNote, [event.target.name]: event.target.value }));
    };

    const handleAttachmentChange = (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        event.target.value = '';
        setError('');

        if (attachments.length + selectedFiles.length > MAX_ATTACHMENTS) {
            setError(`Attach up to ${MAX_ATTACHMENTS} files to one note.`);
            return;
        }
        const totalSize = attachments.concat(selectedFiles).reduce((total, file) => total + file.size, 0);
        if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
            setError('Attachments must total 45 MB or less.');
            return;
        }
        const invalidType = selectedFiles.find((file) => !ALLOWED_FILE_TYPES.has(file.type));
        if (invalidType) {
            setError(`${invalidType.name} is not a supported file type.`);
            return;
        }
        const oversizedFile = selectedFiles.find((file) => file.size > MAX_ATTACHMENT_SIZE);
        if (oversizedFile) {
            setError(`${oversizedFile.name} is larger than the 200 MB per-file limit.`);
            return;
        }
        setAttachments((currentFiles) => currentFiles.concat(selectedFiles));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSaving(true);
        try {
            await addNote(note.title.trim(), note.description.trim(), note.tag.trim(), note.dueDate, attachments);
            setNote({ title: '', description: '', tag: '', dueDate: '' });
            setAttachments([]);
            setIsExpanded(false);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={`panel note-form-panel ${isExpanded ? 'is-expanded' : 'is-collapsed'}`} aria-labelledby="add-note-heading">
            <div className="panel-heading note-form-heading">
                <div>
                    <h2 id="add-note-heading">Quick capture</h2>
                    <p>Save a thought now, organize it later.</p>
                </div>
                <button
                    type="button"
                    className={`button ${isExpanded ? 'button-secondary' : 'button-primary'} note-form-toggle`}
                    onClick={() => {
                        setIsExpanded((expanded) => !expanded);
                        setError('');
                    }}
                    aria-expanded={isExpanded}
                    aria-controls="add-note-form"
                >
                    <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                    {isExpanded ? 'Close' : 'New note'}
                </button>
            </div>
            {isExpanded && <form id="add-note-form" onSubmit={handleSubmit}>
                {error && <div className="error-message" role="alert">{error}</div>}
                <div className="form-grid">
                    <div className="field">
                        <label htmlFor="note-title">Title</label>
                        <input
                            id="note-title"
                            name="title"
                            type="text"
                            placeholder="e.g. Weekend plans"
                            value={note.title}
                            onChange={handleChange}
                            minLength={5}
                            maxLength={100}
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="note-tag">Tag <span className="text-muted">(optional)</span></label>
                        <input
                            id="note-tag"
                            name="tag"
                            type="text"
                            placeholder="e.g. Personal"
                            value={note.tag}
                            onChange={handleChange}
                            maxLength={40}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="note-due-date">Due date <span className="text-muted">(optional)</span></label>
                        <input
                            id="note-due-date"
                            name="dueDate"
                            type="date"
                            value={note.dueDate}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="field field-full">
                        <label htmlFor="note-description">Description</label>
                        <textarea
                            id="note-description"
                            name="description"
                            placeholder="Write down what you want to remember…"
                            value={note.description}
                            onChange={handleChange}
                            minLength={5}
                            maxLength={2000}
                            required
                        />
                    </div>
                    <div className="field field-full">
                        <span className="field-label">Attachments <span className="text-muted">(optional)</span></span>
                        <button
                            className="attachment-picker"
                            type="button"
                            onClick={() => attachmentInputRef.current?.click()}
                            aria-describedby="attachment-hint"
                        >
                            <span className="attachment-picker-icon" aria-hidden="true">＋</span>
                            <span className="attachment-picker-copy">
                                <strong>Add images, PDFs or videos</strong>
                                <span id="attachment-hint">Up to 5 files · 200 MB per file and 200 MB total · JPG, PNG, GIF, WebP, PDF, MP4 or WebM</span>
                            </span>
                            <span className="attachment-picker-action">Browse files</span>
                        </button>
                        <input
                            ref={attachmentInputRef}
                            className="visually-hidden"
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm"
                            multiple
                            onChange={handleAttachmentChange}
                            tabIndex={-1}
                        />
                        {attachments.length > 0 && (
                            <ul className="selected-attachments" aria-label="Selected attachments">
                                {attachments.map((file, index) => (
                                    <li key={`${file.name}-${file.size}-${index}`} className="selected-attachment">
                                        <span className="selected-attachment-icon" aria-hidden="true">
                                            {file.type.startsWith('image/') ? '▧' : file.type.startsWith('video/') ? '▶' : 'PDF'}
                                        </span>
                                        <span className="selected-attachment-name" title={file.name}>{file.name}</span>
                                        <span className="selected-attachment-size">{formatFileSize(file.size)}</span>
                                        <button
                                            className="remove-attachment"
                                            type="button"
                                            aria-label={`Remove ${file.name}`}
                                            onClick={() => setAttachments((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index))}
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={saving || note.title.trim().length < 5 || note.description.trim().length < 5}
                >
                    {saving ? 'Adding…' : 'Add note'}
                </button>
            </form>}
        </section>
    );
};

export default AddNote;
