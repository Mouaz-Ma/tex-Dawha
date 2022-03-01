const mongoose = require('mongoose');
const User = require('./users')
const Schema = mongoose.Schema;


var degreeSchema = new Schema({
    text: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model("Degree", degreeSchema);