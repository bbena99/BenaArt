var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var authRouter = require('./routes/auth');
var indexRouter = require('./routes/index');

const mongoose = require('mongoose');
mongoose.connect(
  "mongodb+srv://bbena99:Atbbtb999badger@fp402.hztsh9l.mongodb.net/test",
  {useNewUrlParser: true, useUnifiedTopology: true},
  (err) => err ? console.log(err) : console.log("Connected to finalproject")
);
mongoose.set('strictQuery',true);

var app = express();

app.use(session({
  secret: 'flesh sucks',
  resave: false,
  saveUninitialized: true,
  cookie: {secure:false}
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'final-project')));

app.use('/api/v1', authRouter);
app.use('/api/v1', indexRouter);

app.use('/**',(req,res,next)=>{
  res.redirect("/");
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

module.exports = app;
