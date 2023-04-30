const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
    username : {type:String, required: true},
    keywords : { type : String, required: true},
    data : { type : String, required : true },

    enabled : { type : Boolean, required : true }
});

const Image = mongoose.model( 'Image', ImageSchema);

module.exports = Image;