

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
    if (req.session&&req.session.user_id) {
        try {
            const user = await User.findById(req.session.user_id);
            if (User && User.is_blocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                    return res.redirect('/login');
                });
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


module.exports = {
    isLogin,
    isLogout,
    checkUserStatus
}