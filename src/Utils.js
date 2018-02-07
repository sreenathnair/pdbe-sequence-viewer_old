
class Utils {

    uniqueArray(arrArg) {
        return arrArg.filter((elem, pos, arr) => {
            return arr.indexOf(elem) == pos;
        });
    }

    flattenArray(arrArg) {
        return arrArg.reduce((a, b) => a.concat(b));
    }

    toCamelCase(str) {

        return str.split('').reduce((t, v, k) => t + (k === 0 ? v.toUpperCase() : v), '');
    }


    // this function binds change events to all protvista components
    bindEvents() {
        let regEx = /^protvista/i;
        var viewerComponents = Array.prototype.slice.call(document.querySelectorAll('*')).filter(function (el) {
            return el.tagName.match(regEx);
        });

        viewerComponents.forEach(element => {

            element.addEventListener("change", e => {

                for (const ch of viewerComponents) {
                    ch.setAttribute(e.detail.type, e.detail.value);
                }

                for (let key in e.detail) {

                    for (const ch of viewerComponents) {
                        ch.setAttribute(key, e.detail[key]);
                    }

                }
            });
        });
    }

    toggle(obj) {

        var tracksContainer = obj.parent().children().last();
        var summaryContainer = obj.parent().children().first().next();

        if ("none" === tracksContainer.css("display")) {
            tracksContainer.css("display", "inline-block");
            summaryContainer.css("display", "none");
        } else {
            tracksContainer.css("display", "none");
            summaryContainer.css("display", "inline-block");
        }
    }

    createClassByName(name, ...a) {
        var c = eval(name);
        return new c(...a);
    }

}

export default Utils;