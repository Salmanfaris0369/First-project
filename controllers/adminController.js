
  const User = require('../models/usermodel')
  const Admin = require('../models/adminmodel')
 
  const bcrypt=require('bcrypt')


  const loadLogin = async(req,res)=>{
    try {
        res.render('login')
    } catch (error) {
        console.log(error);
    }
}
    
const verifyLogin=async(req,res)=>{

    try {
        const email=req.body.email
        const password=req.body.password
        const admindata=await Admin.findOne({adminEmail:email})
        console.log(admindata);
        if(admindata){
            const passwordMatch = await bcrypt.compare(password,admindata.adminPassword)
           
                 if(passwordMatch){
                    req.session.admin_id =admindata._id
                        res.redirect('admin/dashboard');
                 }else{
                    res.render('login',{message:"incorrect password"})
                 }
        }else{
            res.render('login',{message:'Your email is incorrect'})
        }
    } catch (error) {
       console.log(error); 
    }
}

const loadDashboard = async(req,res)=>{
    try {
        res.render('dashboard')
    } catch (error) {
        console.log(error);
    }
}

const loadUsers = async(req,res)=>{
    try { 
         const users=await User.find()

        res.render('users',{users:users})
    } catch (error) {
        console.log(error);
    }
}

const block_unblock = async(req, res) => {
    try {
        const userId = req.params.id;
        const action = req.body.action;
        console.log(userId,action);

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (action === 'block') {
            user.is_blocked = true;
        } else if (action === 'unblock') {
            user.is_blocked = false;
        } else {
            return res.json({ success: false, message: 'Invalid action' });
        }

        await user.save();
        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
}



module.exports={
    loadLogin,
    verifyLogin,
    loadDashboard,
    loadUsers,
    block_unblock,
    
}