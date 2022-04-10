var AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-south-1' });

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
// Create the Service interface for DynamoDB
var dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
// Create the Document Client interface for DynamoDB
var ddbDocumentClient = new AWS.DynamoDB.DocumentClient();

var queueURL = "https://sqs.ap-south-1.amazonaws.com/037721679801/dancewebque";


const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose')
const bodyparser = require('body-parser');
const { name } = require('pug/lib');
// CONNECTION TO DATABASE 
mongoose.connect('mongodb://localhost:27017/contactDacne', { useNewUrlParser: true });
const port = 8000

//MONGOOSE SCHEMA
var contacySchema = new mongoose.Schema({
  name: String,
  phone: String,
  age: String,
  gender: String,
  address: String
})

//MODEL
var Contact = mongoose.model('contact', contacySchema);

//EXPRESS RELATED STUFF
const app = express();
app.use('/static', express.static('static'));
app.use(express.urlencoded())

//PUG SPCIFIC STUFF
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'));

//ENTRY POINTS

app.get('/', (req, res) => {
  res.status(200).render('home.pug')
})

app.get('/contact', (req, res) => {
  res.status(200).render('contact.pug')
})
app.get('/table', (req, res) => {
  // Create an SQS service object
})
app.post('/contact', (req, res) => {

  var myData = new Contact(req.body);
  console.log(myData.name)

  myData.save().then(() => {
    res.send('this item is saved to database')
  }).catch(() => {
    res.status(400).send('item was not saved to database')
  })
  // res.status(200).render('contact.pug')
  var params = {
    // Remove DelaySeconds parameter and value for FIFO queues
    DelaySeconds: 10,
    MessageAttributes: {
      "Name": {
        DataType: "String",
        StringValue: myData.name
      },
      "phone": {
        DataType: "String",
        StringValue: myData.phone
      },
      "age": {
        DataType: "String",
        StringValue: myData.age
      },

      "gender": {
        DataType: "String",
        StringValue: myData.gender
      },
      "address": {
        DataType: "String",
        StringValue: myData.address
      }
    },
    MessageBody: "Contact Details",
    
    QueueUrl: "https://sqs.ap-south-1.amazonaws.com/037721679801/dancewebque"
  };
  sqs.sendMessage(params, function (err, data) {
    if (err) {
      console.log("Error ! Form not submitted", err);
    } else {
      console.log("Form responce sent to SQS ", data.MessageId);
    }
  });


  var queueURL = "https://sqs.ap-south-1.amazonaws.com/037721679801/dancewebque";

  var params1 = {
    AttributeNames: ["SentTimestamp"],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ["All"],
    QueueUrl: queueURL,
    VisibilityTimeout: 20,
    WaitTimeSeconds: 0,
  };

  sqs.receiveMessage(params1, function (err, data) {
    if (err) {
      console.log("Receive Error", err);
    } else if (data.Messages) {

      console.log("Message received From SQS");

    }
    var dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
    var ddbDocumentClient = new AWS.DynamoDB.DocumentClient();
    var params3 = {
      TableName: 'dancewebsite',
      Item: {
        'Name': data.Messages[0].MessageAttributes.Name.StringValue,
        'Phone': data.Messages[0].MessageAttributes.phone.StringValue,
        'Age': data.Messages[0].MessageAttributes.age.StringValue,
        'Gender': data.Messages[0].MessageAttributes.gender.StringValue,
        'Address': data.Messages[0].MessageAttributes.address.StringValue
      }

    };
    ddbDocumentClient.put(params3, function (err, data) {
      if (err) {
        console.log("Error ! Form responce is not sent to DynamoDb", err);
      } else {
        console.log("Success ! Form responce is sent to DynamoDb", data);
      }
    });
    
    var deleteParams = {
    QueueUrl: queueURL,
    ReceiptHandle: data.Messages[0].ReceiptHandle,
  };
  sqs.deleteMessage(deleteParams, function (err, data) {
    if (err) {
      console.log("Delete Error", err);
    } else {
      console.log("Message Deleted form SQS", data);
    }
  })
  });


})



//STARTING SERVER
app.listen(port, () => {
  console.log(`server listening on port ${port}`);
})