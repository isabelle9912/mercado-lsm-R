// .env
require("dotenv").config();
const port = process.env.PORT || 5432;

// Modulos
const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const conn = require("./db/conn");
const admin = require("./router/adminRoutes");
const client = require("./router/clientRoutes");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const flash = require("connect-flash");

const { eAdmin } = require("./helpers/eAdmin");

// Config
// Express
const app = express();
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.json());

// Models
const Purchase = require("./models/Purchase");
const User = require("./models/User");

// Session middleware
app.use(
  session({
    name: "session",
    secret: "banana-pao",
    resave: false,
    saveUninitialized: false,
    store: new FileStore({
      logFn: function () {},
      path: require("path").join(require("os").tmpdir(), "sessions"),
    }),
    cookie: {
      secure: false,
      maxAge: 3600000,
      expires: new Date(Date.now() + 3600000),
      httpOnly: true,
    },
  })
);

// Flash
app.use(flash());

//Middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.user = req.user || null;
  next();
});
// Handlebars
app.engine("handlebars", exphbs.engine());
app.set("view engine", "handlebars");

// Public
app.use(express.static(path.join(__dirname, "public")));

// Set session to res
app.use((req, res, next) => {
  if (req.session.userid) {
    res.locals.session = req.session;
  }

  next();
});

// Rotas
app.get("/", (req, res) => {
  res.render("home");
});

app.use("/admin", eAdmin, admin);
app.use("/client", client);

// Servidor
// Servidor e conexão com banco
app.listen(port);
conn
  //.sync({force: true})
  .sync()
  .then()
  .catch((error) => {
    console.log(error);
  });
