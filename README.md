# EC2 Instances RESTful API
This API serves as a mediator between the AWS EC2 Console and
an admin that wishes to get information about their EC2 instances w/o
too much of a hassle.

It aims to be simple, minimal-privileged (more on that later), and quick.
## User Authentication
Since AWS requires user authentication (and later authorization)
to call endpoints relating to sensitive/personal information,
the API too needs to receive the user's AWS keys to call AWS's API endpoints.

To minimize exposure of details, it is advised that the given keys are generated
as temporary keys (e.g. as session tokens using AWS's STS API).

Furthermore, these keys should correspond to users who have assumed roles
with only one policy: to allow calling `ec2:describeInstances` operations.
## Endpoints
## Notes
explain about HTTPS problems
explain about regions