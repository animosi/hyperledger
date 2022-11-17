import { Injectable } from '@nestjs/common';
import * as hfc from 'fabric-client';
import readYamlFile from 'read-yaml-file';
import * as path from 'path';
const connProfilePath = path.join(
  __dirname,
  '../connection-profile/connection.profile.yaml',
);
const clientConfigPath = path.join(
  __dirname,
  '../connection-profile/client-org1.yaml',
);

// hfc.addConfigFile('./../config.json');
// const channelName = hfc.getConfigSetting('channelName');
// const chaincodeName = hfc.getConfigSetting('chaincodeName');
// const peers = hfc.getConfigSetting('peers');

@Injectable()
export class AppService {
  async getHello(): Promise<string> {
    console.log('app start...');
    try {
      const file = await readYamlFile(connProfilePath);
      console.log(file);
      return 'hello';
    } catch (error) {
      console.log(error);
    }

    // const gateway = new Gateway();
    // await gateway.connect(connectionProfile, gatewayOptions);

    // const network = await gateway.getNetwork('mychannel');
    // console.log(network);
    return 'Hello';
  }

  async getClientForOrg(userorg, username) {
    console.log(
      '============ START getClientForOrg for org %s and user %s',
      userorg,
      username,
    );

    console.log(
      '##### getClient - Loading connection profiles from file: %s and %s',
      connProfilePath,
      clientConfigPath,
    );

    const client = hfc.loadFromConfig(connProfilePath);

    client.loadFromConfig(clientConfigPath);

    await client.initCredentialStores();
    const channel = await client.getChannel('mychannel');

    console.log(channel);

    // if (username) {
    //   const user = await client.getUserContext(username, true);
    //   if (!user) {
    //     throw new Error('USER_NOT_FOUND');
    //   } else {
    //     console.log(
    //       '##### getClient - User %s was found to be registered and enrolled',
    //       username,
    //     );
    //   }
    // }

    // console.log('============ END getClientForOrg for org %s and user %s \n\n');

    return client;
  }

  async invokeChaincode(username: string, orgName: string) {
    console.log(
      "\n============ invokeChaincode - chaincode %s, function %s, on the channel '%s' for org: %s\n",

      orgName,
    );

    try {
      // first setup the client for this org
      const client = await this.getClientForOrg(orgName, username);
      console.log(
        '##### invokeChaincode - Successfully got the fabric client for the organization "%s"',
        orgName,
      );
      console.log(client);
    } catch (err) {
      throw new Error(err);
    }
  }
}
