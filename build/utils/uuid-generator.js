"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidGenerator = void 0;
var uuidGenerator = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0, v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
exports.uuidGenerator = uuidGenerator;
//# sourceMappingURL=uuid-generator.js.map