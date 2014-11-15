// fra http://stackoverflow.com/questions/6224571/positioning-multiple-random-sized-absolutely-positioned-elements-so-they-dont

module.exports = function(elements, totalHeight, totalWidth) {

    var min_x = 0;
    var max_x =  totalWidth;
    var min_y = 0;
    var max_y = totalHeight;
    var filled_areas = [];

    [].forEach.call(elements, function(element) {
        var area;
        var rand_x = 0;
        var rand_y = 0;

        var width   = element.offsetWidth;
        var height  = element.offsetHeight

        var max_x_subtracted = max_x - width;
        var max_y_subtracted = max_y - height;
        var loopCounter = 0;

        do {
            loopCounter++;
            rand_x = Math.round(min_x + ((max_x_subtracted - min_x)*(Math.random() % 1)));
            rand_y = Math.round(min_y + ((max_y_subtracted - min_y)*(Math.random() % 1)));
            area = {x: rand_x, y: rand_y, width: width, height: height};
        } while(check_overlap(area) && loopCounter < 5000);

        filled_areas.push(area);

        element.style.left  = rand_x + "px";
    //     element.style.top   = rand_y + "px";
    });

    function check_overlap(area) {
        for (var i = 0; i < filled_areas.length; i++) {

            check_area = filled_areas[i];

            var bottom1 = area.y + area.height;
            var bottom2 = check_area.y + check_area.height;
            var top1 = area.y;
            var top2 = check_area.y;
            var left1 = area.x;
            var left2 = check_area.x;
            var right1 = area.x + area.width;
            var right2 = check_area.x + check_area.width;
            if (bottom1 < top2 || top1 > bottom2 || right1 < left2 || left1 > right2) {
                continue;
            }
            return true;
        }
        return false;
    }


};