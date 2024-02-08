const axios = require("axios");
const User = require("../mongodb/user.model");
const Op = require("../mongodb/operation.model");
const Profile = require("../mongodb/profile.model");

async function sendDMs(
 users,
 profile,
 salesLetter,
 opId,
 currentUserId,
 sentDMs,
 totalDMsSent,
 maxDMsPerDay,
 usersDMedToday
) {
 function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
 }

 const delayBetweenDMs = 60000;

 for (const user of users) {
  const firstName = user.name.split(" ");

  let dmSuccessful = false;

  const options = {
   method: "GET",
   url: "https://twitter2.good6.top/api/base/apitools/sendDMS",
   params: {
    apiKey:
     "NJFa6ypiHNN2XvbeyZeyMo89WkzWmjfT3GI26ULhJeqs6|1539340831986966534-8FyvB4o9quD9PLiBJJJlzlZVvK9mdI",
    auth_token: profile.authTokens.auth_token,
    ct0: profile.authTokens.ct0,
    recipient_id: user.id,
    text: salesLetter.replace("[name]", firstName[0]),
    type: "message_create",
   },
   headers: { accept: "*/*" },
  };

  await axios
   .request(options)
   .then(async (data) => {
    console.log(`Sending DM to ${user.name}`);

    if (data.data?.data !== "Forbidden" || data.data?.data?.recipient_id) {
     console.log(`DM sent to ${user.name}`);
     console.log(data.data.data);

     usersDMedToday.push({
      id: user.id,
      name: user.name,
     });
     await User.findOneAndUpdate(
      { _id: JSON.parse(currentUserId) },
      {
       $push: {
        live_updates: {
         messageType: "dm_sent",
         message: `DM sent: ${user.name} `,
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
     await Profile.findOneAndUpdate(
      { _id: profile._id },
      {
       $push: {
        usersDMed: {
         id: user.id,
        },
       },
      }
     );

     console.log(usersDMedToday.length);

     dmSuccessful = true;
     sentDMs++;
     totalDMsSent++;
    } else {
     console.log(`Fail to send DM to ${user.name}`);
     dmSuccessful;
     sentDMs++;
    }
   })
   .catch(() => console.log("Error with sending to user."));

  if (dmSuccessful) {
   if (usersDMedToday.length < maxDMsPerDay) {
    console.log("going to wait for a minute...");

    await delay(delayBetweenDMs);
   } else {
    console.log("Maximum number of DMs reached for today. Stopping for a day.");

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

    await Profile.findOneAndUpdate(
     { _id: profile._id },
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

    // Returns a Promise that resolves after "ms" Milliseconds
    const timer = (ms) => new Promise((res) => setTimeout(res, ms));

    async function load() {
     // We need to wrap the loop into an async function for this to work
     for (var i = 0; i < 24 * 60 * 60; i++) {
      await timer(1000); // then the created Promise can be awaited
     }
    }
    load();

    usersDMedToday = [];
    sentDMs = 0;
   }
  }
 }
}

function sortUsers(users, options, usersDMed) {
 let sortedUsers = users;

 function removeUsersWithMatchingIds(userArray, idsToRemove) {
  const idsToRemoveArray = idsToRemove.map((item) => item.id);
  const filteredUsers = userArray.filter(
   (user) => !idsToRemoveArray.includes(user.id)
  );

  return filteredUsers;
 }

 const updatedUsers = removeUsersWithMatchingIds(users, usersDMed);

 sortedUsers = updatedUsers;

 if (options[4].trigger === "true") {
  const res = sortedUsers.filter(
   (person) =>
    person.followers >= options[4].state[0] &&
    person.followers <= options[4].state[1]
  );
  sortedUsers = res;
 }

 // bio excludes
 if (options[1].trigger === "true") {
  const wordSet = new Set(options[1].state);
  const res = sortedUsers.filter((user) => {
   const descriptionWords = user.description.split(" ");
   return !descriptionWords.some((word) => wordSet.has(word));
  });
  sortedUsers = res;
 }

 // bio includes
 if (options[2].trigger === "true") {
  const wordSet = new Set(options[2].state);
  const res = sortedUsers.filter((user) => {
   const descriptionWords = user.description.split(" ");
   return descriptionWords.some((word) => wordSet.has(word));
  });
  sortedUsers = res;
 }

 // location excludes
 if (options[3].trigger === "true") {
  const wordSet = new Set(options[3].state);
  const res = sortedUsers.filter((user) => {
   const descriptionWords = user.location.split(" ");
   return !descriptionWords.some((word) => wordSet.has(word));
  });
  sortedUsers = res;
 }
 return sortedUsers;
}

module.exports = { sendDMs, sortUsers };
