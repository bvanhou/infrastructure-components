/**
 * Created by frank.zickert on 02.05.19.
 */

import AWS from 'aws-sdk';
import gql from 'graphql-tag';

/**
 * transforms a function into a Promise
 */
const promisify = foo => new Promise((resolve, reject) => {
    foo((error, result) => {
        if(error) {
            reject(error)
        } else {
            resolve(result)
        }
    })
});

export const setEntry = (tableName, pkEntity, pkId, skEntity, skId, jsonData) => {

    console.log("setEntry: ", pkEntity, "/", pkId);

    return promisify(callback =>
        new AWS.DynamoDB.DocumentClient().update({
            TableName: tableName,
            /**
             * ALL KEYS MUST BE SPECIFIED HERE!
             */
            Key: {
                pk: `${pkEntity}|${pkId}`,
                sk: `${skEntity}|${skId}`
            },
            UpdateExpression: `SET jsonData = :jsonData`,
            ExpressionAttributeValues: {
                ':jsonData': `${JSON.stringify(jsonData)}`,
            }
        }, callback))
        .then(() => {
            var result = {};
            result[pkEntity] = pkId;
            result[skEntity] = skId;
            result["data"] = `${JSON.stringify(jsonData).replace(/"/g, "\\\"")}`;

            return result;
        }).catch(error => { console.log(error) });
};


/**
 * Get all entries to a entity|value pair in the key-field whose range have the specified rangeEntity
 *
 * @param key specify which field is the key: pk or sk
 * @param entity specifies the entity of the key-field
 * @param value specify the id of the key-field
 * @param rangeEntity specify the entity of the range
 * @returns {Promise<string>|any}
 */
export const ddbListEntries = (tableName, key, entity, value, rangeEntity) => {

    console.log("ddbListEntries: ", tableName, key, entity, value, rangeEntity);

    const q = {
        // use the table_name as specified in the serverless.yml
        TableName: tableName,
        IndexName: key === "sk" ? "reverse" : undefined,
        /**
         * ALL KEYS MUST HAVE KEY-CONDITION-EXPRESSIONS!
         */
        KeyConditionExpression: `${
            key
            } = :value and begins_with(${
            key === "pk" ? "sk" : "pk"
            }, :entity)`,
        ExpressionAttributeValues: {
            ":value": `${entity}|${value}`,
            ":entity": rangeEntity
        }
    };

    console.log("query: ", q);

    return promisify(callback =>
        new AWS.DynamoDB.DocumentClient().query(q, callback))
        .then(result => {
            console.log("ddb-result: ", result);
            return result["Items"];

            /*
             if (result.Items) {

             return result.Items.map(item => JSON.stringify(item));
             }

             return [];*/
            //return result.Items.map(item => JSON.stringify(item));
        }).catch(error => { console.log(error) });
};

export const getEntry = (tableName, pkEntity, pkValue, skEntity, skValue) => {

    console.log("pk: ", `${pkEntity}|${pkValue}`);
    console.log("sk: ", `${skEntity}|${skValue}`);

    return promisify(callback =>
        new AWS.DynamoDB.DocumentClient().get({
            // use the table_name as specified in the serverless.yml
            TableName: tableName,
            Key: {
                pk: `${pkEntity}|${pkValue}`,
                sk: `${skEntity}|${skValue}`
            }
        }, callback))
        .then(result => {
            console.log("result: ", result);

            return result["Item"] ? result["Item"] : result;

        }).catch(error => { console.log(error) });
};

import { mutation, params, types, query } from 'typed-graphqlify'

 
/**
 * uses this: https://github.com/acro5piano/typed-graphqlify
 *
 * TODO generalize to other data-types than string
 * 
 * @param client
 * @param entryId
 * @param data
 * @returns {any|Promise<T>|Promise<U>}
 */
export const mutate = (client, entryId, data) => {
    console.log("mutate: ", entryId, data);

    const mutationObj = {};
    mutationObj[`set_${entryId}`] = params(
        Object.keys(data).reduce((result, key) => {
            result[key] = `"${data[key]}"`;
            return result;
        },{}),
        Object.keys(data).reduce((result, key) => {
            result[key] = types.string;
            return result;
        },{})
    );

    console.log("mutation string: ", mutation(mutationObj));

    return client.mutate({
        mutation: gql`${mutation(mutationObj)}`
    }).then(result => { console.log(result)}).catch(error => { console.log(error) });

}

export const select = (client, gqlQuery) => {
    console.log("select: ", gqlQuery);

    return client.query({
        query: gqlQuery
    }).then(result => {
        console.log("select result: ", result)

        return result.data;

    }).catch(error => {
        console.log(error);
    });

}


/**
 * this function provides a executable graphql-query
 * TODO the fields must be taken from the data-layer, not requiring the user to provide them
 */
export const getEntryListQuery = ( entryId, data, fields) => {
    console.log("getEntryListQuery: ", entryId, data, fields);
    
    if (Object.keys(data).length !== 1) {
        console.error("getEntryListQuery requires exact 1 field provided in the data argument");
        return undefined;
    }
    
    const queryKey = Object.keys(data)[0];

    const queryObj = {};
    queryObj[`list_${entryId}_${queryKey}`] = params(
        Object.keys(data).filter(key => key === queryKey).reduce((result, key) => {
            result[key] = `"${data[key]}"`;
            return result;
        },{}),
        Object.keys(fields).reduce((result, key) => {
            result[key] = types.string;
            return result;
        },{})
    );

    console.log("listQuery string: ", query(queryObj));

    return gql`${query(queryObj)}`;
    
};