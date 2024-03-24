const express = require("express");
const router = express.Router();
const pool = require("../db/conn");
const basePath = "./admin/";
const bcrypt = require("bcrypt");
const { hash } = require("bcryptjs");
const { eAdmin } = require("../helpers/eAdmin");
const passport = require("passport");
require("../config/auth")(passport);
const User = require("../models/User");
const Purchase = require("../models/Purchase");

// Insert new user
router.get("/newuser", eAdmin, (req, res) => {
  res.render(basePath + "newuser");
});

router.get("/clients", eAdmin, (req, res) => {
  const purchaseSql = `SELECT
    IFNULL(SUM(purchase.purchase_amount), 0) AS total_purchases_pending
    FROM
        user
    LEFT JOIN
        purchase ON user.id = purchase.user_id AND purchase.status <> 'paga';`;

  const usersSql = `SELECT user.*, IFNULL(SUM(purchase.purchase_amount), 0) AS total_purchases
                       FROM user
                       LEFT JOIN purchase ON user.id = purchase.user_id AND purchase.status <> 'paga'
                       GROUP BY user.id ORDER BY name ASC`; // Query para exibir a soma das compras pendentes na página de clientes

  pool.query(usersSql, (err, userData) => {
    if (err) {
      console.log(err);
      req.flash("error_msg", "Erro ao buscar clientes!");
      res.redirect("/");
    }

    pool.query(purchaseSql, (err, purchasesData) => {
      if (err) {
        console.log(err);
        req.flash("error_msg", "Erro ao calcular o total das compras");
        res.redirect("/");
      }
      const totalPurchases = purchasesData[0].total_purchases_pending;

      res.render(basePath + "users", { users: userData, totalPurchases });
    });
  });
});

router.get("/client/:id", eAdmin, (req, res) => {
  const id = req.params.id;

  const userSql = `SELECT * FROM user WHERE id = ?`;
  const purchasesSql = `
    SELECT purchase.purchase_amount, purchase.purchase_date, purchase.id, purchase.status
    FROM purchase
    WHERE purchase.user_id = ?
    ORDER BY purchase.status = 'paga';`; // Ordena as compras por data mais recente
  // Query para selecionar as compras do cliente e dados que serão exibidos na view

  const total_purchasesSql = `
    SELECT IFNULL(SUM(purchase_amount), 0) AS total_purchases
    FROM purchase
    WHERE user_id = ? AND status <> 'paga';`;

  pool.query(userSql, [id], (err, userData) => {
    if (err) {
      req.flash("error_msg", "Erro ao buscar usuário");
      res.redirect("/admin/clients");
      console.log(err);
    }

    pool.query(purchasesSql, [id], (err, purchasesData) => {
      if (err) {
        req.flash("error_msg", "Erro ao buscar compras");
        res.redirect("/admin/clients");
        console.log(err);
      }

      pool.query(total_purchasesSql, [id], (err, totalPurchaseData) => {
        if (err) {
          req.flash("error_msg", "Erro ao buscar o total das compras");
          res.redirect("/admin/clients");
          console.log(err);
        }

        const user = userData[0];
        const purchases = purchasesData;
        const totalPurchases = totalPurchaseData[0].total_purchases;
        res.render(basePath + "user", { user, purchases, totalPurchases });
      });
    });
  });
});

router.get("/search", eAdmin, (req, res) => {
  const name = req.query.name;

  const sql = `SELECT * FROM user WHERE name = ?`; // Query para busca de um cliente por meio

  pool.query(sql, [name], (err, data) => {
    if (err) {
      req.flash("error_msg", "Erro ao buscar usuário");
      res.redirect("/admin/clients");
      console.log(err);
    }
    const user = data[0];
    res.render(basePath + "searchresults", { user });
  });
});

router.post("/insertuser", eAdmin, (req, res) => {
  var erros = [];

  // Validação de criação de conta
  if (
    !req.body.name ||
    typeof req.body.name == undefined ||
    req.body.name == null
  ) {
    erros.push({ texto: "Nome inválido" });
  }

  if (
    !req.body.password ||
    typeof req.body.password == undefined ||
    req.body.password == null
  ) {
    erros.push({ texto: "Senha inválida" });
  }

  if (req.body.password.length < 4) {
    erros.push({ texto: "Senha muito pequena" });
  }

  if (req.body.password != req.body.password2) {
    erros.push({ texto: "As senhas são diferentes" });
  }

  if (erros.length > 0) {
    res.render(basePath + "newuser", { erros: erros });
  } else {
    const name = req.body.name;
    const password = req.body.password;
    // Check if user exist

    
    const nameSql = `SELECT * FROM user WHERE name = ?`;

    pool.query(nameSql, [name], (err, nameData) => {
      if (nameData.length > 0) {
        req.flash(
          "error_msg",
          "Já existe uma conta com esse nome no nosso sistema"
        );
        erros.push({ texto: "Esse nome já existe, tente novamente!" });
        res.redirect("/admin/insertuser");
      } else {
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, (err, hash) => {
          if (err) {
            req.flash("error_msg", "Não foi possível cadastrar o cliente");
            res.redirect("/");
          }

          // Salvar o hash no banco
          const sql = `INSERT INTO user (name, password) VALUES (?, ?)`;
          const data = [name, hash];

          pool.query(sql, data, (err) => {
            if (err) {
              console.log(err);
              req.flash("error_msg", "Não foi possível cadastrar o cliente");
              res.redirect("/");
            }
            req.flash("success_msg", "Cliente cadastrado com sucesso!");
            res.redirect("/admin/clients");
          });
        });
      }
    });
  }
});

