//var demo = false;
var simulateOn = false;
var timeStep = 0;
var scale = { x: 1, y: 1, rate: 1.1 };

var rgraph = new joint.dia.Graph();

var rpaper = new joint.dia.Paper({

    el: $('#paper'),
    model: rgraph,
    width: 1260, height: 800, gridSize: 5,
    snapLinks: false,
    linkPinning: false,
    perpendicularLinks: false,
    defaultLink: function(cv,m) {
        if (hasBusOutput(cv)) {
            return new joint.shapes.logic.Bus;
        } else {
            return new joint.shapes.logic.Wire;
        }
    }, 

    validateConnection: function(vs, ms, vt, mt, e, vl) {

        if (e === 'target') {
            
             if (hasBusOutput(vs) != hasBusInput(vt)) return false;   // validate bus connection

            // target requires an input port to connect
            if (!mt || !mt.getAttribute('class') || mt.getAttribute('class').indexOf('input') < 0) return false;

            // Allow multi-input
            if (hasMultiInput(vt)) {
                // label if target is a joiner
                if (vt.model.attributes.type === 'logic.Joiner') {                    
                    vl.model.set('joinerTargetId', vt.model.id);
                }
                return true;    // no need to check if port already used
            }

            // Label if source is a splitter
            if (vs.model.attributes.type === 'logic.Splitter') {
                vl.model.set('splitterSourceId', vs.model.id);
            }

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

// scale
rpaper.scale(scale.x, scale.y);

// Resize paper to fit outter div
var mainDiv = document.getElementById('right-col');
rpaper.setDimensions(mainDiv.offsetWidth, mainDiv.offsetHeight);
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


function toggleLive(model, signal) {
    // add 'live' class to the element if there is a positive signal
    V(rpaper.findViewByModel(model).el).toggleClass('live', signal > 0);
}

function broadcastSignal(gate, signal) {
    // broadcast signal to all output ports
    _.defer(_.invoke, rgraph.getConnectedLinks(gate, { outbound: true }), 'set', 'signal', signal);
}

function incrDff() {
    _.each(rgraph.getElements(), function(element) {
        (element instanceof joint.shapes.logic.Dff) && element.nextTimeStep.apply();
    });
    _.each(rgraph.getElements(), function(element) {
        (element instanceof joint.shapes.logic.Dff) && element.nextTimeStep.apply();
    });
    timeStep++;
}

function initializeSignal() {
    
    var signal = 1;
    // > 0 wire with a positive signal is alive
    // < 0 wire with a negative signal means, there is no signal 
    // 0 none of the above - reset value

    // cancel all signals stores in wires
    _.invoke(rgraph.getLinks(), 'set', 'signal', 0);

    // remove all 'live' classes
    $('.live').each(function() {
        V(this).removeClass('live');
    });

    // If not in simulation mode, return
    if (!simulateOn) { return signal ; }


    // Otherwise broadcast signals
    _.each(rgraph.getElements(), function(element) {
        // broadcast a new signal from every input in the rgraph
        (element instanceof joint.shapes.logic.Input) && broadcastSignal(element, signal);
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

rgraph.on('change:signal', function(wire, signal) {

    toggleLive(wire, signal);

    var magnitude = Math.abs(signal);

    // if a new signal has been generated stop transmitting the old one
    if (magnitude !== current) return;

    var gate = rgraph.getCell(wire.get('target').id);

    if (gate) {

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
        // }
   }
});

rgraph.on('change', function(cell) {
    if (cell.get('joinerTargetId') !== undefined && cell.attributes.labels === undefined) {
        // Find target
        var joiner = rgraph.getCell(cell.get('joinerTargetId'));
        setLabel(cell, rgraph.getConnectedLinks(joiner, { inbound: true }).length);
    } else if (cell.get('splitterSourceId') !== undefined && cell.attributes.labels === undefined) {
        var splitter = rgraph.getCell(cell.get('splitterSourceId'));
        setLabel(cell, rgraph.getConnectedLinks(splitter, { outbound: true }).length - 1);
    }
})


rgraph.on('remove', function(cell) {
    if (cell.get('joinerTargetId') !== undefined) {
        var removedLabel = cell.attributes.labels[0].attrs.text.text;
        // Find target
        var joiner = rgraph.getCell(cell.get('joinerTargetId'));
        // Re-label links with higher label
        _.each(rgraph.getConnectedLinks(joiner, { inbound: true }), function(link) {
            var currLabel = link.attributes.labels[0].attrs.text.text;
            if (currLabel > removedLabel) {
                setLabel(link, currLabel - 1);
            }
        });
    } else if (cell.get('splitterSourceId') !== undefined) {
        var removedLabel = cell.attributes.labels[0].attrs.text.text;
        // Find source
        var splitter = rgraph.getCell(cell.get('splitterSourceId'));
        // Re-label links with higher label
        _.each(rgraph.getConnectedLinks(splitter, { outbound: true }), function(link) {
            var currLabel = link.attributes.labels[0].attrs.text.text;
            if (currLabel > removedLabel) {
                setLabel(link, currLabel - 1);
            }
        });
    }
})



$("#simBtn").click(function() {

    var sequentialLogic = false;
    _.each(rgraph.getElements(), function(element) {
        if (element instanceof joint.shapes.logic.Dff)
            sequentialLogic = true;
    });

    if (!simulateOn) {
        simulateOn = true;
        $("#simBtn").remove();
        if (sequentialLogic) {
            $("#stepBtn").css('visibility', 'visible');    
        }
    } 
    current = initializeSignal();
});

$("#stepForward").click(function() {
    incrDff();
    $("#currTimeStep").html(timeStep);
    current = initializeSignal();
});








