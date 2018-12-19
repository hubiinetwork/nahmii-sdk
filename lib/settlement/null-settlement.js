//when it needs to start/settle a challenge. For settling a challenge, it won't need specifying intendedStageAmount
class NullSettlement {
    constructor (wallet, currency, intendedStageAmount = null, latestProposal = null) {}

    get intendedStageAmount() {}

    //check if it can start challenge
    async checkStartChallenge() {}
    //check if it can settle challenge
    async checkSettle() {}

    async startChallenge() {}
    async settle() {}
    static async from (wallet, currency, intendedStageAmount) {
        //load latest proposal by Proposal.from(type, wallet, ct, id)
        //create and return NullSettlement object
    }
}