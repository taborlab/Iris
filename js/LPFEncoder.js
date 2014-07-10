function LPFEncoder(deviceParams) {
    this.deviceParams = deviceParams;
    
    // shuffle function for randomizing the randMatrix
    function shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
    
    //////////////////
    // placeholder device parameters
    this.rows = 8;
    this.cols = 8;
    this.tubeNum = this.rows * this.cols;
    this.channelNum = 4;
    this.totalTime = 720*60*1000; //ms
    this.timeStep = 1000; //ms
    this.numPts = Math.floor(this.totalTime/this.timeStep + 1);
    this.maxGSValue = 4095;
    this.times = new Array(this.numPts);
    for (i=0; i<this.times.legnth; i++) {
        this.times[i] = this.timeStep * i;
    }
    this.randomized = true;
    ///////////////////
    
    
    // Deal with randomization
    this.randMatrix = new Array(this.tubeNum);
    for (i=0; i<this.tubeNum; i++) {
        this.randMatrix[i] = i;
    }
    if (this.randomized == true) { // randMatrix must be shuffled
        this.randMatrix = shuffleArray(this.randMatrix);
    }
    
    // create gsVals array & initialize all values to 0
    this.gsVals = new Array(this.numPts);
    for (i=0; i<this.numPts; i++) {
        this.gsVals[i] = new Array(this.rows);
        for (j=0; j<this.rows; j++) {
            this.gsVals[i][j] = new Array(this.cols);
            for (k=0; k<this.cols; k++) {
                this.gsVals[i][j][k] = new Array(this.channelNum);
                for (l=0; l<this.channelNum; l++) {
                    this.gsVals[i][j][k][l] = 0;
                }
            }
        }
    }
    
    ///////////////
    // Placeholder functions for program
    this.functions = {}
    ///////////////
    
    
    //self.runFunctions()
    //if filename is not None: # write program to the given file name/path
	//self.getProgram(filename=filename)
};