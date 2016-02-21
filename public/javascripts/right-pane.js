//var demo = false;
var simulateOn = false;
var timeStep = 0;
var scale = { x: 1, y: 1, rate: 1.1 };

var rgraph = new joint.dia.Graph();

var rpaper = new joint.dia.Paper({

    el: $('#paper'),
    model: rgraph,
    width: 1260, height: 800, gridSize: 5,
    snapLinks: true,
    linkPinning: false,
    perpendicularLinks: true,
    defaultLink: new joint.shapes.logic.Wire, // default when click and drag

    validateConnection: function(vs, ms, vt, mt, e, vl) {

        if (e === 'target') {

            // target requires an input port to connect
            if (!mt || !mt.getAttribute('class') || mt.getAttribute('class').indexOf('input') < 0) return false;

            // check whether the port is being already used
            var portUsed = _.find(this.model.getLinks(), function(link) {

                return (link.id !== vl.model.id &&
                        link.get('target').id === vt.model.id &&
                        link.get('target').port === mt.getAttribute('port')); 
            });

            return !portUsed;

        } else { // e === 'source'

            // source requires an output port to connect
            return ms && ms.getAttribute('class') && ms.getAttribute('class').indexOf('output') >= 0; 
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
// The repeater delays a signal handling by 400ms
joint.shapes.logic.Repeater.prototype.onSignal = function(signal, handler) {
    _.delay(handler, 400, signal);
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

$("#simBtn").click(function() {
    // _.each(rgraph.getLinks(), function(link) {
    //     //console.log(JSON.stringify(link));
    //     rgraph.addCell(rpaper.getDefaultLink().set(JSON.stringify(link)));
    // });
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

















//---------------------------------------
// else {
//     var gates = {
//         repeater: new joint.shapes.logic.Repeater({ position: { x: 410, y: 25 }}),
//         // or: new joint.shapes.logic.Or({ position: { x: 550, y: 50 }}),
//         // and: new joint.shapes.logic.And({ position: { x: 550, y: 150 }}),
//         not: new joint.shapes.logic.Not({ position: { x: 90, y: 140 }}),
//         // nand: new joint.shapes.logic.Nand({ position: { x: 550, y: 250 }}),
//         nor: new joint.shapes.logic.Nor({ position: { x: 270, y: 190 }}),
//         // xor: new joint.shapes.logic.Xor({ position: { x: 550, y: 200 }}),
//         // xnor: new joint.shapes.logic.Xnor({ position: { x: 550, y: 100 }}),
//         input: new joint.shapes.logic.Input({ position: { x: 5, y: 45 }}),
//         output: new joint.shapes.logic.Output({ position: { x: 440, y: 290 }})
//     };


//     var wires = [
//         { source: { id: gates.input.id, port: 'out' }, target: { id: gates.not.id, port: 'in' }},
//         { source: { id: gates.not.id, port: 'out' }, target: { id: gates.nor.id, port: 'in1' }},
//         { source: { id: gates.nor.id, port: 'out' }, target: { id: gates.repeater.id, port: 'in' }},
//         { source: { id: gates.nor.id, port: 'out' }, target: { id: gates.output.id, port: 'in' }},
//         { source: { id: gates.repeater.id, port: 'out' }, target: { id: gates.nor.id, port: 'in2'},
//           vertices: [{ x: 215, y: 100 }]
//         }
//     ];

//     // add gates and wires to the rgraph
//     rgraph.addCells(_.toArray(gates));
//     _.each(wires, function(attributes) {
//         rgraph.addCell(rpaper.getDefaultLink().set(attributes));
//     });

//     rgraph.on('change:source change:target', function(model, end) {

//         var e = 'target' in model.changed ? 'target' : 'source';

//         if ((model.previous(e).id && !model.get(e).id) || (!model.previous(e).id && model.get(e).id)) {
//             // if source/target has been connected to a port or disconnected from a port reinitialize signals
//             current = initializeSignal();
//         }
//     });

//     rgraph.on('change:signal', function(wire, signal) {

//         toggleLive(wire, signal);

//         var magnitude = Math.abs(signal);

//         // if a new signal has been generated stop transmitting the old one
//         if (magnitude !== current) return;

//         var gate = rgraph.getCell(wire.get('target').id);

//         if (gate) {

//             gate.onSignal(signal, function() {

//                 // get an array of signals on all input ports
//                 var inputs = _.chain(rgraph.getConnectedLinks(gate, { inbound: true }))
//                     .groupBy(function(wire) {
//                         return wire.get('target').port;
//                     })
//                     .map(function(wires) {
//                         return Math.max.apply(this, _.invoke(wires, 'get', 'signal')) > 0;
//                     })
//                     .value();

//                 // calculate the output signal
//                 var output = magnitude * (gate.operation.apply(gate, inputs) ? 1 : -1);
                
//                 broadcastSignal(gate, output);
//             });
//        }
//     });
//     //---------------------------------------
//     // initialize signal and keep its value
//     var current = {};

//     $("#simBtn").click(function() {
//         current = initializeSignal();
//     });
// }



