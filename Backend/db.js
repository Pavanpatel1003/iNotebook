const mongoose = require('mongoose');

const connectToMongo = ()=>{
    mongoose.connect(mangoURI,()=>{
        console.log("connected to Mongoo successfully")
    })
}

const mangoURI = "mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass&ssl=false";

module.exports = connectToMongo;