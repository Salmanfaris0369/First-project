const isAdmin = async(req,res,next)=>{
    try {
          if(req.session.admin_id){
            next()
          }else{
            res.redirect('/admin/login')
          }
    } catch (error) {
        console.log(error);
    }
}
module.exports={
  isAdmin
}