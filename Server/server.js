import express from "express";

const app = express();

app.listen(3000, (err) => {
    if(err) {
        console.log(err);
    } else {
        console.log("Express server listening");
    }
})