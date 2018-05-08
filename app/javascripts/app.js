// Import the page's CSS. Webpack will know what to do with it,
// as it's been configured by truffle-webpack
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract';

// Import our contract artifacts and turn them into usable abstractions.
// Make sure you've ran truffle compile first
import contract_build_artifacts from '../../build/contracts/OraclizeTest.json';

// OraclizeContract is our usable abstraction, which we'll use through the code below.
var OraclizeContract = contract(contract_build_artifacts);

var accounts;
var account;

window.App = {
  currentBalance: 0,
  ethPriceinUSD: 0,

  // 'Constructor'
  start: function() {
    var self = this;

    // Bootstrap the abstraction for Use.
    OraclizeContract.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];

      self.refreshBalance();
    });
  },

  // Show an error
  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  // Opens a socket and listens for Events defined in our contract.
  addEventListeners: function(instance){
    var LogCreated = instance.LogUpdate({},{fromBlock: 0, toBlock: 'latest'});
    var LogPriceUpdate = instance.LogPriceUpdate({},{fromBlock: 0, toBlock: 'latest'});
    var LogInfo = instance.LogInfo({},{fromBlock: 0, toBlock: 'latest'});

    LogPriceUpdate.watch(function(err, result){
      if(!err){
        App.ethPriceinUSD = result.args.price;
        App.showBalance(App.ethPriceinUSD, App.currentBalance);
      }else{
        console.log(err);
      }
    })

    // Emitted when the Contract's constructor is run
    LogCreated.watch(function(err, result){
      if(!err){
        console.log('Contract created!');
        console.log('Owner: ' , result.args._owner);
        console.log('Balance: ' , web3.fromWei(result.args._balance, 'ether').toString(), 'ETH');
        console.log('-----------------------------------');
      }else{
        console.log(err);
      }
    })

    // Emitted when a text message needs to be logged to the front-end from the Contract
    LogInfo.watch(function(err, result){
      if(!err){
        console.info(result.args);
      }else{
        console.error(err);
      }
    })
  },

  refreshBalance: function() {
    var self = this;

    var meta;

    OraclizeContract.deployed().then(function(instance) {
      meta = instance;

      App.addEventListeners(instance);

      return meta.getBalance.call(account, {from: account});
    }).then(function(value) {
      App.currentBalance = web3.fromWei(value.valueOf(), 'ether');
      App.showBalance(App.ethPriceinUSD, App.currentBalance);
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting balance; see console log.");
    });
  },

  showBalance: function(price, balance){
    // Balance updated, start CSS animation
    var row = document.getElementById('row');
    row.style.animation = 'heartbeat 0.75s';

    // Removes CSS animation after 1000 ms
    setTimeout(function(row){
      var row = document.getElementById('row');
      row.style.animation = null;
    }, 1000)

    var balance_element = document.getElementById("balance");
    // Rounding can be more precise, this is just an example
    balance_element.innerHTML = parseFloat(balance).toFixed(6);

    var total_element = document.getElementById("total");
    total_element.innerHTML = (price * balance).toFixed(2);
  }
};

// Front-end entry point
window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  // All systems go, start App!
  App.start();
});
