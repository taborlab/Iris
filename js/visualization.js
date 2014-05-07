//Toggle between types of visualization
$("#view").click(function () {
    var button = $("#view");
    if (button.val() == "Plate View") {
        $("#plateSim").show();
        $("#wellSim").hide();
        button.val("Well View");
    }
    else if (button.val() == "Well View") {
        $("#plateSim").hide();
        $("#wellSim").show();
        button.val("Plate View");
        createChart();
    }
    console.log(button.val());
});
//Plate View
var interval = 50 //miliseconds, refresh rate of animation
var speed = $("#speed").val();
var time=0;
var intervalFunc;

var canvas = document.getElementsByTagName('canvas');
var context = canvas[0].getContext('2d');
context.globalCompositeOperation = 'lighter';
var xNum;
var yNum;
var spacing

function updateVars() {
    xNum=$("#columns").val();
    yNum=$("#rows").val();
    var canvas = document.querySelector('canvas');
    canvas.style.width='100%';
    canvas.style.height='100%';
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    spacing = Math.min(Math.floor((context.canvas.width-0)/xNum)
        ,Math.floor((context.canvas.height-1)/yNum));
   
}
updateVars();

function timestep() {

    $("#time").val(time/($("#length").val()*60*1000));
    console.log(time/($("#length").val()*60*1000));
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    updateVars();
    for (var x = 0; x < xNum; x++) {
        for (var y = 0; y < yNum; y++) {
            var red = Math.floor(Math.random() * 255);
            var green = Math.floor(Math.random() * 255);
            context.fillStyle = 'rgba(' + red + ',' + green + ',0,1)';
            context.fillRect(x * spacing, y * spacing, spacing, spacing);
            context.lineWidth = 0;
            context.strokeStyle = 'black';
            context.stroke();
            //console.log(x * xSpacing + ", " + y * ySpacing + ", " + xSpacing + ", " + ySpacing);
        }
    }
    time=time+interval*speed;
    console.log(time);
    if(time>($("#length").val()*60*1000)) {
        clearInterval(intervalFunc);
        $("#play").val("Play");
    }
}
function playWellSim() {
    if(time>($("#length").val()*60*1000)) {
        time=0;
        $("#time").val(time);
    }
    intervalFunc = setInterval(timestep, interval);
}
function pauseWellSim() {
    clearInterval(intervalFunc);    
}

//Toggle between playing and pausing the well simulation
$("#play").click(function () {
    var button = $("#play");
    if (button.val() == "Play") {
        playWellSim();
        button.val("Pause");
    }
    else if (button.val() == "Pause") {
        pauseWellSim();
        button.val("Play");
    }
});

$("#time").change(function() {
   time=$("#time").val()*($("#length").val()*60*1000); 
});


//Recreates the chart, probably not efficient, but allows it to scale size correctly
function createChart() {
    chart = new CanvasJS.Chart("wellSim",
		{
		    title: {
		        text: "Time Course for Well 1, 1",
		        fontSize: 24,
		    },
            zoomEnabled: true, 
		    axisX: {
		        valueFormatString: "DD/MMM"
		    },
		    toolTip: {
		        shared: true
		    },
		    legend: {
                cursor: "pointer",
                itemclick: function (e) {
                    //console.log("legend click: " + e.dataPointIndex);
                    //console.log(e);
                    if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                        e.dataSeries.visible = false;
                    } else {
                        e.dataSeries.visible = true;
                    }

                    chart.render();
                }
		    },

		    data: [
			{
			    type: "line",
			    showInLegend: true,
			    lineThickness: 2,
			    name: "LED1",
			    markerType: "square",
			    color: "#F08080",
			    dataPoints: [
				{ x: new Date(2010, 0, 3), y: 650 },
				{ x: new Date(2010, 0, 5), y: 700 },
				{ x: new Date(2010, 0, 7), y: 710 },
				{ x: new Date(2010, 0, 9), y: 658 },
				{ x: new Date(2010, 0, 11), y: 734 },
				{ x: new Date(2010, 0, 13), y: 963 },
				{ x: new Date(2010, 0, 15), y: 847 },
				{ x: new Date(2010, 0, 17), y: 853 },
				{ x: new Date(2010, 0, 19), y: 869 },
				{ x: new Date(2010, 0, 21), y: 943 },
				{ x: new Date(2010, 0, 23), y: 970 }
				]
			},
			{
			    type: "line",
			    showInLegend: true,
			    name: "LED2",
			    color: "#20B2AA",
			    lineThickness: 2,

			    dataPoints: [
				{ x: new Date(2010, 0, 3), y: 510 },
				{ x: new Date(2010, 0, 5), y: 560 },
				{ x: new Date(2010, 0, 7), y: 540 },
				{ x: new Date(2010, 0, 9), y: 558 },
				{ x: new Date(2010, 0, 11), y: 544 },
				{ x: new Date(2010, 0, 13), y: 693 },
				{ x: new Date(2010, 0, 15), y: 657 },
				{ x: new Date(2010, 0, 17), y: 663 },
				{ x: new Date(2010, 0, 19), y: 639 },
				{ x: new Date(2010, 0, 21), y: 673 },
				{ x: new Date(2010, 0, 23), y: 660 }
				]
			}


			]
		});
		chart.render();
}