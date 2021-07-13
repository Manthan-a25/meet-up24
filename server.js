const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidV4 } = require("uuid");
var passport = require("passport"),
  bodyParser = require("body-parser"),
  LocalStrategy = require("passport-local"),
  User = require("./models/user"),
  passportLocalMongoose = require("passport-local-mongoose"),
  mongoose = require("mongoose");
app.set("view engine", "ejs");
app.use("/public", express.static(__dirname + "/public"));
const io = require("socket.io")(server);

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use("/peerjs", peerServer);

const users = {};

mongoose.connect("mongodb+srv://shinigami:deathnote@video.apihw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
app.set("view engine", "ejs");
app.use(
  require("express-session")({
    secret: "Rusty is the best and cutest dog in the world",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(bodyParser.urlencoded({ extended: true }));

//------------------------------------------------------------------------------------------------------------------//
/*
 *******************
 *      ROUTES     *
 *******************/

app.get("/", function (req, res) {
  res.render("login");
});

// Auth Routes
//Show sign up form
app.get("/register", function (req, res) {
  res.render("register");
});
//handling user signup
app.post("/register", function (req, res) {
  // console.log(req.body.username);
  // console.log(req.body.password);
  User.register(
    new User({ username: req.body.username }),
    req.body.password,
    function (err, user) {
      if (err) {
        console.log("OOPS SOMETHING WENT WRONG!!");
        console.log(err);
        return res.render("register");
      }
      passport.authenticate("local")(req, res, function () {
        //to log in the user
        res.redirect("/home");
      });
    }
  );
});
// LOGIN ROUTES
// render login forms
app.get("/login", function (req, res) {
  res.render("login");
});
//login logic
//middleware: code that runs before our final route callback
app.post(
  "/login",
  passport.authenticate("local", {
    //to check our login credentials
    successRedirect: "/home",
    failureRedirect: "/login",
  }),
  function (req, res) {}
);

//Logout route
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

//Home Page
app.get("/home", isLoggedIn, (req, res) => {
  res.render("home");
});

//To generate a unique roomid and redirecting it to chat room
app.get("/chat", isLoggedIn, (req, res) => {
  res.redirect(`/chat/${uuidV4()}`);
});

//To generate a unique roomid and redirecting it to video room
app.get("/video", isLoggedIn, (req, res) => {
  res.redirect(`/video/${uuidV4()}`);
});

//Chat room
app.get("/chat/:room", isLoggedIn, (req, res) => {
  res.render("chat", { roomId: req.params.room });
});

//Video room
app.get("/video/:room", isLoggedIn, (req, res) => {
  res.render("video", { roomId: req.params.room });
});

//video chat room after video meeting is left
app.get("/vid/:room", isLoggedIn, (req, res) => {
  res.render("vidchat", { roomId: req.params.room });
});

// writing our own middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

//-----------------------------------------------------------------------------------------------------------------//

//********************//
//*SOCKET CONNECTIONS*//
//********************//

io.on("connection", (socket) => {
  //joining chat room socket programming
  socket.on("new-user", (roomId, name) => {
    console.log(roomId, name);
    users[socket.id] = name;
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user", name);
  });

  socket.on("send", (roomId, message) => {
    console.log(roomId, message);
    socket.join(roomId);
    socket.broadcast
      .to(roomId)
      .emit("recieve", { message: message, name: users[socket.id] });
  });

  socket.on("sendmessage", (roomId, message) => {
    //send message to the same room
    io.to(roomId).emit("createMessage", message, users[socket.id]);
  });

  //Joining video room socket prograaming
  socket.on("join-room", (roomId, userId, username) => {
    socket.join(roomId);
    users[socket.id] = username;
    socket.broadcast.to(roomId).emit("user-connected", userId);
    // messages
    socket.on("message", (message) => {
      //send message to the same room
      io.to(roomId).emit("createMessage", message, username);
    });
    socket.on("vidsend", (roomId, message) => {
      console.log(roomId, message);
      socket.join(roomId);
      io.to(roomId).emit("recieve", {
        message: message,
        name: users[socket.id],
      });
    });
    socket.on("disconnect", () => {
      socket.broadcast.to(roomId).emit("user-disconnected", userId);
    });
  });
});

//----------------------------------------------------------------------------------------------------------------//

//*********************//
//***LISTENING PORT****//
//*********************//

server.listen(process.env.PORT || 3000);
