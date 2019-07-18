const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
    customer: {
        type: String,
        required: true, // We don't want a post without a title
    },
    sku: {
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
    price: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
});

var models = mongoose.model("orders", orderSchema); // "posts" will be the name of the collection within the database
module.exports = models;
