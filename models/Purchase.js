const { DataTypes } = require("sequelize");

const db = require("../db/conn");

const User = require("./User");

const Purchase = db.define("Purchase", {
  purchase_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    require: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    require: true,
    defaultValue: "pendente",
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
  },
});

Purchase.belongsTo(User);
User.hasMany(Purchase);

module.exports = Purchase;
