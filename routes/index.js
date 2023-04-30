const express = require('express');
const axios = require('axios');
const {v4: uuidv4} = require('uuid');
const path = require('path');
const concat = require('concat-stream');
var fs = require('fs');

var router = express.Router();

var Userdb = require('../models/users');
var Imagedb = require('../models/images');
var Blogdb = require('../models/blogposts');
const { response } = require('../app');
const { fn, data } = require('jquery');

/**
 * My helpter functions
 */
function getKeywords(query,un){
  //console.log("getKeywords() called -> results:");
  //console.log(query);
  let keywords = query.prompt+', '+query.sampler+', '+query.model+', '+un;
  //console.log("Object value to return:");
  //console.log(object);
  return keywords;
}

/**
 * End of helper functions
 * ---------------------------------------------------------------------------------------------------------
 * Start of API calls
 */

/**
 * "GET/who"
 * Is used to validate user
 */
router.get("/who", (req,res,next)=>{
  //console.log("    GET '/who' was called")
  let result = req.session.user && req.session;
  //console.log(result);
  res.json( result );
});

/**
 * ALL"*"
 * Is used to validate user
 */
router.all( '*', (req,res,next)=>{
  //console.log("    .all('*') was called");
  //console.log(req.session);
  if( req.session && req.session.user){
    //console.log("User found ☺");
    next();
  } else if( req.session ){
    req.session.regenerate( err => {
      console.log("No user found");
      //console.log(req.session);
      res.redirect("/");
    });
  } else {
    console.log("No session found");
    res.redirect("/");
  }
});

/*   Start of all user calls   */

/**
 * GET "/users"
 * get a list of users
 * can have a filter to filter out certain users.
 * Will be used only for moderation purposes
 */
router.get('/users', async(req, res, next)=> {
  //console.log("    GET '/users' was called to get a list of all users");
  let returnUsers;
  //console.log(req.query.filter);
  if(req.query.username!='undefined')returnUsers = await Userdb.find({'username':{$regex:req.query.username}});
  else returnUsers = await Userdb.find();
  res.status(200).send(returnUsers);
});

/**
 * PUT "/users/:username"
 * will disable a single user in the database
 * Will be used only for moderation purposes
 */
router.put('/users/:username', async (req,res,next)=>{
  //console.log("  PUT '/users/:username' called to disable/enable a user");
  let admin = req.session.user;
  //console.log(admin)
  if(!admin.admin)res.status(401).send("NOT AN ADMIN");
  //console.log("  PUT './users/:username was called to update a user");
  let dbUser = await Userdb.findOne({"username":req.params.username});
  dbUser.enabled = req.body.enabled;
  await Userdb.updateOne({'username':req.params.username},dbUser);
  res.status(200).send(dbUser);
});

/*   Start of image calls   */

/**
 * GET "/images"
 * gets all images for user
 * can take a querry param for KEYWORD filtering
 */
router.get('/images', async (req, res, next)=> {
  //console.log("  GET '/images' called to get all user's images");
  //console.log(req.session.user);
  let user = req.session.user;
  let keywords = String(req.query.keywords)
  let image;
  //console.log(keywords);
  if(keywords!=='undefined') {
    //console.log('req.query.keywords!=undefined   req.query.keywords='+keywords);
    image = await Imagedb.find(
      {$and:[
        {'username':user.username},
        {'keywords':{$regex:keywords}}
      ]}
    );
  } else {
    //console.log('req.query.keywords == undefined');
    image = await Imagedb.find({'username':user.username});
  }
  /*
  image.forEach(element => {
    console.log(element.data);
  });
  */
  res.status(200).send(image);
});

/**
 * GET "/images/:imageName"
 * gets a single image based on file name.
 */
router.get('/images/:imageName',(req,res,next)=>{
  let fname = path.join(__dirname,'..', 'images',req.params.imageName);
  //console.log(fname);
  res.status(200).sendFile(fname);
});

