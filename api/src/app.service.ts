import { Injectable } from '@nestjs/common';
import * as hfc from 'fabric-client';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
// import { clearTimeout } from 'timers';
const connProfilePath = path.join(
  __dirname,
  '../connection-profile/connection.profile.yaml',
);
const clientConfigPath = path.join(
  __dirname,
  '../connection-profile/client-org1.yaml',
);

import { Gateway, GatewayOptions, Wallets } from 'fabric-network';

const channelName = 'mychannel';
const chaincodeName = 'todo';
const org1 = 'org1';
const walletPath = path.join(__dirname, 'wallet');

// type InvokeChainCodeReq = {
//   peers: string[];
//   organization: string;
//   channelName: string;
//   chaincodeId: string;
//   chaincodeArgs: string[];
//   chaincodeMethod: any;
//   username: string;
// };

@Injectable()
export class AppService {
  async getHello(): Promise<string> {
    console.log('app start...');
    try {
      const connectionProfile: any = yaml.load(
        fs.readFileSync(connProfilePath, 'utf-8'),
      );
      const wallet = await Wallets.newFileSystemWallet(walletPath);

      const gatewayOpts: GatewayOptions = {
        wallet,
        identity: org1,
        discovery: { enabled: true, asLocalhost: true },
      };
      const gateway = new Gateway();
      await gateway.connect(connectionProfile, gatewayOpts);

      const network = await gateway.getNetwork('mychannel');

      console.log(network);

      return 'Success';
    } catch (error) {
      console.log(error);
    }
  }

  //todo OnInit()
  async getClient(): Promise<hfc> {
    const client = hfc.loadFromConfig(connProfilePath);
    if (!client) {
      throw new Error('GET_CLIENT_ERROR');
    }
    client.loadFromConfig(clientConfigPath);
    await client.initCredentialStores();

    return client;
  }

  // async invokeChaincode(body: InvokeChainCodeReq) {
  //   const client = await this.getClient();
  //   const channel = client.getChannel(body.channelName);

  //   if (!channel) {
  //     throw new Error('CHANNEL_NOT_FOUND');
  //   }

  //   const txId = client.newTransactionID();
  //   const txIdAsString = txId.getTransactionID();

  //   const request = {
  //     targets: body.peers,
  //     chaincodeId: body.chaincodeId,
  //     fcn: JSON.stringify(body.chaincodeMethod),
  //     args: body.chaincodeArgs,
  //     chainId: body.chaincodeId,
  //     txId,
  //   };

  //   const results = await channel.sendTransactionProposal(request);
  //   const proposalResponses: any = results[0];
  //   const proposal = results[1];
  //   let successfulResponses = true;

  //   for (const i in proposalResponses) {
  //     let oneSuccessfulResponse = false;
  //     if (
  //       proposalResponses &&
  //       proposalResponses[i].response &&
  //       proposalResponses[i].response.status === 200
  //     ) {
  //       oneSuccessfulResponse = true;
  //       console.log(
  //         '##### invokeChaincode - received successful proposal response',
  //       );
  //     } else {
  //       console.log(
  //         '##### invokeChaincode - received unsuccessful proposal response',
  //       );
  //     }
  //     successfulResponses = successfulResponses && oneSuccessfulResponse;
  //   }

  //   const event_hubs = channel.getChannelEventHubsForOrg();

  //   const events = await Promise.all(
  //     event_hubs.map(
  //       asu(eh) => {
  //         const event_timeout = setTimeout(() => {
  //           const message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
  //           console.error(message);
  //           eh.disconnect();
  //         }, 10000);

  //         const peerAddr = eh.getPeerAddr();

  //         eh.registerTxEvent(
  //           txIdAsString,
  //           (txId, code, blockNumber) => {
  //             console.log(
  //               `##### invokeChaincode - The invoke chaincode transaction has been committed on peer ${peerAddr}`,
  //             );
  //             console.log(
  //               `##### invokeChaincode - Transaction ${txId} has status of ${code} in block ${blockNumber}`,
  //               txId,
  //               code,
  //               blockNumber,
  //             );

  //             clearTimeout(event_timeout); //?

  //             if (code !== 'VALID') {
  //               const message = `##### invokeChaincode - The invoke chaincode transaction was invalid, ${code}`;

  //               throw new Error(message);
  //             } else {
  //               const message =
  //                 '##### invokeChaincode - The invoke chaincode transaction was valid.';
  //               console.log(message);
  //               return message;
  //             }
  //           },
  //           (err) => {
  //             clearTimeout(event_timeout);
  //             console.log(err);
  //             throw new Error(err.message);
  //           },
  //           { unregister: true, disconnect: true },
  //         );
  //         eh.connect();
  //         //end map

  //         const orderer_request = {
  //           txId: txId,
  //           proposalResponses: proposalResponses,
  //           proposal: proposal,
  //         };

  //         const sendPromise = await channel.sendTransaction(orderer_request);
  //         events.push(sendPromise);
  //       }, //end promise()
  //     ),
  //   );
  // }
}
