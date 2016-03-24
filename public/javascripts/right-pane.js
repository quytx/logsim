//var demo = false;
var simulateOn = false;
var timeStep = 0;
// Graph option
var scale = { x: 0.8, y: 0.8, rate: 1.1 };
var width = 2560;
var height = 1600;
var gridSize = 6;
var gridColor = 'lightgrey';
var LBL_LEFT_POS = 0.2;
var LBL_RIGHT_POS = 0.8;
var NUM_STATE_BIT = 5;


var rgraph = new joint.dia.Graph();

var rpaper = new joint.dia.Paper({

    el: $('#right-col'),
    model: rgraph,
    width: width, height: height, gridSize: gridSize,
    snapLinks: false,
    linkPinning: false,
    perpendicularLinks: false,
    defaultLink: function(cv,m) {
        if (hasBusOutput(cv.model)) {
            return new joint.shapes.logic.Bus;
        } else {
            return new joint.shapes.logic.Wire;
        }
    }, 

    validateConnection: function(vs, ms, vt, mt, e, vl) {

        if (e === 'target') {
            
            if (hasBusOutput(vs.model) != hasBusInput(vt.model) && !hasMixInput(vt.model)) return false;   // validate bus connection

            // target requires an input port to connect
            if (!mt || !mt.getAttribute('class') || mt.getAttribute('class').indexOf('input') < 0) return false;

            if (vl.model.attributes.type === BUS && vt.model.attributes.type === REG && mt.getAttribute('port') === vt.model.we) {
                notify('Write-enable input must be a single bit', 'warning');
                return false;
            }

            // Set source & target ID to retrieve after removing
            vl.model.set('sourceId', vs.model.id);
            vl.model.set('targetId', vt.model.id);

            // Allow multi-input
            if (hasMultiInput(vt.model)) return true;    // no need to check if port already used

            // check whether the port is being already used
            var portUsed = _.find(this.model.getLinks(), function(link) {
                return (link.id !== vl.model.id &&
                        link.get('target').id === vt.model.id &&
                        link.get('target').port === mt.getAttribute('port')); 
            });

            return !portUsed;

        } else { // e === 'source'
            // source requires an output port to connect
            //return ms && ms.getAttribute('class') && ms.getAttribute('class').indexOf('output') >= 0; 
            return false;   // Dragging a link's source end is disabled
        }
    }
});


// grid lines
setGrid(rpaper, gridSize, gridColor);

// scale
rpaper.scale(scale.x, scale.y);

// rpaper.on('cell:pointermove', function (cellView, evt, x, y) {
//     var bbox = cellView.getBBox();
//     var constrained = false;
//     var constrainedX = x;
//     if (bbox.x <= 0) { constrainedX = x + gridSize; constrained = true }
//     if (bbox.x + bbox.width >= width) { constrainedX = x - gridSize; constrained = true }
//     var constrainedY = y;
//     if (bbox.y <= 0) {  constrainedY = y + gridSize; constrained = true }
//     if (bbox.y + bbox.height >= height) { constrainedY = y - gridSize; constrained = true }
//     if (constrained) { cellView.pointermove(evt, constrainedX, constrainedY) }
// });

// Resize paper to fit outter div
// var mainDiv = document.getElementById('right-col');
// rpaper.setDimensions(mainDiv.offsetWidth, mainDiv.offsetHeight);
// console.log(mainDiv.offsetWidth, mainDiv.offsetHeight);

// Zoom in 
$('#zoomInBtn').click(function() {
    scale.x = scale.x * scale.rate;
    scale.y = scale.y * scale.rate;
    rpaper.scale(scale.x, scale.y);
});

// Zoom out
$('#zoomOutBtn').click(function() {
    scale.x = scale.x / scale.rate;
    scale.y = scale.y / scale.rate;
    rpaper.scale(scale.x, scale.y);
});

function resetFlipFlops() {
    _.each(rgraph.getElements(), function(element) {
        (element instanceof joint.shapes.logic.Dff || element instanceof joint.shapes.logic.Register) && element.reset.apply();
    });
}

function reset() {
    simulateOn = false;
    timeStep = 0;
    resetFlipFlops();
    initializeSignal();
}

function toggleLive(model, signal) {
    // add 'live' class to the element if there is a positive signal
    V(rpaper.findViewByModel(model).el).toggleClass('live', signal > 0);
}

