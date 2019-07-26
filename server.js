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

var ebaySkus = [];

setInterval(function(){
    ebaySkus = [];
    var ebayUrl = "";
    inventoryModel.find().then(function(inventory){
        for(var item in inventory) {
            if(inventory[item].marketplace == "eBay") {
                ebaySkus.push(inventory[item].sku);
                console.log(ebaySkus);
            } else {
                console.log("Not Ebay");
            }
        };
        for(var sku in ebaySkus) {
            ebayUrl = `${url + ebaySkus[sku]}`;
            fetchEbay(ebayUrl);
        };
    });
}, 5000);

var fetchEbay = function(ebayUrl) {
    fetch(`${ebayUrl}`, {
        method: "GET",
        headers: {"Authorization": "Bearer v^1.1#i^1#f^0#r^0#I^3#p^3#t^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"},
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

            if (data.estimatedAvailabilities[0].estimatedAvailableQuantity != undefined){
                item.quantity = data.estimatedAvailabilities[0].estimatedAvailableQuantity;
            }
            item.save().then(function(){
                console.log("It worked!");
            });
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
