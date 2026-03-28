"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./instrumentation.ts":
/*!****************************!*\
  !*** ./instrumentation.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n// instrumentation.ts — Next.js 15 instrumentation hook\n// Runs BEFORE any page rendering on the server\nasync function register() {\n    // Fix: Node.js 22+ has a built-in localStorage global, but when\n    // --localstorage-file is provided without a valid path, the methods\n    // (getItem, setItem, etc.) are not functions. This crashes SSR.\n    // Provide a no-op polyfill if localStorage exists but is broken.\n    if (typeof globalThis !== 'undefined') {\n        const ls = globalThis.localStorage;\n        if (ls && typeof ls.getItem !== 'function') {\n            const store = new Map();\n            globalThis.localStorage = {\n                getItem: (key)=>store.get(key) ?? null,\n                setItem: (key, value)=>store.set(key, String(value)),\n                removeItem: (key)=>store.delete(key),\n                clear: ()=>store.clear(),\n                get length () {\n                    return store.size;\n                },\n                key: (index)=>[\n                        ...store.keys()\n                    ][index] ?? null\n            };\n        }\n    }\n    // Patch React.cache if missing (React 18 + Next.js 15 compatibility)\n    try {\n        const React = __webpack_require__(/*! react */ \"(instrument)/./node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js\");\n        if (typeof React.cache !== 'function') {\n            React.cache = (fn)=>fn;\n        }\n    } catch  {}\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vaW5zdHJ1bWVudGF0aW9uLnRzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQSx1REFBdUQ7QUFDdkQsK0NBQStDO0FBRXhDLGVBQWVBO0lBQ3BCLGdFQUFnRTtJQUNoRSxvRUFBb0U7SUFDcEUsZ0VBQWdFO0lBQ2hFLGlFQUFpRTtJQUNqRSxJQUFJLE9BQU9DLGVBQWUsYUFBYTtRQUNyQyxNQUFNQyxLQUFLLFdBQW9CQyxZQUFZO1FBQzNDLElBQUlELE1BQU0sT0FBT0EsR0FBR0UsT0FBTyxLQUFLLFlBQVk7WUFDMUMsTUFBTUMsUUFBUSxJQUFJQztZQUNqQkwsV0FBbUJFLFlBQVksR0FBRztnQkFDakNDLFNBQVMsQ0FBQ0csTUFBZ0JGLE1BQU1HLEdBQUcsQ0FBQ0QsUUFBUTtnQkFDNUNFLFNBQVMsQ0FBQ0YsS0FBYUcsUUFBa0JMLE1BQU1NLEdBQUcsQ0FBQ0osS0FBS0ssT0FBT0Y7Z0JBQy9ERyxZQUFZLENBQUNOLE1BQWdCRixNQUFNUyxNQUFNLENBQUNQO2dCQUMxQ1EsT0FBTyxJQUFNVixNQUFNVSxLQUFLO2dCQUN4QixJQUFJQyxVQUFTO29CQUFFLE9BQU9YLE1BQU1ZLElBQUk7Z0JBQUU7Z0JBQ2xDVixLQUFLLENBQUNXLFFBQWtCOzJCQUFJYixNQUFNYyxJQUFJO3FCQUFHLENBQUNELE1BQU0sSUFBSTtZQUN0RDtRQUNGO0lBQ0Y7SUFFQSxxRUFBcUU7SUFDckUsSUFBSTtRQUNGLE1BQU1FLFFBQVFDLG1CQUFPQSxDQUFDLHdHQUFPO1FBQzdCLElBQUksT0FBT0QsTUFBTUUsS0FBSyxLQUFLLFlBQVk7WUFDckNGLE1BQU1FLEtBQUssR0FBRyxDQUFDQyxLQUFZQTtRQUM3QjtJQUNGLEVBQUUsT0FBTSxDQUFDO0FBQ1giLCJzb3VyY2VzIjpbIi9zZXNzaW9ucy9xdWlya3ktbW9kZXN0LWN1cmllL21udC9BZXJvZWR1dmlzb24vaW5zdHJ1bWVudGF0aW9uLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGluc3RydW1lbnRhdGlvbi50cyDigJQgTmV4dC5qcyAxNSBpbnN0cnVtZW50YXRpb24gaG9va1xuLy8gUnVucyBCRUZPUkUgYW55IHBhZ2UgcmVuZGVyaW5nIG9uIHRoZSBzZXJ2ZXJcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICAvLyBGaXg6IE5vZGUuanMgMjIrIGhhcyBhIGJ1aWx0LWluIGxvY2FsU3RvcmFnZSBnbG9iYWwsIGJ1dCB3aGVuXG4gIC8vIC0tbG9jYWxzdG9yYWdlLWZpbGUgaXMgcHJvdmlkZWQgd2l0aG91dCBhIHZhbGlkIHBhdGgsIHRoZSBtZXRob2RzXG4gIC8vIChnZXRJdGVtLCBzZXRJdGVtLCBldGMuKSBhcmUgbm90IGZ1bmN0aW9ucy4gVGhpcyBjcmFzaGVzIFNTUi5cbiAgLy8gUHJvdmlkZSBhIG5vLW9wIHBvbHlmaWxsIGlmIGxvY2FsU3RvcmFnZSBleGlzdHMgYnV0IGlzIGJyb2tlbi5cbiAgaWYgKHR5cGVvZiBnbG9iYWxUaGlzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGNvbnN0IGxzID0gKGdsb2JhbFRoaXMgYXMgYW55KS5sb2NhbFN0b3JhZ2U7XG4gICAgaWYgKGxzICYmIHR5cGVvZiBscy5nZXRJdGVtICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBzdG9yZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAoZ2xvYmFsVGhpcyBhcyBhbnkpLmxvY2FsU3RvcmFnZSA9IHtcbiAgICAgICAgZ2V0SXRlbTogKGtleTogc3RyaW5nKSA9PiBzdG9yZS5nZXQoa2V5KSA/PyBudWxsLFxuICAgICAgICBzZXRJdGVtOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpID0+IHN0b3JlLnNldChrZXksIFN0cmluZyh2YWx1ZSkpLFxuICAgICAgICByZW1vdmVJdGVtOiAoa2V5OiBzdHJpbmcpID0+IHN0b3JlLmRlbGV0ZShrZXkpLFxuICAgICAgICBjbGVhcjogKCkgPT4gc3RvcmUuY2xlYXIoKSxcbiAgICAgICAgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHN0b3JlLnNpemU7IH0sXG4gICAgICAgIGtleTogKGluZGV4OiBudW1iZXIpID0+IFsuLi5zdG9yZS5rZXlzKCldW2luZGV4XSA/PyBudWxsLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBQYXRjaCBSZWFjdC5jYWNoZSBpZiBtaXNzaW5nIChSZWFjdCAxOCArIE5leHQuanMgMTUgY29tcGF0aWJpbGl0eSlcbiAgdHJ5IHtcbiAgICBjb25zdCBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG4gICAgaWYgKHR5cGVvZiBSZWFjdC5jYWNoZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgUmVhY3QuY2FjaGUgPSAoZm46IGFueSkgPT4gZm47XG4gICAgfVxuICB9IGNhdGNoIHt9XG59XG4iXSwibmFtZXMiOlsicmVnaXN0ZXIiLCJnbG9iYWxUaGlzIiwibHMiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwic3RvcmUiLCJNYXAiLCJrZXkiLCJnZXQiLCJzZXRJdGVtIiwidmFsdWUiLCJzZXQiLCJTdHJpbmciLCJyZW1vdmVJdGVtIiwiZGVsZXRlIiwiY2xlYXIiLCJsZW5ndGgiLCJzaXplIiwiaW5kZXgiLCJrZXlzIiwiUmVhY3QiLCJyZXF1aXJlIiwiY2FjaGUiLCJmbiJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(instrument)/./instrumentation.ts\n");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(instrument)/./instrumentation.ts")));
module.exports = __webpack_exports__;

})();