app.service('chart', ['formData', 'plate', function (formData, plate) {
    //Creates the chart
    var chartReference;
    var chartData = []; // list of data objects, can be updated to dyanmically update chart
    var chartColor = '#404040';
    function createChart() {
        chartReference = new CanvasJS.Chart("wellSim",
            {
                title: {
                    text: "Time Course for Well",
                    fontSize: 32,
                    fontFamily: 'helvetica'
                },
                zoomEnabled: true,
                axisX: {
                    valueFormatString: "###",
                    labelFontSize: 22,
                    labelFontColor: chartColor,
                    titleFontSize: 24,
                    titleFontFamily: 'helvetica',
                    title: "Time (min)",
                    titleFontColor: chartColor,
                    tickColor: chartColor,
                    lineColor: chartColor,
                    labelAutoFit: true,
                    minimum: -1
                },
                axisY: {
                    minimum: 0,
                    maximum: 4100,
                    interval: 500,
                    labelFontSize: 22,
                    labelFontColor: chartColor,
                    titleFontSize: 24,
                    titleFontFamily: 'helvetica',
                    titleFontColor: chartColor,
                    title: "Intensity (GS)",
                    lineColor: chartColor,
                    gridColor: chartColor,
                    tickColor: chartColor
                },
                axisY2: {
                    margin: 100
                },
                toolTip: {
                    shared: true,
                    borderColor: 'white'
                },
                legend: {
                    fontFamily: "helvetica",
                    fontSize: 16
                },
                data: chartData
            });
    }

    //Updates the data displayed on the chart to current data
    function privateUpdateData(wellNum, visible) {
        //Removes old data from array
        //Could be done more concisely....
        while (chartData.length != 0) {
            chartData.shift();
        }
        //Gives the data array of the chart the new data points
        var channelColors = formData.getColors();
        // pull data for each channel of the selected tube
        var dataPoints = plate.get().createTimecourse(wellNum);
        for (var i = 0; i < plate.get().channelNum; i++) {
            // set data point properties
            var dp = {
                type: "stepLine",
                showInLegend: true,
                lineThickness: 4,
                name: formData.getData().device.leds[i].wavelength.toString(),
                markerType: "none",
                color: channelColors[i],
                dataPoints: dataPoints[i],
                visible: visible[i]
            }
            if (i == 0) {
                dp.click = function (e) {
                    currentStep = e.dataPoint.x * 1000 * 60 / plate.get().totalTime * (plate.get().numPts - 1);
                    // TO DO: I don't think this works...
                }
            }
            // add to data array
            chartData.push(dp);
        }
    }

    return {
        updateData: function (wellNum, visible) {
            //If chart has yet to be created create it
            if (undefined == chartReference) {
                createChart();
            }
            privateUpdateData(wellNum, visible);
            chartReference.render();
        },
        updateChart:function () {
            chartReference.render();
        }
    }
}]);