router.get("/clients/edit/:id", eAdmin, (req, res) => {
  const id = req.params.id;

  const userSql = `SELECT * FROM user WHERE id = ?`;

  pool.query(userSql, [id], (err, userData) => {
    if (err) {
      console.log(err);
      req.flash("error_msg", "Erro ao buscar usuário");
      res.redirect("/admin/clients");
    }
    const user = userData[0];

    res.render(basePath + "edituser", { user });
  });
});

router.post("/updateclient", eAdmin, (req, res) => {
  const id = req.body.id;
  var erros = [];

  // Validação de criação de conta
  if (
    !req.body.name ||
    typeof req.body.name == undefined ||
    req.body.name == null
  ) {
    erros.push({ texto: "Nome inválido" });
  }

  if (
    !req.body.password ||
    typeof req.body.password == undefined ||
    req.body.password == null
  ) {
    erros.push({ texto: "Senha inválida" });
  }

  if (req.body.password.length < 4) {
    erros.push({ texto: "Senha muito pequena" });
  }

  if (erros.length > 0) {
    req.flash("error_msg", erros); // Armazena os erros na sessão
    res.redirect(`/admin/clients/edit/${id}`);
  } else {
    const name = req.body.name;
    const password = req.body.password;
    const id = req.body.id;

    const nameSql = `SELECT * FROM user WHERE name = ?`;

    pool.query(nameSql, [name], (err, nameData) => {
      if (nameData.length > 0) {
        req.flash(
          "error_msg",
          "Já existe uma conta com esse nome no nosso sistema"
        );
        erros.push({ texto: "Esse nome já existe, tente novamente!" });
        res.redirect(`/clients/edit/${id}`);
      } else {
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, (err, hash) => {
          if (err) {
            req.flash("error_msg", "Não foi possível cadastrar o cliente");
            res.redirect("/");
          }

          const sql = "UPDATE user SET name = ?, password = ? WHERE id = ?";
          const data = [name, hash, id];
          pool.query(sql, data, (err) => {
            if (err) {
              console.error(err);
              req.flash("error_msg", "Não foi possível salvar as atualizações");
              res.redirect("/admin/clients");
            }
            req.flash("success_msg", "Os dados foram atualizados com sucesso!");
            res.redirect("/admin/clients");
          });
        });
      }
    });
  }
});

router.post("/clients/remove/:id", eAdmin, (req, res) => {
  const id = req.params.id;

  const purchaseSql = "DELETE FROM purchase WHERE user_id = ?";
  const userSql = "DELETE FROM user WHERE id = ?";

  pool.query(purchaseSql, [id], (err, purchaseResult) => {
    if (err) {
      console.log(err);
      req.flash("error_msg", "Erro ao buscar compra");
      res.redirect("/admin/clients");
    }

    pool.query(userSql, [id], (err, userResult) => {
      if (err) {
        console.log(err);
        return;
      }
      req.flash("success_msg", "Cliente removido com sucesso!");
      res.redirect("/admin/clients");
    });
  });
});

router.get("/newpurchase/:id", eAdmin, (req, res) => {
  const id = req.params.id;

  const sql = `SELECT * FROM user WHERE id = ?`;

  pool.query(sql, [id], (err, data) => {
    if (err) {
      console.log(err);
      req.flash("error_msg", "Erro ao buscar usuário");
      res.redirect("/admin/clients");
    }

    const user = data[0];

    if (!user) {
      req.flash("error_msg", "Erro ao buscar usuário");
      res.redirect("/admin/clients");
    }

    res.render(basePath + "newpurchase", { user });
  });
});

router.post("/insertpurchase/:id", eAdmin, (req, res) => {
  const user_id = req.params.id;
  // Obtém os dados da compra do formulário
  const { purchase_amount, purchase_date } = req.body;

  // Insere a compra na tabela 'purchase'
  const sql = `INSERT INTO purchase (user_id, purchase_amount, purchase_date) VALUES (?, ?, ?)`;
  const values = [user_id, purchase_amount, purchase_date];

  pool.query(sql, values, (err, result) => {
    if (err) {
      req.flash("error_msg", "Erro ao inserir compra");
      res.redirect("/admin/clients");
    }
    req.flash("success_msg", "Compra adicionada com sucesso!");
    res.redirect("/admin/clients");
  });
});

router.post("/paypurchase/:purchaseId", eAdmin, (req, res) => {
  const purchaseId = req.params.purchaseId;
  const id = req.body.id;

  console.log(id);

  const sql = `UPDATE purchase SET status = 'paga' WHERE id = ?`;

  pool.query(sql, [purchaseId], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar o status da compra:", err);
      req.flash("error_msg", "Erro ao atualizar o status da compra");
      res.redirect(`/admin/clients`);
    }
    req.flash("success_msg", "Compra paga com sucesso!");
    res.redirect(`/admin/clients`); // Redirecione para a página do cliente após o pagamento
  });
});

router.post("/client/:id/pay", eAdmin, (req, res) => {
  const id = req.params.id;

  const payPurchasesSql = `
    UPDATE purchase
    SET status = 'paga'
    WHERE user_id = ? AND status <> 'paga';`;

  pool.query(payPurchasesSql, [id], (err, result) => {
    if (err) {
      req.flash("error_msg", "Erro ao pagar as compras");
      res.redirect("/admin/clients");
      console.log(err);
    }

    req.flash("success_msg", "Compras pagas com sucesso!");
    res.redirect(`/admin/client/${id}`);
  });
});

module.exports = router;
