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
        headers: {"Authorization": "Bearer v^1.1#i^1#I^3#r^0#p^3#f^0#t^H4sIAAAAAAAAAOVYbWwURRju9YsULGokQKqWY/GHUvdu9vY+194l1/YaGqEtvdJADbSzu7Pt2r3dy85s24sm1pJUDILwww9+GEmIaPgBMdEEFGMMYDBiREBATTBGVNAoYn9IYqLObtvjWmPp3RHTxPuzN7Pv1/O+z7wzs2Cksmr12Jqx36tdC0r3joCRUpeLWwSqKivqFpeV1lSUgBwB196RB0bKR8uu1GOY0tJCB8JpQ8fIPZzSdCw4k1HGMnXBgFjFgg5TCAtEEpLxdWsFnwcIadMghmRojLulKcqEwzJEyI944Ac+JMl0Vp+y2WlEGYgUReQ5UQ5GRCjy9nuMLdSiYwJ1EmV8gIuwIMT6gp1cUPAHBOD3REKRbsbdhUysGjoV8QAm5oQrOLpmTqyzhwoxRiahRphYS7w52RZvaUq0dtZ7c2zFJvOQJJBYePqo0ZCRuwtqFprdDXakhaQlSQhjxhub8DDdqBCfCqaA8J1U+3wi74OAg1AUES+C25LKZsNMQTJ7HPaMKrOKIyognagkc6uM0myIjyOJTI5aqYmWJrf9WG9BTVVUZEaZREN804ZkooNxJ9vbTWNQlZFsI+V4P88FIpEQEyMI0xQis0fVB6lnw8z4Jr1NmJzM9Qx3jYYuq3bmsLvVIA2Iho5mJojPSRAVatPbzLhC7LBy5cLZRAa67cpOlNIi/bpdXJSiMbmd4a3LMMWLm0y4XcwI8j4kc5w/ElYCIgSBXGbYa71QdsTsAsXb2712LEiEGTYFzQFE0hqUECvR9FopZKoyzaXi48MKYukyV1h/RFFYMSAHWU5BCCAkilIk/L8jCSGmKloEZYky84WDNMrYiRVUqAjEGEB6ZyaNmJmSThOaZMcwjjL9hKQFr3doaMgzxHsMs8/rA4Dzbly3Nin1oxRksrLqrYVZ1aGuhKgWVgVCA4gyw5SG1Lnex8Q6Es0dieSans62RxOtUxSeFlls5uy/IE1KRhq1G5oqZeYXRN6U26FJMg1Who6TSNPooyio2Ib6X4N01vqsQG0bmBqBadVj884jGSmvAWkDs6d6nKjdcxHyilaGxiAj02MiKBu6lpm7Xp9FF+yE9tyUMK2IZ6L3UBh5epyunIdOtpsU4jCrnIcOlCTD0kkh7iZV89BQLE1RNc1uTIU4zFHPJ0wdahmiSrjwGjqbD00vVvv6Sb526Bzdsai+BAnUjHypZJMX9xvptM1CiXaMPNaKotC1Ai3J2ejzC5Zuec6hKzdae60XZIN2ClUrNG1ZK+l+Q0dFW4GybNIjc9F27BNSQSRWdbtZ4qJafTydbkmlLAJFDbXI82xj4wHHR4qGN89QNZgqpAclk51qsmyyYSMry2EpJIWCEuuHPhAU/UpRuJvQ4HzBXT5aunkKO0XIhQMRPz1qwwhLL948K4pKkA2LITHg94OQAgNF4W7UVJrT+XcMXWNgguTioNFL0/wC5fB2krYBXqK1DAQh6w8g+i9kXzBkGJ4r5BkTOdeOf1w7vdM//sRKnB836noPjLqOlLpcIARYrg48VFm2obzsDgarBHkw1GXRGPbQq4qHbr46JJaJPAMok4aqWVrpUr88J93I+ey0dzNYnv3wVFXGLcr5CgXuu/mmgrtzWTUXASFfkAv6A8DfDVbdfFvOLS1fcqEmtuXr2vGBksSuD89Wv1C768rPf4DqrJDLVVFSPuoqqRlq5qt7No2PH3z+xncrQr2Ht9Z11eFx42SN8Vzo+I7t+35gn+jzjb2x5p5Lhz89cfx46szAM8l9Z0+d3RMY6RWvN5yJmwvPL928Y/vAFvXo8LeuFztibGzJ8tN960LiYmvLL1eTq145GKva9VXn+nOj8t07T+9OnT9Q984nR9P1L3XtrB1rdO9JrqxpfOrKZ0e2/fqFtedy/PBd197+se3Jawu7e5nr50X9t/qtj3yze/UxFzPy+SG4jTz28GBDdGP1gQ/85y78eei1O8+8uR/c+/Gxno8ujnW9/1bnu/JJ3+5XT1Sxz9YsG1q+qbbj+5Wvs+z9N1aAlxeABw+eSux/WjZW9l7esfriX1d/ujRRxr8BVXv/4BAUAAA="},
    }).then(res => res.json()).then(data => {
        saveEbay(data);
    });
};



var saveEbay = function(data){
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
