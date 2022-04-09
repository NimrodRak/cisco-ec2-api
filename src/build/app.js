"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const consts_1 = require("./consts");
const app = (0, express_1.default)();
function initializeRegion(req) {
    if (req.params.region === undefined) {
        return -1;
    }
    aws_sdk_1.default.config.update({
        region: req.params.region.toString()
    });
    return 0;
}
function authenticateUser(req) {
    let auth = req.header("Authorization");
    if (auth === undefined) {
        return -1;
    }
    let splitAuth = auth.split(" ");
    if (splitAuth.length != 2) {
        return -1;
    }
    let splitDecodedAuth = Buffer.from(splitAuth[1], "base64")
        .toString("utf8")
        .split(":");
    if (splitDecodedAuth.length != 2) {
        return -1;
    }
    process.env.AWS_ACCESS_KEY_ID = splitDecodedAuth[0];
    process.env.AWS_SECRET_ACCESS_KEY = splitDecodedAuth[1];
    return 0;
}
function parseData(data) {
    if (data.Reservations === undefined) {
        return undefined;
    }
    if (data.Reservations.length === 0) {
        return { "instances": [] };
    }
    if (data.Reservations[0].Instances === undefined) {
        return undefined;
    }
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
function generateRequestParameters(req) {
    let params = {};
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
    if (req.query.nextToken !== undefined) {
        params.NextToken = req.query.nextToken.toString();
    }
    if (req.query.maxResults !== undefined) {
        params.MaxResults = parseInt(req.query.maxResults.toString());
    }
    return params;
}
function sortInstances(req, parsedInstances) {
    var _a;
    let sortby = (_a = req.query.sortby) === null || _a === void 0 ? void 0 : _a.toString();
    if (parsedInstances.instances.length > 0 && sortby !== undefined) {
        if (sortby in parsedInstances.instances[0]) {
            parsedInstances.instances.sort((a, b) => 
            // @ts-ignore // type check here is redundant because we just checked that the sorting key is a valid key
            a[sortby].localeCompare(b[sortby]));
            return 0;
        }
        else {
            return -1;
        }
    }
    return 0;
}
function getInstancesInfo(req, res) {
    const ec2 = new aws_sdk_1.default.EC2();
    let describeReqParams = generateRequestParameters(req);
    ec2.describeInstances(describeReqParams, (err, data) => {
        if (err) {
            res.status(401).send(consts_1.describeError);
            return;
        }
        let parsedInstances = parseData(data);
        if (parsedInstances === undefined) {
            res.status(400).send(consts_1.unknownError);
            return;
        }
        if (sortInstances(req, parsedInstances)) {
            res.status(400).send(consts_1.sortError);
        }
        else {
            res.send(parsedInstances);
        }
    });
}
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
app.get("/api/:region/instances", (req, res) => serveRequest(req, res));
exports.default = app;
