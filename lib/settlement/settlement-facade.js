//a facade class to encapsulate the operations over DriipSettlement/NullSettlement
class SettlementFacade {
    constructor(wallet, currency, intendedStageAmount = null) {}
    async getRequiredChallengesForIntendedStageAmount() {
        //call this.checkStartChallenge()
        //calculate if the intended stage amount needs to be split into driip and null settlements.
        //initiate DriipSettlement or NullSettlement objects using wallet/currencyAddress/currencyId
        //return an array of required settlement type objects with split intended stage amount if necessary
    }
    //checking which type of challenges can be started
    async checkStartChallenge() {}
    async getOngoingChallenges() {}
    async getSettleableChallenges() {}
    async getMaxChallengesTimeout() {}

    //start driip/null settlement. 
    //I am thinking to have a abstract Settlement class to be inherit by DriipSettlement and NullSettlement class, 
    //so this function doesn't need to check the type, instead just call startChallenge() of the instances.
    async startByRequiredChallenge(requiredChallenge) {}
    async settleBySettleableChallenge(settleableChallenge) {}

    async startChallenge() {}
    async settle() {}
}