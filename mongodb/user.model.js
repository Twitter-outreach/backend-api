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
   type: Date,
   default: Date.now(),
   required: true,
  },
  endDate: {
   type: Date,
   default: Date.now(),
  },
 },
 profiles: [
  {
   userUrl: String,
   auth_tokens: {
    profileUrl: String,
    auth_token: String,
    ct0: String,
   },
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
 users_DMed: [
  {
   id: String,
  },
 ],
});

const User = mongoose.models.UserData || mongoose.model("UserData", UserSchema);

module.exports = User;
