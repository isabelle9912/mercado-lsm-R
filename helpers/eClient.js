module.exports = {
  eClient: function (req, res, next) {
    if (req.session.userid) {
      return next();
    }
    req.flash("error_msg", "Você precisa fazer o login para acessar suas compras!");
    res.redirect("/client/login");
  },
};
