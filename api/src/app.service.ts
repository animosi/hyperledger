import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
// import { Gateway, GatewayOptions, Wallets, X509Identity } from 'fabric-network';
import * as hfc from 'fabric-client';
// import * as yaml from 'js-yaml';

@Injectable()
export class AppService {
  channelName = 'mychannel';
  org1 = 'org1';
  mspId = 'm-HLJ5GNXSINB73OM2FTDKHGSZOU';
  username = 'user1';
  connProfilePath = path.join(
    __dirname,
    '../connection-profile/connection.profile.yaml',
  );
  clientConfigPath = path.join(
    __dirname,
    '../connection-profile/client-org1.yaml',
  );
  privateKey = fs
    .readFileSync(
      path.resolve(
        '/home/ec2-user/msp/keystore/8d2d0848d0bb4c21056af0172f5423565a6cb9d2edcd3c0a6e4f0e516f50a4d7_sk',
      ),
    )
    .toString();
  signCert = fs
    .readFileSync(path.resolve('/home/ec2-user/msp/admincerts/cert.pem'))
    .toString();

  // walletPath = path.join(__dirname, 'wallet');

  //todo onInit()
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

      //todo params
      const adminUserObj = await client.setUserContext({
        username: 'midas',
        password: 'Midassoft22',
      });

      //* register new user
      const caClient = client.getCertificateAuthority();
      const secret = await caClient.register(
        {
          enrollmentID: this.username,
          affiliation: '',
        },
        adminUserObj,
      );

      //* set new user's password
      user = await client.setUserContext({
        username: this.username,
        password: secret,
      });

      if (!user.isEnrolled()) {
        throw new Error('USER_ENROLL_ERROR');
      }

      //todo revise
      return {
        success: true,
        secret,
        message: this.username + ' ENROLLED',
      };
    } catch (error) {
      console.error(error.message);
      throw new Error(error);
    }
  }

  async queryChaincode() {
    try {
      console.log(this.privateKey, this.signCert, this.mspId);
      const client = await this.getClient();
      await client.setAdminSigningIdentity(
        this.privateKey,
        this.signCert,
        this.mspId,
      );
      const channel = client.getChannel(this.channelName);
      await channel.initialize({ discover: true });

      if (!channel) {
        throw new Error('CHANNEL_NOT_FOUND');
      }

      const request = {
        targets: ['nd-I3OM7G6JIBCSRAAGFQGKJUIGSM'],
        chaincodeId: 'mycc',
        fcn: 'query',
        args: ['query', 'a'],
      };

      const res = await channel.queryByChaincode(request);

      if (!res || res.length < 1) {
        return 'DATA_NOT_FOUND';
      }
      return res;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
