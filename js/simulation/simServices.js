app.service('chart', ['formData', 'plate', function (formData, plate) {
    //Creates the chart
    var chartReference;
    var chartData = []; // list of data objects, can be updated to dyanmically update chart
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
                    titleFontSize: 24,
                    titleFontFamily: 'helvetica',
                    title: "Time (min)",
                    minimum: -1
                },
                axisY: {
                    minimum: 0,
                    maximum: 4100,
                    interval: 500,
                    labelFontSize: 22,
                    titleFontSize: 24,
                    titleFontFamily: 'helvetica',
                    title: "Intensity (GS)"
                },
                toolTip: {
                    shared: true,
                    borderColor: 'white'
                },
                legend: {
                    fontFamily: "helvetica",
                    cursor: "pointer",
                    itemclick: function (e) {
                        if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                            e.dataSeries.visible = false;
                        } else {
                            e.dataSeries.visible = true;
                        }
                        chartReference.render();
                    },
                    fontSize: 16
                },
                data: chartData
            });
    }

    //Updates the data displayed on the chart to current data
    function privateUpdateData(wellNum) {
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
                lineThickness: 2,
                name: "Channel " + i,
                markerType: "none",
                color: channelColors[i],
                dataPoints: dataPoints[i]
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
        updateData: function (wellNum) {
            //If chart has yet to be created create it
            if (undefined == chartReference) {
                createChart();
            }
            privateUpdateData(wellNum);
            chartReference.render();
        },
        updateChart:function () {
            chartReference.render();
        }
    }
}]);