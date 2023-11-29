const mongoose = require("mongoose");

const OperationSchema = new mongoose.Schema(
 {
  user: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "user",
  },
  status: String,
  usersDMed: [
   {
    id: String,
   },
  ],
  tokens: {
   auth_token: String,
   ct0: String,
  },
  usersResponded: [{ id: String }],
  salesLetter: String,
 },
 {
  timestamps: true,
 }
);

const Op =
 mongoose.models.operation || mongoose.model("operation", OperationSchema);

module.exports = Op;
