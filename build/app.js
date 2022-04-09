"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const consts_1 = require("./consts");
const app = (0, express_1.default)();
/**
 * initializes AWS region from incoming request params, return 0 on success -1 otherwise
 * @param req incoming request
 */
function initializeRegion(req) {
    if (req.params.region === undefined) {
        return -1;
    }
    aws_sdk_1.default.config.update({
        region: req.params.region.toString()
    });
    return 0;
}
/**
 * parse user keys from request header and set the to the relevant environment variables
 * @param req incoming request
 */
function authenticateUser(req) {
    let auth = req.header("Authorization");
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
function summarizeInstanceDescriptions(data) {
    // validity checks for TS mostly
    if (data.Reservations === undefined) {
        return undefined;
    }
    if (data.Reservations.length === 0) {
        return { "instances": [] };
    }
    if (data.Reservations[0].Instances === undefined) {
        return undefined;
    }
    // map each instance data to only the needed information for the user
    return Object.assign({ "instances": data.Reservations[0].Instances.map((inst) => {
            var _a, _b;
            return {
                "name": inst.InstanceId,
                "type": inst.InstanceType,
                "state": (_a = inst.State) === null || _a === void 0 ? void 0 : _a.Name,
                "az": (_b = inst.Placement) === null || _b === void 0 ? void 0 : _b.AvailabilityZone,
                "publicIP": inst.PublicIpAddress,
                "privateIP": inst.PrivateIpAddress
            };
        }) }, (data.NextToken !== undefined) && { "nextToken": data.NextToken });
}
/**
 * generate the parameters for the AWS SDK describe call from the incoming requests query params
 * @param req incoming query
 */
function generateRequestParameters(req) {
    let params = {};
    // go over each parameter we support and check if it was passed, if it was, put it as a filter
    for (let param of consts_1.parameterOptions) {
        param = param.toString();
        let val = req.query[param];
        if (val !== undefined) {
            if (params.Filters === undefined) {
                params.Filters = [];
            }
            params.Filters.push({
                Name: consts_1.awsTerms[param],
                Values: [val.toString()]
            });
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
function sortInstances(req, parsedInstances) {
    var _a;
    let sortKey = (_a = req.query.sortby) === null || _a === void 0 ? void 0 : _a.toString();
    // both of the if's are used for TS to calm down a bit (although not 100% de-jure,
    // de-facto this code insures no error occurres)
    if (parsedInstances.instances.length > 0 && sortKey !== undefined) {
        if (sortKey in parsedInstances.instances[0]) {
            parsedInstances.instances.sort((a, b) => 
            // @ts-ignore // type check here is redundant because we just checked that the sorting key is a valid key
            a[sortKey].localeCompare(b[sortKey]));
            return 0;
        }
        else {
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
function getInstancesInfo(req, res) {
    const ec2 = new aws_sdk_1.default.EC2();
    // get the parameters and call AWS's SDK with them
    let describeReqParams = generateRequestParameters(req);
    ec2.describeInstances(describeReqParams, (err, data) => {
        // if there was an argument problem, we will catch it first
        if (err) {
            res.status(401).send(consts_1.describeError);
            return;
        }
        let parsedInstances = summarizeInstanceDescriptions(data);
        // if there wasn't an error but the parsed instances are undefined something weird happened (hence unknown error)
        if (parsedInstances === undefined) {
            res.status(400).send(consts_1.unknownError);
            return;
        }
        // if sorting doesn't go well - note that not sorting because we weren't asked to do so doesn't count as an error
        if (sortInstances(req, parsedInstances)) {
            res.status(400).send(consts_1.sortError);
        }
        else {
            res.send(parsedInstances);
        }
    });
}
/**
 * central function that serves the entire request from start to finish
 * @param req incoming request
 * @param res outgoing response
 */
function serveRequest(req, res) {
    if (initializeRegion(req)) {
        res.status(400).json(consts_1.regionError);
    }
    else if (authenticateUser(req)) {
        res.status(400).json(consts_1.authError);
    }
    else {
        getInstancesInfo(req, res);
    }
}
// we have a single endpoint, see documentation for more information about this
app.get("/api/:region/instances", (req, res) => serveRequest(req, res));
exports.default = app;
