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
        headers: {"Authorization": "Bearer v^1.1#i^1#I^3#r^0#p^3#f^0#t^H4sIAAAAAAAAAOVYaWwUVRzv9iINFoxyqClxO5ogwuzOzM7u7IzsSs/QUNrSLRQbSXk786YdmJ3ZzHvTdqvR2g/wQQ7xSJXYSECIAaJBTKB4JCRIYsTjgwYCITEhNF6gEBH5APhmerCtsXS3xDRxk83uvPlfv///9/7vYHoKi57ctHzT9WLPjNxdPUxPrsfDzmSKCgsWz8rLfaQgh0kT8Ozqebwnvzfvx6UIJPSk1AhR0jQQ9HYldANJ7mCEsi1DMgHSkGSABEQSlqVY2cpaifMxUtIysSmbOuWtqYxQMgxw8aDCcyEeQEbgyagxYrPJjFBxWYEC+YbDcSEksgJ5j5ANawyEgYEjFMewIs0INCc0MZzE8hIX9oU4roXyroEW0kyDiPgYKuqGK7m6VlqsE4cKEIIWJkaoaE1Zday+rKayqq5pqT/NVnQ4DzEMsI3GPlWYCvSuAboNJ3aDXGkpZssyRIjyR4c8jDUqlY0Ek0X4bqqBHAqInBqAISgzXJC7J6msNq0EwBPH4YxoCq26ohI0sIZTd8soyUZ8A5Tx8FMdMVFT6XV+VtlA11QNWhGqqrzsmdWxqkbKG2tosMwOTYGKg5QN8AE2KIoCFcUQkRRCq1UzOohn00pxw96GTA7nepy7CtNQNCdzyFtn4nJIQofjE8SkJYgI1Rv1VpmKnbDS5fiRRLJii1PZoVLauN1wigsTJCav+3j3Mozw4g4T7hUzwoog8CwD2bAo8EGRTWeGM9ezZUfUKVBZQ4PfiQXGQYpOAGsjxEkdyJCWSXrtBLQ0RQoEVS4QViGthESV5kVVpUlTCNGsCiEDYTwui+H/HUkwtrS4jeEoUca/cJFGKCexkgZUCZsbodGUSkJqvKTbhIbZ0YUiVDvGScnv7+zs9HUGfKbV5ucYhvWvXVkbk9thAlCjstrdhWnNpa4MiRbSJEwCiFBdhIbEudFGRRurqhurYstbm+pXVNWNUHhMZNHxo/+CNCabSdhg6pqcml4QA5bSACycKrdT5DkGdZ38TAkqcqD+1yDduT4hUMcGIkZAUvM5vPPJZsJvAtLAnKFWN2rvZIT8cTtFYlCg5bMgUExDT01er80mE3ZIe3JKiFTEN9R7CIwMPY5VzkBntJtk43BUOQMdIMumbeBs3A2rZqCh2rqq6brTmLJxmKaeSZgG0FNYk1H2NXQXH5JepLW140ztkDGyYhF9GWCgm5lSySEvajeTSYeFMukYGcwVVSVzBdiyu9BnFixZ8txNV3q0zlzPygbpFJqebdpGrSTbTQNO2QpQFItsmadsx9khZUVizXCaJZpSqy9LJmsSCRuDuA5rlGm2sAUYNiBOGd40Q1VuaYBslCx6pMnSsfK1tKKEZUEWQjLNA44JxXl1SrgrYcd0wZ3fm7tuBDtByIaDIk+22kCkeRgI0PG4GqLJ+Toe5HlGUEFwSrgrdI3kdPptQ5ebCENlatDIoWl6gXJ5O0zbYEAmtQyGAM0HIfknOAcMBYQnC3ncQNqx4x/HTv/Yy59ojvthez2fMr2egVyPhxEYml3MLCrMW52fdx+FNAx9CBhK3OzykaOKjyy+BsC2BX0bYSoJNCu30KOd/U7+K+3aadc65qHRi6eiPHZm2i0UU3LnTQE7e34xKzICJzAcy3PhFuaxO2/z2Xn5c77yvHhWu7JKX9rTSteW/Cntf/fLuUzxqJDHU5CT3+vJKT+6k9m77UZt8MKBSmvr3MMDO7fcDMx+tKP56s0FF1/Ye+nVX6Mf8wP7avMHNgwu7Fr3xhdXZiysfa1U7j3QY6wvnVPZvWLZibdXlHg3P5Gq20Sh4O3zl16pu3X/U4cP5Zx+57lrrR/8cWbf81vFJf5TfcfmdxsbQHH/W1dOrvz54i/hkq7+yxXNl3/6sGL3S+ePLGs60dd3Wj/Zf/zKuffRcc576ODgvGOLdnw/6+pg6cltRd3hy/6Dt6+9DpfQB2MtT38Co7fO9m3vPlp1Y//uH7TUey/v2bBVeuHCKeHN/s9/G3zwjBmbde6jwevrH/js9+rq5i3iwwvW7Nke2TG/9JvCI8/eav52f+Hm218vWj9Uxr8BJ6D2kRAUAAA="},
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
