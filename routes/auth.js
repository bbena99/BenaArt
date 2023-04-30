const express = require('express');
var router = express.Router();
const bcrypt = require("bcrypt");
var Userdb = require('../models/users');
//const {v4: uuidv4} = require('uuid');

router.post("/login", async (req,res) => {
    //console.log("    .post('/login') was called proper");
    let query = req.query;
    //console.log(query);
    let user = await Userdb.findOne({username:query.username});
    if(user==undefined){
        res.status(404).send("User not found");
        return;
    }
    //console.log(user);
    const ERROR = "Invalid credentials";
    let correct = await bcrypt.compare(req.query.password,user.password);
    if(correct){
        req.session.user = user;
        //console.log(req.session);
        res.status(200).send(user);
    }
    else res.status(401).send(ERROR);
});
router.post("/createUser", async (req,res) => {
    //console.log("    .post('/createUser') was called proper");
    //console.log(req.query);
    if(req.query=={}){
        res.status(400).send('NO QUERY FOUND');
        return;
    }
    if(await Userdb.findOne({'username':req.query.username})){
        res.status(408).send('USERNAME TAKEN');
        return;
    }
    let encrypted = await bcrypt.hash(req.query.password,10);
    let newUser = {'username' : req.query.username , 'password' : encrypted, 'admin': false, 'enabled' : true};
    let dbUser = await Userdb.create( newUser );
    /*
    console.log("Before the for loop");
    for(let i=0; i<1200; i++){
        console.log(i);
        let name = uuidv4();
        let pw = await bcrypt.hash('123',10);
        let botUser = {
            'username' : name,
            'password' : pw,
            'admin' : false,
            'enabled' : true
        }
        await Userdb.create(botUser);
    }
    console.log("end of for loop");
    */
    req.session.regenerate((err)=>{
        if(err){
            console.log("Error in regenerate: "+err);
        }
        req.session.user = dbUser;
    });
    res.status(201).send(dbUser);
});
router.post("/logout", (req, res) => {
    req.session.destroy( () => {
        //console.log( req.session );
        res.status(200).send({});
    });
});

module.exports = router;