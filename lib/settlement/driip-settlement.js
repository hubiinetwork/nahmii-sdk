//when it needs to start/settle a challenge. For settling a challenge, it won't need specifying intendedStageAmount
class DriipSettlement {
    constructor (wallet, receipt, intendedStageAmount = null, latestProposal = null, settlementHistory = null) {}

    get receipt() {}
    get intendedStageAmount() {}

    //check if it can start challenge
    async checkStartChallengeFromPayment() {
        //load latest proposal from contract if proposal is null
        //check the states of the latest proposal and see if the condition is met to start new challenge.
    }
    async checkSettleDriipAsPayment() {
        //load settlement object by receipt nonce
    }

    async startChallenge(){}
    async settle(){}

    static async from (wallet, currency, intendedStageAmount) {
        //load latest receipt under address/ct
        //get nonce, ct, id from receipt
        //load latest proposal by Proposal.from(wallet, ct, id)
        //load settlement history object by SettlementHistory.from(nonce)
        //create and return DriipSettlement object
    }
}