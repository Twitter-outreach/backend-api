// const serverless = require("serverless-http");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const connectToDB = require("./mongodb/connect.js");
const Op = require("./mongodb/operation.model.js");
const User = require("./mongodb/user.model.js");
const { sendDMs, sortUsers } = require("./lib");

const app = express();
app.use(express.json());
app.use(cors());
const port = 3030;

app.listen(port, (req, res) => {
 console.log("we are up and running");
 console.log(`Server is running on PORT: ${port}`);
});

// creating routes
app.get("/api", (req, res) => {
 res.send({ message: "Hello world!" });
 console.log("Hello world!");
});

app.get("/api/scrape", async (req, res) => {
 const {
  url,
  scrapeOption,
  followerRange,
  excludeBioWords,
  salesLetter,
  tokens,
  bioIncludes,
  userId,
  verified,
  excludeLocation,
 } = req.query;
 console.log(req.query);

 //  if (!url) throw new Error("no url send");
 //  if (!tokens) throw new Error("auth tokens required");

 await connectToDB();

 const user_url = new URL(url);
 const parts = user_url.pathname.split("/");
 const username = parts[1];

 const userDataOptions = {
  method: "GET",
  url: `https://twitter-api-v1-1-enterprise.p.rapidapi.com/base/apitools/${
   scrapeOption === "followers" ? "followersList" : "followingsList"
  }`,
  params: {
   apiKey:
    "2WLXZk9kacMXhHxj2cRg19bsuJ98XiQL0ndQ94kMdciuz|1574242047661207552-3jI04wPRb0tVkUfFjR4VzJW19ZnQz3",
   screenName: username,
   cursor: "-1",
  },
  headers: {
   "X-RapidAPI-Key": "0b85afc0b5msh13b76112a3083e1p107698jsn711d5b3650b2",
   "X-RapidAPI-Host": "twitter-api-v1-1-enterprise.p.rapidapi.com",
  },
 };

 const userData = await axios.request(userDataOptions);
 const parsedData = await JSON.parse(userData.data.data);
 const users = parsedData.users;

 const user = await User.findById(userId).select("_id users_DMed liveUpdate");

 const op = await Op.create({
  user: userId,
  usersDMed: [],
  usersResponded: [],
  salesLetter: salesLetter,
  status: "PENDING",
  tokens,
 });
 await User.findOneAndUpdate(
  { _id: user._id },
  {
   $push: {
    operations: op._id,
   },
  }
 );

 console.log(op);

 const sortedUsers = await sortUsers(users, {
  followerRange,
  excludeBioWords,
  usersDMed: user.usersDmed,
  bioIncludes,
  verified,
  excludeLocation,
 });

 console.log(sortedUsers);

 await User.findOneAndUpdate(
  { _id: user._id },
  {
   $push: {
    live_updates: {
     messageType: "start_initialization",
     message: `Scape initialized: ${sortedUsers.length} prospects found`,
    },
   },
  }
 );

 console.log(`Scrape initialized: ${sortedUsers.length} prospects found`);
 const currentUserId = JSON.stringify(user._id);
 await sendDMs(sortedUsers, tokens, salesLetter, op, currentUserId);

 const totalDms = await Op.findById(op.id).select("usersDMed");

 await Op.findOneAndUpdate(
  { _id: op._id },
  {
   status: "COMPLETED",
  }
 );

 await User.findOneAndUpdate(
  { _id: user._id },
  {
   $push: {
    live_updates: {
     messageType: "done",
     message: `Scrape done: ${totalDms.usersDMed.length} Dms sent`,
    },
   },
  }
 );
 console.log(`Scrape done: ${totalDms.usersDMed.length} Dms sent`);
 console.log("scrape is complete");
 return;
});
