const mongoose = require("mongoose");

const inventorySchema = mongoose.Schema({
    sku: {
        type: String,
        required: true, // We don't want a post without a title
    },
    image: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    marketplace: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    cost: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    date: {
        type: String,
        required: true,
    }
});

var model = mongoose.model("inventory", inventorySchema); // "posts" will be the name of the collection within the database
module.exports = model;
