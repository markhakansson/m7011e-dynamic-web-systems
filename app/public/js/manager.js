$(document).ready(function () {
    $.ajax({
        url: 'http://localhost:4000/graphql',
        contentType: 'application/json',
        type: 'POST',
        data: JSON.stringify({
            query: `{
                users {
                    username
                }
            }`
        }),
        success: function (res) {
            res.data.users.forEach(obj => {
                $('#users').append("<li><a href='/prosumer?username=" + obj.username + "'>" + obj.username + '</a></li>');
                $('#users').append('<button type=button id=' + obj.username + ' > Block </button>');
                $('#users').on('click', '#' + obj.username, function () {
                    $.ajax({
                        url: 'http://localhost:4000/graphql',
                        contentType: 'application/json',
                        type: 'POST',
                        data: JSON.stringify({
                            query: `mutation {
                                blockProsumer(prosumerName: "${obj.username}", timeout: ${$('#timeBlock').val()})
                            }`
                        }),
                        success: function (res) {
                            $('#blockInfo').html(res.data.blockProsumer);
                        },
                        error: function (e) {
                            $('#blockInfo').html('Error: ' + e + '\n Did you provide digits?');
                        }
                    })
                });
            });
        }
    });
    $.ajax({
        url: 'http://localhost:4000/online',
        contentType: 'application/json',
        type: 'GET',
        success: function (res) {
            res.users.forEach(obj => {
                $('#online').append('<li><a>' + obj + '</a></li>');
            });
        }
    });
    $('#productionSlider').change(function () {
        const value = this.value;
        $.ajax({
            url: 'http://localhost:4000/graphql',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify({
                query: `mutation {
                    setMarketProduction(production: ${value})
                }`
            }),
            success: function () {
                console.log('Production updated to ' + value);
                $('#productionValue').html(value);
            }
        });
    });
    $('#setProductionValue').click(function () {
        const value = $('#productionValueText').val();
        $.ajax({
            url: 'http://localhost:4000/graphql',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify({
                query: `mutation {
                    setMarketProduction(production: ${value})
                }`
            }),
            success: function () {
                $('#productionValue').html(value);
                $('#productionSlider').val(value);
            },
            error: function (e) {
                alert('Bad request, did you input digits?');
            }
        });
    });
    $('#bufferRatioSlider').change(function () {
        const value = this.value;
        $.ajax({
            url: 'http://localhost:4000/graphql',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify({
                query: `mutation {
                    setMarketFillBatteryRatio(fillBatteryRatio: ${value / 100})
                }`
            }),
            success: function (e) {
                $('#bufferRatioValue').html(value);
            }
        });
    });
    $('#setBufferRatio').click(function () {
        const value = $('#bufferValueText').val();
        $.ajax({
            url: 'http://localhost:4000/graphql',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify({
                query: `mutation {
                    setMarketFillBatteryRatio(fillBatteryRatio: ${value / 100})
                }`
            }),
            success: function () {
                $('#bufferRatioValue').html(value);
                $('#bufferRatioSlider').val(value);
            },
            error: function (e) {
                alert('Bad request, did you input digits?');
            }
        });
    });
    $('#marketPriceSlider').change(function () {
        const value = this.value;
        $.ajax({
            url: 'http://localhost:4000/graphql',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify({
                query: `mutation {
                    setMarketPrice(price: ${value})
                }`
            }),
            success: function () {
                $('#priceRatioValue').html(value);
            }
        });
    });
    $('#setPrice').click(function () {
        const value = $('#priceValueText').val();
        $.ajax({
            url: 'http://localhost:4000/graphql',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify({
                query: `mutation {
                    setMarketPrice(price: ${value})
                }`
            }),
            success: function () {
                $('#priceRatioValue').html(value);
                $('#marketPriceSlider').val(value);
            },
            error: function (e) {
                alert('Bad request, did you input digits?');
            }
        });
    });
    $('#autopilot').change(function (e) {
        if (!$(this).is(':checked')) {
            $.ajax({
                url: 'http://localhost:4000/graphql',
                contentType: 'application/json',
                type: 'POST',
                data: JSON.stringify({
                    query: `mutation {
                        useAutopilot(enable: ${false})
                    }`
                }),
                success: function () {
                    $(this).prop('checked', false);
                }

            });
        } else {
            $.ajax({
                url: 'http://localhost:4000/graphql',
                contentType: 'application/json',
                type: 'POST',
                data: JSON.stringify({
                    query: `mutation {
                        useAutopilot(enable: ${true})
                    }`
                }),
                success: function () {
                    $(this).prop('checked', true);
                }

            });
        }
    })

    updateInformation();

    // setInterval(updateInformation, 5000);
});

function updateInformation () {
    $.ajax({
        url: 'http://localhost:4000/graphql',
        contentType: 'application/json',
        type: 'POST',
        data: JSON.stringify({
            query: `{
                manager{timestamp, status, production, consumption, demand, price, fillBatteryRatio, recommendedProduction, recommendedPrice, autopilot, manualPrice, manualProduction}
            }`
        }),
        success: function (res) {
            const market = res.data.manager;
            $('#timestamp').html(market.timestamp);
            $('#status').html(market.status);
            $('#consumption').html(market.consumption);
            $('#demand').html(market.demand);
            $('#price').html(market.price);
            $('#recPrice').html(market.recommendedPrice);

            // Sliders
            $('#productionSlider').val(market.manualProduction);
            $('#productionValue').html(market.manualProduction);
            $('#bufferRatioSlider').val(market.fillBatteryRatio * 100);
            $('#bufferRatioValue').html(market.fillBatteryRatio * 100);
            $('#marketPriceSlider').val(market.manualPrice);
            $('#priceRatioValue').html(market.manualPrice);
            $('#autopilot').prop('checked', market.autopilot);

            // Chart
            if (marketChart !== null) {
                marketChart.addData(market.demand, market.timestamp);
            }
        },
        error: function (err) {
            console.log(err);
        }
    });
}
