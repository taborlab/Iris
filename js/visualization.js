var context = document.getElementsByTagName('canvas')[0].getContext('2d');

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

//rectangles();
setInterval(rectangles, 50);