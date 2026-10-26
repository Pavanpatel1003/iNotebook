import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import noteContext from '../context/notes/noteContext';
import AddNote from './AddNote';
import Noteitem from './Noteitem';

const Notes = () => {
    const { notes, getNotes, editNote, deleteNote } = useContext(noteContext);
    const navigate = useNavigate();
    const editButtonRef = useRef(null);
    const closeButtonRef = useRef(null);
    const [note, setNote] = useState({ id: '', title: '', description: '', tag: '', dueDate: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            navigate('/login', { replace: true });
            return;
        }

        getNotes()
            .catch((requestError) => setError(requestError.message))
            .finally(() => setLoading(false));
    }, [getNotes, navigate]);

    const updateNote = useCallback((currentNote) => {
        setError('');
        setNote({
            id: currentNote._id,
            title: currentNote.title || '',
            description: currentNote.description || '',
            tag: currentNote.tag || '',
            dueDate: currentNote.dueDate || ''
        });
        editButtonRef.current?.click();
    }, []);

    const handleChange = (event) => {
        setNote((currentNote) => ({ ...currentNote, [event.target.name]: event.target.value }));
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        setSavingEdit(true);
        setError('');
        try {
            await editNote(note.id, note.title, note.description, note.tag, note.dueDate);
            closeButtonRef.current?.click();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = async (id) => {
        setError('');
        try {
            await deleteNote(id);
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const availableTags = useMemo(() => (
        [...new Set(notes.map((currentNote) => currentNote.tag?.trim()).filter(Boolean))]
            .sort((first, second) => first.localeCompare(second))
    ), [notes]);

    const matchingNotes = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase();
        const filtered = notes.filter((currentNote) => {
            const matchesTag = !selectedTag || currentNote.tag === selectedTag;
            const searchableText = [
                currentNote.title,
                currentNote.description,
                currentNote.tag,
                currentNote.dueDate,
                ...(currentNote.attachments || []).map((attachment) => attachment.name)
            ].join(' ').toLocaleLowerCase();
            return matchesTag && (!query || searchableText.includes(query));
        });

        return filtered.sort((first, second) => {
            if (sortOrder === 'title') {
                return (first.title || '').localeCompare(second.title || '');
            }
            if (sortOrder === 'dueDate') {
                if (!first.dueDate) return 1;
                if (!second.dueDate) return -1;
                return first.dueDate.localeCompare(second.dueDate);
            }
            if (sortOrder === 'oldest') {
                return new Date(first.createdAt || 0) - new Date(second.createdAt || 0);
            }
            return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
        });
    }, [notes, searchQuery, selectedTag, sortOrder]);

    const attachedNoteCount = useMemo(
        () => notes.filter((currentNote) => currentNote.attachments?.length > 0).length,
        [notes]
    );

    return (
        <>
            <section className="notes-hero" aria-labelledby="workspace-heading">
                <div className="notes-hero-copy">
                    <p className="eyebrow">Your personal workspace</p>
                    <h1 id="workspace-heading">A little space for everything on your mind.</h1>
                    <p>Keep your ideas, plans, and important details together—ready whenever you need them.</p>
                </div>
                <div className="workspace-summary" aria-label="Notebook summary">
                    <div className="summary-item">
                        <span className="summary-icon summary-icon-notes" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M7 4.5h10a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" /><path d="M5 7H3.5v11A1.5 1.5 0 0 0 5 19.5h14M9 9h6m-6 3h6" /></svg>
                        </span>
                        <span className="summary-value">{notes.length}</span>
                        <span className="summary-label">Total notes</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-icon summary-icon-tags" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="m20 13-7 7-10-10V3h7l10 10Z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>
                        </span>
                        <span className="summary-value">{availableTags.length}</span>
                        <span className="summary-label">Tags used</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-icon summary-icon-files" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3v7h7m-11 4h6m-6 3h6" /></svg>
                        </span>
                        <span className="summary-value">{attachedNoteCount}</span>
                        <span className="summary-label">With files</span>
                    </div>
                </div>
            </section>

            <AddNote />

            <button
                type="button"
                ref={editButtonRef}
                className="d-none"
                data-bs-toggle="modal"
                data-bs-target="#editNoteModal"
                aria-hidden="true"
                tabIndex="-1"
            >
                Edit note
            </button>

            <div className="modal fade" id="editNoteModal" tabIndex="-1" aria-labelledby="editNoteModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <form onSubmit={handleUpdate}>
                            <div className="modal-header">
                                <div>
                                    <p className="eyebrow">Your notebook</p>
                                    <h2 className="modal-title fs-5" id="editNoteModalLabel">Edit note</h2>
                                </div>
                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div className="modal-body">
                                {error && <div className="error-message" role="alert">{error}</div>}
                                <div className="field">
                                    <label htmlFor="edit-title">Title</label>
                                    <input id="edit-title" name="title" value={note.title} onChange={handleChange} minLength={5} maxLength={100} required />
                                </div>
                                <div className="field">
                                    <label htmlFor="edit-description">Description</label>
                                    <textarea id="edit-description" name="description" value={note.description} onChange={handleChange} minLength={5} maxLength={2000} required />
                                </div>
                                <div className="field">
                                    <label htmlFor="edit-tag">Tag <span className="text-muted">(optional)</span></label>
                                    <input id="edit-tag" name="tag" value={note.tag} onChange={handleChange} maxLength={40} />
                                </div>
                                <div className="field">
                                    <label htmlFor="edit-due-date">Due date <span className="text-muted">(optional)</span></label>
                                    <input id="edit-due-date" name="dueDate" type="date" value={note.dueDate} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="button button-secondary" data-bs-dismiss="modal" ref={closeButtonRef}>Cancel</button>
                                <button type="submit" className="button button-primary" disabled={savingEdit || note.title.trim().length < 5 || note.description.trim().length < 5}>
                                    {savingEdit ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <section className="notes-section" aria-labelledby="notes-heading">
                <div className="notes-heading">
                    <div>
                        <p className="eyebrow">Your collection</p>
                        <h2 id="notes-heading">All notes <span className="notes-total">{notes.length}</span></h2>
                        <p>Find the right thought and pick up where you left off.</p>
                    </div>
                </div>

                {error && <div className="error-message status-message" role="alert">{error}</div>}
                {loading ? (
                    <div className="status-message" role="status">Loading your notes…</div>
                ) : notes.length === 0 ? (
                    <div className="empty-state notes-empty">
                        <span className="empty-state-icon" aria-hidden="true">✦</span>
                        <h3>Your notebook is ready</h3>
                        <p>Add your first thought above and it will be waiting for you here.</p>
                    </div>
                ) : (
                    <>
                        <div className="notes-toolbar">
                            <label className="notes-search" htmlFor="notes-search-input">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4 4" /></svg>
                                <input
                                    id="notes-search-input"
                                    type="search"
                                    placeholder="Search notes, tags, or files..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                />
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">×</button>
                                )}
                            </label>
                            <label className="notes-select-wrap">
                                <span className="visually-hidden">Filter by tag</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 13-7 7-10-10V3h7l10 10Z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>
                                <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)} aria-label="Filter by tag">
                                    <option value="">All tags</option>
                                    {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                                </select>
                            </label>
                            <label className="notes-select-wrap notes-sort-select">
                                <span className="visually-hidden">Sort notes</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10m-7 5h4" /></svg>
                                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort notes">
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                    <option value="title">Title A–Z</option>
                                    <option value="dueDate">Due date</option>
                                </select>
                            </label>
                        </div>
                        <div className="notes-results-summary" aria-live="polite">
                            Showing <strong>{matchingNotes.length}</strong> of <strong>{notes.length}</strong> {notes.length === 1 ? 'note' : 'notes'}
                            {(searchQuery || selectedTag) && (
                                <button type="button" onClick={() => { setSearchQuery(''); setSelectedTag(''); }}>
                                    Clear filters
                                </button>
                            )}
                        </div>
                        {matchingNotes.length === 0 ? (
                            <div className="empty-state notes-empty notes-no-results">
                                <span className="empty-state-icon" aria-hidden="true">⌕</span>
                                <h3>No notes found</h3>
                                <p>Try a different search or clear your filters to see all notes.</p>
                                <button className="button button-secondary" type="button" onClick={() => { setSearchQuery(''); setSelectedTag(''); }}>
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="notes-grid">
                                {matchingNotes.map((currentNote) => (
                                    <Noteitem
                                        key={currentNote._id}
                                        note={currentNote}
                                        updateNote={updateNote}
                                        deleteNote={handleDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </>
    );
};

export default Notes;
