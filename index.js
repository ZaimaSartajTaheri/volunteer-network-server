const express = require('express');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');

const admin = require("firebase-admin");

var serviceAccount = require("./config/volunteer-network-9c413-firebase-adminsdk-xroru-5c4cb16111.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://volunteer-network-9c413.firebaseio.com"
});


const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ioamv.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
app.use(cors());
app.use(bodyParser.json());

client.connect(err => {
    const activitiesCollection = client.db(process.env.DB_NAME).collection(process.env.DB_COLLA);
    const userActivitiesCollection = client.db(process.env.DB_NAME).collection(process.env.DB_COLLU);
    app.post('/addActivity', (req, res) => {
        const event = req.body;

        activitiesCollection.insertOne(event)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    });
    app.get('/events', (req, res) => {
        activitiesCollection.find({})
            .toArray((err, document) => {
                res.send(document);
            })
    });
    app.get('/usersActivities', (req, res) => {
        userActivitiesCollection.find({})
            .toArray((err, document) => {
                res.send(document);
            })
    });
   
    app.post('/addUserActivity', (req, res) => {
        const userActivity = req.body;
        userActivitiesCollection.insertOne(userActivity)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    });

    app.get('/activities', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    let tokenEmail = decodedToken.email;
                    if (tokenEmail == req.query.email) {
                        userActivitiesCollection.find({ email: req.query.email })
                            .toArray((err, document) => {
                                res.status(200).send(document);
                            })
                    }
                    else {
                        res.status(401).send("un-authorised access");
                    }

                }).catch(function (error) {
                    res.status(401).send("un-authorised access")
                });
        }
        else {
            res.status(401).send("un-authorised access");
        }
    });

    app.delete('/activities/delete/:id', (req, res) => {
        userActivitiesCollection.deleteOne({ _id: ObjectID(req.params.id) })
            .then(result => {
                res.send(result.deletedCount > 0);
            })
    });

    app.delete('/usersActivities/delete/:id', (req, res) => {
        userActivitiesCollection.deleteOne({ _id: ObjectID(req.params.id) })
            .then(result => {
                res.send(result.deletedCount > 0);
            })
    });

});

app.get('/', (req, res) => {
    res.send('Hello');
});

app.listen(process.env.PORT||3003);