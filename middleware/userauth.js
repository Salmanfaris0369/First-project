

const User = require('../models/usermodel');

const isLogin = async (req,res,next) => {
    try{
        if(req.session.user_id){
            return next();
        }else{
            return res.redirect('/login');
        }
    }catch(error){
        res.send(error.message);
    }
}

const isLogout = async (req,res,next) => {
    try{
        if(req.session.user_id){
           return res.redirect('/');
        }
        return next();
    }catch(error){
        res.send(error.message);
    }
};

const checkUserStatus = async (req, res, next) => {
    if (req.session && req.session.user_id) {
        try {
            const user = await User.findById(req.session.user_id);
            if (user && user.is_blocked) {
                // // Check if the session belongs to an admin
                // if (req.session.is_admin) {
                //     next(); // Allow admin to continue
                // } else {
                //     // Block the user and redirect to login page
                    delete req.session.user_id
                    res.redirect('/login');
                // }
                
            } else {
                next();
            }
        } catch (error) {
            console.error('Error checking user status:', error);
            next(error);
        }
    } else {
        next();
    }
};



const authMiddleware = async (req, res, next) => {
    try {
        if (req.session && req.session.user_id) {
            const user = await User.findById(req.session.user_id);
            if (user) {
                res.locals.isAuthenticated = true;
                res.locals.user = user;
            } else {
                res.locals.isAuthenticated = false;
                res.locals.user = null;
            }
        } else {
            res.locals.isAuthenticated = false;
            res.locals.user = null;
        }
        next();
    } catch (error) {
        res.send(error.message);
    }
};


module.exports = {
    isLogin,
    isLogout,
    checkUserStatus,
    authMiddleware
}