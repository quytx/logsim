var lgraph = new joint.dia.Graph();

var lpaper = new joint.dia.Paper({
    el: $('#left-col'),
    model: lgraph,
    width: 300, height: 814, gridSize: 5,
    snapLinks: false,
    linkPinning: false,
    interactive: false,
    validateMagnet: function(cellView, magnet) {
        return false;   // disable linking in left panel
    }
});

// zoom the viewport by 20%
lpaper.scale(1.2,1.2);

// Resize paper to fit outter div
// var navDiv = document.getElementById('left-col');
// lpaper.setDimensions(navDiv.offsetWidth, navDiv.offsetHeight);
// console.log(lpaper);
// console.log(navDiv.offsetWidth, navDiv.offsetHeight);


var defaultX = 50;
var defaultY = 30;
var gapY = 50;

// Default gates
var lgates = {
    // repeater: new joint.shapes.logic.Repeater({ position: { x: 410, y: 25 }}),
    
    // Input and output
    input: new joint.shapes.logic.Input({ position: { x: defaultX - 8, y: defaultY }}),
    output: new joint.shapes.logic.Output({ position: { x: defaultX + 28, y: defaultY + 1 * gapY }}),

    // Logic gates
    not: new joint.shapes.logic.Not({ position: { x: defaultX, y: defaultY + 2 * gapY }}),
    and: new joint.shapes.logic.And({ position: { x: defaultX, y: defaultY + 3 * gapY }}),
    nand: new joint.shapes.logic.Nand({ position: { x: defaultX, y: defaultY + 4 * gapY }}),
    or: new joint.shapes.logic.Or({ position: { x: defaultX, y: defaultY + 5 * gapY }}),
    nor: new joint.shapes.logic.Nor({ position: { x: defaultX, y: defaultY + 6 * gapY }}),
    xor: new joint.shapes.logic.Xor({ position: { x: defaultX, y: defaultY + 7 * gapY }}),
    xnor: new joint.shapes.logic.Xnor({ position: { x: defaultX, y: defaultY + 8 * gapY }}),
    mux21: new joint.shapes.logic.Mux21({ position: { x: defaultX, y: defaultY + 9 * gapY }}),
    dff: new joint.shapes.logic.Dff({ position: { x: defaultX, y: defaultY + 10 * gapY }})
    
    // More gates here (remember to add to helper.js as well)

};


var resetLeftPane = function(cells) {
    lgraph.resetCells(_.toArray(cells));
}

// add gates and wires to the lgraph
resetLeftPane(lgates);

lpaper.on('cell:pointerdown', function(cellView, evt, x, y) { 
    addGate(rgraph, cellView.model.attributes.type, 50, 50);
    // // Create temp div
    // var tmpDiv = document.createElement('div');
    // tmpDiv.id = 'tmpDiv';
    // tmpDiv.className = 'tmpDiv';
    // document.body.appendChild(tmpDiv);

    // // Create new paper
    // var tmpPaper = new joint.dia.Paper({
    //     el: $('#tmpDiv'),
    //     model: lgraph,
    //     width: 300, height: 600, gridSize: 5,
    //     snapLinks: false,
    //     linkPinning: false,
    //     interactive: false,
    //     validateMagnet: function(cellView, magnet) {
    //         return false;   // disable linking in left panel
    //     }
    // });


})

lpaper.on('cell:pointerup', function(evt) { 
    // resetLeftPane(lgates);
    // rgraph.resetCells(_.toArray(lgates));
    // document.getElementById('tmpDiv').remove();
})


