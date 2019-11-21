var gauss = require('../../helper/gauss')
var tools = require('../../helper/tools');

class Consumer {
    constructor(name, market) {
        this.name = name;
        this.market = market;
        this.consumption = 3000; // in Wh
        this.bought = 0;
        this.timeMultiplier = 5;
        this.blackout = false;
        this.retrying = false;
    }

    setConsumption(consumption) {
        this.consumption = consumption; // should be gauss distribution
    }

    generateConsumption() {
        // Yearly consumption 25,000 kWh around 70 kWh a day/ 3 kWh an hour
        let consumption = this.consumption / 1000;
        let arr;

        // Threshold of 4 kWh. If it reaches over that point the distribution will favor smaller consumptions.
        if(consumption > 0) {
            if(consumption < 4.0) {
                arr = [0.8 * consumption, consumption, 1.2 * consumption];
            } else {
                arr = [0.8 * consumption, 0.9 * consumption, 0.95 * consumption, 1.1 * consumption];
            }

            consumption = gauss.gauss(arr, 4, 0.05) * 1000;   
            this.buyFromMarket(consumption);
        
        // If blackout has occured, try to buy from market in the future
        } else if(this.blackout && !this.retrying) {
            this.retrying = true;

            tools.sleep(2 * this.timeMultiplier * 1000).then(() => {
                arr = [0.8 * 3, 3, 1.2 * 3];
                consumption = gauss.gauss(arr, 4, 0.05) * 1000;
                this.buyFromMarket(consumption);
                this.retrying = this.blackout;
            });
        }
    }

    buyFromMarket(energy) {
        let boughtEnergy = this.market.buy(energy); 
        this.bought = boughtEnergy;
        
        if(boughtEnergy == 0) {
            this.consumption = 0;
            this.blackout = true;

        } else if(boughtEnergy < energy) {
            this.consumption -= (energy - boughtEnergy);
            this.blackout = false;

        } else {
            this.consumption = energy;
            this.blackout = false;
        }
    }

    display() {
        console.log("Consumer " + this.name + " is connected to " + this.market.name + 
        "\n Time: " + Date(this.time).toString() + 
        "\n Consuming: " + this.consumption + " Wh" + 
        "\n Bought energy: " + this.bought + " Wh" +
        "\n Price per Wh is: " + this.market.price +" SEK" +
        "\n Blackout: " + this.blackout
        );

    }
    

}

module.exports = Consumer;