/**
 * POST "/images"
 * creates a SINGLE image ->via the 3rd party api<-
 */
router.post('/images', (req, res, next)=> {
  //console.log("  POST '/images' set to get picture");
      /** Make a template for the image to follow */
  // console.log("-> Query params:");
  // console.log(req.query);
  // console.log("-> Params:");
  // console.log(req.params);
  let newSet = {
    'username' : req.session.user.username,
    'keywords' : getKeywords(req.query,req.session.user.username),
    'data' : ' ',
    'enabled' : 'true'
  };
      /** Make the params for the 3rd party api call */
  const encodedParams = new URLSearchParams();
  encodedParams.append('prompt',req.query.prompt);
  if(req.query.negPrompt!='undefined')encodedParams.append('negative_prompt',req.query.negPrompt);
  encodedParams.append('sampler',req.query.sampler);
  encodedParams.append('model',req.query.model);
  encodedParams.append('steps',req.query.steps);
  encodedParams.append('guidance',req.query.guidance);
  if(req.query.seed!='undefined')encodedParams.append('seed',req.query.seed);
  encodedParams.append('width',req.query.width);
  encodedParams.append('height',req.query.height);
      /** Make the options for the 3rd party api call */
  const options = {
    method: 'POST',
    url: 'https://dezgo.p.rapidapi.com/text2image',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-RapidAPI-Key': '2dd45f3b97msh6445b6430167b5ep168ecajsn82285ecbd2e4',
      'X-RapidAPI-Host': 'dezgo.p.rapidapi.com'
    },
    data: encodedParams,
    responseType: 'arraybuffer'
  };
    /** Make the 3rd party api call */
  axios.request(options).then((response)=> {
        /** Write to the file */
    //console.log(response.headers);
    let fname = uuidv4()+".png";
    //console.log("-> fname:");
    //console.log(fname);
    //console.log(response.data.length);
    fs.writeFileSync('./images/'+fname, response.data,'binary');
        /** Save the contents of the read file to our template image */
    newSet.data = fname;
        /** Send image to database */
    Imagedb.create(newSet);
    res.status(201).send(newSet);
  }).catch(function (error) {
    console.error("There was an error in the axios request:", error);
    res.status(500).send("There was an error in the axios request: "+error);
  });
});
/**
 * POST "/upscale"
 * upscales a single photo to a higher resolution for the user
 */
/*
router.post('/upscale', (req,res,next)=>{
  console.log("  POST '/upscale' called to upscale a single photo");
  console.log('-> req.body:');
  console.log(req.body);
  
  let fname = uuidv4()+".png";
  //console.log("-> fname:");
  //console.log(fname);
  let newSet = {
    'uid' : req.session.user._id,
    'username' : req.session.user.username,
    'keywords' : req.body.keywords,
    'data' : fname,
    'enabled' : 'true'
  }
  const options = {
    method: 'POST',
    url: 'https://dezgo.p.rapidapi.com/upscale',
    headers: {
      'X-RapidAPI-Key': '2dd45f3b97msh6445b6430167b5ep168ecajsn82285ecbd2e4',
      'X-RapidAPI-Host': 'dezgo.p.rapidapi.com',
      'Cotent-Type': 'application/json'
    },
    data: {
      'image':fs.readFileSync("./images/"+req.body.data,'base64')
    }
  }
  axios.request(options).then(async(response)=>{
      console.log('  inside of axios.request');
      console.log('-> fname');
      console.log(newSet.data);
      console.log('-> response.headers');
      console.log(response.headers);
      console.log("Wrote to file: ./images/"+newSet.data);
      console.log('-> response.data //used for proof that we received the file');
      console.log(response.data.substring(0,100));
      console.log(response.data.length);
      fs.writeFileSync('./images/'+newSet.data, response.data,'base64');
      await Imagedb.create(newSet);
      res.status(201).send(newSet);
    })
    .catch(err=>{
      console.log(err.response);
    });
},);
*/
/**
 * DELETE "/images/:fname"
 * deletes image from db
 */
