const axios = require("axios");
const User = require("../mongodb/user.model");
const Op = require("../mongodb/operation.model");

async function sendDMs(users, tokens, salesLetter, op, currentUserId) {
 function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
 }

 const delayBetweenDMs = 60000; // 1 minute delay between each DM
 const maxDMsPerDay = 100;
 let sentDMs = 0;

 for (const user of users) {
  const firstName = user.name.split(" ");

  try {
   const options = {
    method: "GET",
    url: "https://twitter-api-v1-1-enterprise.p.rapidapi.com/base/apitools/sendDMS",
    params: {
     text: salesLetter.replace("{first_name}", firstName[0]),
     // dynamic letter
     ct0: tokens.ct0,
     type: "message_create",
     recipient_id: user.id,
     auth_token: tokens.auth_token,
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

    if (data.data?.msg == "SUCCESS") {
     console.log(`DM sent to ${user.name}`);
     console.log(data.data);

     await User.findOneAndUpdate(
      { _id: JSON.parse(currentUserId) },
      {
       $push: {
        live_updates: {
         messageType: "dm_sent",
         message: `DM sent: ${user.name}`,
        },
       },
      }
     );

     await Op.findOneAndUpdate(
      { _id: op._id },
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
     dmSuccessful = true;
     sentDMs++;
     console.log(dmSuccessful);
    }
   });
   if (dmSuccessful) {
    if (sentDMs < maxDMsPerDay) {
     console.log("going to wait for a minute...");
     await delay(delayBetweenDMs);
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

async function sortUsers(
 users,
 {
  followerRange = [0, 5000],
  excludeBioWords = [],
  usersDMed,
  verified,
  bioIncludes,
  excludeLocation,
 }
) {
 let sortedUsers = [];

//  if (verified == "true") {
  sortedUsers = await users
   //  .filter((person) => !usersDMed.id.includes(person.id))
  //  .filter(
  //   (person) =>
  //    person.followers >= followerRange[0] &&
  //    person.followers <= followerRange[1]
  //  )
  //  .filter((person) => person.verified === "true")
  //  .filter((person) => person.description.includes(bioIncludes))
  //  .filter((person) => !person.description.includes(excludeBioWords))
  //  .filter((person) => !person.location.includes(excludeLocation));
//  } else {
  sortedUsers = await users
   //  .filter((person) => !usersDMed.id.includes(person.id))
   .filter(
    (person) =>
     person.followers >= followerRange[0] &&
     person.followers <= followerRange[1]
   )
  //  .filter((person) => person.description.includes(bioIncludes))
   .filter((person) => !person.description.includes(excludeBioWords))
   .filter((person) => !person.location.includes(excludeLocation));
//  }
 return sortedUsers;
}

module.exports = { sendDMs, sortUsers };
