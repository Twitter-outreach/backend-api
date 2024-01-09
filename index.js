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
 let userData = [];
 /*
  * Recursively obtain blue authenticated users
  */
 async function getAllBlueFollowers(apiKey, userId, cursor) {
  try {
   const jsonStr = await getListByUserId(apiKey, userId, cursor);

   const jsonObject = JSON.parse(jsonStr.data);

   const instructions =
    jsonObject.data.user.result.timeline.timeline.instructions;

   for (let i = 0; i < instructions.length; i++) {
    const instruction = instructions[i];

    if (instruction.type === "TimelineAddEntries") {
     const userArrays = instruction.entries;

     for (let j = 0; j < userArrays.length; j++) {
      const content = userArrays[j].content;

      if (content.entryType === "TimelineTimelineItem") {
       const userJson = content.itemContent.user_results.result;

       userData.push(userJson);
       console.log(userData.length);
      } else if (
       content.entryType === "TimelineTimelineCursor" &&
       content.cursorType === "Bottom"
      ) {
       const cursorValue = content.value;
       console.log(`index: ${j}, cursor = ${cursorValue}`);

       if (cursorValue.startsWith("0|")) {
        return;
       }

       await new Promise((resolve) => setTimeout(resolve, 500));
       await getAllBlueFollowers(apiKey, userId, cursorValue);
      }
     }
    }
   }
  } catch (error) {
   console.error(error);
  }
 }

 /*
  * This method calls the v2 followers blue endpoint by user ID
  */
 async function getListByUserId(apiKey, userId, cursor) {
  const url = `https://twitter.utools.me/api/base/apitools/blueVerifiedFollowersV2?apiKey=${encodeURIComponent(
   apiKey
  )}&cursor=${encodeURIComponent(cursor)}&userId=${userId}`;

  try {
   const response = await axios.get(url, {
    headers: {
     accept: "*/*",
    },
   });

   const body = response.data;

   // Record counts for future limiting
   const headers = response.headers;
   for (const headerName of Object.keys(headers)) {
    if (headerName.toLowerCase().includes("limit")) {
     const headerValue = headers[headerName];
    }
   }

   if (response.status === 429) {
    return "1";
   }

   return body;
  } catch (error) {
   console.error(error);
   return "0";
  }
 }

 // Example usage

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
  title,
 } = req.query;
 console.log(req.query);

 await connectToDB();

 const op = await Op.create({
  title,
  user: userId,
  profile: profileId,
  usersDMed: [],
  usersResponded: [],
  salesLetter: salesLetter,
  status: "PENDING",
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

 res.send({ message: "scrape in progress!" });

 const user_url = new URL(url);
 const parts = user_url.pathname.split("/");
 const username = parts[1];

 let users = [];
 let nextPageId = "-1";
 let limitCount = 0;
 // let scrapedUserId;

 let sentDMs = 0;
 let totalDMsSent = 0;
 let usersDMedToday = [];

 const user = await User.findById(userId).select("_id paymentInfo");
 const profileData = await Profile.findById(profileId).select(
  "_id authTokens usersDMed"
 );

 const paymentInfo = user.paymentInfo;

 let maxDMsPerDay = 0;

 switch (paymentInfo.plan) {
  case "price_1ONGFBH5JVWNW8rNbhrFdjii":
   // Execute code for basic plan
   maxDMsPerDay = 70;
   break;
  case "price_1ONGFZH5JVWNW8rNnAzGFJNj":
   // Execute code for standard plan
   maxDMsPerDay = 200;
   break;
  case "price_1ONGFtH5JVWNW8rNL5jDetrl":
   // Execute code for premium plan
   maxDMsPerDay = 500;
   break;
  default:
   console.log("User does not have any of the available plans");
   return;
 }

 //  console.log(profileData);
 const opId = op._id.toString();

 while (nextPageId != 0 || limitCount > 500) {
  const op = await Op.findById(opId).select("_id status");
  let dateObj = new Date();
  let day = dateObj.getDate();
  let month = dateObj.getMonth() + 1; // months from 1-12
  let year = dateObj.getFullYear();
  let currentDate = day + "/" + month + "/" + year;

  if (op.status === "TERMINATED") {
   await Profile.findOneAndUpdate(
    { _id: profileData._id },
    {
     $push: {
      statistics: {
       date: currentDate,
       usersDMed: usersDMedToday,
       usersResponded: [],
      },
     },
    }
   );

   console.log("TERMINATED");
   console.log("STATS RECORDED");
   break;
  }

  let parsedUserData;

  if (verified === "true") {
   const options = { method: "GET", headers: { accept: "*/*" } };

   const scrapeUserData = await axios.request(
    `https://twitter2.good6.top/api/base/apitools/uerByIdOrNameLookUp?apiKey=NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6%7C1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI&screenName=${username}`,
    options
   );
   const parsedScrapeUserData = JSON.parse(scrapeUserData.data.data);

   console.log("parsed stuff", parsedScrapeUserData);
   //
   const apiKey =
    "NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6|1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI";

   const userId = parsedScrapeUserData[0].id_str;
   await getAllBlueFollowers(apiKey, userId, "-1");

   parsedUserData = userData?.map(({ rest_id, legacy }) => {
    return {
     id: rest_id,
     name: legacy.name,
     location: legacy.location.toLowerCase(),
     description: legacy.description.toLowerCase(),
     followers: legacy.followers_count,
    };
   });

   console.log("end users.", parsedUserData);
   console.log("end users.length", parsedUserData.length);

   nextPageId = 0;
   //
  } else {
   const options = {
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

   const userData = await axios.request(options);
   const parsedData = await JSON.parse(userData.data.data);
   if (!parsedData) return;
   parsedUserData = parsedData.users?.map(
    ({ id_str, name, location, description, followers_count }) => {
     return {
      id: id_str,
      name,
      location: location.toLowerCase(),
      description: description.toLowerCase(),
      followers: followers_count,
     };
    }
   );
   nextPageId = parsedData.next_cursor_str;
   console.log(parsedUserData?.length);
  }

  limitCount++;

  users = [...parsedUserData];

  console.log("users fetched: ", users.length);
  console.log("parsing...");

  const sortedUsers = sortUsers(parsedUserData, {
   followerRange,
   bioExclude: excludeBioWords,
   usersDMed: profileData.usersDMed,
   bioIncludes,
   excludeLocation,
  });

  console.log("found prospects: ", sortedUsers.length);

  const currentUserId = JSON.stringify(user._id);

  await sendDMs(
   sortedUsers,
   profileData,
   salesLetter,
   opId,
   currentUserId,
   sentDMs,
   totalDMsSent,
   maxDMsPerDay,
   usersDMedToday
  );

  console.log("another one.");
 }
 let dateObj = new Date();
 let day = dateObj.getDate();
 let month = dateObj.getMonth() + 1; // months from 1-12
 let year = dateObj.getFullYear();
 let currentDate = day + "/" + month + "/" + year;

 const opData = await Op.findById(opId).select("_id status");

 if (opData.status === "PENDING") {
  await Profile.findOneAndUpdate(
   { _id: profileData._id },
   {
    $push: {
     statistics: {
      date: currentDate,
      usersDMed: usersDMedToday,
      usersResponded: [],
     },
    },
   }
  );

  console.log("statistics recorded!");
 }
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

 console.log("scrape is complete");
 return;
});

app.get("/api/record", async (req, res) => {
 await connectToDB();

 const profiles = await Profile.find({}).populate({
  path: "operations",
  model: Op,
  select: "_id usersDMed usersResponded",
 });

 for (let profile of profiles) {
  if (!profile) return;
  if (!profile.authTokens) return;

  const options = { method: "GET", headers: { accept: "*/*" } };

  try {
   const data = await axios.request(
    `https://twitter2.good6.top/api/base/apitools/getDMSListV2?apiKey=NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6%7C1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI&auth_token=${encodeURIComponent(
     profile.authTokens.auth_token
    )}&ct0=${encodeURIComponent(profile.authTokens.ct0)}&cursor=-1`,
    options
   );

   if (data.data.data === "Forbidden") return;

   const parsedDMs = await JSON.parse(data.data.data);
   const dms = parsedDMs.user_events.entries;

   let days = [];
   let DMedUsers = [];
   let userResponded = [];

   profile.statistics.forEach(async (day) => {
    day.usersDMed.forEach((user) => {
     for (let message of dms) {
      if (
       message?.message?.message_data.sender_id &&
       message?.message?.message_data.sender_id === user.id
      ) {
       let client = message.message?.message_data;

       //  console.log(client);
       DMedUsers.push({
        id: user.id,
        name: user.name,
       });

       userResponded.push({
        id: user.id,
        name: user.name,
       });
      } else {
       DMedUsers.push({
        id: user.id,
        name: user.name,
       });
      }
     }
    });

    let uniqueDMedUsers = [
     ...new Map(DMedUsers.map((user) => [user.id, user])).values(),
    ];
    let uniqueDMedResponded = [
     ...new Map(
      [...userResponded, ...day.usersResponded].map((user) => [user.id, user])
     ).values(),
    ];

    days.push({
     date: day.date,
     usersDMed: uniqueDMedUsers,
     usersResponded: uniqueDMedResponded,
    });

    DMedUsers = [];
    userResponded = [];
   });

   let mergedData = {};

   console.log(days);

   days.reduce((acc, obj) => {
    if (!acc[obj.date]) {
     acc[obj.date] = {
      date: obj.date,
      usersDMed: [],
      usersResponded: [],
     };
    }

    let userDMedSet = new Set(acc[obj.date].usersDMed.map((user) => user.id));
    let userRespondedSet = new Set(
     acc[obj.date].usersResponded.map((user) => user.id)
    );

    obj.usersDMed.forEach((user) => {
     if (!userDMedSet.has(user.id)) {
      acc[obj.date].usersDMed.push(user);
      userDMedSet.add(user.id);
     }
    });

    obj.usersResponded.forEach((user) => {
     if (!userRespondedSet.has(user.id)) {
      acc[obj.date].usersResponded.push(user);
      userRespondedSet.add(user.id);
     }
    });

    return acc;
   }, mergedData);

   let mergedArray = Object.values(mergedData);

   console.log("full stats for: ", profile.name, mergedArray);

   await Profile.findByIdAndUpdate(
    {
     _id: profile._id,
    },
    {
     statistics: mergedArray,
    }
   );

   mergedData = {};
   days = [];
   DMedUsers = [];
   userResponded = [];
   let dmsRepliedId = [];

   for (let op of profile.operations) {
    op.usersDMed.forEach((user) => {
     for (let message of dms) {
      if (
       message?.message?.message_data.sender_id &&
       message?.message?.message_data.sender_id === user.id
      ) {
       let client = message.message?.message_data;
       console.log(client);
       dmsRepliedId.push({
        id: client.sender_id,
       });
      }
     }
    });

    dmsRepliedId = [...new Set(dmsRepliedId)];

    await Op.findOneAndUpdate(
     { _id: op._id },
     {
      usersResponded: [...dmsRepliedId],
     }
    );
   }
  } catch (err) {
   throw new Error(err);
  }
 }

 console.log("stats recorded.");
});
