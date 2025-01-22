const fs = require("fs");
const path = require("path");

module.exports = (filePath) => {
    filePath = path.join(__dirname, filePath);
    console.log(filePath)
    fs.unlink(filePath, (error) => {
        if (error) {
            throw (error);
        }
    })
}