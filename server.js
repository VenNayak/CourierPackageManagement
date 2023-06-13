// Create express app
var express = require("express");
var app = express();
const api = require('./crudAPIs');
const bodyParser = require('body-parser');

// Server port
var port = 8000 
// Start server
app.listen(port, () => {
    console.log(`API running on localhost:${port}`);
});
// Root endpoint
app.get("/", (req, res, next) => {
    res.json({"message":"ok"})
});

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.use('/api',api);
// Default response for any other request
app.use(function(req, res){
    res.status(404);
}); 



