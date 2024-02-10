const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
 email: {
  require: true,
  type: String,
 },
 name: {
  require: true,
  type: String,
 },
 paymentInfo: {
  stripeCustomerId: String,
  plan: {
   type: String,
   default: "none",
  },
  startDate: {
   type: String,
   default: Date.now(),
  },
  endDate: {
   type: String,
   default: Date.now(),
  },
 },
 profiles: [
  {
   type: mongoose.Schema.Types.ObjectId,
   ref: "profile",
  },
 ],
 presets: [
  {
   type: mongoose.Schema.Types.ObjectId,
   ref: "preset",
  },
 ],
 operations: [
  {
   type: mongoose.Schema.Types.ObjectId,
   ref: "operation",
  },
 ],
 templates: [
  {
   type: mongoose.Schema.Types.ObjectId,
   ref: "template",
  },
 ],
 live_updates: [
  {
   message: String,
   messageType: String,
   createdAt: {
    type: Date,
    default: new Date(0),
   },
  },
  {
   required: true,
  },
 ],
 usersDMed: [
  {
   id: String,
  },
 ],
});

const User = mongoose.models.UserData || mongoose.model("UserData", UserSchema);

module.exports = User;
