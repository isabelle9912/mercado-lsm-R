module.exports = {
  eAdmin: function (req, res, next) {
    console.log(req.session.useradmin)
    if (req.session.useradmin === "admin") {
      return next();
    }
    req.flash("error_msg", "Você precisa ser um Admin");
    res.redirect("/");
  },
};
