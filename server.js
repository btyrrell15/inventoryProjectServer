const express = require("express");
const expressSession = require("express-session");
// const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const fetch = require("node-fetch");

// const Ebay = require("ebay-node-api");
// //
// let ebay = new Ebay ({
//     clientID: "GraysonE-inventor-PRD-6d8d798b5-2ccdf1c2",
//     clientSecret: "PRD-d8d798b5e316-9e67-4ff7-bf53-33bc",
//     body: {
//         grant_type: "client_credentials",
//         scope: "https://api.ebay.com/oauth/api_scope"
//     }
// });
// ebay.getAccessToken().then((data) => {
//     console.log(data);
// }, (error) => {
//     console.log(error);
// });

// let eBay = require("ebay-node-api");
// let eBay = new eBay({
//     clientID: "BrianTyr-inventor-SBX-dd8c7c76c-4a206b4f",
//     env: "SANDBOX"
// });

var url = "https://api.sandbox.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=110423302103";

var server = express();
var port = process.env.PORT || 3000;

var inventoryModel = require("./schema.js");

//middleware
// server.use(cors());
server.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", req.get("origin"));
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});
server.options("*", function(req, res, next){
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});
server.use(express.json());
server.use(express.urlencoded({extended: false}));

//passport middleware
server.use(expressSession({
    secret: "We hate Ebay",
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 3600000
    }
}));
server.use(passport.initialize());
server.use(passport.session());
passport.serializeUser(function(user, callback){
    callback(null, user.id);
});
passport.deserializeUser(function(id, callback){
    userModel.findById(id, function(error, user){
        callback(error, user);
    });
});
passport.use(new LocalStrategy(
    function(username, password, done){
        userModel.findOne({
            username: username
        }, function(error, user){
            if (error) {
                return done(error);
            }
            if (!user){
                return done(null, false);
            }
            bcrypt.compare(password, user.password, function(error, isMatch){
                if (isMatch){
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        });
    }
));

var ensureAuthentication = function(req, res, next){
    if (req.isAuthenticated()){
        next();
    } else {
        res.status(403);
        res.json({
            msg: "Please login first"
        });
    }
};

//models
var userModel = require("./models/user.js");

// //user endpoints
// server.get("/private", ensureAuthentication, function (req, res){
//     res.json ({
//         msg: 'Hello ${req.user.username}'
//     });
// });

//register
server.post("/users/register", function(req, res){
    userModel.findOne({
        username: req.body.username
    }).then(function(user){
        if (user){
            res.status(422);
            res.json({
                msg: "That username is already in use."
            });
        } else {
            bcrypt.genSalt(10, function(error, salt){
                bcrypt.hash(req.body.password, salt, function(error, hashed_password){
                    userModel.create({
                        username: req.body.username,
                        password: hashed_password
                    }).then(function(new_user){
                        res.status(201);
                        res.json({
                            user: new_user
                        });
                    }).catch(function(error){
                        res.status(400).json({msg: error.message});
                    });
                });
            });
        }
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

//login
server.post("/users/login",
    passport.authenticate("local", {failureRedirect: "users/login/error"}),
    function(req, res, next){
        res.redirect("/users/login/success");
    }
);

//login error and success
server.get("/users/login/error", function(req, res){
    res.status(403);
    res.json({
        msg: "Invalid username or password"
    });
});

server.get("/users/login/success", function(req, res){
    res.json({
        msg: `Welcome ${req.user.username}`
    });
});

//logout
server.get('/logout', function(req, res){
    req.logout();
    req.session.destroy(function(err) {
        res.send({message: 'Successfully logged out'});
    });
    // res.redirect('/');
    res.send();
});


//Rest endpoints
server.get("/inventory", ensureAuthentication, function(req, res){
    inventoryModel.find().then(function(inventory){
        res.json({
            inventory: inventory
        });
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.post("/inventory", function(req, res){
    inventoryModel.create({
        sku: req.body.sku,
        image: req.body.image,
        title: req.body.title,
        category: req.body.category,
        marketplace: req.body.marketplace,
        quantity: req.body.quantity,
        cost: req.body.cost,
        location: req.body.location,
    }).then(function(new_item){
        res.status(201);
        res.json({
            new_item: new_item
        });
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.put("/inventory/:id", function(req, res){
    inventoryModel.findById(req.params.id).then(function(inventory){
        if (inventory == null){
            res.status(404);
            res.json({
                msg: `There is no item with the ID of ${req.params.id}`
            });
        } else {
            if (req.body.sku != undefined){
                inventory.sku = req.body.sku;
            }
            if (req.body.image != undefined){
                inventory.image = req.body.image;
            }
            if (req.body.title != undefined){
                inventory.title = req.body.title;
            }
            if (req.body.category != undefined){
                inventory.category = req.body.category;
            }
            if (req.body.marketplace != undefined){
                inventory.marketplace = req.body.marketplace;
            }
            if (req.body.quantity != undefined){
                inventory.quantity = req.body.quantity;
            }
            if (req.body.cost != undefined){
                inventory.cost = req.body.cost;
            }
            if (req.body.location != undefined){
                inventory.location = req.body.location;
            }
            inventory.save().then(function(){
                res.status(200);
                res.json({
                    inventory: inventory
                });
            });
        }
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.delete("/inventory/:id", function(req, res){
    inventoryModel.findByIdAndDelete(req.params.id).then(function(){
        res.status(204).send();
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});


// fetch(`${url}`, {
//     method: "GET",
//     headers: {"Authorization": "Bearer v^1.1#i^1#I^3#r^0#p^3#f^0#t^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"},
// }).then(res => res.json()).then(data => {
//     saveEbay(data);
//     console.log(data.categoryId);
//
// });
//
//
//
// var saveEbay = function(data){
//     console.log(data);
//     var rawId = data.itemId;
//     var newId = rawId.slice(3, 15);
//     inventoryModel.create({
//         sku: newId,
//         image: "none",
//         title: data.title,
//         category: data.categoryId,
//         marketplace: "eBay",
//         quantity: data.estimatedAvailabilities[0].estimatedAvailableQuantity,
//         cost: data.price.value,
//         location: data.itemLocation.postalCode,
//     }).then(function(new_item){
//         console.log(new_item);
//     }).catch(function(error){
//         console.log(error);
//     });
// };

//start the server and connect to database
mongoose.connect("mongodb+srv://btyrrell:fakepassword@mydatabase-izpfk.mongodb.net/Test?retryWrites=true&w=majority",{
    useNewUrlParser: true
}).then(function(){
    server.listen(port, function(){
        console.log(`listening on port ${port}`);
    });
});
