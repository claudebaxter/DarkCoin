import React from "react"

import algosdk, { seedFromMnemonic } from "algosdk"

import { Typography, Button } from "@mui/material"

import MyAlgo from '@randlabs/myalgo-connect';

import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect();


export default class DisplayBat extends React.Component { 

    constructor(props) {
        super(props);
        this.state = {
            zoom: false,
            nft: null,
            nftId: null,
            nftUrl: null,
            story1: "",
            story2:"",
            message: ""
            
        };
        this.joinBattle = this.joinBattle.bind(this)
        this.genStory = this.genStory.bind(this)
        this.sendBattle = this.sendBattle.bind(this)


    }

    async componentDidMount() {

        peraWallet.reconnectSession()
        .catch((error) => {
          // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
          // For the async/await syntax you MUST use try/catch
          if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
              // log the necessary errors
              console.log(error)
          }
          });
      
          const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');
          


        let nftId

        let res = await indexerClient.lookupAccountAppLocalStates(this.props.address).do();
        res["apps-local-states"].forEach((localstate) => {
            if (localstate.id == this.props.contract) {
                localstate["key-value"].forEach((kv) => {
                    if (atob(kv.key) == "assetId") {
                        nftId = kv.value.uint
                    }
                })
            }
        })

        let response = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: nftId
              }),
            
                
            });
        
        let session = await response.json()

        let charStats = null

            let assetConfig = await indexerClient.lookupAssetTransactions(nftId)
            .txType("acfg")
            .do();

            charStats = atob(assetConfig.transactions[0].note)
        
        
        this.setState({
            nft: session.assets[0].params,
            nftId: nftId,
            nftUrl: "https://ipfs.io/ipfs/" + session.assets[0].params.url.slice(34),
            charStats: charStats
        })
          
      }

      async genStory() {

        let charName
        let charStats

        const token = {
            'X-API-Key': process.env.indexerKey
        }
      
        const indexerClient = new algosdk.Indexer(token, 'https://mainnet-algorand.api.purestake.io/idx2', '');

        let response = await indexerClient.lookupAccountAppLocalStates(this.props.activeAddress).do();
        response["apps-local-states"].forEach((localstate) => {
            if (localstate.id == this.props.contract) {
                localstate["key-value"].forEach((kv) => {
                    if (atob(kv.key) == "name") {
                        charName = atob(kv.value.bytes)
                    }
                })
                localstate["key-value"].forEach(async (kv) => {
                    
                    if (atob(kv.key) == "assetId") {

                        let assetConfig = await indexerClient.lookupAssetTransactions(kv.value.uint)
                        .txType("acfg")
                        .do();

                        charStats = atob(assetConfig.transactions[0].note)
                        

                        if (charName && charStats) {

                            const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

                            let params = await client.getTransactionParams().do();


                            let ftxn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                                this.props.activeAddress, 
                                "5W64M4ZT4ERRI4AW77HMSO63YHYZVJTRGM6WC7RQIM3YJOLOPYPTXHMU6I", 
                                undefined,
                                undefined,
                                500, 
                                undefined,
                                601894079,
                                params
                            );

                            let ftxn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                            this.props.activeAddress, 
                            "VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM", 
                            undefined,
                            undefined,
                            500, 
                            undefined,
                            601894079,
                            params
                            );

                            
                            let txns = [ftxn1, ftxn2]

                            let txgroup = algosdk.assignGroupID(txns)

                            let multipleTxnGroups

                            
                    
                            if (this.props.wallet == "pera") {
                    
                                try {
                                multipleTxnGroups = [
                                    {txn: ftxn1, signers: [this.props.activeAddress]},
                                    {txn: ftxn2, signers: [this.props.activeAddress]}
                                ];
                    
                                const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

                                let txId = await client.sendRawTransaction(signedTxn).do();

                                this.setState({
                                    confirm: "Sending Transaction..."
                                })

                                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

                                this.setState({
                                    confirm: "Generating Stories..."
                                })

                                let res1 = await fetch('/api/generateStory', {
                                    method: "POST",
                                    headers: {
                                    "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        charName: charName,
                                        charStats: charStats,
                                        charNameOther: this.state.nft.name,
                                        charStatsOther: this.state.charStats,
                                        wager: this.props.wager

                                    }),
                                    
                                    
                                });
                        
                                let sess1 = await res1.json()
                        
                                let story1 = sess1.response.text


                                while (story1.length > 800) {

                                    res1 = await fetch('/api/generateStory', {
                                        method: "POST",
                                        headers: {
                                        "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            charName: charName,
                                            charStats: charStats,
                                            charNameOther: this.state.nft.name,
                                            charStatsOther: this.state.charStats,
                                            wager: this.props.wager
    
                                        }),
                                        
                                        
                                    });

                                    sess1 = await res1.json()

                                    story1 = sess1.response.text

                                }


                                this.setState({
                                    story1: String(kv.value.uint) + ">" + charName + ">" + this.state.nftId + ">" + this.state.nft.name + ">" + this.props.wager + ">" + story1
                                })

                                let res2 = await fetch('/api/generateStory', {
                                    method: "POST",
                                    headers: {
                                    "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        charName: this.state.nft.name,
                                        charStats: this.state.charStats,
                                        charNameOther: charName,
                                        charStatsOther: charStats,
                                        wager: this.props.wager

                                    }),
                                    
                                    
                                });
                        
                                let sess2 = await res2.json()
                        
                                let story2 = sess2.response.text


                                while (story2.length > 800) {

                                    res2 = await fetch('/api/generateStory', {
                                        method: "POST",
                                        headers: {
                                        "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            charName: this.state.nft.name,
                                            charStats: this.state.charStats,
                                            charNameOther: charName,
                                            charStatsOther: charStats,
                                            wager: this.props.wager
    
                                        }),
                                        
                                        
                                    });

                                    sess2 = await res2.json()

                                    story2 = sess1.response.text

                                }


                                this.setState({
                                    story2: this.state.nftId + ">" + this.state.nft.name + ">" + String(kv.value.uint) + ">" + charName + ">" + this.props.wager + ">" + story2
                                })


                                this.setState({
                                    confirm: "Stories Generated, Ready to Fight"
                                })
                        
                                
                                }
                    
                                catch (error) {
                                this.setState({
                                    confirm: "Transaction Denied"
                                })
                                console.log(error)
                                }
                                
                    
                            }
                    
                            else if (this.props.wallet == "myalgo") {

                                try {

                                multipleTxnGroups = [
                                ftxn1.toByte(),
                                ftxn2.toByte()
                                ];

                                const myAlgoWallet = new MyAlgo()

                                const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

                                let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob]).do();

                                this.setState({
                                confirm: "Sending Transaction..."
                                })

                                let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        

                                this.setState({
                                    confirm: "Generating Stories..."
                                })

                                let res1 = await fetch('/api/generateStory', {
                                    method: "POST",
                                    headers: {
                                    "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        charName: charName,
                                        charStats: charStats,
                                        charNameOther: this.state.nft.name,
                                        charStatsOther: this.state.charStats,
                                        wager: this.props.wager

                                    }),
                                    
                                    
                                });
                        
                                let sess1 = await res1.json()
                        
                                let story1 = sess1.response.text


                                while (story1.length > 800) {

                                    res1 = await fetch('/api/generateStory', {
                                        method: "POST",
                                        headers: {
                                        "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            charName: charName,
                                            charStats: charStats,
                                            charNameOther: this.state.nft.name,
                                            charStatsOther: this.state.charStats,
                                            wager: this.props.wager
    
                                        }),
                                        
                                        
                                    });

                                    sess1 = await res1.json()

                                    story1 = sess1.response.text

                                }


                                this.setState({
                                    story1: String(kv.value.uint) + ">" + charName + ">" + this.state.nftId + ">" + this.state.nft.name + ">" + this.props.wager + ">" + story1
                                })

                                let res2 = await fetch('/api/generateStory', {
                                    method: "POST",
                                    headers: {
                                    "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        charName: this.state.nft.name,
                                        charStats: this.state.charStats,
                                        charNameOther: charName,
                                        charStatsOther: charStats,
                                        wager: this.props.wager

                                    }),
                                    
                                    
                                });
                        
                                let sess2 = await res2.json()
                        
                                let story2 = sess2.response.text


                                while (story2.length > 800) {

                                    res2 = await fetch('/api/generateStory', {
                                        method: "POST",
                                        headers: {
                                        "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            charName: this.state.nft.name,
                                            charStats: this.state.charStats,
                                            charNameOther: charName,
                                            charStatsOther: charStats,
                                            wager: this.props.wager
    
                                        }),
                                        
                                        
                                    });

                                    sess2 = await res2.json()

                                    story2 = sess1.response.text

                                }


                                this.setState({
                                    story2: this.state.nftId + ">" + this.state.nft.name + ">" + String(kv.value.uint) + ">" + charName + ">" + this.props.wager + ">" + story2
                                })


                                this.setState({
                                    confirm: "Stories Generated, Ready to Fight"
                                })

                            }

                            catch (error) {
                                this.setState({
                                confirm: "Transaction Denied"
                                })
                                console.log(error)
                            }
                    
                            
                            }
                        }
                    }
                })
            }
        })
  

      }

      async joinBattle() {

        const indexerClient = new algosdk.Indexer('', 'https://algoindexer.algoexplorerapi.io', '');

        const client = new algosdk.Algodv2("", "https://node.algoexplorerapi.io/", "")

        let params = await client.getTransactionParams().do();

        let wtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            this.props.activeAddress, 
            "VWNGMYLU4LGHU2Z2BYHP54IUNU3GJROHG2LOOPFH5JAES3K7W4TBODC6TU", 
            undefined,
            undefined,
            Number(this.props.wager), 
            undefined,
            601894079,
            params
          );

          let global = await indexerClient.lookupApplications(this.props.contract).do();

          let globalState = global.application.params["global-state"]

          let battleNum

          globalState.forEach((keyVal) => {
            if (atob(keyVal.key) == "battleNum") {
                battleNum = keyVal.value.uint
            }
          })

         
          const appArgs = []
          appArgs.push(
            new Uint8Array(Buffer.from("fight")),
            new Uint8Array(Buffer.from(this.props.address)),
            new Uint8Array(Buffer.from("Battle" + String(battleNum))),
            new Uint8Array(Buffer.from(this.state.story1)),
            new Uint8Array(Buffer.from(this.state.story2)),

            
          )

          const accounts = [this.props.address]
          const foreignApps = []
            
          const foreignAssets = [601894079]

          let battleBox = new Uint8Array(Buffer.from("Battle" + String(battleNum)))

          const boxes = [{appIndex: 0, name: battleBox}, {appIndex: 0, name: battleBox}]
          
          let atxn = algosdk.makeApplicationNoOpTxn(this.props.activeAddress, params, this.props.contract, appArgs, accounts, foreignApps, foreignAssets, undefined, undefined, undefined, boxes);
          
          let txns = [wtxn, atxn]

          let txgroup = algosdk.assignGroupID(txns)

          let multipleTxnGroups

         
  
          if (this.props.wallet == "pera") {
  
            try {
              multipleTxnGroups = [
                {txn: wtxn, signers: [this.props.activeAddress]},
                {txn: atxn, signers: [this.props.activeAddress]}
              ];
  
              const signedTxn = await peraWallet.signTransaction([multipleTxnGroups]) 

              let txId = await client.sendRawTransaction(signedTxn).do();

              this.setState({
                confirm: "Sending Transaction..."
              })

              let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);

             let Battle = await client.getApplicationBoxByName(this.props.contract, "Battle" + String(battleNum)).do();

             let string = new TextDecoder().decode(Battle.value)

             let array = string.split(">")

            let winner = Number(array[0])
            let loser = Number(array[2])
            let wager = Number(array[4])
            let story = array[5]

            await this.sendBattle(winner, loser, wager, story, txId.txId)






              this.setState({
                confirm: "Battle Complete"
              })
    
              
            }
  
            catch (error) {
              this.setState({
                confirm: "Transaction Denied"
              })
              console.log(error)
            }
            
  
          }
  
          else if (this.props.wallet == "myalgo") {

            try {

            multipleTxnGroups = [
                wtxn.toByte(),
              atxn.toByte()
            ];

            const myAlgoWallet = new MyAlgo()

            const signedTxn = await myAlgoWallet.signTransaction(multipleTxnGroups);

            let txId = await client.sendRawTransaction([signedTxn[0].blob, signedTxn[1].blob]).do();

            this.setState({
              confirm: "Sending Transaction..."
            })

            let confirmedTxn = await algosdk.waitForConfirmation(client, txId.txId, 4);        

            this.setState({
                confirm: "Battle Complete"            
            })

          }

          catch (error) {
            this.setState({
              confirm: "Transaction Denied"
            })
            console.log(error)
          }
  
          
        }


      }

    async sendBattle(winner, loser, wager, story, txId) {

        let responseWinner = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: winner
              }),
            
                
            });
        
        let sessionWinner = await responseWinner.json()

        let nameWinner = sessionWinner.assets[0].params.name
        let urlWinner = "https://ipfs.io/ipfs/" + sessionWinner.assets[0].params.url.slice(34)

        let responseLoser = await fetch('/api/getNft', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nftId: loser
              }),
            
                
            });
        
        let sessionLoser = await responseLoser.json()

        let nameLoser = sessionLoser.assets[0].params.name
        let urlLoser = "https://ipfs.io/ipfs/" + sessionLoser.assets[0].params.url.slice(34)

        let randomNumber = Math.floor(Math.random() * 2);

        let embeds = []

        embeds.push({
            "title": wager.toLocaleString("en-US") + " DC on the line ! FIGHT !",
            "color": 0
        })
        
        if (randomNumber == 1) {
            
            embeds.push({
                "title" : nameWinner,
                "url": "https://algoexplorer.io/asset/" + winner,
                "image": {
                    "url": String(urlWinner)
                },
                "color": 16711680
            })

            embeds.push({
                "title" : "VS",
                "color" : 16777215
            })

            embeds.push({
                "title" : nameLoser,
                "url": "https://algoexplorer.io/asset/" + loser,
                "image": {
                    "url": String(urlLoser)
                },
                "color": 1376511
            })
                
               

        }

        else {

            embeds.push({
                "title" : nameLoser,
                "url": "https://algoexplorer.io/asset/" + loser,
                "image": {
                    "url": String(urlLoser)
                },
                "color": 1376511
            })

            embeds.push({
                "title" : "VS",
                "color" : 16777215
            })

        
            embeds.push({
                "title" : nameWinner,
                "url": "https://algoexplorer.io/asset/" + winner,
                "image": {
                    "url": String(urlWinner)
                },
                "color": 16711680
            })

        }

        embeds.push({
            "description": String(story).replace(/["']/g, "'"),
            "color": 16777215
        })

        embeds.push({
            "title": nameWinner + " has won " + wager.toLocaleString("en-US") + " DC !",
            "url": "https://algoexplorer.io/tx/" + txId,
            "color": 0
        })


        const response = await fetch(process.env.discordWebhook, {
            method: "POST",
            body: JSON.stringify({
                username: "Arena Fight",
                embeds: embeds
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });



        
    }

    // async sendData() {

    //     let embeds = []

    //     embeds.push({
    //         "title": 10000 + "DC on the line! Combatants, FIGHT!",
    //         "color": 0
    //     })
    //     embeds.push({
    //         "color": 0
    //     })
    //     const response = await fetch(process.env.testDiscordWebhook, {
    //         method: "POST",
    //         body: JSON.stringify({ 
    //           embeds: embeds
    //         }),
    //         headers: {
    //           "Content-Type": "application/json",
    //         },
    //       });

    // }

   

    render() {

        if (this.state.nft) {
            if (this.props.zoom) {
                return (
                    <div >
                        <Button style={{display: "flex", margin: "auto"}} onClick={() => this.props.setNft(null)}>
                        <img src={this.state.nftUrl} style={{display: "flex", margin: "auto", width: "70%", maxWidth: 500, borderRadius: 5}} />


                        </Button>


                        <Typography color="secondary" align="center" style={{margin: 20}} variant="subtitle1"> {this.state.charStats} </Typography>
                        <br />
                        <Typography color="secondary" align="center" variant="h6"> {this.state.message} </Typography>

                        <br />


                        <Button variant="contained" color="secondary"  style={{display: "flex", margin: "auto"}} onClick={() => this.chooseCharacter()} >
                            
                        <Typography color="primary" align="center" variant="h6"> Select </Typography>
                    </Button>


                    </div>
        
                )

            }
            else {
                return (
                    <div style={{border: "1px solid white"}}>
                        <br />
                        <Typography color="secondary" align="center" variant="subtitle1"> {this.state.nft.name} </Typography>
                        <img style={{width: "50%", maxWidth: 200, borderRadius: 5, display: "flex", margin: "auto"}} src={this.state.nftUrl} />
                        <br />
                        <Typography color="secondary" align="center" variant="subtitle1"> Wager </Typography>
                        <Typography color="secondary" align="center" variant="h6"> {Number(this.props.wager).toLocaleString("en-US")} <img style={{width: 40, paddingRight: 20}} src="./DarkCoinLogo.png"/> </Typography>
                        <br />
                        {this.state.story1 && this.state.story2 ? 
                        <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.joinBattle()}>
                            <Typography color="primary" variant="h6" align="center"> Fight {Number(this.props.wager).toLocaleString("en-US")} </Typography>
                            <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                        </Button>
                        :
                        <Button variant="contained" color="secondary" style={{display: "flex", margin: "auto"}} onClick={() => this.genStory()}>
                            <Typography  variant="h6"> Generate 1,000 </Typography>
                            <img src="invDC.svg" style={{display: "flex", margin: "auto", width: 50, padding: 10}} />
                        </Button>
                        }
                    <br />
                    <Typography color="secondary" align="center" variant="h6"> {this.state.confirm} </Typography>
                    <br />

                    </div>
        
                )
            }
            
        }

        else {
            return (
                <div>                   
                </div>
    
            )
        }
       
        
    }
    
}