function broadcastSignal(gate, signal) {
    // broadcast signal to all output ports
    _.defer(_.invoke, rgraph.getConnectedLinks(gate, { outbound: true }), 'set', 'signal', signal);
}

function broadcastBus(gate, busSignal) {
    _.defer(_.invoke, rgraph.getConnectedLinks(gate, { outbound: true }), 'set', 'busSignal', busSignal);
}

function broadcastSplitter(gate) {
    if (gate.attributes.type === SPLITTER) {
        var busIn = rgraph.getConnectedLinks(gate, { inbound: true});
        if (busIn.length > 1) {
            notify("Error: Splitter cannot have more than 1 input bus");
            return;
        }
        if (busIn[0] !== undefined) {
            // Get input
            var inputs = busIn[0].attributes.busSignal;
            // console.log(inputs);
            // Get sorted list of output
            var outputs = _.chain(rgraph.getConnectedLinks(gate, { outbound: true}))
            .sortBy(function(output) {
                return output.attributes.labels[nextLabelIndex(output, LBL_LEFT_POS)].attrs.text.text;
            })
            .value();

            // Validate input and output size
            if (inputs !== undefined && inputs[0] !== undefined && outputs.length > inputs.length) {
                notify('Error: Splitter cannot have more output wires (' + outputs.length + ') than input wires (' + inputs.length + ')');
                return;
            }

            // Map input bus signal to each output
            _.each(inputs, function(signal, index) {
                _.defer(_.invoke, [outputs[index]], 'set', 'signal', signal);
            });

        }      
    } 
}


function incrDff(graph) {
    _.each(graph.getElements(), function(element) {
        (element instanceof joint.shapes.logic.Dff || element instanceof joint.shapes.logic.Register) && element.nextTimeStep.call(element, graph);
    });
    _.each(graph.getElements(), function(element) {
        (element instanceof joint.shapes.logic.Dff || element instanceof joint.shapes.logic.Register) && element.nextTimeStep.call(element, graph);
    });
    timeStep++;
}


function initializeSignal() {
    
    var signal = 1; // signal is high
    
    // cancel all signals stores in buses and wires
    _.invoke(_.chain(rgraph.getLinks()).reject(function(link) {
        return !(link instanceof joint.shapes.logic.Wire);
    }).value(), 'set', 'signal', 0);

    _.invoke(_.chain(rgraph.getLinks()).reject(function(link) {
        return !(link instanceof joint.shapes.logic.Bus);
    }).value(), 'unset', 'busSignal');

    // _.invoke(rgraph.getLinks(), 'set', 'signal', 0);

    // remove all 'live' classes
    $('.live').each(function() {
        V(this).removeClass('live');
    });

    // If not in simulation mode, return
    if (!simulateOn) { return signal; }


    // Otherwise broadcast signals
    _.each(rgraph.getElements(), function(element) {
        // broadcast a new signal from every input in the rgraph
        (element instanceof joint.shapes.logic.Input) && broadcastSignal(element, 1);
        (element instanceof joint.shapes.logic.InputLow) && broadcastSignal(element, -1);
    });

    return signal;
}

// Every logic gate needs to know how to handle a situation, when a signal comes to their ports.
joint.shapes.logic.Gate.prototype.onSignal = function(signal, handler) {
    handler.call(this, signal);
}

// Output element just marks itself as alive.
joint.shapes.logic.Output.prototype.onSignal = function(signal) {
    toggleLive(this, signal);
}

// diagramm setup

var current = {};

rgraph.on('change:source change:target', function(model, end) {
    var e = 'target' in model.changed ? 'target' : 'source';

    if ((model.previous(e).id && !model.get(e).id) || (!model.previous(e).id && model.get(e).id)) {
        // if source/target has been connected to a port or disconnected from a port reinitialize signals
        current = initializeSignal();
    }
});


