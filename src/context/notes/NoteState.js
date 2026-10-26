import { useCallback, useState } from "react";
import NoteContext from "./noteContext";
import API_BASE_URL from "../../config";

const NoteState = ({ children }) => {
    const [notes, setNotes] = useState([]);

    const getNotes = useCallback(async () => {
        const response = await fetch(`${API_BASE_URL}/api/notes/fetchallnotes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Could not load your notes.');
        }
        if (!Array.isArray(data)) {
            throw new Error('The server returned an invalid notes list.');
        }
        setNotes(data);
    }, []);

    const addNote = useCallback(async (title, description, tag, dueDate, attachments) => {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('tag', tag);
        formData.append('dueDate', dueDate);
        attachments.forEach((file) => formData.append('attachments', file));

        const response = await fetch(`${API_BASE_URL}/api/notes/addnote`, {
            method: 'POST',
            headers: {
                'auth-token': localStorage.getItem('token')
            },
            body: formData
        });
        const note = await response.json();
        if (!response.ok) {
            throw new Error(note.message || note.error || 'Could not add this note.');
        }
        setNotes((currentNotes) => currentNotes.concat(note));
    }, []);

    const deleteNote = useCallback(async (id) => {
        const response = await fetch(`${API_BASE_URL}/api/notes/deletenote/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            }
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || data.error || 'Could not delete this note.');
        }
        setNotes((currentNotes) => currentNotes.filter((note) => note._id !== id));
    }, []);

    const editNote = useCallback(async (id, title, description, tag, dueDate) => {
        const response = await fetch(`${API_BASE_URL}/api/notes/updatenote/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify({ title, description, tag, dueDate })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Could not update this note.');
        }
        setNotes((currentNotes) => currentNotes.map((note) => (
            note._id === id ? { ...note, title, description, tag, dueDate } : note
        )));
    }, []);

    return (
        <NoteContext.Provider value={{ notes, addNote, deleteNote, editNote, getNotes }}>
            {children}
        </NoteContext.Provider>
    );
};

export default NoteState;
