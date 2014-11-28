// fra http://stackoverflow.com/questions/6224571/positioning-multiple-random-sized-absolutely-positioned-elements-so-they-dont

var getSize = function(element) {
    var clone = element.cloneNode();
    element.parentNode.appendChild(clone);

    var returnObj = {
        width:  clone.offsetWidth,
        height: clone.offsetHeight
    };
    clone.remove();

    return returnObj;
};


module.exports = function(elements, options) {

    var minX = options.minWidth || 0;
    var maxX = options.width;
    var minY = options.minHeight || 0;
    var maxY = options.height;
    var filledAreas = [];

    [].forEach.call(elements, function(element) {
        var area;
        var size = getSize(element);

        var randX = 0;
        var randY = 0;

        var width  = size.width;
        var height = size.height;

        var subtractedMaxX = maxX - width;
        var subtractedMaxY = maxY - height;
        var loopCounter = 0;

        do {
            loopCounter++;
            randX = Math.round(minX + ((subtractedMaxX - minX)*(Math.random() % 1)));
            randY = Math.round(minY + ((subtractedMaxY - minY)*(Math.random() % 1)));
            area = {x: randX, y: randY, width: width, height: height};
        } while(checkOverlap(area) && loopCounter < 5000);

        if (loopCounter == 5000) {
            console.log("loopCounter avbrøt plassering");
        };

        filledAreas.push(area);

        element.style.left = randX + "px";
        element.style.top  = randY + "px";
    });

    function checkOverlap(area) {
        var filledAreasLength =  filledAreas.length;
        for (var i = 0; i < filledAreasLength; i++) {

            checkArea = filledAreas[i];

            var bottom1 = area.y + area.height;
            var bottom2 = checkArea.y + checkArea.height;
            var top1    = area.y;
            var top2    = checkArea.y;
            var left1   = area.x;
            var left2   = checkArea.x;
            var right1  = area.x + area.width;
            var right2  = checkArea.x + checkArea.width;

            if (bottom1 < top2 || top1 > bottom2 || right1 < left2 || left1 > right2) {
                continue;
            }
            return true;
        }
        return false;
    }
};