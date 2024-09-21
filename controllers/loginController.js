const { name } = require('ejs');
const User = require('../models/usermodel');
const bcrypt = require('bcrypt')
const nodemailer=require("nodemailer")
const crypto = require('crypto');
const { text } = require('express');
const { error } = require('console');
const passport =require('passport')
const Googlestrategy=require('passport-google-oauth20').Strategy
const session = require('express-session')
const Wallet =require('../models/walletModel')





const loadRegister = async(req,res)=>{
    try {
        res.render('register')
        
    } catch (error) {
        console.log(error.message);
    }
}

const securePassword= async(password)=>{
    try {
      const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}


// otp generating 
const generateotp =()=>{
    return crypto.randomInt(100000,999999).toString()
}

const sendOtp=async(email,otp)=>{

    const transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user: process.env.user_email,
            pass: process.env.user_pass
            // ________
        }
    })


const mailOption={
    from:"salmanfs953@gmail.com",
    to:email,
    subject:'OTP',
    text:`your otp is${otp}`
}

 
 
return new Promise((resolve, reject) => {
    transporter.sendMail(mailOption,(error,confirmation)=>{
        if(error){
            reject(error)
        }else{
            resolve('OTP sent to your email')
        }
    })
})

}



const insertUser= async(req,res)=>{
    try {
          
           const existemail= await User.findOne({email:req.body.email})
           if(existemail){
            res.render('register',({message:'Email already exist try different email'}))
           }else{
            const sPassword = await securePassword(req.body.password)
      
      const otp=generateotp()

      req.session.otp=otp;
      req.session.otp_expire=Date.now() + 60000


       req.session.userData={
         name:req.body.name,
        email:req.body.email,
        mobile:req.body.mobile,
        password:sPassword,
        is_blocked:false
    }
        
 await sendOtp(req.body.email,otp)
 res.redirect('/verify')
}
 
    
    } catch (error) {
        console.log(error);
    }
}


const verifyform= async(req,res)=>{
    try {
        if(!req.session.userData){
           return res.redirect('/register')
        }
        else{
            res.render('verify',{message:'please verify your otp'})
        }
    } catch (error) {
        console.log(error.message);
    }
   
}

