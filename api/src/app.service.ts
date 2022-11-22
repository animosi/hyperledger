import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { Gateway, GatewayOptions, Wallets, X509Identity } from 'fabric-network';
import * as hfc from 'fabric-client';
import * as yaml from 'js-yaml';

@Injectable()
export class AppService {
  channelName = 'mychannel';
  org1 = 'org1';
  username = 'user1';
  walletPath = path.join(__dirname, 'wallet');
  connProfilePath = path.join(
    __dirname,
    '../connection-profile/connection.profile.yaml',
  );
  clientConfigPath = path.join(
    __dirname,
    '../connection-profile/client-org1.yaml',
  );

  async getClient(): Promise<hfc> {
    const client = hfc.loadFromConfig(this.connProfilePath);

    if (!client) {
      throw new Error('GET_CLIENT_ERROR');
    }

    client.loadFromConfig(this.clientConfigPath);
    await client.initCredentialStores();

    return client;
  }

  async registerUser() {
    try {
      const client = await this.getClient();
      let user = await client.getUserContext(this.username, true);

      if (user && user.isEnrolled()) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      const adminUserObj = await client.setUserContext({
        username: 'midas',
        password: 'Midassoft22',
      });

      const caClient = client.getCertificateAuthority();

      const secret = await caClient.register(
        {
          enrollmentID: this.username,
          affiliation: '',
        },
        adminUserObj,
      );

      console.log('SECRET', secret);

      user = await client.setUserContext({
        username: this.username,
        password: secret,
      });

      if (!user.isEnrolled()) {
        throw new Error('USER_ENROLL_ERROR');
      }
      return {
        success: true,
        secret,
        message: this.username + ' enrolled Successfully',
      };
    } catch (error) {
      console.error(error.message);
      throw new Error(error);
    }

    return true;
  }

  async queryChaincode() {
    try {
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
        console.log('RESPONSE', response);

        if (
          responses[0]
            .toString('utf8')
            .indexOf('Error: transaction returned with failure') != -1
        ) {
          throw new Error('RESPONSE_ERROR');
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
      console.log('ERROR', error.message);
      return error.toString();
    }
  }
}
