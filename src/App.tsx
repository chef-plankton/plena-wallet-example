import * as React from "react";
import styled from "styled-components";
import PlenaConnect from "@plenaconnect/client";
import QRCodeModal from "@plenaconnect/qrcode-modal";
import { IInternalEvent } from "@plenaconnect/types";
import Button from "./components/Button";
import Column from "./components/Column";
import Wrapper from "./components/Wrapper";
import Modal from "./components/Modal";
import Header from "./components/Header";
import Loader from "./components/Loader";
import { fonts } from "./styles";
import { IPlenaTxData } from "@plenaconnect/types";
import Web3 from "web3";
import { AbiItem } from "web3-utils";

import Banner from "./components/Banner";
import { convertUtf8ToHex } from "@plenaconnect/utils";
import { verifySignature, hashMessage } from "./helpers/utilities";

const web3 = new Web3(new Web3.providers.HttpProvider("https://rpc-mainnet.matic.quiknode.pro/"));
console.log("initialised web3", web3);

const SLayout = styled.div`
  position: relative;
  width: 100%;
  /* height: 100%; */
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper as any)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SLanding = styled(Column as any)`
  height: 600px;
`;

const SButtonContainer = styled(Column as any)`
  width: 250px;
  margin: 50px 0;
`;

const SConnectButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SModalContainer = styled.div`
  width: 100%;
  position: relative;
  word-wrap: break-word;
`;

const SModalTitle = styled.div`
  margin: 1em 0;
  font-size: 20px;
  font-weight: 700;
`;

const SModalParagraph = styled.p`
  margin-top: 30px;
`;

// @ts-ignore
const SBalances = styled(SLanding as any)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const STable = styled(SContainer as any)`
  flex-direction: column;
  text-align: left;
`;

const SRow = styled.div`
  width: 100%;
  display: flex;
  margin: 6px 0;
`;

const SKey = styled.div`
  width: 30%;
  font-weight: 700;
`;

const SValue = styled.div`
  width: 70%;
  font-family: monospace;
`;

const STestButtonContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const STestButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  max-width: 250px;
  margin: 12px;
`;

interface IAppState {
  connector: PlenaConnect | null;
  fetching: boolean;
  connected: boolean;
  chainId: number;
  showModal: boolean;
  pendingRequest: boolean;
  uri: string;
  accounts: string[];
  address: string;
  result: any | null;
}

const INITIAL_STATE: IAppState = {
  connector: null,
  fetching: false,
  connected: false,
  chainId: 56,
  showModal: false,
  pendingRequest: false,
  uri: "",
  accounts: [],
  address: "",
  result: null,
};

class App extends React.Component<any, any> {
  public state: IAppState = {
    ...INITIAL_STATE,
  };

  public connect = async () => {
    // bridge url
    const bridge = "https://bridge.plena.finance/";

    // create new connector
    const connector = new PlenaConnect({
      bridge,
      qrcodeModal: QRCodeModal,
      clientMeta: {
        description: "Connect your dApps",
        url: "https:/plena.finance",
        icons: ["https://plena.finance/files/plena-logo.png"],
        name: "Plena Connect",
      },
    });

    await this.setState({ connector });

    // check if already connected
    if (!connector.connected) {
      // create new session
      await connector.createSession();
    }

    // subscribe to events
    await this.subscribeToEvents();
  };
  public subscribeToEvents = () => {
    const { connector } = this.state;

    if (!connector) {
      return;
    }

    connector.on("session_update", async (error, payload) => {
      if (error) {
        throw error;
      }

      const { chainId, accounts } = payload.params[0];
      this.onSessionUpdate(accounts, chainId);
    });

    connector.on("connect", (error, payload) => {
      console.log("here");
      console.log(payload);
      
      if (error) {
        throw error;
      }

      this.onConnect(payload);
    });

    connector.on("disconnect", (error, payload) => {
      if (error) {
        throw error;
      }

      this.onDisconnect();
    });

    if (connector.connected) {
      const { chainId, accounts } = connector;
      const address = accounts[0];
      this.setState({
        connected: true,
        chainId,
        accounts,
        address,
      });
      this.onSessionUpdate(accounts, chainId);
    }

    this.setState({ connector });
  };

  public killSession = async () => {
    const { connector } = this.state;
    if (connector) {
      connector.killSession();
    }
    this.resetApp();
  };

  public resetApp = async () => {
    await this.setState({ ...INITIAL_STATE });
  };

  public onConnect = async (payload: IInternalEvent) => {
    const { chainId, accounts } = payload.params[0];
    const address = accounts[0];
    await this.setState({
      connected: true,
      chainId,
      accounts,
      address,
    });
    // this.getAccountAssets();
  };

