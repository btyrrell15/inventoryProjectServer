const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

var server = express();
var port = process.env.PORT || 3000;

//middleware
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({extended: false}));



//start the server and connect to database
server.listen(port, function(){
    console.log(`listening on port ${port}`);
});
