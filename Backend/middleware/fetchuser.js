var jwt = require('jsonwebtoken');
const JWT_SECRET = 'HELLO I AM PAVAN';


const fetchuser = (req, res, next) => {

    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ error: "Please authenticate using a valid token" });
    }
    try {
        const data = jwt.verify(token, JWT_SECRET)
        req.user = data.user;   
        console.log('USER:',JSON.stringify(data.user));
        next();
    } catch (error) {
        res.status(401).send({ error: "Please authenticate using a valid token" });

    }

}

module.exports = fetchuser;