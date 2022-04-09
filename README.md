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

### Show EC2 Instances Information
Returns json data about all instances in region, subject to filters and sorting
* URL: `/api/:region/instances`
* Method:
 `GET`
* URL Params:

   **Required:**

  * `region=[string]` corresponding to a valid AWS region.

  **Optional:**

  * `name|type|state|privateIP|publicIP=[string]` corresponding to valid values for the
    relevant category.
  * `sortby=["name"|"type"|"state"|"az"|"privateIP"|"publicIP"]`

  * `maxResults=[integer]` a number larger or equal to 5.

  * `nextToken` a token received from a previous call to this API
* Data Params:

    None  
* Success Response:
  * Code: 200
  * Content: `{ instances: [...], ...(nextToken) }` 
* Error Response:
  * Code: 400/401
  * Content: `{ error: {type: "rest", message: "...", explanation: "...", action: "..." }`
  * Sample Call:

      ```
    $.ajax({
        url: "/api/us-east-1/instances",
        dataType: "json",
        data: { authorization: "Basic <base64 encoded access key id and secret key>" }
        type : "GET",
        success : function(r) {
            console.log(r);
        }
    });
    ```
## Notes
### Dis-use of HTTPS
To be able to use HTTPS I would need to get a cert from an official CA.

This can be done for free using services such as `letsencrypt.com` but all of those
blacklist AWS computing serves as they are "ephemeral". To bypass this ban I would need
to by a domain of my own, and that would cost money (finding free domains is extremely hard,
especially at such a short time span).

I opted for setting up basic HTTP for the server, and while this completely missed the point of the
security considerations (we are passing secret keys on an unencrypted channel), it serves as a (hopefully)
satisfactory PoC as adding HTTPS support to the current infrastructure comes down to adding two lines to 
the `Nginx` configuration file.

### Region limitations
I have opted out for creating one API endpoint that demands specifying
the region for the EC2 instances. This is done because the AWS SDK itself
demands one region to fetch info about. Therefore, to be able to get info
about instances from various different regions, one would need to send completely
independent calls to the AWS SDK with a different region everytime. While this is possible,
I found that it isn't critical to the functionality of the API and furthermore,
adding it as a feature is as simple as adding a for-loop with a list of hard-coded regions.