// Modules for ORM, CRIPTOGRAPHY and MODELS
const { where } = require("sequelize");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const bcrypt = require("bcrypt");
const { trace } = require("../router/adminRoutes");
const { Op } = require("sequelize");

module.exports = class adminController {
  static async showClients(req, res) {
    try {
      const clients = await User.findAll();
      const mappedClients = clients.map((client) => client.dataValues);

      let totalPurchasesAllClients = 0;

      for (let client of mappedClients) {
        const purchases = await Purchase.findAll({
          where: { UserId: client.id, status: "pendente" },
        });

        const totalPurchases = purchases.reduce((acc, purchase) => {
          acc += purchase.purchase_amount;
          return acc;
        }, 0);

        totalPurchasesAllClients += totalPurchases;
        client.totalPurchases = totalPurchases;
      }

      res.render("admin/clients", {
        clients: mappedClients,
        totalPurchases: totalPurchasesAllClients,
      });
    } catch (error) {
      req.flash("error_msg", "Não foi possível encontrar os clientes!");
      res.redirect("/");
    }
  }

  static async showPurchases(req, res) {
    const id = req.params.id;
    try {
      const client = await User.findOne({ where: { id: id } });

      if (!client) {
        req.flash("error_msg", "Não foi possível encontrar o cliente!");
        return res.redirect("/admin/clients");
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

      res.render("admin/client", {
        client: client.dataValues,
        purchases: mappedPurchases,
        totalPurchases: totalPurchases,
      });
    } catch (error) {
      req.flash("error_msg", "Não foi possível encontrar o cliente!");
      res.redirect("/");
    }
  }

  static async registerPurchase(req, res) {
    const id = req.params.id;

    try {
      const client = await User.findOne({ where: { id: id } });

      if (!client) {
        req.flash("error_msg", "Não foi possível encontrar o cliente!");
        return res.redirect("/admin/clients");
      }

      const plainClient = client.get({ plain: true }); // Convertendo para objeto simples

      res.render("admin/purchase", { client: plainClient });
    } catch (error) {
      req.flash("error_msg", "Erro ao encontrar o cliente!");
      return res.redirect("/admin/clients");
    }
  }

  static async registerPurchaseSave(req, res) {
    const purchase = {
      purchase_amount: req.body.purchase_amount,
      purchase_date: req.body.purchase_date,
      UserId: req.body.id,
    };

    // Validation
    if (!purchase.purchase_amount || isNaN(purchase.purchase_amount)) {
      req.flash("error_msg", "Valor de compra inválido");
      res.redirect(`/admin/addPurchase/${id}`);
      return;
    }

    try {
      await Purchase.create(purchase);

      req.flash("success_msg", "Compra adicionada com sucesso!");

      req.session.save(() => {
        res.redirect(`/admin/clients`);
      });
    } catch (error) {
      console.log("Aconteceu um erro: " + error);
    }
  }

  static async updatePurchase(req, res) {
    const id = req.params.id;

    try {
      const purchase = await Purchase.findOne({ where: { id: id } });

      if (!purchase) {
        req.flash("error_msg", "Não foi possível encontrar a compra!");
        return res.redirect("/admin/clients");
      }

      const plainPurchase = purchase.get({ plain: true }); // Convertendo para objeto simples

      res.render("admin/editPurchase", { purchase: plainPurchase });
    } catch (error) {
      req.flash("error_msg", "Erro ao encontrar a compra!");
      return res.redirect("/admin/clients");
    }
  }

  static async updatePurchasePost(req, res) {
    const id = req.body.id;
    const purchase = {
      purchase_amount: req.body.purchase_amount,
      purchase_date: req.body.purchase_date,
      status: req.body.status,
    };

    // Validation form
    if (
      !purchase.purchase_amount ||
      typeof purchase.purchase_amount == undefined ||
      purchase.purchase_amount == null ||
      isNaN(purchase.purchase_amount)
    ) {
      req.flash("error_msg", "Valor inválido!");
      res.redirect(`/admin/editPurchase/${id}`);
      return;
    }
    if (
      !purchase.purchase_date ||
      typeof purchase.purchase_date == undefined ||
      purchase.purchase_date == null
    ) {
      req.flash("error_msg", "Data inválida!");
      res.redirect(`/admin/editPurchase/${id}`);
      return;
    }

    Purchase.update(purchase, { where: { id: id } })
      .then(() => {
        req.flash("success_msg", "Compra editada com sucesso!");
        req.session.save(() => {
          res.redirect(`/admin/clients`);
        });
        return;
      })
      .catch((error) => {
        console.log("Aconteceu um erro: " + error);
      });
  } // End updatePostPurchase

  static async removePurchase(req, res) {
    const idclient = req.params.id;

    const idpurchase = req.body.id; // purchase

    Purchase.destroy({ where: { id: idpurchase } })
      .then(() => {
        req.flash("success_msg", "Compra removida com sucesso!");
        req.session.save(() => {
          return res.redirect(`/admin/clients`);
        });
      })
      .catch((error) => {
        req.flash(
          "error_msg",
          "Não foi possível deletar a compra, tente novamente!"
        );
        return res.redirect(`/admin/clients`);
      });
  }

  static async payPurchase(req, res) {
    const idpurchase = req.body.id; // purchase

    Purchase.update({ status: "paga" }, { where: { id: idpurchase } })
      .then(() => {
        req.flash("success_msg", "Compra paga com sucesso!");
        req.session.save(() => {
          return res.redirect(`/admin/clients`);
        });
      })
      .catch((error) => {
        req.flash(
          "error_msg",
          "Não foi possível pagar a compra, tente novamente!"
        );
        return res.redirect(`/admin/clients`);
      });
  }

  static async payPurchases(req, res) {
    const id = req.params.id; // purchase

    Purchase.update({ status: "paga" }, { where: { UserId: id } })
      .then(() => {
        req.flash("success_msg", "Compras pagas com sucesso!");
        req.session.save(() => {
          return res.redirect(`/admin/purchase/${id}`);
        });
      })
      .catch((error) => {
        req.flash(
          "error_msg",
          "Não foi possível pagar as compras, tente novamente!"
        );
        return res.redirect(`/admin/purchase/${id}`);
      });
  }

  static registerClients(req, res) {
    res.render("admin/register");
  }

  static async registerSave(req, res) {
    const { name, password, password2 } = req.body;

    // Validation form
    if (!name || typeof name == undefined || name == null) {
      req.flash("error_msg", "Nome inválido!");
      res.redirect("/admin/addClient");
      return;
    }

    if (!password || typeof password == undefined || password == null) {
      req.flash("error_msg", "Senha inválida");
      res.redirect("/admin/addClient");
      return;
    }

    if (password.length < 4) {
      req.flash("error_msg", "Senha muito pequena!");
      res.redirect("/admin/addClient");
      return;
    }

    if (password != password2) {
      req.flash("error_msg", "As senhas são diferentes, tente novamente!");
      res.redirect("/admin/addClient");
    }

    // Check if user exist
    const checkUserExists = await User.findOne({ where: { name: name } });

    if (checkUserExists) {
      req.flash("error_msg", "O nome já está em uso, tente novamente!");
      res.redirect("/admin/addClient");
      return;
    }

    // Create password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const user = {
      name,
      password: hashedPassword,
    };

    try {
      const createdUser = await User.create(user);

      // name for front
      const fullName = user.name;
      const firstName = fullName.split(" ")[0];
      req.session.username = firstName;

      // auth user
      req.session.userid = user.id;

      // Initialize session
      req.session.userid = createdUser.id;
      req.session.username = createdUser.name;
      req.flash("success_msg", "Cadastro realizado com sucesso!");

      req.session.save(() => {
        res.redirect("/");
      });
    } catch (error) {
      console.log(error);
    }
  } // End registerPost

  static async updateClient(req, res) {
    const id = req.params.id;

    try {
      const client = await User.findOne({ where: { id: id } });

      const plainClient = client.get({ plain: true }); // Convertendo para objeto simples

      res.render("admin/editClient", { client: plainClient });
    } catch (error) {
      req.flash("error_msg", "Não foi possível encontrar o client!");
      return res.redirect("/admin/clients");
    }
  }

  static async updateClientPost(req, res) {
    const id = req.body.id;
    console.log(id);
    const { name, password, password2 } = req.body;

    // Validation form
    if (!name || typeof name == undefined || name == null) {
      req.flash("error_msg", "Nome inválido!");
      res.redirect(`/admin/editClient/${id}`);
      return;
    }

    if (!password || typeof password == undefined || password == null) {
      req.flash("error_msg", "Senha inválida");
      res.redirect(`/admin/editClient/${id}`);
      return;
    }

    if (password.length < 4) {
      req.flash("error_msg", "Senha muito pequena!");
      res.redirect(`/admin/editClient/${id}`);
      return;
    }

    if (password != password2) {
      req.flash("error_msg", "As senhas são diferentes, tente novamente!");
      res.redirect(`/admin/editClient/${id}`);
      return;
    }

    try {
      // Check if user exist
      const checkUserExists = await User.findOne({
        where: { name: name, id: { [Op.ne]: id } },
      });

      if (checkUserExists) {
        req.flash("error_msg", "O nome já está em uso, tente novamente!");
        res.redirect(`/admin/editClient/${id}`);
        return;
      }

      // Create password
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      const user = {
        name,
        password: hashedPassword,
      };

      await User.update(user, { where: { id: id } });

      req.flash("success_msg", "Cliente editado com sucesso!");

      req.session.save(() => {
        res.redirect(`/admin/clients`);
      });

      return res.redirect("/admin/clients");
    } catch (error) {
      console.log(error);
    }
  } // End updateClientPost

  static async removeClient(req, res) {
    const id = req.params.id;
    User.destroy({ where: { id: id } })
      .then(() => {
        req.flash("success_msg", "Cliente removido com sucesso!");
        req.session.save(() => {
          return res.redirect(`/admin/clients`);
        });
      })
      .catch((error) => {
        req.flash(
          "error_msg",
          "Não foi possível remover o cliente, tente novamente!"
        );
        return res.redirect(`/admin/clients`);
      });
  }
}; // Module.exports end
