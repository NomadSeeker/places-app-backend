const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const fs = require('fs');

const HttpError = require('../models/http-error');
const Place = require('../models/place');
const User = require('../models/user');
const getCoordsForAddress = require('../util/location');

const getPlaceById = async (req, res, next) => {

    const placeId = req.params.pid;
    let place;

    try{
        place = await Place.findById(placeId);
    }catch(err) {
        return next(new HttpError('Something went wrong, could not find a place.', 500));
    }

    if(!place) {
        return next(new HttpError('Could not find a place for the provided id.', 404));
    }

    //the .toObject() method is used to convert the mongoose object to a normal js object
    //the getters: true option is used to convert the _id to id
    res.json({place: place.toObject({getters: true})});
};

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let places; 

    try {
        places = await Place.find({creator: userId});
    }catch(err) {
        return next(new HttpError('Fetching places failed, please try again later. Error: '+err, 500));
    }

    if(!places || places.length === 0) {
       return next(new HttpError('Could not find a place for the provided user.', 404));
    }

    res.json({places: places.map(p => p.toObject({getters: true}))});
};

const createPlace = async (req, res, next) => {

    //this validationResult function validates the req based on the checks in the routes file
   const errors = validationResult(req);

    if(!errors.isEmpty()) {
       return next(new HttpError('Invalid inputs passed, please check your data.', 422));
    }

    const {title, description,address} = req.body;
    let coordinates;
    try {
        coordinates = await getCoordsForAddress(address);
    }catch(err) {
        return next(err);
    }

    let user;
   

    const createdPlace = new Place({
        title,
        description,
        location: coordinates,
        image: req.file.path,
        address,
        creator: req.userData.userId,
    });

    try {
        user = await User.findById(req.userData.userId);
    }catch(err) {
        return next(new HttpError('Finding user failed, please try again.', 500));
    }

    if(!user) {
        return next(new HttpError('Could not find user for provided id.', 404));
    }

    try {
        //startSession() is used to start a session which allows the creation of a transaction
        //a transaction is a set of operations that are executed as a single unit
        //if one operation fails, the whole transaction fails and the database is returned to its previous state
        //this is used to ensure that the database is in a consistent state and all changes are rolled back if an error occurs
        //the session is passed to the save method to ensure that the transaction is used
        //the session.commitTransaction() is used to commit the transaction and save the changes

        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess});
        user.places.push(createdPlace);
        await user.save({ session: sess});
        await sess.commitTransaction();
    }catch(err) {
        return next(new HttpError('Creating place failed, please try again. '+err, 500));
    }

    res.status(201).json({place: createdPlace});
};

const updatePlace = async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        next(new HttpError('Invalid inputs passed, please check your data.', 422));
    }

    const placeId = req.params.pid;
    const {title, description} = req.body;

    let place;
    try{
        place = await Place.findById(placeId);
    }catch(err) {
        return next(new HttpError('Something went wrong, could not update place.', 500));
    }

    //this extra validation is used to check if the user is the creator of the place, if not, they are not allowed to edit it
    //the req.userData.userId is the id of the user that is stored in the token
    //the .toString() is used to convert the creator id since it is a mongoose object id
    if(place.creator.toString() !== req.userData.userId)
        return next(new HttpError('You are not allowed to edit this place.', 401));


    place.title = title;
    place.description = description;

    try{
        await place.save();
    }catch(err) {
        return next(new HttpError('Something went wrong, could not update place.', 500));
    }
      
    res.status(200).json({place: place.toObject({getters: true})});
};

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;
    let place;

    try{
        //.populate() is used to get the user object instead of just the id
        //populate allows to access the fields of the related model stored in a different collection and work with them
        //this populate is allowed because of the ref in the place and user models
        place = await Place.findById(placeId).populate('creator');

    }catch(err){
        return next(new HttpError('Something went wrong, could not delete place.', 500));
    }

    if(!place){
        return next(new HttpError('Could not find place for this id.', 404));
    }

    if(place.creator.id !== req.userData.userId)
        return next(new HttpError('You are not allowed to delete this place.', 401));
    
    const imagePath = place.image;

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.deleteOne({session: sess});
        //.pull() is used to remove the id of the place from the user's places array
        place.creator.places.pull(place);
        await place.creator.save({session: sess});
        await sess.commitTransaction();
    }catch(err) {
        return next(new HttpError('Something went wrong, could not delete place. '+err, 500));
    }

    fs.unlink(imagePath, err => {
        console.log(err);
    });

    res.status(200).json({message: 'Deleted place.'});
};


exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;