const mongoose = require("mongoose");

const OperationSchema = new mongoose.Schema(
 {
  title: String, 
  user: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "user",
  },
  profile: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "profile",
  },
  status: String,
  usersDMed: [
   {
    id: String,
   },
  ],
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
