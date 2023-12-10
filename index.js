const express = require("express");
const cors = require("cors");
const axios = require("axios");
const connectToDB = require("./mongodb/connect.js");
const Op = require("./mongodb/operation.model.js");
const User = require("./mongodb/user.model.js");
const { sendDMs, sortUsers } = require("./lib");
const Profile = require("./mongodb/profile.model.js");

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
  profileId,
  userId,
  url,
  scrapeOption,
  followerRange,
  excludeBioWords,
  salesLetter,
  bioIncludes,
  verified,
  excludeLocation,
 } = req.query;
 console.log(req.query);

 await connectToDB();

 const profile = await Profile.findById(profileId).select("_id authTokens");

 const op = await Op.create({
  user: userId,
  profile: profileId,
  usersDMed: [],
  usersResponded: [],
  salesLetter: salesLetter,
  status: "PENDING",
  tokens: profile.authTokens,
 });

 await User.findOneAndUpdate(
  { _id: userId },
  {
   $push: {
    operations: op._id,
   },
  }
 );

 console.log(op);

 await Profile.findOneAndUpdate(
  { _id: profileId },
  {
   status: "RUNNING",
   $push: {
    operations: op._id,
   },
  }
 );

 const user_url = new URL(url);
 const parts = user_url.pathname.split("/");
 const username = parts[1];

 let users = [];
 let nextPageId = "-1";
 let limitCount = 0;

 while (nextPageId != 0 || limitCount > 50) {
  const userDataOptions = {
   method: "GET",
   url: `https://twitter-api-v1-1-enterprise.p.rapidapi.com/base/apitools/${
    scrapeOption === "followers" ? "followersList" : "followingsList"
   }`,
   params: {
    apiKey:
     "2WLXZk9kacMXhHxj2cRg19bsuJ98XiQL0ndQ94kMdciuz|1574242047661207552-3jI04wPRb0tVkUfFjR4VzJW19ZnQz3",
    screenName: username,
    cursor: nextPageId,
   },
   headers: {
    "X-RapidAPI-Key": "0b85afc0b5msh13b76112a3083e1p107698jsn711d5b3650b2",
    "X-RapidAPI-Host": "twitter-api-v1-1-enterprise.p.rapidapi.com",
   },
  };

  const userData = await axios.request(userDataOptions);
  // console.log(userData.next_cursor_str);
  const parsedData = await JSON.parse(userData.data.data);

  console.log(await parsedData.next_cursor_str);

  if (!parsedData) return;

  const parsedUserData = parsedData.users?.map(
   ({ id_str, name, location, description, followers_count, verified }) => {
    return {
     id: id_str,
     name,
     location,
     description: description.toLowerCase(),
     followers: followers_count,
     verified,
    };
   }
  );

  nextPageId = parsedData.next_cursor_str;
  // console.log(parsedUserData);
  console.log(parsedUserData.length);
  limitCount++;
  users = [...users, ...parsedUserData];
 }

 console.log("users fetched: ", users.length);
 const user = await User.findById(userId).select("_id usersDMed liveUpdate");

 console.log("parsing started");
 const sortedUsers = sortUsers(users, {
  followerRange,
  bioExclude: excludeBioWords,
  usersDMed: user.usersDMed,
  bioIncludes,
  verified,
  excludeLocation,
 });

 // console.log(sortedUsers);
 console.log("found prospects: ", sortedUsers.length);

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

 const opId = op._id.toString();
 await sendDMs(sortedUsers, profile, salesLetter, opId, currentUserId);

 const totalDms = await Op.findById(op.id).select("usersDMed");

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

 await Op.findOneAndUpdate(
  { _id: op._id },
  {
   status: "COMPLETED",
  }
 );

 await Profile.findOneAndUpdate(
  { _id: profileId },
  {
   status: "AVAILABLE",
  }
 );
 console.log(`Scrape done: ${totalDms.usersDMed.length} Dms sent`);
 console.log("scrape is complete");
 return;
});

app.get("/api/scrape", async (req, res) => {});
