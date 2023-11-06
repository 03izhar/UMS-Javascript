const mongoose = require("mongoose")
mongoose.connect("mongodb://127.0.0.1:27017/user_management_system")
.then(console.log("mongodb connected..."))

const express = require("express")
const app = express();

// for user route
const userRoute = require('./routes/user.route');
app.use('/',userRoute);

// for admin route
const adminRoute = require('./routes/admin.route');
app.use('/admin',adminRoute);

app.listen(3000, ()=>{
    console.log("server is running on --> http://127.0.0.1:3000");
})