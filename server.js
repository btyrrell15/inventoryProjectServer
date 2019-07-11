const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
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
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({extended: false}));


//Rest endpoints
server.get("/inventory", function(req, res){
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


fetch(`${url}`, {
    method: "GET",
    headers: {"Authorization": "Bearer v^1.1#i^1#p^3#r^0#I^3#f^0#t^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" },
}).then(res => res.json()).then(data => {
    saveEbay(data);
    console.log(data.categoryId);
    // dummy(data);
});

// var dummy = function(data) {
//     console.log(data);
// }

var saveEbay = function(data){
    console.log(data);
    inventoryModel.create({
        sku: "none",
        image: "none",
        title: data.title,
        category: data.categoryId,
        marketplace: "eBay",
        quantity: data.estimatedAvailabilities[0].estimatedAvailableQuantity,
        cost: data.price.value,
        location: data.itemLocation.postalCode,
    }).then(function(new_item){
        console.log(new_item);
    }).catch(function(error){
        console.log(error);
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
