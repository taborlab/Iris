# LPFParser.py
# Author: Lucas Hartsough
#         lucash@rice.edu
# Description: Package of helper functions for parsing and plotting LPF files.
# Requires: numpy, matplotlib (for plotting; optional)

# --------------------------------
## Import packages ##
# --------------------------------
try:
    import numpy as np
    import struct

    def LPFtoArray(LPFfile, rowNum=4, colNum=6, channelNum=2, verbose=True):
        '''Returns a dict with parsed LPF data.
        Inputs:
        LPFfile (str/File Obj) -- relative path to LPF file to be parsed, either as a str or the File Obj variable
            Note: the LPF is automatically closed at the end.
        rowNum (int) -- number of rows in the device [default: 4]
        colNum (int) -- number of cols in the device [default: 6]
        channelNum (int) -- number of channels in the device [default: 2]
        verbose (bool) -- whether to print header information during parsing
        Returns: dict with keys:
            'header': list of raw header data
            'data': tuple of:
                [0]: array of time points (ms) corresponding to the time steps in the LPF data
                [1]: 4D numpy array with LPF data: [times][rows][cols][channels]
        '''
        output = {}
        if type(LPFfile) == str:
            LPFfile = open(LPFfile, 'rb')
        header = struct.unpack('I'*8, LPFfile.read(32))
        output['header'] = header
        if verbose:
            print "Header:\n\t%s"%repr(header)
        numPts = header[3]
        timeStep = header[2]
        if verbose:
            print "Header Data:"
            print "\tLPF ver: %d"%header[0]
            print "\tNumber of channels (total): %d"%header[1]
            print "\tTime step: %d (ms)"%timeStep
            print "\tNumber of time steps: %d"%numPts
        if header[1] != rowNum * colNum * channelNum:
            raise IOError("Product of rowNum, colNum, & channelNum (%d) != total channels in the LPF (%d)"%(rowNum*colNum*channelNum, header[1]))
        times = np.arange(0, numPts*timeStep, timeStep)
        ints = np.zeros((header[3], rowNum, colNum, channelNum))
        for tp in range(numPts):
            for r in range(rowNum):
                for c in range(colNum):
                    for ch in range(channelNum):
                        ints[tp,r,c,ch] = int(struct.unpack('h', LPFfile.read(2))[0])
        LPFfile.close()
        if verbose:
            print "Intensity Data:"
            print "\tParsed %d time points (%d.2fmin)"%(len(times), times[-1]/1000./60.)
        output['data'] = (times, ints)
        return output

    try:
        import matplotlib.pyplot as plt

        def plotLPFData(data, channels=None, wellIndices=None, rowNum=None, colNum=None, savePath=None, mplargs={}):
            '''Plots LPF data for each channel.
            Inputs:
            data (tuple (len 2)) -- tuple containing x-axis data (time points) and y-axis data (LPF channel intensities)
                Structure is identical to that returned from LPFtoArray, as output['data'].
            channels (list of ints) -- list specifying which channels to plot [default: all]
            wellIndices (list of ints) -- list of indices specifying which wells to plot [default: all]
            rowNum, colNum (int) -- number of rows/cols in the plate. Required for specifying wellIndices. [default: same as data]
            savePath (str) -- full path (including image name and file extension) for saving plot [default: not saved]
            mplargs (dict) -- dict of various matplotlib arguments. Currently supported:
                lw (int) - line width; default: 3
                alpha (float, [0,1]) -- line alpha value; default: 0.6
                chColors (list of valid mpl colors) -- length must be equal to the number of channels plotted;
                    default: colorbrewer2.org colors starting with red, green, blue, purple, orange, yellow
                xlabel (str) -- x-axis label; default: 'Time (min)'
                ylabel (str) -- y-axis label; default: 'Intensity (GS)'
                title (str) -- title label; default: none
                chLabels (list of str) -- alternative labels for the channels, must be in order; default: 'Channel n'
                xlabel_size, ylabel_size, title_size (int) -- text size for labels; default: 16, 16, 20
                ticklabel_size (int) -- text size for tick labels; default: 14
                fontweight (str) -- 'bold' or 'normal' are good, check MPL for full list; default: bold
                xlim, ylim (tuple of 2 ints) -- xrange and yrange for plots; default: full range
                legend_loc (str) -- location of the channel num legend; default: 'best'
            Outputs: Plot of LPF data for selected channels and wells. File is saved if a path is given.'''

            if type(data) is not tuple and type(data) is not list:
                raise TypeError("data must be a list or tuple")
            if len(data) != 2:
                raise IOError("data does not have the correct number of elements")
            if len(data[0]) != np.shape(data[1])[0]:
                raise IOError("Number of timepoints in data[0] != number of intensities in data[1]")
            if channels is not None:
                if type(channels) is not list:
                    raise TypeError("channels must be a list")
                for i in channels:
                    if type(i) is not int:
                        raise TypeError("All elements in channels must be ints.")
            else:
                channels = range(np.shape(data[1])[-1])
            if wellIndices is not None:
                if type(wellIndices) is not list:
                    raise TypeError("wellInedices must be a list")
                for i in wellIndices:
                    if type(i) is not int:
                        raise TypeError("all elements in wellIndices must be ints")
            if rowNum is not None:
                if type(rowNum) is not int:
                    raise TypeError("rowNum must be an int")
            else:
                rowNum = np.shape(data[1])[-3]
            if colNum is not None:
                if type(colNum) is not int:
                    raise TypeError("colNum must be an int")
            else:
                colNum = np.shape(data[1])[-2]
            if wellIndices is None:
                wellIndices = range(rowNum*colNum)
            if type(mplargs) is not dict:
                raise TypeError("mplargs must be a dict")
            if len(mplargs.keys()) != 0:
                for k in mplargs.keys():
                    if k in ['lw', 'ticklabel_size', 'xlabel_size', 'ylabel_size', 'title_size']:
                        if type(mplargs[k]) is not int:
                            raise TypeError("Value corresponding to mplargs key %s must be an int"%k)
                        if mplargs[k] < 0:
                            raise IOError("Text and line width sizes must be positive.")
                    elif k in ['alpha']:
                        if type(mplargs[k]) is not float:
                            raise TypeError("Value corresponding to mplargs key %s must be a float"%k)
                        if mplargs[k] < 0 or mplargs[k] > 1:
                            raise IOError("alpha values must be in the range [0,1])")
                    elif k in ['xlabel', 'ylabel', 'title', 'fontweight', 'legend_loc']:
                        if type(mplargs[k]) is not str:
                            if k == 'legend_loc' and mplargs[k] is not None:
                                raise TypeError("Value corresponding to mplargs key %s must be a string"%k)
                    elif k in ['chColors', 'chLabels']:
                        if type(mplargs[k]) is not list:
                            raise TypeError("Value corresponding to mplargs key %s must be a list"%k)
                    elif k in ['xlim', 'ylim']:
                        if type(mplargs[k]) is not tuple:
                            raise TypeError("xlim & ylim args must be tuples")
                    else:
                        raise KeyError("Invlid key given to mplargs -- arg not supported: %s"%k)
            # Default mpl args [colors from colorbrewer2.org]
            default_mplargs = {
                'lw': 3,
                'alpha': 1.0,
                'chColors': ['#e41a1c', '#4daf4a', '#377eb8', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'],
                'xlabel': 'Time (min)',
                'ylabel': 'Intensity (GS)',
                'title': '',
                'chLabels': ['Channel %d'%i for i in channels],
                'xlabel_size': 16,
                'ylabel_size': 16,
                'title_size': 20,
                'ticklabel_size': 14,
                'fontweight': 'bold',
                'xlim': None,
                'ylim': None,
                'legend_loc': 'best'}
            for defk in default_mplargs.keys():
                if defk not in mplargs.keys(): # Need to set default value
                    mplargs[defk] = default_mplargs[defk]

            def wellIndextoRC(index, rowNum, colNum):
                '''Returns the row and column index of a given well index.'''
                return (index/colNum, index%rowNum)

            rcIndices = [] # List of row and column indices for the selected wellIndices
            for i in wellIndices:
                rcIndices.append(wellIndextoRC(i, rowNum, colNum))

            plt.figure(figsize=(8,6), dpi=150)
            first = True # only the first set gets legend labels
            for welli in range(len(rcIndices)):
                for chi in channels:
                    r,c = rcIndices[welli]
                    if first:
                        plt.plot(data[0]/1000./60., data[1][:,r,c,chi], lw=mplargs['lw'], alpha=mplargs['alpha'],
                                 color=mplargs['chColors'][chi], label=mplargs['chLabels'][chi])
                    else:
                        plt.plot(data[0]/1000./60., data[1][:,r,c,chi], lw=mplargs['lw'], alpha=mplargs['alpha'],
                                 color=mplargs['chColors'][chi])
                first = False
            if mplargs['title'] != '':
                plt.title(mplargs['title'], fontsize=mplargs['title_size'], fontweight=mplargs['fontweight'])
            plt.xlabel(mplargs['xlabel'], fontsize=mplargs['xlabel_size'], fontweight=mplargs['fontweight'])
            plt.ylabel(mplargs['ylabel'], fontsize=mplargs['ylabel_size'], fontweight=mplargs['fontweight'])
            plt.xticks(fontsize=mplargs['ticklabel_size'], fontweight=mplargs['fontweight'])
            plt.yticks(fontsize=mplargs['ticklabel_size'], fontweight=mplargs['fontweight'])
            if mplargs['xlim'] is not None:
                plt.xlim(mplargs['xlim'])
            else:
                xlimlow = 0 - 0.05*data[0][-1]/1000./60. # 5% of the total time left of 0
                xlimhigh = 1.05*data[0][-1]/1000./60. # 5% of the total time right of max
                plt.xlim((xlimlow, xlimhigh))
            if mplargs['ylim'] is not None:
                plt.ylim(mplargs['ylim'])
            else:
                plt.ylim((-800,4100))
            if mplargs['legend_loc'] is not None:
                plt.legend(loc=mplargs['legend_loc'])
            if savePath is not None:
                if type(savePath) is not str:
                    raise TypeError("savePath must be a string")
                plt.savefig(savePath, dpi=150, bbox_inches='tight')

    except ImportError:
        print "Plotting functions disabled; matplotlib not found."
except ImportError:
    print "Numpy package is required."