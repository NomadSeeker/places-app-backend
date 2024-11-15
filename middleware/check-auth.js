const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {

    if(req.method === 'OPTIONS')
        return next();
    
    try {
        //get the token from the headers of the request
        //we need to split the autorization header to get the token
        const token = req.headers.authorization.split(' ')[1];
        if(!token)
            throw new Error('Authentication failed!');
        //we need the secret key to decode the token, same as used to create the token
        const decodedToken = jwt.verify(token, 'secret_dont_share');
        //since the token had the userId and email when created, we can extract it here
        //and add it to the request object, so that we can use it in the next middlewares
        req.userData = {userId: decodedToken.userId}
        next();
    }catch(err) {
        return next(new HttpError('Authentication failed!', 403));
    }
    
       
};