const otpVerification = async(req,res)=>{
   try{
         const{otp}=req.body
    
    if(req.session.otp&&req.session.otp_expire>Date.now()&&req.body.otp===req.session.otp){

         const user =req.session.userData;
         const newUser=new User(user);
         const newuserData = await newUser.save();
      
       if(newuserData){
        req.session.otp=null
        req.session.otp_expire=null
        req.session.userData=null

        res.json({ success: true, message: 'Registration successful. You can now login.' })
        }else{
            res.json({ success: false, message: 'Error saving user data.' });
        }

    }else{
        res.json({ success: false, message: 'Invalid or expired OTP.' })
    }
}catch{
    console.log(error.message);
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}




   const resendOtp = async(req,res)=>{
    try {   
            const userData =req.session.userData
            console.log(userData);
           if(!userData){
            return res.status(400).json({success:false,message:'session not found'})
           }

     const newOtp=generateotp()
           console.log(newOtp);
          req.session.otp=newOtp
          req.session.otp_expire = Date.now() + 60000
           await sendOtp(userData.email,newOtp)
           res.json({ success: true, message: 'OTP resent successfully' })
        
    } catch (error) {
        console.error();(error.message);
        res.status(500).json({ success: false, message: 'Server error' })
    }
}


// user login 

const loginLoad = async(req,res)=>{
    try {
        res.render('userlogin')
    } catch (error) {
    console.log(error.message);        
    }
}




const verifyLogin = async(req,res)=>{

  try {  

          const email=req.body.email
          const password = req.body.password

       const userData= await User.findOne({email:email})

       if(userData){
               const passwordMatch=await bcrypt.compare(password,userData.password)
               if(passwordMatch){
                       if(userData.is_blocked==true){
                        console.log('kkk');
                        
                        res.render('userlogin',{message:"You are blocked"})
                       }else{
                        req.session.user_id=userData._id
                    
                        req.session.user_id = userData._id;
                  
                        res.redirect('/home')

                        let wallet = await Wallet.findOne({ userId: userData._id });
                    if (!wallet) {
                        wallet = new Wallet({
                            user: userData._id,
                            balance: 0
                        });

                        await wallet.save();
                    }
                  

                       }
               }else{
                console.log('notmatch');
                
                res.render('userlogin',{message:"password is incorrect"})
               }
       }else{
        res.render('login',{message:"user not found"})
       }


  } catch (error) {
    console.log(error.message);
  }

}

const logout = async(req,res)=>{
    try { console.log(req.session.user_id,'qw8gcdx');
        delete req.session.user_id
        res.redirect('/login')
    } catch (error) {
        console.log(error.message);
    }
}

// login with google

passport.use(new Googlestrategy({
    clientID:process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL:process.env.callbackURL,
    passReqToCallback:true
},async(req,accessToken,refreshToken,profile,done)=>{
  try{    
         let user=await User.findOne({email:profile.emails[0].value})


    if(!user){
             user=new User({
                googleId:profile.id,
                name:profile.displayName,
                email:profile.emails[0].value,
                image:profile.photos[0].value
             });
             await user.save()
       }

       done(null,user)
     
    }catch(error){
        console.log(error);
    }
}));

passport.serializeUser((user,done)=>{
       done(null,user.id)
})


passport.deserializeUser(async(id,done)=>{
    try {
        const user=await User.findById(id);
        done(null,user)
    } catch (error) {
        done (error)
    }
})

const googleSuccess = async(req,res,next)=>{
    try {
        if(!req.user){
            return res.redirect('/login')
        }
        if(req.user.is_blocked==1){
            return res.render('login',{message:'user is blocked'})
        }
        console.log(req.user);
        const user = await User.findById(req.user.id);
       req.session.user_id=req.user.id
       let wallet = await Wallet.findOne({ user : req.user.id});
if (!wallet) {
    wallet = new Wallet({
        user: req.user.id,
        balance: 0
    });
    await wallet.save();
}
           res.redirect('/')
    } catch (error) {
        console.log(error);
    }
}







const resetPasswordPage = async(req,res)=>{
    try {
            res.render('resetPassword')
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}

const emailToken = async(req,res)=>{
    try {
          const {email} = req.body
          console.log(req.body);
          const user = await User.findOne({email : email})
console.log(user,'nnnnnnnn');
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        const resetTokenExpiry = Date.now() + 3600000;
    
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        
        await user.save();
        const transport = nodemailer.createTransport({
            service : 'Gmail',
            auth : {
                user : process.env.user_email,
                pass: process.env.user_pass,
            }
        })
        
        const mailOption = {
            to : user.email,
            from : process.env.user_email,
            subject: 'Password Reset',
          text:` You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n +
                Please click on the following link, or paste this into your browser to complete the process:\n\n +
                http://localhost:3000/resetPassword/${resetToken}\n\n +
                If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };
        await transport.sendMail(mailOption)
        res.status(200).json({messege:'An Email has been sent to'+user.email+'with further instraction'})
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}




const resetPassword = async(req,res)=>{
    try {
        const{token}=req.params
        const user =  await User.findOne({resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now()}})
        console.log(user,'kkkkkkkkkkk');
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
    
        console.log(token,'3dtfrhjbgtcrdxersx');
        res.render('newPassword', { token }); 
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}
const updatePassword = async(req,res)=>{
    try { 
        const { token } = req.params;
        const {password,confirmPassword} = req.body;
        console.log(token,'jkjkkjkjk');
        console.log(req.body,'sallllllll');
           if(password!==confirmPassword){
            return res.status(400).json({success : false , message : `password do not match`})
           }        
           const user = await User.findOne({resetPasswordToken:token})
           console.log(user);
           if(!user){
            return res.status(400).json({success : false , message : `user not found`})
           }
           const hashPassword = await bcrypt.hash(password,10)
           user.password=hashPassword
           console.log(user.password,'llllllllll');
           user.resetPasswordToken = undefined
           await user.save()
           res.status(200).json({success : true , message : `password has been successfully changed,you can now`})
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}


module.exports={
    loadRegister,
    insertUser,
    securePassword,
    loginLoad,
    verifyLogin,
    logout,
    verifyform,
    otpVerification,
    resendOtp,
    googleSuccess,
    resetPassword,
    resetPasswordPage,
    emailToken,
    updatePassword
    
}