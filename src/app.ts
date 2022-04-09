import express from "express";
import AWS from "aws-sdk";
import {Instance} from "aws-sdk/clients/ec2";

import {
    DescribeParameters, ParsedInstanceData,
    unknownError, regionError, authError, describeError,
    parameterOptions, awsTerms, sortError
} from "./consts"

const app = express()

function initializeRegion(req: express.Request): number {
    if (req.params.region === undefined) {
        return -1;
    }
    AWS.config.update({
        region: req.params.region.toString()
    })
    return 0;
}

function authenticateUser(req: express.Request): number {
    let auth = req.header("Authorization")
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

function parseData(data: AWS.EC2.DescribeInstancesResult): {"instances": ParsedInstanceData[]} | undefined {
    if (data.Reservations === undefined) {
        return undefined;
    }
    if (data.Reservations.length === 0) {
        return {"instances": []}
    }
    if (data.Reservations[0].Instances === undefined) {
        return undefined;
    }
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
        ...(data.NextToken !== undefined) && {"nextToken": data.NextToken}
    };

}

function generateRequestParameters(req: express.Request): DescribeParameters {
    let params: DescribeParameters = {};
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
    if (req.query.nextToken !== undefined) {
        params.NextToken = req.query.nextToken.toString();
    }
    if (req.query.maxResults !== undefined) {
        params.MaxResults = parseInt(req.query.maxResults.toString());
    }
    return params;
}

function sortInstances(req: express.Request, parsedInstances: { instances: ParsedInstanceData[] }): number {
    let sortby = req.query.sortby?.toString();
    if (parsedInstances.instances.length > 0 && sortby !== undefined) {
        if (sortby in parsedInstances.instances[0]) {
            parsedInstances.instances.sort((a, b): number =>
                // @ts-ignore // type check here is redundant because we just checked that the sorting key is a valid key
                a[sortby].localeCompare(b[sortby])
            )
            return 0;
        } else {
            return -1;
        }
    }
    return 0;
}

function getInstancesInfo(req: express.Request, res: express.Response): void {
    const ec2 = new AWS.EC2()
    let describeReqParams = generateRequestParameters(req);
    ec2.describeInstances(describeReqParams, (err, data): void => {
        if (err) {
            res.status(401).send(describeError);
            return;
        }
        let parsedInstances = parseData(data);
        if (parsedInstances === undefined) {
            res.status(400).send(unknownError);
            return;
        }
        if (sortInstances(req, parsedInstances)) {
            res.status(400).send(sortError);
        } else {
            res.send(parsedInstances);
        }
    });
}

function serveRequest(req: express.Request, res: express.Response): void {
    if (initializeRegion(req)) {
        res.status(400).json(regionError);
    } else if (authenticateUser(req)) {
        res.status(400).json(authError)
    } else {
        getInstancesInfo(req, res)
    }
}

app.get("/api/:region/instances", (req,
                                   res): void => serveRequest(req, res))

export default app;
