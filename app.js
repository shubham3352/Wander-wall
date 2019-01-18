var express=require('express');
var app=express();
var bodyParser=require('body-parser');
var mongoose=require('mongoose');
var passport=require('passport');
var LocalStrategy=require('passport-local');
var passportLocalMongoose=require('passport-local-mongoose');
var leaderBoard=require('@gamestdio/leaderboard');

//mongoose.connect("mongodb://localhost/e_mage");
mongoose.connect("mongodb://shubham:03092001s@ds030719.mlab.com:30719/e_mage");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine","ejs");



var userSchema=new mongoose.Schema({
	username:String,
	password:String
});
userSchema.plugin(passportLocalMongoose);
var User=mongoose.model("User",userSchema);

app.use(require("express-session")({
	secret:"hello",
	resave:false,
	saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser = req.user;
	next();
});



var commentSchema=new mongoose.Schema({
	text : String,
	author : {
		id:{
			type : mongoose.Schema.Types.ObjectId,
			ref : "User"
		},
		username : String
	}
});

var Comment=mongoose.model("Comment",commentSchema);

var imageSchema= new mongoose.Schema({
	name : String,
	image : String,
	description:String,
	likes: {type : Number , default : 0},
	author:{
		id : {
			type : mongoose.Schema.Types.ObjectId,
			ref : "User"
		},
		username : String
	},
	comments : [
		{
			type : mongoose.Schema.Types.ObjectId,
			ref : "Comment"
		}
	]
});

var Image =mongoose.model("Image",imageSchema);
//
app.get("/allimage",function(req,res){
	Image.find({},function(error,allimage){
		if(error){
			console.log(error);
		}else{
			res.render("index",{img : allimage});
		}
	});
	
});



app.post("/allimage",isLoggedIn,function(req,res){
	var name=req.body.name;
	var image=req.body.image;
	var desc=req.body.description;
	var author={
		id  : req.user._id,
		username : req.user.username
	}
	var data={name: name , image:image , description:desc , author:author}
	Image.create(data,function(error,data){
		if(error){
			console.log(error);
		}else{
			res.redirect("/allimage");
		}
	});
});

app.get("/",function(req,res){
	res.redirect("/allimage");
});

app.get("/allimage/add",isLoggedIn,function(req,res){
	res.render("add");
});

app.get("/allimage/:id",isLoggedIn,function(req,res){
	Image.findById(req.params.id).populate("comments").exec(function(error,data){
		if(error){
			console.log(error);
		} else{
			res.render("show",{img:data});
		}
	});
	
});
app.post("/allimage/:id",isLoggedIn, function(req, res) {
    Image.findById(req.params.id, function (err, data) {
        if (err) {
            console.log(err);
        } else {
            data.likes += 1;
            data.save();
            //res.redirect("/allimage/:id");
            res.render("show",{img:data});
        }
    });
});



app.get("/allimage/:id/comments/new",isLoggedIn,function(req,res){
	Image.findById(req.params.id, function(err,data){
		if(err){
			console.log(err);
		} else{
			res.render("new",{img: data});
		}
	});
});

app.post("/allimage/:id/comments",isLoggedIn,function(req,res){
	Image.findById(req.params.id,function(err,data){
		if (err){
			console.log(err);
		} else {
			Comment.create(req.body.comment,function(err,comment){
				if(err){
					console.log(err);
				} else {
					comment.author.id=req.user._id;
					comment.author.username=req.user.username;
					comment.save();
					data.comments.push(comment);
					data.save();
					res.redirect("/allimage/" + data._id);
				}
			});
		}
	});
});


app.get("/register",function(req,res){
	res.render("register");
});

app.post("/register",function(req,res){
	var newUser=new User({username: req.body.username});
	User.register(newUser , req.body.password,function(err,user){
		if(err){
			console.log(err);
			return res.redirect("/register");
		}
		passport.authenticate("local")(req,res,function(){
			res.redirect("/allimage");
		});
	});
});

app.get("/login",function(req,res){
	res.render("login");
});

app.post("/login",passport.authenticate("local",{
	successRedirect:"/allimage",
	failureRedirect:"/login"
}),function(req,res){});

app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/allimage");
});



function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	else{
		res.redirect("/login");
	}
}


app.get("/leaderboard",isLoggedIn,function(req,res){
	Image.find({}).sort([["likes","descending"]]).exec(function(err,leader){
		if (err){
			console.log(err);
		} else {
			res.render("leader",{leader:leader});
		}
	});
});



app.listen(3000,function(){
	console.log("Server Started!!");
});