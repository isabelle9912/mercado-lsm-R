const express = require("express");
const router = express.Router();
const pool = require("../db/conn");
const basePath = "./client/";
const bcrypt = require("bcrypt");
const passport = require("passport");

router.get("/login", (req, res) => {
  res.render(basePath + "login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/client/login",
    failureFlash: true,
  }),
  (req, res) => {
    if (req.user.eAdmin == "admin") {
      res.redirect("/admin/clients");
    } else {
      res.redirect("/client/" + req.user.id);
    }
  }
);

// Rota para fazer logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao destruir a sessão:", err);
      req.flash("error_msg", "Erro ao fazer logout");
      return res.status(500).send("Erro ao fazer logout");
    }
    res.redirect("/");
  });
});

router.get("/:id", (req, res) => {
  const id = req.params.id;

  const userSql = `SELECT * FROM user WHERE id = ?`;
  const purchasesSql = `
    SELECT purchase.purchase_amount, purchase.purchase_date, purchase.id, purchase.status
    FROM purchase
    WHERE purchase.user_id = ?
    ORDER BY purchase.status = 'paga';`; // Ordena as compras por data mais recente
  // Query para selecionar as compras do cliente e dados que serão exibidos na view

  pool.query(userSql, [id], (err, userData) => {
    if (err) {
      req.flash("error_msg", "Erro ao buscar usuário!");
      res.redirect("/");
      console.log(err);
    }

    pool.query(purchasesSql, [id], (err, purchasesData) => {
      if (err) {
        console.log(err);
        req.flash("error_msg", "Erro ao buscar compras!");
        res.redirect("/");
      }

      const user = userData[0];
      const purchases = purchasesData;

      res.render(basePath + "user", { user, purchases });
    });
  });
});

module.exports = router;
