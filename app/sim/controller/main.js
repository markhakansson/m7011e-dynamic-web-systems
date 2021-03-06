const ConsumerSim = require('../model/consumer');
const MarketSim = require('../model/market');
const ProsumerSim = require('../model/prosumer');
const WeatherSim = require('../model/weather');

const Prosumer = require('../../db/model/prosumer');
const Consumer = require('../../db/model/consumer');

const Logger = require('../../config/logger');

// Set simulation speed (in ms)
const TIME_MULTIPLIER = 5000;

// Lets make market have the same name as the manager?
const MARKET = new MarketSim('Lulea', 2, 5000, 100000, TIME_MULTIPLIER);
const WEATHER = new WeatherSim('Lulea', 10, 20);

var prosumerNames = [];
var consumerNames = [];

var prosumerMap = new Map();
var consumerMap = new Map();

/**
 * Initializes all simulation models with data from the database.
 * Currently only support a single market.
 */
async function init () {
    if (process.env.NODE_ENV === 'development') {
        Logger.info('Initializing simulator...');
    }

    // Get all unique names of prosumers and consumers from DB
    await updateNameArrays();

    // Create new sim models
    for (const name of prosumerNames) {
        mapProsumer(name, MARKET);
    }

    for (const name of consumerNames) {
        mapConsumer(name, MARKET);
    }

    if (process.env.NODE_ENV === 'development') {
        Logger.info('Prosumers: ' + prosumerNames);
        Logger.info('Consumers: ' + consumerNames);
    }
}

function mapProsumer (name, market) {
    try {
        prosumerMap.set(name, new ProsumerSim(name, market, TIME_MULTIPLIER));
    } catch (err) {
        Logger.error('Problem when creating prosumer: ' + err);
    }
}

function mapConsumer (name, market) {
    try {
        consumerMap.set(name, new ConsumerSim(name, market, TIME_MULTIPLIER));
    } catch (err) {
        Logger.error('Problem when creating consumer: ' + err);
    }
}

/**
 * Updates the internal simulation arrays that holds the users and
 * their household.
 */
async function updateNameArrays () {
    await Prosumer.distinct('name')
        .then(res => {
            if (res) {
                prosumerNames = res;
            }
        })
        .catch(err => {
            if (err) {
                Logger.error(err);
            }
        });

    await Consumer.distinct('name')
        .then(res => {
            if (res) {
                consumerNames = res;
            }
        })
        .catch(err => {
            Logger.error(err);
        });
}

/**
 * Searches for new prosumers/consumers in the databse and adds them to the simulation.
 */
async function searchForNewUsers () {
    await updateNameArrays();

    for (const name of prosumerNames) {
        if (!prosumerMap.has(name)) {
            mapProsumer(name, MARKET);
        }
    }

    for (const name of consumerNames) {
        if (!consumerMap.has(name)) {
            mapConsumer(name, MARKET);
        }
    }
}

/**
 * Removes a user/prosumer from the simulation.
 * @param {} name Name of the user to remove.
 */
async function removeUser (name) {
    const index = prosumerNames.indexOf(name);
    prosumerNames.splice(index, 1);
    prosumerMap.delete(name);
}

async function simLoop () {
    setInterval(async function () {
        searchForNewUsers();
        await MARKET.fetchData();
        await WEATHER.fetchData();
        WEATHER.update();
        MARKET.generateProduction();

        for (const [_, prosumer] of prosumerMap) {
            await prosumer.fetchData().catch(
                async (err) => {
                    Logger.warn('User has been deleted from simulator because of error: ' + err);
                    await removeUser(prosumer.prosumer.name);
                }
            );
            prosumer.generateProduction(WEATHER.weather.wind_speed);
            prosumer.generateConsumption();
        }

        for (const [_, consumer] of consumerMap) {
            await consumer.fetchData();
            consumer.generateConsumption();
        }

        for (const [_, prosumer] of prosumerMap) {
            prosumer.update();
        }

        for (const [_, consumer] of consumerMap) {
            consumer.update();
        }

        MARKET.update();
        if (process.env.NODE_ENV === 'development') {
            Logger.info('Wind speed: ' + WEATHER.weather.wind_speed);
        }
    }, TIME_MULTIPLIER);
}

async function main () {
    await init();

    Logger.info('Simulator now running... ');
    try {
        await simLoop();
    } catch (err) {
        Logger.error('Simulation crashed with the following error: ' + err + ' Restarting now.');
        main();
    }
}

module.exports = { main, init };
