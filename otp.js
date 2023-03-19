var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    var tableName = 'arq_users';
    var response = {statusCode: 500};
    var data = JSON.parse(event.body);
    var email = data.email;
    var otp = data.otp;
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
          if(element.otp.N == otp) {
              response.statusCode = 200;
              const updateparams = {
                TableName: tableName,
                Key: {
                  email: email,
                },
                UpdateExpression: 'set ip = :ip',
                ExpressionAttributeValues: {
                  ':ip': ip,
                },
              };
            await docClient.update(updateparams).promise();
            var authToken = Buffer.from(email).toString('base64');
            const updateparams2 = {
              TableName: tableName,
              Key: {
                email: email,
              },
              UpdateExpression: 'set authToken = :authToken',
              ExpressionAttributeValues: {
                ':authToken': authToken,
              },
            };
            await docClient.update(updateparams2).promise();
            response.body = JSON.stringify({accessToken: authToken});
          } else {
            response.statusCode = 404;
          }
        }
      }
    });
    return response;
};
