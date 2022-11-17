import { Injectable } from '@nestjs/common';
import hfc from 'fabric-client';
// hfc.addConfigFile('./../config.json');
// const channelName = hfc.getConfigSetting('channelName');
// const chaincodeName = hfc.getConfigSetting('chaincodeName');
// const peers = hfc.getConfigSetting('peers');

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  async getClientForOrg(userorg, username) {
    console.log(
      '============ START getClientForOrg for org %s and user %s',
      userorg,
      username,
    );
    const config = './connection-profile/connection.profile.yaml';
    const orgLower = userorg.toLowerCase();
    const clientConfig =
      './connection-profile/' + 'client-' + orgLower + '.yaml';

    console.log(
      '##### getClient - Loading connection profiles from file: %s and %s',
      config,
      clientConfig,
    );

    const client = hfc.loadFromConfig(config);
    client.loadFromConfig(clientConfig);

    await client.initCredentialStores();

    if (username) {
      const user = await client.getUserContext(username, true);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      } else {
        console.log(
          '##### getClient - User %s was found to be registered and enrolled',
          username,
        );
      }
    }

    console.log('============ END getClientForOrg for org %s and user %s \n\n');

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
