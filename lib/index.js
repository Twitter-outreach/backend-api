const axios = require("axios");
const User = require("../mongodb/user.model");
const Op = require("../mongodb/operation.model");
const Profile = require("../mongodb/profile.model");

async function sendDMs(users, profile, salesLetter, opId, currentUserId) {
 function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
 }

 const delayBetweenDMs = 60000; // 1 minute delay between each DM
 const maxDMsPerDay = 500;
 let sentDMs = 0;
 let totalDMsSent = 0;
 let usersDMedToday = [];

 for (const user of users) {
  const firstName = user.name.split(" ");

  try {
   let dmSuccessful = false;
   const options = { method: "GET", headers: { accept: "*/*" } };

   await axios
    .get(
     `https://twitter2.good6.top/api/base/apitools/sendDMS?apiKey=NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6%7C1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI&auth_token=${
      profile.authTokens.auth_token
     }&ct0=${profile.authTokens.ct0}&recipient_id=${
      user.id
     }&text=${salesLetter.replace(
      "{first_name}",
      firstName[0]
     )}&type=message_create`,
     options
    )
    .then(async (data) => {
     console.log(`Sending DM to ${user.name}`);

     if (data.data?.msg == "SUCCESS" || data.data?.data?.recipient_id) {
      console.log(`DM sent to ${user.name}`);
      console.log(data.data);
      console.log(data.data.data);

      await User.findOneAndUpdate(
       { _id: JSON.parse(currentUserId) },
       {
        $push: {
         live_updates: {
          messageType: "dm_sent",
          message: `DM sent: ${user.name} (${totalDMsSent}/${users.length})`,
         },
        },
       }
      );

      await Op.findOneAndUpdate(
       { _id: opId },
       {
        $push: {
         usersDMed: {
          id: user.id,
         },
        },
       }
      );

      await User.findOneAndUpdate(
       { _id: JSON.parse(currentUserId) },
       {
        $push: {
         users_DMed: {
          id: user.id,
         },
        },
       }
      );

      usersDMedToday.push({
       id: user.id,
       name: user.name,
       hasReplied: false,
      });

      console.log(usersDMedToday);

      dmSuccessful = true;
      sentDMs++;
      totalDMsSent++;
      console.log(dmSuccessful);
     } else {
      console.log(`Fail to send DM to ${user.name}`);

      await User.findOneAndUpdate(
       { _id: JSON.parse(currentUserId) },
       {
        $push: {
         live_updates: {
          messageType: "dm_failed",
          message: `DM Failed: ${user.name} (${totalDMsSent}/${users.length})`,
         },
        },
       }
      );
     }
    });

   if (dmSuccessful) {
    if (sentDMs < maxDMsPerDay) {
     console.log("going to wait for a minute...");
     await delay(delayBetweenDMs);

    //  const op = await Op.findById(opId).select("_id status");
    } else {
     console.log(
      "Maximum number of DMs reached for today. Stopping for a day."
     );

     await User.findOneAndUpdate(
      { _id: JSON.parse(currentUserId) },
      {
       $push: {
        live_updates: {
         messageType: "sleep",
         message: `Sleep: DM limit exceeded for the day`,
        },
       },
      }
     );
     let dateObj = new Date();
     let day = dateObj.getDate();
     let month = dateObj.getMonth() + 1; // months from 1-12
     let year = dateObj.getFullYear();
     let currentDate = day + "/" + month + "/" + year;
     console.log(currentDate);

     await Profile.findOneAndUpdate(
      { _id: profile._id },
      {
       $push: {
        statistics: {
         date: currentDate,
         usersDMed: usersDMedToday,
        },
       },
      }
     );

     const op = await Op.findById(opId).select("_id status");

     if (op.status === "TERMINATED") {
      console.log("SCRAPE TERMINATED");
      return;
     }

     await delay(24 * 60 * 60 * 1000); // Stop for a day (24 hours)
     sentDMs = 0; // Reset the counter for the next day
    }
   }
  } catch (e) {
   console.log(e.message);
   throw new Error(e.message);
  }
 }
}

function sortUsers(
 users,
 {
  followerRange = [0, 5000],
  bioExclude = [],
  bioIncludes,
  usersDMed,
  verified,
  excludeLocation,
 }
) {
 let sortedUsers;

 // if (bioIncludes) {
 sortedUsers = users;

 if (followerRange) {
  const res = sortedUsers.filter(
   (person) =>
    person.followers >= followerRange[0] && person.followers <= followerRange[1]
  );
  sortedUsers = res;
 }
 if (verified === "true") {
  const res = sortedUsers.filter((person) => person.verified === true);
  sortedUsers = res;
 }

 // bio includes
 if (bioIncludes?.length != 0) {
  const wordSet = new Set(bioIncludes);
  const res = sortedUsers.filter((user) => {
   const descriptionWords = user.description.split(" ");
   return descriptionWords.some((word) => wordSet.has(word));
  });
  sortedUsers = res;
 }

 // bio excludes
 if (bioExclude?.length != 0) {
  const wordSet = new Set(bioExclude);
  const res = sortedUsers.filter((user) => {
   const descriptionWords = user.description.split(" ");
   return !descriptionWords.some((word) => wordSet.has(word));
  });
  sortedUsers = res;
 }

 // location excludes
 if (excludeLocation?.length != 0) {
  const wordSet = new Set(excludeLocation);
  const res = sortedUsers.filter((user) => {
   const descriptionWords = user.location.split(" ");
   return !descriptionWords.some((word) => wordSet.has(word));
  });
  sortedUsers = res;
 }
 return sortedUsers;
}

module.exports = { sendDMs, sortUsers };
