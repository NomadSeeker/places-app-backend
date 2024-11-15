const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {type: String, require: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true, minlength: 6},
    image: {type: String, required: true}, 
    //this is a reference to the place model
    //the [] is used to tell mongoose that this field will be an array of object ids
    //since a user can have multiple places
    places: [{type: mongoose.Types.ObjectId, default: [], required: true, ref: 'Place'}]
});

//this plugin will add validation to the schema
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);