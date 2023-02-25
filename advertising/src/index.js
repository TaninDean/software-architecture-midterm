const express = require("express");
const mongodb = require("mongodb");
const amqp = require('amqplib');
const bodyParser = require("body-parser");

if (!process.env.DBHOST) {
    throw new Error("Please specify the databse host using environment variable DBHOST.");
}

if (!process.env.DBNAME) {
    throw new Error("Please specify the name of the database using environment variable DBNAME");
}

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

const mockData = [{name: "Agoda", url: "https://www.agoda.com/?device=c&network=g&adid=577649613252&rand=5359149502069272647&expid=&adpos=&aud=kwd-2230651387&site_id=1891472&tag=ed909e8f-7d46-c36b-dee1-31618dde0b5f&gclid=Cj0KCQiAgOefBhDgARIsAMhqXA7P4hXNSF_tJP5WOUSiy5Zglp2UyqaLLTXPbNFQtbYD_0Pb8kGNPyYaApjaEALw_wcB"},
{name: "Lineman", url: "https://lineman.line.me/"},{name: "google", url: "https://www.google.com/search?q=google&rlz=1C5CHFA_enTH1017TH1020&oq=google&aqs=chrome.0.0i131i355i433i512j46i131i199i433i465i512j0i131i433i512l2j69i60l3j5.781j0j4&sourceid=chrome&ie=UTF-8"}]

//
// Connect to the database.
//
function connectDb() {
    return mongodb.MongoClient.connect(DBHOST) 
        .then(client => {
            return client.db(DBNAME);
        });
}

//
// Connect to the RabbitMQ server.
//
function connectRabbit() {

    console.log(`Connecting to RabbitMQ server at ${RABBIT}.`);

    return amqp.connect(RABBIT) // Connect to the RabbitMQ server.
        .then(messagingConnection => {
            console.log("Connected to RabbitMQ.");

            return messagingConnection.createChannel(); // Create a RabbitMQ messaging channel.
        });
}

//
// Setup event handlers.
//
function setupHandlers(app, db, messageChannel) {

    const videosCollection = db.collection("videos");

    //
    // HTTP GET API to retrieve video viewing history.
    //
    app.get("/", (req, res) => {
        videosCollection.find() // Retreive video list from database.
            .toArray() // In a real application this should be paginated.
            .then(videos => {
                const randomIndex = Math.floor(Math.random() * mockData.length)
                res.json({ videos: mockData[randomIndex] });
            })
            .catch(err => {
                console.error("Failed to get videos collection.");
                console.error(err);
                res.sendStatus(500);
            });
    });
}

//
// Start the HTTP server.
//
function startHttpServer(db, messageChannel) {
    return new Promise(resolve => { // Wrap in a promise so we can be notified when the server has started.
        const app = express();
        app.use(bodyParser.json()); // Enable JSON body for HTTP requests.
        setupHandlers(app, db, messageChannel);

        const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
        app.listen(port, () => {
            resolve(); // HTTP server is listening, resolve the promise.
        });
    });
}

//
// Application entry point.
//
function main() {
    return connectDb()                                          // Connect to the database...
        .then(db => {                                           // then...
            return connectRabbit()                              // connect to RabbitMQ...
                .then(messageChannel => {                       // then...
                    return startHttpServer(db, messageChannel); // start the HTTP server.
                });
        });
}

main()
    .then(() => console.log("Microservice ads online."))
    .catch(err => {
        console.error("Microservice ads failed to start.");
        console.error(err && err.stack || err);
    });