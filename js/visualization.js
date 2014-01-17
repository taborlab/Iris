$("#view").click(function () {
    var button = $("#view");
    if (button.val() == "Plate") {
        $("#plateSim").show();
        $("#wellSim").hide();
        button.val("Well");
    }
    else if (button.val() == "Well") {
        $("#plateSim").hide();
        $("#wellSim").show();
        button.val("Plate");
    }
    console.log(button.val());
});
var canvas = document.getElementsByTagName('canvas');
var context = canvas[0].getContext('2d');

context.globalCompositeOperation = 'lighter';

var xNum;
var yNum;
var spacing

function updateVars() {
    xNum=8;//$("#rows").val();
    yNum=3;//$("#columns").val();
    //spacing = Math.min(Math.floor(context.canvas.width/xNum)
    //    , Math.floor(context.canvas.height / yNum));
    var canvas = document.querySelector('canvas');
      canvas.style.width='100%';
  canvas.style.height='100%';
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
    spacing = Math.floor((context.canvas.width-0)/xNum);

}
updateVars();

function rectangles() {
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
}

rectangles();
setInterval(rectangles, 50);
window.onload = function () {
    var chart = new CanvasJS.Chart("wellSim",
		{

		    title: {
		        text: "Time Course",
		        fontSize: 30
		    },
		    axisX: {

		        gridColor: "Silver",
		        tickColor: "silver",
		        valueFormatString: "DD/MMM"

		    },
		    toolTip: {
		        shared: true
		    },
		    theme: "theme2",
		    axisY: {
		        gridColor: "Silver",
		        tickColor: "silver"
		    },
		    legend: {
		        verticalAlign: "center",
		        horizontalAlign: "right"
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