//Tutorial at : https://codeburst.io/hitchhikers-guide-to-back-end-development-with-examples-3f97c70e0073
var express = require("express");
var formidable = require('formidable');
var path=require("path");
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');
var url = require('url');
var app = express();
var port = 3000;

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/events",{ useNewUrlParser: true });

var eventSchema = new mongoose.Schema({
 nameofevent: String,
 place: String,
 date: String,
 image: String,
 comments: String,
 rules: String,
 email:String
})

var userSchema=new mongoose.Schema({
	username:String,
	email:String,
	password:String
});
 
var Event = mongoose.model("Event", eventSchema);
var User=mongoose.model("User",userSchema);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use( express.static( "public" ) );
app.use(session({secret: 'keyboard cat',saveUninitialized: true, resave: true,}))


app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
//-------------------------------------------------------------------------
//Posting form with text input and file upload
app.post("/addevent", (req, res) => {
	var form = new formidable.IncomingForm();
	form.parse(req,function(err,fields,files){
		if(err) next(err);
		var formdata={	nameofevent:fields.nameofevent,
						place:fields.place,
						date:fields.date,
						image:req.session.user.username+files.image.name,
						comments:fields.comments,
						rules:fields.rules,
						email:req.session.user.email
					 };
	 	var myData = new Event(formdata);	 	
		myData.save()
			.then(item => {	
			res.redirect('/');
			})
			.catch(err => {
			res.status(400).send("unable to save to database ");
		});	
	});
    form.on('fileBegin', function (name, file){
		file.path = __dirname + '/public/uploads/' +req.session.user.username+file.name;
    });

    form.on('file', function (name, file){
        console.log('Uploaded ' + file.name);
    });
});

app.post("/signup", (req, res) => {
	User.findOne({$or:[{'email':req.body.email},{'username':req.body.username}]},function(err,username){
		if (err) throw err;
		if(username!=null){
			req.session.fail="Username or email already Exists!"
			res.redirect('/signup');
		}else{
			bcrypt.hash(req.body.password, 10, function(err, hash) {
				var datatostore={username:req.body.username,email:req.body.email,password:hash}
				var userData = new User(datatostore);
				userData.save()
					.then(item => {	
					req.session.user = req.body;
					req.session.logoutoption="Logout";
					req.session.myeventsoption="My events";
					res.redirect('/');
					})
					.catch(err => {
					res.status(400).send("unable to save to database ");
				});		  // Store hash in database
			});
		}
	});
});

app.post("/login", (req, res) => {	
	// find each person with a last name matching 'Ghost', selecting the `name` and `occupation` fields
	User.findOne({ 'email': req.body.email}, function (err, user) {
	  if (err) throw err;
		if(user!=null){
			req.session.user=user;
			req.session.logoutoption="Logout";
			req.session.myeventsoption="My events";
			bcrypt.compare(req.body.password, user.password, function(err, res2) {
				if(res2) {
				   	console.log("Correct Password!");
				   	res.redirect('/');
				} else {
				   	console.log("Wrong Password");
				   	res.redirect('/login');
				} 
			});								
		}else{
			console.log("This email is wrong");
			res.redirect('/login');
		}
	});
});

app.post("/searchplace", (req, res) => {	
	Event.find({'place':req.body.place},function(err,doc){
		if(err){
			console.log("ERROR")
		}
		res.render('eventsView',{title:"Events", 
								eventview:doc, 
								isLogedin:req.session.user.username,
								logoutoption:req.session.logoutoption, 
								header:"Events at "+req.body.place,
								myeventsoption:req.session.myeventsoption});
	}).sort({date:'ascending'});	
});

//-----------------------------------------------------------------
app.get("/eventcreation", (req, res) => {
	if(req.session.user==null || req.session.user.username=="Login/Signup"){
		res.render('login',{});
	}else{
	 	res.render('eventcreation',{title:"CreateEvent",headline:"Create event with your Terms"});	
	}	
});

app.get("/login", (req, res) => {
	 res.render('login',{});
});

app.get("/signup", (req, res) => {
	if(req.session.fail==null){
		req.session.fail=""
	}
	res.render('signup',{fail:req.session.fail});
});

app.get("/", (req, res) => {
	if(req.session.user==null){
		req.session.logoutoption="";
		req.session.myeventsoption="";
		req.session.user={username:"Login/Signup",email:"",password:""}
	}
	Event.find({},function(err,doc){
		if(err){
			console.log("ERROR")
		}
		res.render('eventsView',{title:"Events", 
								eventview:doc, 
								isLogedin:req.session.user.username,
								logoutoption:req.session.logoutoption, 
								header:"All events",
								myeventsoption:req.session.myeventsoption});
	}).sort({date:'ascending'});
});

app.get("/logout", (req, res) => {
	req.session.logoutoption="";
	req.session.user=null;
	req.session.myeventsoption="";
	res.redirect('/');
});

app.get("/myevents", (req, res) => {
	Event.find({'email':req.session.user.email},function(err,doc){
		if(err){
			console.log("ERROR")
		}
		res.render('eventsView',{title:"Events", 
								eventview:doc, 
								isLogedin:req.session.user.username,
								logoutoption:req.session.logoutoption, 
								header:"My events: "+req.session.user.username,
								myeventsoption:req.session.myeventsoption});
	}).sort({date:'ascending'});
});

app.get("/eventbyid", (req, res) => {
	var q = url.parse(req.url, true).query;
	Event.findOne({'_id':q.eventid},function(err,doc){
		if(err){
			console.log("ERROR")
		}
		res.render('eventbyid',{title:doc.nameofevent, 
								eventview:doc, 
								isLogedin:req.session.user.username,
								logoutoption:req.session.logoutoption, 
								header:doc.nameofevent,
								myeventsoption:req.session.myeventsoption});
	})	
});

app.listen(port, () => {
 	console.log("Server listening on port " + port);
});