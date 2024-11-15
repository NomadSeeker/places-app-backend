const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const placeSchema = new Schema({
    title: {type: String, require: true},
    description: {type: String, require: true},
    image: {type: String, require: true},
    address: {type: String, require: true},
    location: {
        lat: {type: Number, require: true},
        lng: {type: Number, require: true}
    },
    //this is a reference to the user model
    //This is the relation that states that a place belongs to 1 user
    //ref is used to tell mongoose to which model this field is related to
    creator: {type: mongoose.Types.ObjectId, require: true, ref: 'User'}
});

module.exports = mongoose.model('Place', placeSchema);