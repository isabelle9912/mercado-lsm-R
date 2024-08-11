// Modules for express and MVC
const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");

// helper
const { eClient } = require("../helpers/eClient");

router.get("/login", clientController.login);
router.post("/login", clientController.loginPost);
router.get("/logout", clientController.logout);
router.get("/pix", eClient, clientController.showPix)
router.get("/:id", eClient, clientController.showPurchases);

module.exports = router;
