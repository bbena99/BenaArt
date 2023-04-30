const mongoose = require('mongoose');

const BlogpostSchema = new mongoose.Schema({
    user : {type:String,required:true},//username of user
    keywords : {type : String,required:true},
    text : {type : String,required:false},
    data : {type : String,required:true},
    liked : {type : Number,required:true},
    enabled : {type : Boolean,required:true,default:true}
});

const Blogpost = mongoose.model( 'Blogpost', BlogpostSchema);

module.exports = Blogpost;