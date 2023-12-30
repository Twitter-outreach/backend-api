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
 const maxDMsPerDay = 500;

 for (const user of users) {
  const firstName = user.name.split(" ");

  // try {
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

    const op = await Op.findById(opId).select("_id status");
    let dateObj = new Date();
    let day = dateObj.getDate();
    let month = dateObj.getMonth() + 1; // months from 1-12
    let year = dateObj.getFullYear();
    let currentDate = day + "/" + month + "/" + year;
    console.log(currentDate);

    if (op.status === "TERMINATED") {
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

     console.log("SCRAPE TERMINATED");
     return;
    }
    await delay(delayBetweenDMs);

    //  const op = await Op.findById(opId).select("_id status");
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

    const op = await Op.findById(opId).select("_id status");

    if (op.status === "TERMINATED") {
     console.log("SCRAPE TERMINATED");
     return;
    }

    await delay(24 * 60 * 60 * 1000); // Stop for a day (24 hours)
    sentDMs = 0; // Reset the counter for the next day
   }
  }
  // } catch (e) {
  //  console.log(e.message);
  //  throw new Error(e.message);
  // }
 }
}

function sortUsers(
 users,
 {
  followerRange = [0, 5000],
  bioExclude = [],
  bioIncludes,
  usersDMed,
  excludeLocation,
 }
) {
 let sortedUsers = users;

 //  const skippedUser = usersDMed.map((id) => {
 //   return id.id;
 //  });

 //  const skippedUserSet = new Set(skippedUser);
 //  const res = sortedUsers.filter((user) => {
 //   const id = user.id;

 //   return !id.has((id) => skippedUserSet.has(id));
 //  });
 //  sortedUsers = res;

 if (followerRange) {
  const res = sortedUsers.filter(
   (person) =>
    person.followers >= followerRange[0] && person.followers <= followerRange[1]
  );
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
