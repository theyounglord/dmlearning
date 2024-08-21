const express = require("express");

require("dotenv").config();

const app = express();

app.use(express.static("public"));
const port = 2023;

app.listen(port, () => {
  console.log("Server started on port 2023");
});
