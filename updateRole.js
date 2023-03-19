var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const docClient = new AWS.DynamoDB.DocumentClient();

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
      Message: 'Para realizar el cambio debe confirmar su identidad con el código '+otp,
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
    //console.log(event);
    var tableName = 'arq_users';
    var response = {statusCode: 500};
    var data = JSON.parse(event.body);
    var userEmail = data.userEmail;
    var newRole = data.newRole;
    var otp = data.otp;
    var authToken = event.headers?.Authorization ?? "";
    
    var params = {
        ExpressionAttributeValues: {
            ':authToken' : {S: authToken},
        },
        IndexName: "authToken-index",
        KeyConditionExpression: 'authToken = :authToken',
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
            if(otp == "" || otp == undefined) {
                var phone = element.phone?.S ?? "";
                var email = element.email?.S ?? "";
                var newOTP = randomNumber(6);
                const updateparams = {
                    TableName: tableName,
                    Key: {
                      email: email,
                    },
                    UpdateExpression: 'set otp = :otp',
                    ExpressionAttributeValues: {
                      ':otp': newOTP,
                    },
                  };
                await docClient.update(updateparams).promise();
                await sendSMS(phone,newOTP);
                response.statusCode = 200;
                response.body = JSON.stringify({msg: "OTP Sent"});
            } else {
                if(element.otp.N == otp) {
                    var email = element.email?.S ?? "";
                    const updateparams = {
                        TableName: tableName,
                        Key: {
                          email: email,
                        },
                        UpdateExpression: 'set rol = :rol',
                        ExpressionAttributeValues: {
                          ':rol': newRole,
                        },
                      };
                    await docClient.update(updateparams).promise();
                    response.statusCode = 200;
                    response.body = JSON.stringify({msg: "Role updated"});
                } else {
                    response.statusCode = 404;
                }
            }
        }
      }
    });
    return response;
};
