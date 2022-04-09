"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsTerms = exports.parameterOptions = exports.sortError = exports.describeError = exports.authError = exports.regionError = exports.unknownError = void 0;
// list of errors for different contexts, format is based on IBM's RESTful APIs
exports.unknownError = {
    "error": {
        "type": "rest",
        "message": "An Unknown error has occurred.",
        "explanation": "Unavailable.",
        "action": "Unavailable."
    }
};
exports.regionError = {
    "error": {
        "type": "rest",
        "message": "Region parameter wasn't passed.",
        "explanation": "AWS's API requires a specific region to be able to fetch info about EC2 instances in it.",
        "action": "Pass a valid AWS region in the querystring."
    }
};
exports.authError = {
    "error": {
        "type": "rest",
        "message": "Keys weren't passed correctly in request.",
        "explanation": "API requires AWS keys are sent in the \"Authorization\" header in Basic auth scheme but this" +
            "wasn't received.",
        "action": "Pass keys in Basic auth scheme through the \"Authorization\" header with base64 encoded" +
            " accessKeyId:secretAccessKey.",
    }
};
exports.describeError = {
    "error": {
        "type": "rest",
        "message": "AWS SDK could not authenticate user or did not have necessary permission policies to " +
            "execute ec2:describeInstances.",
        "explanation": "AWS SDK was called with invalid secret/ID keys or was given valid keys to user " +
            "w/o necessary permissions.  Alternatively, there may be a connection issue between the server and AWS.",
        "action": "Resubmit the request with valid keys for a user with the correct permissions."
    }
};
exports.sortError = {
    "error": {
        "type": "rest",
        "message": "Sorting key couldn't be resolved",
        "explanation": "To sort the results, a valid sorting key must be passed. A key is valid if it is one of the" +
            " visible attributes of an EC2 server.",
        "action": "Resubmit te request with a valid sort key"
    }
};
// list of parameter options for filtering
exports.parameterOptions = ["name", "type", "state", "publicIP", "privateIP"];
// map from simplified names to AWS's official terminology
exports.awsTerms = {
    name: "instance-id",
    type: "instance-type",
    state: "instance-state-name",
    publicIP: "ip-address",
    privateIP: "private-ip-address",
};
