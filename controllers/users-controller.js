
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');


const getAllUsers = async (req, res, next) => {
    //the -password is used to exclude the password field from the response
    //another way is to put all the fields you want to include in the response
    let users;

    try {
        users = await User.find({}, '-password');0
    }catch(err) {
        return next(new HttpError('Fetching users failed, please try again later.', 500));
    }

    res.json({users: users.map(user => user.toObject({getters: true}))});
};

const createUser = async (req, res, next) => {
    const errors = validationResult(req);
    let existingUser;
    const {name, email, password} = req.body;
    let newUser;
    let token;

    if(!errors.isEmpty()){
        return next(new HttpError('Invalid inputs passed, please check your data.', 422));
    }

    try {
        existingUser = await User.findOne({email: email});
    }catch(err) {
        console.log(err);
       return next(new HttpError('Signing up failed, please try again later. '+err, 500));
    }

    if(existingUser) {
        const error = new HttpError('User exists already, please login instead.', 422);
        return next(error);
    }
    
    let hasedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    }catch(err) {
        return next(new HttpError('Could not create user, please try again.', 500));
    }

    newUser = new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places: []

    });

    try {
        await newUser.save();
    }catch(err) {
        return next(new HttpError('Signing up failed, please try again later. Error: '+err, 500));
    }

    try {
        token = jwt.sign({userId: newUser.id, email: newUser.email}, 'secret_dont_share', {expiresIn: '1h'});
    }catch(err) {
        return next(new HttpError('Signing up failed, please try again later. Error: '+err, 500));
    }

    res.status(201).json({userId: createdUser.id, email: newUser.email, token: token});
    // res.status(201).json({user: newUser.toObject({getters: true})});
};

const loginUser = async (req, res, next) => {
    const {email, password} = req.body;
    let existingUser;
    let isValidPassword = false;
    let token;
    try {
        existingUser = await User.findOne({email: email});
    }catch(err) {
       return next(new HttpError('Logging in failed, please try again later.', 500));
    }

    if(!existingUser) {
        const error = new HttpError('Invalid credentials, could not log you in.', 403);
        return next(error);
    }

    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    }catch(err) {
        return next(new HttpError('Could not log you in, please check your credentials and try again.', 500));
    }

    if(!isValidPassword)
        return next(new HttpError('Invalid credentials, could not log you in.', 401));

    try {
        token = jwt.sign({userId: existingUser.id, email: existingUser.email}, 'secret_dont_share', {expiresIn: '1h'});
    }catch(err) {
        return next(new HttpError('Logging in failed, please try again later.', 500));
    }
    res.status(200).json({userId: existingUser.id, email: existingUser.email, token: token});
    // res.json({message: 'User logged in', user: existingUser.toObject({getters: true})});
};

exports.getAllUsers = getAllUsers;
exports.createUser = createUser;
exports.loginUser = loginUser;