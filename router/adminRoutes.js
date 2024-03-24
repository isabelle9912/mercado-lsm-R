// Modules for express and MVC
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// helper
const { eAdmin } = require("../helpers/eAdmin");

router.get("/addClient", adminController.registerClients);
router.post("/addClient", adminController.registerSave);
router.get("/addPurchase/:id", adminController.registerPurchase);
router.post("/addPurchase", adminController.registerPurchaseSave);
router.get("/purchase/:id", adminController.showPurchases);
router.post("/removePurchase", adminController.removePurchase);
router.post("/payPurchase", adminController.payPurchase);
router.post("/payPurchases/:id", adminController.payPurchases);
router.get("/editPurchase/:id", adminController.updatePurchase);
router.post("/editPurchase", adminController.updatePurchasePost);
router.get("/editClient/:id", adminController.updateClient);
router.post("/editClient", adminController.updateClientPost);
router.post("/removeClient/:id", adminController.removeClient);
router.get("/clients", adminController.showClients);

module.exports = router;
