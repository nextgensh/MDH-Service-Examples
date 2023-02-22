const { DynamoDBClient } = require("@aws-sdk/client-dynamodb")
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb")
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager")

const mdh = require('./mdh')

// **NOTE!** In a real production app you would want these to be sourced from real environment variables. The .env file is just
// a convenience for development.
const rksProjectId = process.env.RKS_PROJECT_ID;

async function main() {

  let rksServiceAccount = null
  let privateKey = null

  // If We have passed the service account and private key path in the environment use that.
  if(process.env.RKS_SERVICE_ACCOUNT && process.env.RKS_PRIVATE_KEY) {
    console.log('Using MDH credentials from environment variables')
    rksServiceAccount = process.env.RKS_SERVICE_ACCOUNT
    privateKey = process.env.RKS_PRIVATE_KEY
  }
  else {
    console.log('Using MDH credentials from AWS Secrets Manager')
    const secret_name = 'prod/mydatahelps/serviceaccount_sciencewellness'
    const secretsClient = new SecretsManagerClient({region: 'us-east-1'})

    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT"
      })
    )

    const secret = response['SecretString']
    rksServiceAccount = secret['MDH_Service_Account']
    privateKey = secret['MDH_Private_Key']
  }

  const token = await mdh.getAccessToken(rksServiceAccount, privateKey)
  if(token == null) {
    return null
  }

  const participants = await getAllParticipants(token, rksProjectId)
  if(participants == null) {
    return null
  }

  let pids = []
  for(const participant of participants.participants) {
    pids.push(participant.id)
  }

  // Setup the connection
  const client = new DynamoDBClient({region: 'us-east-1'})
  const ddClient = DynamoDBDocumentClient.from(client)

  for(const pid of pids) {
    let steps = 0
    const fsteps = await getCurrentMonthSteps(token, pid, 'Fitbit')
    const asteps = await getCurrentMonthSteps(token, pid, 'AppleHealth')
    const gsteps = await getCurrentMonthSteps(token, pid, 'GoogleFit')
    console.log('Fitbit :: Pid - '+pid+' | Steps - '+fsteps)
    console.log('AppleHealth :: Pid - '+pid+' | Steps - '+asteps)
    console.log('GoogleFit :: Pid - '+pid+' | Steps - '+gsteps)

    const totalsteps = fsteps + asteps + gsteps
    const results = await ddClient.send(
      new PutCommand({
        TableName: 'stepsdemo',
        Item: {
          'participantID' : pid,
          'totalsteps' : totalsteps,
          'fitbitsteps' : fsteps,
          'applesteps' : asteps,
          'googlesteps' : gsteps
        }
      })
    )
  }
}

// Method which gets the steps for the current month given the namepsce - Fitbit, AppleHealth, GoogleFit
async function getCurrentMonthSteps(token, pid, namespace) {
    // We are only interested in data from the current month.
    const currentdate = new Date()
    const monthstart = new Date(currentdate.getFullYear(), currentdate.getMonth(), 1)
    // Steps coming from Fitbit.
    const params = {
      'namespace' : namespace,
      'participantID' : pid,
      'type' : 'Steps',
      'observedAfter' : monthstart.toISOString()
    }
    const data = await getDeviceData(token, rksProjectId, params)
    // Add all the steps from the month together.
    let steps = 0
    for(const records of data['deviceDataPoints']) {
      const val = records['value']
      if(val) {
        steps += parseInt(val, 10)
      }
    }

  return steps
}

// Method which gets all the participants.
async function getAllParticipants(token, projectId) {
  const resourceUrl = '/api/v1/administration/projects/'+projectId+'/participants'
  return await mdh.getFromApi(token, resourceUrl)
}

// Method which returns project device data.
async function getDeviceData(token, projectId, params) {
  //const participantResourceUrl = `/api/v1/administration/projects/` + rksProjectId + '/participants';
  const resourceUrl = '/api/v1/administration/projects/'+projectId+'/devicedatapoints'
  return await mdh.getFromApi(token, resourceUrl, params)
}

main()
