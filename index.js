var dotenv = require("dotenv");
dotenv.config();

console.log("PORT:", process.env.PORT);
console.log("ELASTIC_SEARCH_URL:", process.env.ELASTIC_SEARCH_URL);
