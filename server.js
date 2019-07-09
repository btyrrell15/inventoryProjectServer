const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

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



//start the server and connect to database
mongoose.connect("mongodb+srv://btyrrell:fakepassword@mydatabase-izpfk.mongodb.net/Test?retryWrites=true&w=majority",{
    useNewUrlParser: true
}).then(function(){
    server.listen(port, function(){
        console.log(`listening on port ${port}`);
    });
});
