const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
    // optional tuning - 50% faster(cold) / 20% faster(hot)
    apiVersion: '2012-08-10',
    sslEnabled: false,
    paramValidation: false,
    convertResponseTypes: false
});

const tableName = 'arq_users';

exports.handler = async (event) => {
    let params = { TableName: tableName };

    let scanResults = [];
    let items;

    do {
        items = await docClient.scan(params).promise();
        items.Items.forEach((item) => scanResults.push(item));
        params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey != "undefined");
    const response = {
        statusCode: 200,
        body: JSON.stringify(scanResults)
    };
    return response;
};
