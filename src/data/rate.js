"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
console.log("testing");
// Read the content of the JSON file
fs.readFile('data.json', 'utf8', function (err, data) {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    try {
        // Parse the JSON data
        var jsonData = JSON.parse(data);
        // Access and use the parsed data
        console.log(jsonData);
        // Do further processing or manipulation with the JSON data
        // ...
    }
    catch (err) {
        console.error('Error parsing JSON:', err);
    }
});