  public onDisconnect = async () => {
    this.resetApp();
  };

  public onSessionUpdate = async (accounts: string[], chainId: number) => {
    const address = accounts[0];
    await this.setState({ chainId, accounts, address });
  };

  public toggleModal = () => this.setState({ showModal: !this.state.showModal });

  public testPersonalSignMessage = async () => {
    const { connector, address, chainId } = this.state;

    if (!connector) {
      return;
    }

    // test message
    const message = `My email is john@doe.com - ${new Date().toUTCString()}`;

    // encode message (hex)
    const hexMsg = convertUtf8ToHex(message);

    // eth_sign params
    const msgParams = [hexMsg, address];

    try {
      // open modal
      this.toggleModal();
      // toggle pending request indicator
      this.setState({ pendingRequest: true });
      // send message
      const result = await connector.signPersonalMessage(msgParams);
      // verify signature
      const hash = hashMessage(message);
      const valid = await verifySignature(result?.from, result?.signature, hash, chainId);

      // format displayed result
      const formattedResult = {
        method: "personal_sign",
        address,
        valid,
        result: result?.signature,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public testPlenaTransaction = async () => {
    const { connector, address } = this.state;

    if (!connector) {
      return;
    }

    // // from
    // const from = address;

    const lendingPool = "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf";
    const USDC = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
    const swAddress = address;
    const abi1 = {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    };

    const txnData1 = web3.eth.abi.encodeFunctionCall(abi1 as AbiItem, [lendingPool, "1000000"]);

    const abi2 = {
      inputs: [
        {
          internalType: "address",
          name: "asset",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "onBehalfOf",
          type: "address",
        },
        {
          internalType: "uint16",
          name: "referralCode",
          type: "uint16",
        },
      ],
      name: "deposit",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    };

    const txnData2 = web3.eth.abi.encodeFunctionCall(abi2 as AbiItem, [
      USDC,
      "100000",
      swAddress,
      "0",
    ]);

    // Draft transaction
    const tx: IPlenaTxData = {
      from: address,
      encodedData: [txnData1, txnData2],
      to: [USDC, lendingPool],
      tokens: ["", ""],
      amounts: ["0x0", "0x0"],
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send transaction
      const result = await connector.sendTransactionToPlena(tx);
      console.log(result);

      // format displayed result
      const formattedResult = {
        method: "eth_sendTransactionToPlena",
        txHash: result,
        from: address,
      };

      // display result
      this.setState({
        connector,
        pendingRequest: false,
        result: formattedResult || null,
      });
    } catch (error) {
      console.error(error);
      this.setState({ connector, pendingRequest: false, result: null });
    }
  };

  public render = () => {
    const { address, connected, chainId, fetching, showModal, pendingRequest, result } = this.state;
    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.killSession}
          />
          <SContent>
            {!address ? (
              <SLanding center>
                <h3>
                  {`PlenaConnect`}
                  <br />
                  <span>{`v${process.env.REACT_APP_VERSION}`}</span>
                </h3>
                <SButtonContainer>
                  <SConnectButton left onClick={this.connect} fetching={fetching}>
                    {"Connect"}
                  </SConnectButton>
                </SButtonContainer>
              </SLanding>
            ) : (
              <SBalances>
                <Banner />
                <h3>Actions</h3>
                <Column center>
                  <STestButtonContainer>
                    <STestButton left onClick={this.testPersonalSignMessage}>
                      {"personal_sign"}
                    </STestButton>
                  </STestButtonContainer>
                  <STestButtonContainer>
                    <STestButton left onClick={this.testPlenaTransaction}>
                      {"eth_sendPlenaTransaction"}
                    </STestButton>
                  </STestButtonContainer>
                </Column>
              </SBalances>
            )}
          </SContent>
        </Column>
        <Modal show={showModal} toggleModal={this.toggleModal}>
          {pendingRequest ? (
            <SModalContainer>
              <SModalTitle>{"Pending Call Request"}</SModalTitle>
              <SContainer>
                <Loader />
                <SModalParagraph>{"Approve or reject request using your wallet"}</SModalParagraph>
              </SContainer>
            </SModalContainer>
          ) : result ? (
            <SModalContainer>
              <SModalTitle>{"Call Request Approved"}</SModalTitle>
              <STable>
                {Object.keys(result).map(key => (
                  <SRow key={key}>
                    <SKey>{key}</SKey>
                    <SValue>{result[key].toString()}</SValue>
                  </SRow>
                ))}
              </STable>
            </SModalContainer>
          ) : (
            <SModalContainer>
              <SModalTitle>{"Call Request Rejected"}</SModalTitle>
            </SModalContainer>
          )}
        </Modal>
      </SLayout>
    );
  };
}

export default App;
