import mongoose from "mongoose";

const connect = () => {
  console.log(process.env.MONGO_URI);
  return mongoose
    .connect(process.env.MONGO_URI as string)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      console.log("Failed to connect to MongoDB");
      console.log(err);
    });
};

export default connect;
