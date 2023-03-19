var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {

    var response = {statusCode: 500};
    var data = JSON.parse(event.body);
    var email = data.email;
    var pwd = data.password;
    var name = data.name;
    var lastname = data.lastname;
    var ip = event.requestContext?.identity?.sourceIp;
    var phone = data.phone;
    
    const params = {
      TableName : 'arq_users',
      Item: {
         email: email,
         password: pwd,
         name: name,
         lastname: lastname,
         phone: phone,
         rol:1
      }
    }

    try {
        await docClient.put(params).promise();
        return { statusCode: 200 }
    } catch (err) {
        return { error: err }
    }
    return response;
};
