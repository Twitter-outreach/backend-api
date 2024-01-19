const mongoose = require("mongoose");

const BlueSeaSchema = new mongoose.Schema({
 id: String,
 name: String,
 screenName: String,
 location: String,
 description: String,
 followers: Number,
});

const BlueSea =
 mongoose.models.blueSea || mongoose.model("BlueSea", BlueSeaSchema);

module.exports = BlueSea;
