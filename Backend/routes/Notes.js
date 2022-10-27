const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Note = require('../models/Note');
const { body, validationResult } = require('express-validator');


// ROUTE:1 Get All the Notes using : GET "/api/notes/createuser".No Login required
router.get('/fetchallnotes', fetchuser, async (req, res) => {
    try {
        const notes = await Note.find({ user: req.user.id });
        res.json(notes);

    } catch (error) {

        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})

// ROUTE 2 :  Add a New  Notes using : POST "/api/notes/addnote".No Login required
router.post('/addnote', fetchuser, [
    body('title', 'Enter a Valid title').isLength({ min: 3 }),
    body('description', 'Description must be 5 Character').isLength({ min: 5 }),
], async (req, res) => {

    try {

        const { title, description, tag } = req.body

        // If There are errors , return bad request and the error 
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const note = new Note({
            title, description, tag, user: req.user.id
        })
        const savedNote = await note.save()

        res.json(savedNote);

    } catch (error) {

        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

})

// ROUTE:3 Update an existing Note Using : Post "/api/notes/updatenote".No Login required

router.post('/updatenote/:id', fetchuser, async (req, res) => {

    const { title, description, tag } = req.body;

    try {
        // Create a newNote object
        const newNote = {};
        if (title) { newNote.title = title };
        if (description) { newNote.description = description };
        if (tag) { newNote.tag = tag };

        //Find the note to be updated and updated it
        let note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).send(" Not Found");
        }

        if (note.user.toString() !== req.user.id) {
            return res.status(401).send("not allowed")
        }

        note = await Note.findByIdAndUpdate(req.params.id, { $set: newNote }, { new: true })
        res.json({ note });

    } catch (error) {

        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})

// ROUTE:4 delet  an existing Note Using : delet "/api/notes/Deletnote".No Login required

router.delete('/deletenote/:id', fetchuser, async (req, res) => {

    // const { title, description, tag } = req.body;

    try {
        //Find the note to be delet and deleted it

        let note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).send(" Not Found");
        }

        // allow deletion only if user owns this note
        if (note.user.toString() !== req.user.id) {
            return res.status(401).send("Not allowed")
        }

        note = await Note.findByIdAndDelete(req.params.id)
        res.json({ "sucess": "Note has been deleted", note: note });

    } catch (error) {

        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})

module.exports = router;