router.delete('/images/:data', async (req,res,next)=>{
  await Imagedb.deleteOne({data:req.params.data});
  fs.unlinkSync("./images/"+req.params.data);
});

/*   Start of blogpost calls   */

/**
 * GET "/blogposts"
 * gets all blogposts for all users.
 * (can also add a filter to get all blogposts of a single user)
 * (can also add filters for searching for certain types of photos)
 */
router.get('/blogposts', async (req, res, next)=>{
  //console.log("  GET '/blogposts' called to get all blog posts");
  let keywords = req.query.keywords;
  let returnBlog;
  //console.log(keywords);
  if(keywords!=undefined){
    //console.log('entered if');
    returnBlog = await Blogdb.find(
      {$and:[
        {'enabled':true},
        {'keywords':{$regex:keywords}}
      ]}
    );
  } else {
    //console.log('entered else');
    returnBlog = await Blogdb.find({'enabled':true});
  }
  res.status(200).send(returnBlog);
});
/**
 * GET "/blogposts/user/"
 * gets all blogposts for a single user
 */
router.get('/blogposts/user', async (req,res,next)=>{
  let user = req.session.user;
  let filter = req.query.keywords;
  let blogposts;
  if(filter=='undefined')blogposts = await Blogdb.find({'user':user.username});
  else blogposts = await Blogdb.find(
    {$and:[
      {'user':user.username},
      {'keywords':{$regex:filter}}
    ]}
  );
  res.status(200).send(blogposts);
})

/**
 * POST "/blogposts"
 * creates a single blog post
 */
router.post('/blogposts', async (req, res, next)=>{
  //console.log("  POST './blogposts' called to create a blogpost");
  let query = req.query;
  let img = await Imagedb.findOne({'data':query.image});
  //console.log(img);
  let username = img.username;
  let blogpost = {
    'user' : username,
    'keywords' : img.keywords,
    'data' : img.data,
    'liked' : 0,
    'text' : query.text
  }
  blogpost = await Blogdb.create(blogpost);
  res.status(201).send(blogpost);
})

/**
 * PUT "/blogposts"
 * is used to disable a blogpost
 * blogpost is in the body
 */
router.put('/blogposts', async (req,res,next)=>{
  //console.log("  PUT './blogposts' called to disable/enable a blogpost");
  let blogpost = req.body;
  let dbBlogpost = await Blogdb.updateOne({'_id':blogpost._id},{'enabled':blogpost.enabled});
  res.status(200).send(dbBlogpost); 
});
/**
 * PUT "/blogposts/liked"
 * is used to like a post
 */
router.put('/blogposts/liked', async (req,res,next)=>{
  let user = req.session.user;
  let blogpost = req.body;
  blogpost = await Blogdb.updateOne({'_id':blogpost._id},{'liked':blogpost.liked});
  res.status(200).send(blogpost);
})
/**
 * GET "/blogposts/moderation"
 * req.session.user.admin must be true
 * returns all blogposts that are {'endabled':'false'}
 */
router.get('/blogposts/moderation', async (req,res,next)=>{
  let admin = req.session.user;
  if(!admin.admin)res.status(401).send("NOT AN ADMIN");
  let keywords = req.query.keywords;
  let blogposts;
  if(keywords=='undefinded')blogposts = await Blogdb.find({'enabled':false});
  else blogposts = await Blogdb.find(
    {$and:[
      {'enabled':false},
      {'keywords':{$regex:keywords}}
    ]}
  );
  res.status(200).send(blogposts);
})
/**
 * DELETE "/blogposts"
 * deletes a blog post
 */
router.delete('/blogposts', async (req,res,next)=>{
  let admin = req.session.user;
  if(!admin.admin)res.status(401).send("NOT AN ADMIN");
  let blogpost = req.body;
  await Blogdb.deleteOne({'_id':blogpost._id});
  res.status(200).send('DELETED');
})
module.exports = router;
