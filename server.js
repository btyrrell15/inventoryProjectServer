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
var url = "https://api.sandbox.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=110422859570";
//var url = "https://api.sandbox.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=110423305716";

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


fetch(`${url}`, {
    method: "GET",
    headers: {"Authorization": "Bearer v^1.1#i^1#I^3#r^0#p^3#f^0#t^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"},
}).then(res => res.json()).then(data => {
    saveEbay(data);
    console.log(data.categoryId);

});



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
