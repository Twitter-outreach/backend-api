const axios = require("axios");
const User = require("../mongodb/user.model");
const Op = require("../mongodb/operation.model");

async function sendDMs(users, profile, salesLetter, opId, currentUserId) {
 function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
 }

 const delayBetweenDMs = 60000; // 1 minute delay between each DM
 const maxDMsPerDay = 100;
 let sentDMs = 0;
 let totalDMsSent = 0;
 let usersDMedToday = [];

 for (const user of users) {
  const firstName = user.name.split(" ");

  try {
   const options = {
    method: "GET",
    url: "https://twitter-api-v1-1-enterprise.p.rapidapi.com/base/apitools/sendDMS",
    params: {
     text: salesLetter.replace("{first_name}", firstName[0]),
     // dynamic letter
     auth_token: profile.authTokens.auth_token,
     ct0: profile.authTokens.ct0,
     type: "message_create",
     recipient_id: user.id,
     // dynamic value from chrome extension
     apiKey:
      "2WLXZk9kacMXhHxj2cRg19bsuJ98XiQL0ndQ94kMdciuz|1574242047661207552-3jI04wPRb0tVkUfFjR4VzJW19ZnQz3",
     // later it will be in env
    },
    headers: {
     "X-RapidAPI-Key": "0b85afc0b5msh13b76112a3083e1p107698jsn711d5b3650b2",
     "X-RapidAPI-Host": "twitter-api-v1-1-enterprise.p.rapidapi.com",
    },
   };

   let dmSuccessful = false;

   await axios.request(options).then(async (data) => {
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

     const op = await Op.findById(opId).select("_id status");

     if (op.status === "TERMINATED") {
      console.log("SCRAPE TERMINATED");
      return;
     }
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
