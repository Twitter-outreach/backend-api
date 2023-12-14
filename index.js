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

 // const op = await Op.create({
 //  user: userId,
 //  profile: profileId,
 //  usersDMed: [],
 //  usersResponded: [],
 //  salesLetter: salesLetter,
 //  status: "PENDING",
 //  // tokens: profile.authTokens,
 // });

 // await User.findOneAndUpdate(
 //  { _id: userId },
 //  {
 //   $push: {
 //    operations: op._id,
 //   },
 //  }
 // );

 // console.log(op);

 // await Profile.findOneAndUpdate(
 //  { _id: profileId },
 //  {
 //   status: "RUNNING",
 //   $push: {
 //    operations: op._id,
 //   },
 //  }
 // );

 const user_url = new URL(url);
 const parts = user_url.pathname.split("/");
 const username = parts[1];

 let users = [];
 let nextPageId = "-1";
 let limitCount = 0;
 let scrapedUserId;

 while (nextPageId != 0 || limitCount > 2500) {
  // const options = { method: "GET", headers: { accept: "*/*" } };
  // if (!scrapedUserId) {
  //  const verifiedOptions = {
  //   method: "GET",
  //   url: "https://twitter.utools.me/api/base/apitools/userByScreenNameV2",
  //   params: {
  //    apiKey:
  //     "NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6|1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI",
  //    screenName: username,
  //   },
  //   headers: { accept: "*/*" },
  //  };
  //  axios.request(verifiedOptions);
  //  const scrapedUserData = await axios.request(verifiedOptions);

  //  const parsedScrapedUserData = await JSON.parse(scrapedUserData.data.data);

  //  // console.log(parsedScrapedUserData.data.user.result);
  //  // console.log(parsedScrapedUserData.data.user.result.rest_id);
  //  scrapedUserId = parsedScrapedUserData.data.user.result.rest_id;
  // }
  // let options = {};
  // if (verified === "true") {
  //  options = {
  //   method: "GET",
  //   url: "https://twitter2.good6.top/api/base/apitools/blueVerifiedFollowersV2",
  //   params: {
  //    apiKey:
  //     "NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6|1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI",
  //    userId: scrapedUserId,
  //    cursor: nextPageId,
  //   },
  //   headers: { accept: "*/*" },
  //  };

  //  // const userData = await axios.request(options);

  //  // const parsedData = await JSON.parse(userData.data);
  // } else {
  options = {
   method: "GET",
   url: `https://twitter2.good6.top/api/base/apitools/${
    scrapeOption === "followers" ? "followersList" : "followingsList"
   }`,
   params: {
    apiKey:
     "NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6|1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI",
    cursor: nextPageId,
    screenName: username,
   },
   headers: { accept: "*/*" },
  };

  // const userData = await axios.request(options);

  // const parsedData = await JSON.parse(userData.data.data);
  // }

  const userData = await axios.request(options);

  // console.log(userData);

  let parsedData;
  // if (verified === "true") {
  //  const res = await JSON.parse(userData.data.data);
  //  console.log("res log 1: ", res);
  //  parsedData = res.data.user.result.timeline.timeline.instructions.entries;
  //  console.log("res log 2: ", parsedData);
  // } else {
  parsedData = await JSON.parse(userData.data.data);
  // }

  // console.log(parsedData);

  if (!parsedData) return;

  const parsedUserData = parsedData.users?.map(
   ({ id_str, name, location, description, followers_count }) => {
    return {
     id: id_str,
     name,
     location,
     description: description.toLowerCase(),
     followers: followers_count,
    };
   }
  );

  nextPageId = parsedData.next_cursor_str;
  console.log(parsedUserData?.length);
  limitCount++;
  users = [...users, ...parsedUserData];
 }

 console.log("users: ", users);
 console.log("users fetched: ", users.length);
 const user = await User.findById(userId).select("_id usersDMed liveUpdate");

 console.log("parsing started");
 const sortedUsers = sortUsers(users, {
  followerRange,
  bioExclude: excludeBioWords,
  usersDMed: user.usersDMed,
  bioIncludes,
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

 const profile = await Profile.findById(profileId).select("_id authTokens");
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

app.get("/api/record", async (req, res) => {
 await connectToDB();

 const profiles = await Profile.find({});
 // .populate({
 //  path: "profile",
 //  model: Profile,
 //  select: "_id statistics authTokens",
 // });

 // console.log(ops);

 profiles.map(async (profile) => {
  // const profile = op.profile;

  // console.log(profile);

  const options = { method: "GET", headers: { accept: "*/*" } };

  const data = await axios.request(
   `https://twitter.utools.me/api/base/apitools/getDMSListV2?apiKey=NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6%7C1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI&auth_token=${profile.authTokens.auth_token}&ct0=${profile.authTokens.ct0}&cursor=-1`,
   options
  );

  const parsedDMs = JSON.parse(data.data.data);
  const dms = parsedDMs.user_events.entries;

  let days = [];
  let DMedUsers = [];
  let userResponded = [];
  // let dmsRepliedId = [];
  console.log(dms);
  profile.statistics.forEach(async (day) => {
   day.usersDMed.forEach((user) => {
    for (let message of dms) {
     if (
      message?.message?.message_data.sender_id &&
      message?.message?.message_data.sender_id === user.id
     ) {
      let client = message.message?.message_data;

      // console.log(client);

      // dmsRepliedId.push({
      //  id: client.sender_id,
      // });

      DMedUsers.push({
       id: user.id,
       name: user.name,
      });

      userResponded.push({
       id: user.id,
       name: user.name,
      });

      console.log("this user has replied: ", user.name);
     } else {
      DMedUsers.push({
       id: user.id,
       name: user.name,
      });
      // console.log("this user has replied: ", user.name);
     }
    }
   });

   // console.log(dayData);

   // const users = day.usersDMed;
   let uniqueDMedUsers = [
    ...new Map(DMedUsers.map((user) => [user.id, user])).values(),
   ];
   let uniqueDMedResponded = [
    ...new Map(userResponded.map((user) => [user.id, user])).values(),
   ];

   days.push({
    date: day.date,
    usersDMed: uniqueDMedUsers,
    usersResponded: uniqueDMedResponded,
   });

   console.log(DMedUsers, userResponded);

   // console.log(uniqueUsers);
   // day.usersResponded = uniqueUsers;
  });
  console.log(days);

  await Profile.findByIdAndUpdate(
   {
    _id: profile._id,
   },
   {
    statistics: days,
   }
  );
  days = [];
  DMedUsers = [];
  userResponded = [];
  // console.log(day);

  // op.usersDMed.forEach((user) => {
  //  for (let message of dms) {
  //   if (
  //    message?.message?.message_data.sender_id &&
  //    message?.message?.message_data.sender_id === user.id
  //   ) {
  //    let client = message.message?.message_data;
  //    console.log(client);
  //    dmsRepliedId.push({
  //     id: client.sender_id,
  //    });
  //   }
  //  }
  // });

  //  dmsRepliedId = [...new Set(dmsRepliedId)];
  //  console.log(dmsRepliedId);

  //  await Op.findOneAndUpdate(
  //   { _id: op._id },
  //   {
  //    usersResponded: [...dmsRepliedId],
  //   }
  //  );
 });
});
