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

//var url = "https://api.sandbox.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=110423302103";
//var url = "https://api.sandbox.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=110422859570";
//var url = "https://api.sandbox.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=110423305716";
var url = "https://api.sandbox.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=";

var server = express();
var port = process.env.PORT || 3000;

var inventoryModel = require("./schema.js");
var orderModel = require("./orderSchema.js");

//middleware
// server.use(cors());
server.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", req.get("origin"));
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});
server.options("*", function(req, res, next){
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "DELETE, PUT, OPTIONS");
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
            msg: "Please, login first"
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
    passport.authenticate("local", {failureRedirect: "/users/login/error"}),
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
    // req.session.destroy(function(err) {
    //     res.clearCookie("connect.sid");
    //     res.send({message: 'Successful log out'});
    // });
    // res.redirect('/');
    res.send();
});


//Rest endpoints
server.get("/users/:id", function(req, res){
    userModel.findById(req.params.id).then(function(user){
        if(user == null) {
            res.status(404);
            res.json({
                msg: `There is no user with the ID of ${req.params.id}`
            });
        } else {
            res.json({
                user: user
            })
        }
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.get("/inventory", ensureAuthentication, function(req, res){
    inventoryModel.find().then(function(inventory){
        res.json({
            inventory: inventory,
            user_id: req.user._id,
            user_name: req.user.username,
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
        date: req.body.date
    }).then(function(new_item){
        res.status(201);
        res.json({
            new_item: new_item
        });
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.put("/inventory/:id", ensureAuthentication, function(req, res){
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

server.delete("/inventory/:id", ensureAuthentication, function(req, res){
    inventoryModel.findByIdAndDelete(req.params.id).then(function(){
        res.status(204).send();
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.get("/order", ensureAuthentication, function(req, res){
    orderModel.find().then(function(order){
        res.json({
            order: order
        });
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.post("/order", ensureAuthentication, function(req, res){
    orderModel.create({
        customer: req.body.customer,
        sku: req.body.sku,
        title: req.body.title,
        category: req.body.category,
        marketplace: req.body.marketplace,
        quantity: req.body.quantity,
        price: req.body.price,
        location: req.body.location,
        status: req.body.status,
    }).then(function(new_order){
        res.status(201);
        res.json({
            new_order: new_order
        });
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.put("/order/:id", function(req, res){
    orderModel.findById(req.params.id).then(function(order){
        if (order == null){
            res.status(404);
            res.json({
                msg: `There is no order with the ID of ${req.params.id}`
            });
        } else {
            if (req.body.customer != undefined){
                order.customer = req.body.customer;
            }
            if (req.body.sku != undefined){
                order.sku = req.body.sku;
            }
            if (req.body.title != undefined){
                order.title = req.body.title;
            }
            if (req.body.category != undefined){
                order.category = req.body.category;
            }
            if (req.body.marketplace != undefined){
                order.marketplace = req.body.marketplace;
            }
            if (req.body.quantity != undefined){
                order.quantity = req.body.quantity;
            }
            if (req.body.price != undefined){
                order.price = req.body.price;
            }
            if (req.body.location != undefined){
                order.location = req.body.location;
            }
            if (req.body.status != undefined){
                order.status = req.body.status;
            }
            order.save().then(function(){
                res.status(200);
                res.json({
                    order: order
                });
            });
        }
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.delete("/order/:id", function(req, res){
    orderModel.findByIdAndDelete(req.params.id).then(function(){
        res.status(204).send();
    }).catch(function(error){
        res.status(400).json({msg: error.message});
    });
});

server.post("/ebay", ensureAuthentication, function(req, res){
    var sku = req.body.sku;
    var ebayUrl = `${url + sku}`
    console.log("ebay endpoint url", ebayUrl);
    fetchEbay(ebayUrl);
    res.send();
});


var fetchEbay = function(ebayUrl) {
    fetch(`${ebayUrl}`, {
        method: "GET",
        headers: {"Authorization": "Bearer v^1.1#i^1#p^3#r^0#I^3#f^0#t^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"},
    }).then(res => res.json()).then(data => {
        saveEbay(data);
        console.log(data.categoryId);
    });
};



var saveEbay = function(data){
    console.log(data);
    var rawId = data.itemId;
    var newId = rawId.slice(3, 15);
    var itemExists = "";
    inventoryModel.findOne({sku: newId}).then(function(item){
        //itemExists = item.sku
        //console.log("this is the item logged", itemExists);
        if (item == null) {
            console.log(data.title);
            console.log(data.estimatedAvailabilities[0].estimatedAvailableQuantity)
            inventoryModel.create({
                sku: newId,
                image: "none",
                title: data.title,
                category: data.categoryId,
                marketplace: "eBay",
                quantity: data.estimatedAvailabilities[0].estimatedAvailableQuantity,
                cost: data.price.value,
                location: data.itemLocation.postalCode,
                date: new Date(),
            }).then(function(new_item){
                console.log(new_item);
            }).catch(function(error){
                console.log(error);
            });
        } else {
            console.log("Item already exists", item.sku);
        }
    });
};

//start the server and connect to database
mongoose.connect("mongodb+srv://btyrrell:fakepassword@mydatabase-izpfk.mongodb.net/Test?retryWrites=true&w=majority",{
    useNewUrlParser: true
}).then(function(){
    server.listen(port, function(){
        console.log(`listening on port ${port}`);
    });
});
