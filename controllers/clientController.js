// Modules for ORM, CRIPTOGRAPHY and MODELS
const { where } = require("sequelize");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const bcrypt = require("bcrypt");
const { trace } = require("../router/clientRoutes");

module.exports = class clientController {
  static async showPurchases(req, res) {
    const id = req.params.id;
    try {
      const client = await User.findOne({ where: { id: id } });

      if (!client) {
        req.flash("error_msg", "Não foi possível encontrar o cliente!");
        return res.redirect("/");
      }

      const purchases = await Purchase.findAll({
        where: { UserId: id },
      });
      const mappedPurchases = purchases.map((purchase) => purchase.dataValues);

      // Calculate total of "pendente" purchases
      const totalPurchases = purchases.reduce((acc, purchase) => {
        if (purchase.status === "pendente") {
          acc += purchase.purchase_amount;
        }
        return acc;
      }, 0);

      // Order purchases for status, "pentente" first
      mappedPurchases.sort((a, b) => {
        if (a.status === "pendente" && b.status !== "pendente") return -1;
        if (a.status !== "pendente" && b.status === "pendente") return 1;
        return 0;
      });

      res.render("client/purchases", {
        client: client.dataValues,
        purchases: mappedPurchases,
        totalPurchases: totalPurchases,
      });
    } catch (error) {
      req.flash("error_msg", "Não foi possível encontrar o cliente!");
      req.session.save(() => {
        return res.redirect("/");
      });
    }
  }

  // Login
  static login(req, res) {
    res.render("client/login");
  }
  static async loginPost(req, res) {
    const { name, password } = req.body;

    // find user
    const user = await User.findOne({ where: { name: name } });

    if (!user) {
      req.flash("message", "Usuário não encontrado!");
      res.render("client/login");

      return;
    }

    // compare password
    const passwordMatch = bcrypt.compareSync(password, user.password);

    if (!passwordMatch) {
      req.flash("error_msg", "Cliente não encontrado!");
      res.redirect("/client/login");
      return;
    }

    // name for front
    const fullName = user.name;
    const firstName = fullName.split(" ")[0];
    req.session.username = firstName;

    // auth user
    req.session.userid = user.id;
    req.session.useradmin = user.eAdmin;

    req.flash("message", "Login realizado com sucesso!");
    if (req.session.useradmin == "admin") {
      req.session.save(() => {
        return res.redirect("/admin/clients");
      });
    } else {
      req.session.save(() => {
        return res.redirect(`/client/${req.session.userid}`);
      });
    }
  }

  // Logout
  static logout(req, res) {
    req.session.destroy();
    res.redirect("/client/login");
  }
}; // Module.exports end
