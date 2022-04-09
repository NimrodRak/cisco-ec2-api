import express from "express";
import AWS from "aws-sdk";
import {Instance} from "aws-sdk/clients/ec2";
// import uuid from "uuid";

type DescribeParameters = AWS.EC2.DescribeInstancesRequest;
const parameterOptions: string[] = ["name", "type", "state", "publicIP", "privateIP"];
const awsTerms: {[index: string]: string} = {
    name: "instance-id",
    type: "instance-type",
    state: "instance-state-name",
    publicIP: "ip-address",
    privateIP: "private-ip-address",
}
type ParsedInstanceData = {
    "name": string,
    "type": string,
    "state": string,
    "az": string,
    "publicIP": string,
    "privateIP": string
}

const unknownError = {
    "error" : {}
//    TODO : finish this error

}
const regionError = {
    "error": {
        "type": "rest",
        "message": "Region parameter wasn't passed.",
        "explanation": "AWS's API requires a specific region to be able to fetch info about EC2 instances in it",
        "action": "Pass a valid AWS region in the querystring"
    }
}
const authError = {
    "error" : {
        "type": "rest",
        "message": "Keys weren't passed correctly in request.",
        "explanation":  "API requires AWS keys are sent in the \"Authorization\" header in Basic auth scheme but this" +
            "wasn't received",
        "action": "Pass keys in Basic auth scheme through the \"Authorization\" header with base64 encoded" +
                " accessKeyId:secretAccessKey",
    }
};
const describeError = {
    "error" : {
        "type": "rest",
        "message": "AWS SDK could not authenticate user or did not have necessary permission policies to" +
            "execute ec2:describeInstances.",
        "explanation": "AWS SDK was called with invalid secret/ID keys or was given valid keys to user " +
            "w/o necessary permissions.  Alternatively, there may be a connection issue between the server and AWS.",
        "action": "Resubmit the request with valid keys for a user with the correct permissions."
    }
};

const app = express()

const port = process.env.PORT || 3000


function initializeRegion(req: express.Request) {
    if (req.params.region === undefined) {
        return -1;
    }
    AWS.config.update({
        region: req.params.region.toString()
    })
    return 0;
}

function authenticateUser(req: express.Request) {
    let auth = req.header("Authorization")
    if (auth === undefined) {
        return -1;
    }
    let splitAuth = auth.split(" ");
    if (splitAuth.length != 2) {
        return -1;
    }
    let splitDecodedAuth = Buffer.from(splitAuth[1], "base64").toString("utf8").split(":");
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

function getInstancesInfo(req: express.Request, res: express.Response) {
    const ec2 = new AWS.EC2()

    let params: DescribeParameters = {Filters: []};
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
    ec2.describeInstances(params, (err, data) => {
        if (err) {
            res.status(401).send(describeError);
            return;
        }
        let parsedInstances = parseData(data);
        if (parsedInstances !== undefined) {
            res.send(parsedInstances);
        } else {
            res.status(400).send(unknownError);
        }
    });
}

function serveRequest(req: express.Request, res: express.Response) {
    if (initializeRegion(req)) {
        res.status(400).json(regionError);
    } else if (authenticateUser(req)) {
        res.status(400).json(authError)
    } else {
        getInstancesInfo(req, res)
    }
}

app.get("/api/test/:noun", (req, res) => {
    res.send(`Hello, ${req.params.noun}`);
})

app.get("/api/:region/instances", (req, res) => {
    serveRequest(req, res)
})
//    how to get TEMP CRED: https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html
//    api docu; https://gist.github.com/iros/3426278

app.listen(port, () => console.log(`App listening on port ${port}`));
