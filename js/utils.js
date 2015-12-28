/**
 * Array prototype to remove matched item from array
 * See http://stackoverflow.com/questions/3954438/remove-item-from-array-by-value
 * 
 * */
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};