rgraph.on('change:busSignal', function(bus, busSignal) {
    // console.log('bus signal changed');
    
    var gate = rgraph.getCell(bus.get('target').id);
    
    if (gate) {
        if (gate instanceof joint.shapes.logic.Splitter) {
            broadcastSplitter(gate);    // re-broadcast splitter
        } else if (hasMultiOutputValues(gate)) {
            // Handle multiple output values here

            // Rename SMC
            if (gate instanceof joint.shapes.logic.SMC) {
                // Rename based on input value
                if (busSignal !== undefined) {
                    var name = "";
                    for (var i = 0; i < Math.min(busSignal.length, NUM_STATE_BIT); i++) {
                        if (busSignal[i] === 1) { name = name.concat("1"); }
                        else { name = name.concat("0"); }
                    }
                    gate.attr('text/text', name);
                } else {
                    gate.attr('text/text', 'SMC');
                }
            }


            // Broadcast (multiple) outputs
            // To-do: extract first 5 bits


        
        } else if (gate instanceof joint.shapes.logic.Register) {
            // broadcast
            broadcastBus(gate, gate.operation.apply(gate));
        } 
        else {
            // multi-bus input with 1 output handle here, e.g. Mux 16
            // Get all input buses
            var inputs = _.chain(rgraph.getConnectedLinks(gate, { inbound: true}))
            .sortBy(function(bus) {
                return bus.attributes.target.port;
            })
            .map(function(bus) {
                return bus.attributes.busSignal;
            })
            .value();
            

            // Check if all input buses are same length (ANY exception?)
            var busSize;
            if (inputs.length > 0) {
                _.each(inputs, function(bus) {
                    if (bus !== undefined) {
                        if (busSize === undefined) {
                            busSize = bus.length;
                        } else if (busSize !== bus.length) {
                            notify('Error: Bus inputs must be same size');
                            return;
                        }
                    }
                })
            }
            if (busSize === 0) return;
            
            // Group each wire in each bus by index
            var ins = new Array(busSize); 
            var outs = new Array(busSize);
            var i, j;
            for (i = 0; i < busSize; i++) {
                ins[i] = [];
                for (j = 0; j < inputs.length; j++) {
                    if (inputs[j] !== undefined) {
                        ins[i].push(inputs[j][i] == 1 ? true : false);
                    }
                }
            }

            // Apply operation to each bit of input buses
            for (i = 0; i < busSize; i++) {
                outs[i] = gate.operation.apply(gate, ins[i]) ? 1 : -1;
            }   
            broadcastBus(gate, outs); 
        }
   }
});

rgraph.on('change:signal', function(wire, signal) {
    // console.log('wire signal changed');

    toggleLive(wire, signal);

    var magnitude = Math.abs(signal);

    // if a new signal has been generated stop transmitting the old one
    if (magnitude !== current) return;

    var gate = rgraph.getCell(wire.get('target').id);

    if (gate) {
        if (gate instanceof joint.shapes.logic.Joiner) {

            var busIn = _.chain(rgraph.getConnectedLinks(gate, { inbound: true}))
            .sortBy(function(input) {
                return input.attributes.labels[nextLabelIndex(input, LBL_RIGHT_POS)].attrs.text.text;
            })
            .map(function(input) {
                return input.attributes.signal;
            })
            .value();
            broadcastBus(gate, busIn);
        } else if (gate instanceof joint.shapes.logic.Register) {
            // broadcast
            broadcastBus(gate, gate.operation.apply(gate));
        }

        else {
            gate.onSignal(signal, function() {
                // get an array of signals on all input ports
                var inputs = _.chain(rgraph.getConnectedLinks(gate, { inbound: true }))
                    .sortBy(function(wire) { 
                        return wire.get('target').port;     // sort all inputs based on labels (in1, in2, ...)
                    })
                    .groupBy(function(wire) {
                        return wire.get('target').port;
                    })
                    .map(function(wires) {
                        return Math.max.apply(this, _.invoke(wires, 'get', 'signal')) > 0;
                    })
                    .value();
                // calculate the output signal
                // console.log(inputs);
                var output = magnitude * (gate.operation.apply(gate, inputs) ? 1 : -1);
                
                broadcastSignal(gate, output);
            });
        }
   }
});

