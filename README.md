## Dependencies

1. You will need to have `nodejs` and `npm` setup and installed.
2. If you would like to make use of the AWS features such DynamoDB and SecretsManager make sure to have 
you `aws cli` setup and configured. (Remember to export your bash variables for AWS environment variables)

## Installation 

``` shell
npm install -r package.json
```

## Setting up

1. Create a new service account inside MDH for your organization. [Read Service Account documentation](https://developer.mydatahelps.org/api/service_account.html)

2. Set the required environment variables. 

``` shell
export RKS_PROJECT_ID=<project id from MDH>
export RKS_SERVICE_ACCOUNT=<Service account id>
# Pass the private key. 
export RKS_PRIVATE_KEY=`cat ../datahelps_api/myprivate.key`
```

## Runnig the code

``` shell
node index.js
```

If the code runs successfully, you will see a list of Fitbit, Apple Healthkit and Google Fit **steps** data
printed out for each participant.
