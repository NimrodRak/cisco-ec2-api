"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
// import uuid from "uuid";
const defaultRegion = "us-east-1";
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.get("/api/:region/instances", (req, res) => {
});
function initializeRegion(req) {
    aws_sdk_1.default.config.update({
        region: req.query.region === undefined
            ? defaultRegion
            : req.query.region.toString()
    });
}
function authenticateUser(req) {
    process.env.AWS_ACCESS_KEY_ID = req.query.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = req.query.secretAccessKey;
}
function getInstancesInfo(req, res, params) {
    const ec2 = new aws_sdk_1.default.EC2();
    ec2.describeInstances(params, (err, data) => {
        if (err) {
            console.log(err.stack);
            return;
        }
        console.log(data);
        res.send(data);
    });
}
function serveRequest(req, res, params) {
    initializeRegion(req);
    authenticateUser(req);
    getInstancesInfo(req, res, params);
}
app.get("/api/test/:noun", (req, res) => {
    res.send(`Hello, ${req.query.noun}`);
});
app.get("/api/all", (req, res) => {
    const params = {};
    serveRequest(req, res, params);
    //    https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html
    //    https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#sharing-credentials
    //    https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/ec2-example-managing-instances.html
    //    https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-propertyd
    //    https://stackoverflow.com/questions/38907811/use-aws-js-sdk-in-node-to-describe-all-ec2-instances
    //    how to get TEMP CRED: https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html
    //    how to set TEMP CRED: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html#using-temp-creds-more-info
    //    https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-policies-ec2-console.html
    //    understand how to get credentials
    //    https://stackoverflow.com/questions/52958432/listen-for-https-requests-to-port-3000-on-ec2-for-nodejs-express-app
    //    basic setup ec2 + node: https://medium.com/@matlabinfotech12/deploy-nodejs-application-on-aws-4f142247bd55
    //    with nginx no key mention: https://aws.plainenglish.io/deploying-a-nodejs-application-in-aws-ec2-c1618b9b3874
    //    helpful nginx: https://stackoverflow.com/questions/52958432/listen-for-https-requests-to-port-3000-on-ec2-for-nodejs-express-app
    //    very thorough w/ domain: https://blog.cloudboost.io/setting-up-an-https-sever-with-node-amazon-ec2-nginx-and-lets-encrypt-46f869159469
    //    how to override letsencrypt blacklist:https://community.letsencrypt.org/t/policy-forbids-issuing-name-for-aws/95246/2
    //    detailed not new: https://github.com/MSCHF/aws-ec2-node-npm-setup
    //    nip.io, works only if can access public ip directly: https://bansalanuj.com/https-aws-ec2-without-custom-domain
    //    discussion: https://stackoverflow.com/questions/19926385/amazon-ec2-ssl
    //    testing purposes: https://stackoverflow.com/questions/5309910/https-setup-in-amazon-ec2
    //    api docu; https://gist.github.com/iros/3426278
});
app.listen(port, () => console.log(`App listening on port ${port}`));