// Handle labeling (potentially other actions if needed) when a new wire/bus is added from a gate
rgraph.on('change', function(cell) {
    if (cell.isLink()) {
        var source = cell.getSourceElement();
        var target = cell.getTargetElement();
        if (target !== null && target.attributes.type === JOINER && hasNoLabel(cell, LBL_RIGHT_POS)) {
            // Find target
            setLabel(cell, rgraph.getConnectedLinks(target, { inbound: true }).length - 1, nextLabelIndex(cell, LBL_RIGHT_POS), LBL_RIGHT_POS);
        } else if (source !== null && source.attributes.type === SPLITTER && hasNoLabel(cell, LBL_LEFT_POS)) {
            setLabel(cell, rgraph.getConnectedLinks(source, { outbound: true }).length - 1, nextLabelIndex(cell, LBL_RIGHT_POS), LBL_LEFT_POS);
        } else if (source !== null && hasMultiOutputValues(source) && hasNoLabel(cell, LBL_LEFT_POS)) {
            // get currently used labels
            var usedLabels = _.map(rgraph.getConnectedLinks(source, { outbound: true }), function(link){
                if (link.attributes.labels === undefined) return undefined;
                return link.attributes.labels[nextLabelIndex(cell, LBL_LEFT_POS)].attrs.text.text;
            });
            // find first unused label
            var unusedLabels = _.difference(source.outputsList.apply(source), usedLabels);
            if (unusedLabels !== undefined && unusedLabels.length > 0) {
                setLabel(cell, unusedLabels[0], nextLabelIndex(cell, LBL_LEFT_POS), LBL_LEFT_POS);
            } else if (unusedLabels.length == 0) {
                // Remove immediately if reached maximum number of outputs
                cell.remove();
            }
        } else if (target !== null && target.attributes.type === SMC && hasNoLabel(cell, LBL_RIGHT_POS)) {
            setLabel(cell, 'inst_in', nextLabelIndex(cell, LBL_RIGHT_POS), LBL_RIGHT_POS);
        } else if (target !== null && target.attributes.type === REG && hasNoLabel(cell, LBL_RIGHT_POS)) {
            if (cell.attributes.target.port === target.dIn ) setLabel(cell, 'd_in', nextLabelIndex(cell, LBL_RIGHT_POS), LBL_RIGHT_POS);
            if (cell.attributes.target.port === target.we ) setLabel(cell, 'we', nextLabelIndex(cell, LBL_RIGHT_POS), LBL_RIGHT_POS);
            // console.log(rgraph.getConnectedLinks(target, {inbound: true}));
        }
    }
})


rgraph.on('remove', function(cell) {
    if (cell.isLink()) {
        var source = rgraph.getCell(cell.get('sourceId'));
        var target = rgraph.getCell(cell.get('targetId'));
        if (source !== null && source !== undefined && source.attributes.type === SPLITTER) {
            var rmVal = cell.attributes.labels[nextLabelIndex(cell, LBL_LEFT_POS)].attrs.text.text;
            // console.log('removed from splitter: ' + rmVal);
            _.each(rgraph.getConnectedLinks(source, { outbound: true }), function(link) {
                var i = nextLabelIndex(link, LBL_LEFT_POS);
                var currLabel = link.attributes.labels[i].attrs.text.text;
                if (currLabel > rmVal) {
                    setLabel(link, currLabel - 1, i, LBL_LEFT_POS);
                }
            });
        }
        if (target !== null && target !== undefined && target.attributes.type === JOINER) {
            var rmVal = cell.attributes.labels[nextLabelIndex(cell, LBL_RIGHT_POS)].attrs.text.text;
            // console.log('removed from joiner: ' + rmVal);
            _.each(rgraph.getConnectedLinks(target, { inbound: true }), function(link) {
                var i = nextLabelIndex(link, LBL_RIGHT_POS);
                var currLabel = link.attributes.labels[i].attrs.text.text;
                if (currLabel > rmVal) {
                    setLabel(link, currLabel - 1, i, LBL_RIGHT_POS);
                }
            });
        } 
    }
    current = initializeSignal();
})



$("#simBtn").click(function() {

    simulateOn = true;
    $("#simBtn").css('visibility', 'hidden');
    $("#resetBtn").css('visibility', 'visible');

    var sequentialLogic = false;
    _.each(rgraph.getElements(), function(element) {
        if (element instanceof joint.shapes.logic.Dff)
            sequentialLogic = true;
    });

    if (sequentialLogic) {
        $("#stepBtn").css('visibility', 'visible');    
    }

    current = initializeSignal();  
});

$("#resetBtn").click(function() {
    $("#simBtn").css('visibility', 'visible');
    $("#resetBtn").css('visibility', 'hidden');
    $("#stepBtn").css('visibility', 'hidden');
    $("#currTimeStep").html(0);
    reset();

});

$("#stepForward").click(function() {
    incrDff(rgraph);
    $("#currTimeStep").html(timeStep);
    current = initializeSignal();
});









