const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');

dotenv.config();
const app = express();

//this body parser middleware will parse the body of incoming requests
//it is placed before the routes so that the routes can use the parsed body
app.use(bodyParser.json());

app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
});

app.use('/api/places', placesRoutes);

app.use('/api/users', usersRoutes);

app.use((req, res, next) => {
    const error = new HttpError('Could not find this route.', 404);
    throw error;
});

//because of having error as parameter, express recognizes this as an error handling middleware
//so it will execute if any middleware before it has an error
app.use((error, req, res, next) => {
    if(req.file)
        fs.unlink(req.file.path, (err) => {console.log(err)});

    //the res.headerSent checks if a response has already been sent
    if(res.headerSent) {
        return next(error);
    }

    res.status(error.code || 500).json({message: error.message || 'An unknown error occurred!'});
});

mongoose.connect(process.env.DB_URL).then(() => app.listen(parseInt(process.env.PORT))).catch(err => console.log(err));
