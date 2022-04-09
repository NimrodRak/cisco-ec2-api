import AWS from "aws-sdk";

export type DescribeParameters = AWS.EC2.DescribeInstancesRequest;
export type ParsedInstanceData  = {
    "name": string,
    "type": string,
    "state": string,
    "az": string,
    "publicIP": string,
    "privateIP": string
}
export const unknownError = {
    "error" : {
        "type": "rest",
        "message": "An Unknown error has occurred.",
        "explanation": "Unavailable.",
        "action": "Unavailable."
    }
//    TODO : finish this error

}
export const regionError = {
    "error": {
        "type": "rest",
        "message": "Region parameter wasn't passed.",
        "explanation": "AWS's API requires a specific region to be able to fetch info about EC2 instances in it.",
        "action": "Pass a valid AWS region in the querystring."
    }
}
export const authError = {
    "error" : {
        "type": "rest",
        "message": "Keys weren't passed correctly in request.",
        "explanation":  "API requires AWS keys are sent in the \"Authorization\" header in Basic auth scheme but this" +
            "wasn't received.",
        "action": "Pass keys in Basic auth scheme through the \"Authorization\" header with base64 encoded" +
            " accessKeyId:secretAccessKey.",
    }
};
export const describeError = {
    "error" : {
        "type": "rest",
        "message": "AWS SDK could not authenticate user or did not have necessary permission policies to " +
            "execute ec2:describeInstances.",
        "explanation": "AWS SDK was called with invalid secret/ID keys or was given valid keys to user " +
            "w/o necessary permissions.  Alternatively, there may be a connection issue between the server and AWS.",
        "action": "Resubmit the request with valid keys for a user with the correct permissions."
    }
};
export const sortError = {
    "error": {
        "type": "rest",
        "message": "Sorting key couldn't be resolved",
        "explanation": "To sort the results, a valid sorting key must be passed. A key is valid if it is one of the" +
            " visible attributes of an EC2 server.",
        "action": "Resubmit te request with a valid sort key"

    }
}

export const parameterOptions: string[] = ["name", "type", "state", "publicIP", "privateIP"];
export const awsTerms: {[index: string]: string} = {
    name: "instance-id",
    type: "instance-type",
    state: "instance-state-name",
    publicIP: "ip-address",
    privateIP: "private-ip-address",
}
