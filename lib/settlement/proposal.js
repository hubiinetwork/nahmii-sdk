//challenge proposal details object. The contract will add a proposal object whenever a challenge is start either for driip or null type settlement.
class Proposal {
    constructor(proposal) {}

    get proposal() {}

    get nonce() {
        //proposal.nonce
    }
    get expirationTime() {
        //proposal.expirationTime
    }
    get hasExpired() {
        //compare Date.now and proposal.expirationTime
    }
    get stageAmount() {
        //proposal.stageAmount
    }

    //note that it can't load proposal details earlier than the latest one under a wallet currency pair
    async from (type, wallet, ct, id) {
        //load latest challenge proposal from DriipSettlementChallenge or NullSettlementChallenge contract based on type
    }
}