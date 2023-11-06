const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        lowercase:true,
        required:true
    },
    mobile:{
        type:Number,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    password:{
        type:String,
        min:[6, 'minimum 6 words'], //Not working i don't know why...
        required:true
    },
    is_admin:{
        type:Number,
        required:true
    },
    is_verified:{
        type:Number,
        default:0
    },
    token:{
        type:String,
        default:''
    }
})

module.exports = mongoose.model("User", userSchema);