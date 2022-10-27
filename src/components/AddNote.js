import { useState } from 'react';
import noteContext from '../context/notes/noteContext';
import React, { useContext } from 'react';

const AddNote = () => {

    const context = useContext(noteContext);
    const { addNote } = context;

    const [note, setNote] = useState({ title: "", description: "", tag: "" })

    const handleClick = (e) => {
        e.preventDefault();
        addNote(note.title, note.description, note.tag);
        setNote({ title: "", description: "", tag: "" })
    }

    const onChange = (e) => {
        setNote({ ...note, [e.target.name]: e.target.value })
    }

    return (
        <div className="container my-3">
            <h2>Add a Note</h2>
            <form className='my-3'>
                <div className="form-group my-3">
                    <label htmlFor="title">Title</label>
                    <input type="text" className="form-control" id="title" name="title" aria-describedby="emailHelp" placeholder="title" onChange={onChange} minLength={5} required value={note.title} />
                </div>
                <div className="form-group my-3">
                    <label htmlFor="description">Description</label>
                    <input type="text" className="form-control" id="description" name="description" placeholder="description" onChange={onChange} minLength={5} required value={note.description} />
                </div>
                <div className="form-group my-3">
                    <label htmlFor="tag">Tag</label>
                    <input type="text" className="form-control" id="tag" name="tag" placeholder="tag" onChange={onChange} minLength={5} required value={note.tag} />
                </div>

                <button type="submit" className="btn btn-primary" onClick={handleClick} disabled={note.title.length < 5 || note.description.length < 5}>Add Note</button>
            </form>
        </div>
    )
}

export default AddNote;