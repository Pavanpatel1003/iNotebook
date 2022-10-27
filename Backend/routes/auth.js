const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const { findOne } = require('../models/User');
const user = require('../models/User');
const fetchuser = require('../middleware/fetchuser');

const JWT_SECRET = 'HELLO I AM PAVAN';

// ROUTE:1 Create a User Using : Post "/api/auth/createuser".No Login required
router.post('/createuser', [
    body('name', 'Enter a Valid Name').isLength({ min: 3 }),
    body('email', 'Enter a Valid Email').isEmail(),
    body('password', 'Password must be 5 Character').isLength({ min: 5 }),
], async (req, res) => {

    let sucess = false;
    // If There are errors , return bad request and the error 
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ sucess, errors: errors.array() });
    }
    console.log(req.body.name, req.body.email, req.body.password);

    try {
        // check whether the user with this emial exists already

        let user = await User.findOne({ email: req.body.email });
        console.log(user)
        if (user) {
            return res.status(400).json({ sucess, error: 'Sorry a user with this email already exists' })
        }
        // Create  new user

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: secPass,
        })

        const data = {
            user: {
                id: user.id
            }
        }
        const authtoken = jwt.sign(data, JWT_SECRET);

        sucess = true;
        res.json({ sucess, authtoken });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})


// ROUTE:2 Authenticate a User Using : Post "/api/auth/login".No Login required

router.post('/login', [
    body('email', 'Enter a Valid Email').isEmail(),
    body('password', 'Password can not be blank').exists(),
], async (req, res) => {
    let sucess = false;
    // If There are errors , return bad request and the error 
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log(email, password)

    try {
        let user = await User.findOne({ email })

        if (!user) {
            sucess = false;
            return res.status(400).json({ error: "Please try to login with orrect credentials" })

        }

        console.log(user.password, password)

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            sucess = false
            return res.status(400).json({ sucess, error: "Please try to login with orrect credentials" })
        }

        const data = {
            user: {
                id: user.id
            }
        }
        const authtoken = jwt.sign(data, JWT_SECRET,{expiresIn: 120});
        sucess = true;
        res.json({ sucess, authtoken })

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }

})

// ROUTE 3: Get loggedin user Details Using : Get "/api/auth/Getuser".Login required

router.post('/getuser', fetchuser, async (req, res) => {

    try {
        userId = req.user.id;
        const user = await User.findById(userId).select("password");
        res.send(user)
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})

module.exports = router;