const mongoose = require("mongoose");

let isConnected = false;

const connectToDB = async () => {
 try {
  await mongoose.connect(
   "mongodb+srv://dhampl94:xuZhC5YdkyJQgFPg@cluster0.oyov1.mongodb.net/?retryWrites=true&w=majority"
  );
  isConnected = true;
  console.log("connection established");
 } catch (error) {
  console.log(error);
 }
};
module.exports = connectToDB;
