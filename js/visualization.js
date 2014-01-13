var context = document.getElementsByTagName('canvas')[0].getContext('2d');

context.globalCompositeOperation = 'lighter';

var xNum;
var yNum;
var spacing

function updateVars() {
    xNum=$("#rows").val();
    yNum=$("#columns").val();
    spacing = Math.min(Math.floor(context.canvas.width/xNum)
        , Math.floor(context.canvas.height / yNum));
}
updateVars();

function rectangles() {
context.clearRect(0, 0, context.canvas.width, context.canvas.height);
for (var x = 0; x < xNum; x++) {
    for (var y = 0; y < yNum; y++) {
        var red = Math.floor(Math.random() * 255);
        var green = Math.floor(Math.random() * 255);
        context.fillStyle = 'rgba(' + red + ',' + green + ',0,1)';
        context.fillRect(x * spacing, y * spacing, spacing, spacing);
        context.lineWidth = 5;
        context.strokeStyle = 'black';
        context.stroke();
        //console.log(x * xSpacing + ", " + y * ySpacing + ", " + xSpacing + ", " + ySpacing);
    }
}

}

//rectangles();
setInterval(rectangles, 50);