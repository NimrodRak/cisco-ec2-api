import express from "express";
import AWS from "aws-sdk";
import {Instance} from "aws-sdk/clients/ec2";

import {
    DescribeParameters, ParsedInstanceData,
    unknownError, regionError, authError, describeError,
    parameterOptions, awsTerms, sortError
} from "./consts"

const app = express()

/**
 * initializes AWS region from incoming request params, return 0 on success -1 otherwise
 * @param req incoming request
 */
function initializeRegion(req: express.Request): number {
    if (req.params.region === undefined) {
        return -1;
    }
    AWS.config.update({
        region: req.params.region.toString()
    })
    return 0;
}

/**
 * parse user keys from request header and set the to the relevant environment variables
 * @param req incoming request
 */
function authenticateUser(req: express.Request): number {
    let auth = req.header("Authorization")
    if (auth === undefined) {
        return -1;
    }
    // authorization header is of format "Basic <base-64 key combination>
    let splitAuth = auth.split(" ");
    if (splitAuth.length != 2) {
        return -1;
    }
    // keys are base64 encoding of "<accessKeyId>:<secretKey>"
    let splitDecodedAuth = Buffer.from(splitAuth[1], "base64")
        .toString("utf8")
        .split(":");
    if (splitDecodedAuth.length != 2) {
        return -1;
    }
    // this is how we pass keys to AWS SDK
    process.env.AWS_ACCESS_KEY_ID = splitDecodedAuth[0];
    process.env.AWS_SECRET_ACCESS_KEY = splitDecodedAuth[1];
    return 0;
}

/**
 * parse the result of the AWS SDK describeInstances call to a simple format for the user
 * @param data raw data from the describeInstances call
 */
function summarizeInstanceDescriptions(data: AWS.EC2.DescribeInstancesResult):
    {"instances": ParsedInstanceData[]} | undefined {
    // validity checks for TS mostly
    if (data.Reservations === undefined) {
        return undefined;
    }
    if (data.Reservations.length === 0) {
        return {"instances": []}
    }
    if (data.Reservations[0].Instances === undefined) {
        return undefined;
    }
    // map each instance data to only the needed information for the user
    return {
        "instances" : data.Reservations[0].Instances.map((inst: Instance): ParsedInstanceData => {
            return <ParsedInstanceData>{
                "name": inst.InstanceId,
                "type": inst.InstanceType,
                "state": inst.State?.Name,
                "az": inst.Placement?.AvailabilityZone,
                "publicIP": inst.PublicIpAddress,
                "privateIP": inst.PrivateIpAddress
            }
        }),
        // add the token from the call for the user if it exists
        ...(data.NextToken !== undefined) && {"nextToken": data.NextToken}
    };
}

/**
 * generate the parameters for the AWS SDK describe call from the incoming requests query params
 * @param req incoming query
 */
function generateRequestParameters(req: express.Request): DescribeParameters {
    let params: DescribeParameters = {};
    // go over each parameter we support and check if it was passed, if it was, put it as a filter
    for (let param of parameterOptions) {
        param = param.toString();
        let val = req.query[param];

        if (val !== undefined) {
            if (params.Filters === undefined) {
                params.Filters = []
            }

            params.Filters.push({
                Name: awsTerms[param],
                Values: [val.toString()]
            })
        }
    }
    // add pagination info if relevant
    if (req.query.nextToken !== undefined) {
        params.NextToken = req.query.nextToken.toString();
    }
    if (req.query.maxResults !== undefined) {
        params.MaxResults = Number(req.query.maxResults.toString());
    }
    return params;
}

/**
 * sort instances based on one of the supported attributes (lexicographical sort), return 0 on success, -1 otherwise
 * @param req incoming request
 * @param parsedInstances object with list of condensed instance data
 */
function sortInstances(req: express.Request, parsedInstances: { instances: ParsedInstanceData[] }): number {
    let sortKey = req.query.sortby?.toString();
    // both of the if's are used for TS to calm down a bit (although not 100% de-jure,
    // de-facto this code insures no error occurres)
    if (parsedInstances.instances.length > 0 && sortKey !== undefined) {
        if (sortKey in parsedInstances.instances[0]) {
            parsedInstances.instances.sort((a, b): number =>
                // @ts-ignore // type check here is redundant because we just checked that the sorting key is a valid key
                a[sortKey].localeCompare(b[sortKey])
            )
            return 0;
        } else {
            return -1;
        }
    }
    return 0;
}

/**
 * function that puts all the instances' description list operation together and sends out the processed instance data
 * @param req incoming request
 * @param res response object to send the result to
 */
function getInstancesInfo(req: express.Request, res: express.Response): void {
    const ec2 = new AWS.EC2()
    // get the parameters and call AWS's SDK with them
    let describeReqParams = generateRequestParameters(req);
    ec2.describeInstances(describeReqParams, (err, data): void => {
        // if there was an argument problem, we will catch it first
        if (err) {
            res.status(401).send(describeError);
            return;
        }
        let parsedInstances = summarizeInstanceDescriptions(data);
        // if there wasn't an error but the parsed instances are undefined something weird happened (hence unknown error)
        if (parsedInstances === undefined) {
            res.status(400).send(unknownError);
            return;
        }
        // if sorting doesn't go well - note that not sorting because we weren't asked to do so doesn't count as an error
        if (sortInstances(req, parsedInstances)) {
            res.status(400).send(sortError);
        } else {
            res.send(parsedInstances);
        }
    });
}

/**
 * central function that serves the entire request from start to finish
 * @param req incoming request
 * @param res outgoing response
 */
function serveRequest(req: express.Request, res: express.Response): void {
    if (initializeRegion(req)) {
        res.status(400).json(regionError);
    } else if (authenticateUser(req)) {
        res.status(400).json(authError)
    } else {
        getInstancesInfo(req, res)
    }
}

// we have a single endpoint, see documentation for more information about this
app.get("/api/:region/instances", (req,
                                   res): void => serveRequest(req, res))

export default app;
