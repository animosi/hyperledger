import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { Gateway, GatewayOptions, Wallets, X509Identity } from 'fabric-network';
import * as hfc from 'fabric-client';
import * as yaml from 'js-yaml';
// import { clearTimeout } from 'timers';

type InvokeChainCodeReq = {
  peers: string[];
  organization: string;
  channelName: string;
  chaincodeId: string;
  chaincodeArgs: string[];
  chaincodeMethod: any;
  username: string;
};

@Injectable()
export class AppService {
  channelName = 'mychannel';
  org1 = 'org1';
  walletPath = path.join(__dirname, 'wallet');
  connProfilePath = path.join(
    __dirname,
    '../connection-profile/connection.profile.yaml',
  );
  clientConfigPath = path.join(
    __dirname,
    '../connection-profile/client-org1.yaml',
  );

  async getHello(): Promise<string> {
    console.log('app start...');
    try {
      const connectionProfile: any = yaml.load(
        fs.readFileSync(this.connProfilePath, 'utf-8'),
      );
      const wallet = await Wallets.newFileSystemWallet(this.walletPath);

      const identityLabel = 'org1';

      const identity: X509Identity = {
        credentials: {
          certificate: fs
            .readFileSync('/home/ec2-user/msp/admincerts/cert.pem')
            .toString(),
          privateKey: fs
            .readFileSync(
              '/home/ec2-user/msp/keystore/8d2d0848d0bb4c21056af0172f5423565a6cb9d2edcd3c0a6e4f0e516f50a4d7_sk',
            )
            .toString(),
        },
        mspId: 'Org1MSP',
        type: 'X.509',
      };
      await wallet.put(identityLabel, identity);

      const gatewayOpts: GatewayOptions = {
        wallet,
        identity: this.org1,
        discovery: { enabled: true, asLocalhost: true },
      };
      const gateway = new Gateway();
      await gateway.connect(connectionProfile, gatewayOpts);

      const network = await gateway.getNetwork(this.channelName);

      console.log(network);

      return 'Success';
    } catch (error) {
      console.log(error);
    }
  }

  //todo OnInit()
  async getClient(): Promise<hfc> {
    const client = hfc.loadFromConfig(this.connProfilePath);
    if (!client) {
      throw new Error('GET_CLIENT_ERROR');
    }
    client.loadFromConfig(this.clientConfigPath);
    await client.initCredentialStores();

    return client;
  }

  async invokeChaincode(body: InvokeChainCodeReq) {
    const client = await this.getClient();
    const channel = client.getChannel(body.channelName);

    if (!channel) {
      throw new Error('CHANNEL_NOT_FOUND');
    }

    const txId = client.newTransactionID();
    const txIdAsString = txId.getTransactionID();

    const request = {
      targets: body.peers,
      chaincodeId: body.chaincodeId,
      fcn: JSON.stringify(body.chaincodeMethod),
      args: body.chaincodeArgs,
      chainId: body.chaincodeId,
      txId,
    };

    const results = await channel.sendTransactionProposal(request);
    const proposalResponses: any = results[0];
    const proposal = results[1];
    let successfulResponses = true;

    for (const i in proposalResponses) {
      let oneSuccessfulResponse = false;

      //?
      if (
        proposalResponses &&
        proposalResponses[i].response &&
        proposalResponses[i].response.status === 200
      ) {
        oneSuccessfulResponse = true;
        console.log(
          '##### invokeChaincode - received successful proposal response',
        );
      } else {
        console.log(
          '##### invokeChaincode - received unsuccessful proposal response',
        );
      }
      successfulResponses = successfulResponses && oneSuccessfulResponse;
    }

    const event_hubs = channel.getChannelEventHubsForOrg();

    const events = await Promise.all(
      event_hubs.map(
        async (eh) => {
          const event_timeout = setTimeout(() => {
            const message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
            console.error(message);
            eh.disconnect();
          }, 10000);

          const peerAddr = eh.getPeerAddr();

          eh.registerTxEvent(
            txIdAsString,
            (txId, code, blockNumber) => {
              clearTimeout(event_timeout); //?

              if (code !== 'VALID') {
                throw new Error('INVALID_TRANSACTION');
              }
            },
            (err) => {
              clearTimeout(event_timeout);
              console.log(err);
              throw new Error(err.message);
            },
            { unregister: true, disconnect: true },
          );
          eh.connect();
          //end map

          const orderer_request = {
            txId: txId,
            proposalResponses: proposalResponses,
            proposal: proposal,
          };

          const sendPromise = await channel.sendTransaction(orderer_request);
          // events.push(sendPromise);
        }, //end promise()
      ),
    );
  }
  async queryChaincode() {
    try {
      // setup the client for this org
      const client = await this.getClient();

      const channel = client.getChannel(this.channelName);
      if (!channel) {
        throw new Error('CHANNEL_NOT_FOUND');
      }

      // send query
      const request = {
        targets: ['nd-I3OM7G6JIBCSRAAGFQGKJUIGSM'],
        chaincodeId: 'mycc',
        fcn: 'query',
        args: ['query', 'a'],
      };

      const responses = await channel.queryByChaincode(request);
      const ret = [];
      if (responses) {
        // you may receive multiple responses if you passed in multiple peers. For example,
        // if the targets : peers in the request above contained 2 peers, you should get 2 responses
        for (let i = 0; i < responses.length; i++) {
          console.log(
            '##### queryChaincode - result of query: ' +
              responses[i].toString('utf8') +
              '\n',
          );
        }
        // check for error
        const response = responses[0].toString('utf8');

        if (
          responses[0]
            .toString('utf8')
            .indexOf('Error: transaction returned with failure') != -1
        ) {
          throw new Error('ERROR');
        }
        // we will only use the first response. We strip out the Fabric key and just return the payload
        const json = JSON.parse(responses[0].toString('utf8'));
        if (Array.isArray(json)) {
          for (const key in json) {
            if (json[key]['Record']) {
              ret.push(json[key]['Record']);
            } else {
              ret.push(json[key]);
            }
          }
        } else {
          ret.push(json);
        }
        console.log('RETURN', ret);
        return ret;
      } else {
        return 'RESPONSE_NULL';
      }
    } catch (error) {
      console.log('ERROR');
      return error.toString();
    }
  }
}
