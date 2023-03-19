var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const docClient = new AWS.DynamoDB.DocumentClient();
var crypto = require("crypto");

function randomNumber(length) {
    var text = "";
    var possible = "123456789";
    for (var i = 0; i < length; i++) {
      var sup = Math.floor(Math.random() * possible.length);
      text += i > 0 && sup == i ? "0" : possible.charAt(sup);
    }
    return Number(text);
  }
  


async function sendSMS(phone,otp) {
    var params = {
      Message: 'Hemos detectado un inicio de sesión desde una IP desconocida, debemos confirmar tu identidad con el código '+otp,
      PhoneNumber: '57'+phone
    };
    console.log("ENVIANDO A "+JSON.stringify(params));
    var sns = new AWS.SNS({apiVersion: '2010-03-31'});
    return sns.publish(params, function(err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success SNS MESSAGE ID: ", data.MessageId);
        }
    }).promise();
}

exports.handler = async (event) => {
    console.log(event.body);
    var tableName = 'arq_users';
    var response = {statusCode: 500};
    var data = JSON.parse(event.body);
    var email = data.email;
    var pwd = data.password;
    var ip = event.requestContext?.identity?.sourceIp;
    var params = {
      ExpressionAttributeValues: {
        ':email' : {S: email},
      },
      KeyConditionExpression: 'email = :email',
      TableName: tableName
    };
    
    await ddb.query(params).promise().then(async function(data,err) {
      if (err) {
        console.log("Error", err);
      } else {
        var count = data.Items.length;
        if(count == 0) {
          response.statusCode = 404;
        }
        for (var i = 0; i < data.Items.length; i++) {
          var element = data.Items[i];
          if(element.password.S == pwd && (element.ip?.S ?? "") == ip) {
            response.statusCode = 200;
            var authToken = Buffer.from(email).toString('base64');
            const updateparams = {
              TableName: tableName,
              Key: {
                email: email,
              },
              UpdateExpression: 'set authToken = :authToken',
              ExpressionAttributeValues: {
                ':authToken': authToken,
              },
            };
            await docClient.update(updateparams).promise();
            response.body = JSON.stringify({accessToken: authToken});
          } else if(element.password.S == pwd && (element.ip?.S ?? "") != ip) {
            response.statusCode = 401;
            var phone = element.phone?.S ?? "";
            var otp = randomNumber(6);
            const updateparams = {
                TableName: tableName,
                Key: {
                  email: email,
                },
                UpdateExpression: 'set otp = :otp',
                ExpressionAttributeValues: {
                  ':otp': otp,
                },
              };
            await docClient.update(updateparams).promise();
            await sendSMS(phone,otp);
          } else {
            response.statusCode = 404;
          }
        }
      }
    });
    return response;
};
