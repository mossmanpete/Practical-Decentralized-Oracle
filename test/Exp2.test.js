const { assertRevert } = require("./helper/assertRevert");
const { getNow, getTimeDiff } = require("./helper/timer");
const { randBoolPos, sleep, writeToFile } = require("./helper/util");

const Custodian = artifacts.require("Custodian");
const Client = artifacts.require("Client");
const IoT_temp = artifacts.require("IoT_temp");
const IoT_press = artifacts.require("IoT_press");

var _ = require('lodash');
var fs = require('fs');

let clients = []; // array of client contracts 
// let clientIdToPolarity = {};
let seq;
let result;
let totalVoters;
let ioT_temp = [];
let ioT_press = [];
let finalResult = {"noAgreement": 0, "true": 1, "false": 2}
let consensus = {};
let events;

let t1 = []; 
let t2 = [];
let max_trial = 20;
let N = 10;    // fixed N clients
let M = 20;    // max custodians

contract('Custodian', function (accounts) {
    context('N voters', function () {
        it("Exp", async function(){

            // Create client
            clients = [];
            for (var n = 0; n<N; n++){
                clients[n] = await Client.new();
            }

            console.log("All Clients deployed");

            // Create custodian
            for (var m = 0; m<M; m++){
                consensus[m] = await Custodian.new();

                // All clients vote for custodian m
                for (var n = 0; n<N; n++){
                    await clients[n].vote(consensus[m].address, true);  // HAS AWAIT
                }

                // Terminate custodian m
                await consensus[m].unsafeTerminateCurrentOpenedSeq();
            }

            console.log("All Custodians deployed");            

            // Termination of creation
            await sleep(800);


            // Test different number of Consensus
            for (var m = 10; m<=M; m+=10) {

                let ans_array_per_m = [];

                // Do multiple trials
                for (var j = 0; j<max_trial; j++){

                    // start!
                    t1[m] = await getNow();

                    for (var c = 0; c<m; c++) {

                        // Event
                        events = consensus[c].allEvents(["latest"]);
                        events.watch(async function(error, event){
                            if (!error) {
                                t2[m] = await getNow(); 
                            } else { console.log(error); }
                        });

                        // terminate all camps for each consensus before start another vote camp
                        await consensus[c].unsafeTerminateCurrentOpenedSeq();

                        // Extend the voter base to N (NO AWAIT)
                        for (var i = 0; i < N; i++) { clients[i].vote(consensus[c].address, false); }
                    }

                    // sleep before catch t2
                    await sleep(5000);
                    
                    // Catch t2
                    cur_ans = t2[m] - t1[m];
                    console.log(m, ":", t2[m], t1[m], cur_ans);
                    ans_array_per_m.push(cur_ans);
                }

                // Output to file (m:time)
                writeToFile("Exp2-"+m.toString(), ans_array_per_m);
            }
        }).timeout(3000000000);

    });

});