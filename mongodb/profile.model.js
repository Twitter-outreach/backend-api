const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
 user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "user",
 },
 url: String,
 status: String,
 profilePicture: String,
 name: String,
 authTokens: {
  auth_token: String,
  ct0: String,
 },
 usersDMed: [
  {
   id: String,
  },
 ],
 statistics: [
  {
   date: String,
   usersDMed: [
    {
     id: String,
     name: String,
    },
   ],
   usersResponded: [
    {
     id: String,
     name: String,
    },
   ],
  },
 ],
 operations: [
  {
   type: mongoose.Schema.Types.ObjectId,
   ref: "operation",
  },
 ],
});

const Profile =
 mongoose.models.profile || mongoose.model("profile", ProfileSchema);

module.exports = Profile;
