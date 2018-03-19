var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');
var Plotly = require('plotly.js');


// Models
// ======
// A FigureModel holds a mirror copy of the state of a FigureWidget on
// the Python side.  There is a one-to-one relationship between JavaScript
// FigureModels and Python FigureWidgets. The JavaScript FigureModel is
// initialized as soon as a Python FigureWidget initialized, this happens
// even before the widget is first displayed in the Notebook
var FigureModel = widgets.DOMWidgetModel.extend({

    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        // Model metadata
        // --------------
        _model_name: 'FigureModel',
        _view_name: 'FigureView',
        _model_module: 'plotlywidget',
        _view_module: 'plotlywidget',

        // Data and Layout
        // ---------------
        // The _data and _layout properties are synchronized with the
        // Python side on initialization only.  After initialization, these
        // properties are kept in sync through the use of the _py2js_*
        // messages
        _data: [],
        _layout: {},

        // Python -> JS messages
        // ---------------------
        // Messages are implemented using trait properties. This is done so
        // that we can take advantage of ipywidget's binary serialization
        // protocol.
        //
        // Messages are sent by the Python side by assigning the message
        // contents to the appropriate _py2js_* property, and then immediately
        // setting it to None.  Messages are received by the JavaScript
        // side by registering property change callbacks in the initialize
        // methods for FigureModel and FigureView. e.g. (where this is a
        // FigureModel):
        //
        //      this.on('change:_py2js_addTraces', this.do_addTraces, this);
        //
        // Message handling methods, do_addTraces, are responsible for
        // performing the appropriate action if the message contents are
        // not null
        //
        // Messages handling logic and functionality are documented in the
        // corresponding do_* methods of both FigureModel nd FigureView.

        /**
         * @typedef {null|Object} Py2JsAddTracesMsg
         * @property {Array.<Object>} trace_data
         *  Array of traces to append to the end of the figure's current traces
         * @property {Number} trace_edit_id
         *  Edit ID to use when returning trace deltas using
         *  the _js2py_traceDeltas message.
         * @property {Number} layout_edit_id
         *  Edit ID to use when returning layout deltas using
         *  the _js2py_layoutDelta message.
         */
        _py2js_addTraces: null,

        /**
         * @typedef {null|Object} Py2JsDeleteTracesMsg
         * @property {Array.<Number>} delete_inds
         *  Array of indexes of traces to be deleted, in ascending order
         * @property {Number} layout_edit_id
         *  Edit ID to use when returning layout deltas using
         *  the _js2py_layoutDelta message.
         */
        _py2js_deleteTraces: null,

        /**
         * @typedef {null|Object} Py2JsMoveTracesMsg
         * @property {Array.<Number>} current_trace_inds
         *  Array of the current indexes of traces to be moved
         * @property {Array.<Number>} new_trace_inds
         *  Array of the new indexes that traces should be moved to.
         */
        _py2js_moveTraces: null,


        /**
         * @typedef {null|Object} Py2JsRestyleMsg
         * @property {Object} restyle_data
         *  Restyle data as accepted by Plotly.restyle
         * @property {null|Array.<Number>} restyle_traces
         *  Array of indexes of the traces that the resytle operation applies
         *  to, or null to apply the operation to all traces
         * @property {Number} trace_edit_id
         *  Edit ID to use when returning trace deltas using
         *  the _js2py_traceDeltas message
         * @property {Number} layout_edit_id
         *  Edit ID to use when returning layout deltas using
         *  the _js2py_layoutDelta message
         * @property {null|String} source_view_id
         *  view_id of the FigureView that triggered the original restyle
         *  event (e.g. by clicking the legend), or null if the restyle was
         *  triggered from Python
         */
        _py2js_restyle: null,

        /**
         * @typedef {null|Object} Py2JsRelayoutMsg
         * @property {Object} relayout_data
         *  Relayout data as accepted by Plotly.relayout
         * @property {Number} layout_edit_id
         *  Edit ID to use when returning layout deltas using
         *  the _js2py_layoutDelta message
         * @property {null|String} source_view_id
         *  view_id of the FigureView that triggered the original relayout
         *  event (e.g. by clicking the zoom button), or null if the
         *  relayout was triggered from Python
         */
        _py2js_relayout: null,

        /**
         * @typedef {null|Object} Py2JsUpdateMsg
         * @property {Object} style_data
         *  Style data as accepted by Plotly.update
         * @property {Object} layout_data
         *  Layout data as accepted by Plotly.update
         * @property {Array.<Number>} style_traces
         *  Array of indexes of the traces that the update operation applies
         *  to, or null to apply the operation to all traces
         * @property {Number} trace_edit_id
         *  Edit ID to use when returning trace deltas using
         *  the _js2py_traceDeltas message
         * @property {Number} layout_edit_id
         *  Edit ID to use when returning layout deltas using
         *  the _js2py_layoutDelta message
         * @property {null|String} source_view_id
         *  view_id of the FigureView that triggered the original update
         *  event (e.g. by clicking a button), or null if the update was
         *  triggered from Python
         */
        _py2js_update: null,

        /**
         * @typedef {null|Object} Py2JsAnimateMsg
         * @property {Object} style_data
         *  Style data as accepted by Plotly.animate
         * @property {Object} layout_data
         *  Layout data as accepted by Plotly.animate
         * @property {Array.<Number>} style_traces
         *  Array of indexes of the traces that the animate operation applies
         *  to, or null to apply the operation to all traces
         * @property {Object} animation_opts
         *  Animation options as accepted by Plotly.animate
         * @property {Number} trace_edit_id
         *  Edit ID to use when returning trace deltas using
         *  the _js2py_traceDeltas message
         * @property {Number} layout_edit_id
         *  Edit ID to use when returning layout deltas using
         *  the _js2py_layoutDelta message
         * @property {null|String} source_view_id
         *  view_id of the FigureView that triggered the original animate
         *  event (e.g. by clicking a button), or null if the update was
         *  triggered from Python
         */
        _py2js_animate: null,

        /**
         * @typedef {null|Object} Py2JsRemoveLayoutPropsMsg
         * @property {Array.<Array.<String|Number>>} remove_props
         *  Array of property paths to remove. Each propery path is an
         *  array of property names or array indexes that locate a property
         *  inside the _layout object
         */
        _py2js_removeLayoutProps: null,

        /**
         * @typedef {null|Object} Py2JsRemoveTracePropsMsg
         * @property {Number} remove_trace
         *  The index of the trace from which to remove properties
         * @property {Array.<Array.<String|Number>>} remove_props
         *  Array of property paths to remove. Each propery path is an
         *  array of property names or array indexes that locate a property
         *  inside the _data[remove_trace] object
         */
        _py2js_removeTraceProps: null,


        /**
         * @typedef {null|Object} Py2JsSvgRequestMsg
         * @property {String} request_id
         *  Unique svg request identifier. This identifier is returned
         *  along with the SVG image
         */
        _py2js_svgRequest: null,

        // JS -> Python messages
        // ---------------------
        // Messages are sent by the JavaScript side by assigning the
        // message contents to the appropriate _js2py_* property and then
        // calling the `touch` method on the view that triggered the
        // change. e.g. (where this is a FigureView):
        //
        //      this.model.set('_js2py_restyle', data);
        //      this.touch();
        //
        // The Python side is responsible for setting the property to None
        // after receiving the message.
        //
        // Message trigger logic is described in the corresponding
        // handle_plotly_* methods of FigureView

        /**
         * @typedef {null|Object} Js2PyRestyleMsg
         * @property {Object} style_data
         *  Style data that was passed to Plotly.restyle
         * @property {Array.<Number>} style_traces
         *  Array of indexes of the traces that the restyle operation
         *  was applied to, or null if applied to all traces
         * @property {String} source_view_id
         *  view_id of the FigureView that triggered the original restyle
         *  event (e.g. by clicking the legend)
         */
        _js2py_restyle: null,

        /**
         * @typedef {null|Object} Js2PyRelayoutMsg
         * @property {Object} relayout_data
         *  Relayout data that was passed to Plotly.relayout
         * @property {String} source_view_id
         *  view_id of the FigureView that triggered the original relayout
         *  event (e.g. by clicking the zoom button)
         */
        _js2py_relayout: null,

        /**
         * @typedef {null|Object} Js2PyUpdateMsg
         * @property {Object} style_data
         *  Style data that was passed to Plotly.update
         * @property {Object} layout_data
         *  Layout data that was passed to Plotly.update
         * @property {Array.<Number>} style_traces
         *  Array of indexes of the traces that the update operation applied
         *  to, or null if applied to all traces
         * @property {String} source_view_id
         *  view_id of the FigureView that triggered the original relayout
         *  event (e.g. by clicking the zoom button)
         */
        _js2py_update: null,

        /**
         * @typedef {null|Object} Js2PyLayoutDeltaMsg
         * @property {Object} layout_delta
         *  The layout delta object that contains all of the properties of
         *  _fullLayout that are not identical to those in the
         *  FigureModel's _layout property
         * @property {Number} layout_edit_id
         *  Edit ID of message that triggered the creation of layout delta
         */
        _js2py_layoutDelta: null,

        /**
         * @typedef {null|Object} Js2PyTraceDeltasMsg
         * @property {Array.<Object>} trace_deltas
         *  Array of trace delta objects. Each trace delta contains the
         *  trace's uid along with all of the properties of _fullData that
         *  are not identical to those in the FigureModel's _data property
         * @property {Number} trace_edit_id
         *  Edit ID of message that triggered the creation of trace deltas
         */
        _js2py_traceDeltas: null,


        /**
         * Object representing a collection of points for use in click, hover,
         * and selection events
         * @typedef {Object} Points
         * @property {Array.<Number>} trace_indexes
         *  Array of the trace index for each point
         * @property {Array.<Number>} point_indexes
         *  Array of the index of each point in its own trace
         * @property {null|Array.<Number>} xs
         *  Array of the x coordinate of each point (for cartesian trace types)
         *  or null (for non-cartesian trace types)
         * @property {null|Array.<Number>} ys
         *  Array of the y coordinate of each point (for cartesian trace types)
         *  or null (for non-cartesian trace types
         * @property {null|Array.<Number>} zs
         *  Array of the z coordinate of each point (for 3D cartesian trace types)
         *  or null (for non-3D-cartesian trace types)
         */

        /**
         * Object representing the state of the input devices during a
         * plotly event
         * @typedef {Object} InputDeviceState
         * @property {boolean} alt - true if alt key pressed, false otherwise
         * @property {boolean} ctrl - true if ctrl key pressed, false otherwise
         * @property {boolean} meta - true if meta key pressed, false otherwise
         * @property {boolean} shift - true if shift key pressed, false otherwise
         *
         * @property {boolean} button
         *  Indicates which button was pressed on the mouse to trigger the event.
         *    0: Main button pressed, usually the left button or the
         *       un-initialized state
         *    1: Auxiliary button pressed, usually the wheel button or
         *       the middle button (if present)
         *    2: Secondary button pressed, usually the right button
         *    3: Fourth button, typically the Browser Back button
         *    4: Fifth button, typically the Browser Forward button
         *
         * @property {boolean} buttons
         *  Indicates which buttons were pressed on the mouse when the event is
         *  triggered.
         *    0  : No button or un-initialized
         *    1  : Primary button (usually left)
         *    2  : Secondary button (usually right)
         *    4  : Auxilary button (usually middle or mouse wheel button)
         *    8  : 4th button (typically the "Browser Back" button)
         *    16 : 5th button (typically the "Browser Forward" button)
         *
         *  Combinations of buttons are represented by the sum of the codes
         *  above. e.g. a value of 7 indicates buttons 1 (primary), 2 (secondary),
         *  and 4 (auxilary) were pressed during the event
         */

        /**
         * @typedef {Object} BoxSelectorState
         * @property {Array.<Number>} xrange
         *  Two element array containing the x-range of the box selection
         * @property {Array.<Number>} yrange
         *  Two element array containing the y-range of the box selection
         */

        /**
         * @typedef {Object} LassoSelectorState
         * @property {Array.<Number>} xs
         *  Array of the x-coordinates of the lasso selection region
         * @property {Array.<Number>} ys
         *  Array of the y-coordinates of the lasso selection region
         */

        /**
         * Object representing the state of the selection tool during a
         * plotly_select event
         * @typedef {Object} SelectorState
         * @property {String} type
         *  Selection type. One of: 'box', or 'lasso'
         * @property {BoxSelectorState|LassoSelectorState} selector_state
         */

        /**
         * @typedef {null|Object} Js2PyPointsCallbackMsg
         * @property {string} event_type
         *  Name of the triggering event. One of 'plotly_click',
         *  'plotly_hover', 'plotly_unhover', or 'plotly_selected'
         * @property {null|Points} points
         *  Points object for event
         * @property {null|InputDeviceState} device_state
         *  InputDeviceState object for event
         * @property {null|SelectorState} selector
         *  State of the selection tool for 'plotly_selected' events, null
         *  for other event types
         */
        _js2py_pointsCallback: null,

        // SVG image request message
        // -------------------------
        /**
         * @typedef {Object} Js2PySvgResponseMsg
         * @property {String} request_id
         *  Unique identifier of the Py2JsSvgRequestMsg message that
         *  triggered this response
         * @property {String} svg_uri
         *  Response svg image encoded as a data uri string
         *  e.g. 'data:image/svg+xml;base64,...'
         */
        _js2py_svgResponse: null,

        // Message tracking
        // ----------------
        _last_layout_edit_id: 0,
        _last_trace_edit_id: 0
    }),

    /**
     * Initialize FigureModel. Called when the Python FigureWidget is first
     * constructed
     */
    initialize: function() {
        FigureModel.__super__.initialize.apply(this, arguments);
        console.log(['FigureModel: initialize']);

        this.on('change:_data', this.do_data, this);
        this.on('change:_layout', this.do_layout, this);
        this.on('change:_py2js_addTraces', this.do_addTraces, this);
        this.on('change:_py2js_deleteTraces', this.do_deleteTraces, this);
        this.on('change:_py2js_moveTraces', this.do_moveTraces, this);
        this.on("change:_py2js_restyle", this.do_restyle, this);
        this.on("change:_py2js_relayout", this.do_relayout, this);
        this.on("change:_py2js_update", this.do_update, this);
        this.on("change:_py2js_animate", this.do_animate, this);
        this.on("change:_py2js_removeLayoutProps", this.do_removeLayoutProps, this);
        this.on("change:_py2js_removeTraceProps", this.do_removeStyleProps, this);
    },

    /**
     * Input a trace index specification and return an Array of trace
     * indexes where:
     *
     *  - null|undefined -> Array of all traces
     *  - Trace index as Number -> Single element array of input index
     *  - Array of trace indexes -> Input array unchanged
     *
     * @param {undefined|null|Number|Array.<Number>} trace_indexes
     * @returns {Array.<Number>}
     *  Array of trace indexes
     * @private
     */
    _normalize_trace_indexes: function (trace_indexes) {
        if (trace_indexes === null || trace_indexes === undefined) {
            var numTraces = this.get('_data').length;
            trace_indexes = Array.apply(null, new Array(numTraces)).map(function (_, i) {return i;});
        }
        if (!Array.isArray(trace_indexes)) {
            // Make sure idx is an array
            trace_indexes = [trace_indexes];
        }
        return trace_indexes
    },

    /** Log changes to the _data trait */
    do_data: function () {
        console.log('Figure Model: do_data');
        var data = this.get('_data');

        if (data !== null) {
            console.log(data);
        }
    },

    /** Log changes to the _layout trait */
    do_layout: function () {
        console.log('Figure Model: do_layout');
        var layout = this.get('_layout');

        if (layout !== null) {
            console.log(layout);
        }
    },



    /**
     * Perform addTraces operation on the model
     */
    do_addTraces: function () {
        // add trace to plot
        console.log('Figure Model: do_addTraces');

        /** @type {Py2JsAddTracesMsg} */
        var msgData = this.get('_py2js_addTraces');

        if (msgData !== null) {
            console.log(msgData);
            var currentTraces = this.get('_data');
            var newTraces = msgData.trace_data;
            _.forEach(newTraces, function (newTrace) {
                currentTraces.push(newTrace);
            })
        }
    },

    /**
     * Perform the deleteTraces operation on the  model
     */
    do_deleteTraces: function () {
        // remove traces from plot
        console.log('Figure Model: do_deleteTraces');

        /** @type {Py2JsDeleteTracesMsg} */
        var msgData = this.get('_py2js_deleteTraces');

        if (msgData !== null) {
            var delete_inds = msgData.delete_inds;
            var tracesData = this.get('_data');

            // Remove del inds in reverse order so indexes remain valid throughout loop
            delete_inds.slice().reverse().forEach(function (del_ind) {
                tracesData.splice(del_ind, 1);
            });
        }
    },

    /**
     * Perform moveTraces operation on the model
     */
    do_moveTraces: function () {
        console.log('Figure Model: do_moveTraces');

        /** @type {Py2JsMoveTracesMsg} */
        var msgData = this.get('_py2js_moveTraces');

        console.log('do_moveTraces');

        if (msgData !== null) {
            var currentInds = msgData.current_trace_inds;
            var newInds = msgData.new_trace_inds;
            var tracesData = this.get('_data');

            // ### Remove by curr_inds in reverse order ###
            var movingTracesData = [];
            for (var ci = currentInds.length - 1; ci >= 0; ci--) {
                // Insert moving tracesData at beginning of the list
                movingTracesData.splice(0, 0, tracesData[currentInds[ci]]);
                tracesData.splice(currentInds[ci], 1);
            }

            // ### Sort newInds and movingTracesData by newInds ###
            var newIndexSortedArrays = _(newInds).zip(movingTracesData)
                .sortBy(0)
                .unzip()
                .value();

            newInds = newIndexSortedArrays[0];
            movingTracesData = newIndexSortedArrays[1];

            // ### Insert by newInds in forward order ###
            for (var ni = 0; ni < newInds.length; ni++) {
                tracesData.splice(newInds[ni], 0, movingTracesData[ni]);
            }
        }
    },

    do_restyle: function () {
        console.log('FigureModel: do_restyle');

        /** @type {Py2JsRestyleMsg} */
        var msgData = this.get('_py2js_restyle');
        if (msgData !== null) {
            var restyleData = msgData.restyle_data;
            var trace_indexes = this._normalize_trace_indexes(msgData.restyle_traces);
            this._performRestyle(restyleData, trace_indexes)
        }
    },

    _performRestyle: function (style, trace_indexes){

        for (var rawKey in style) {
            if (!style.hasOwnProperty(rawKey)) { continue }
            var v = style[rawKey];

            if (!Array.isArray(v)) {
                v = [v]
            }

            var keyPath = flattenedKeyToObjectPath(rawKey);

            for (var i = 0; i < trace_indexes.length; i++) {
                var trace_ind = trace_indexes[i];
                var valParent = this.get('_data')[trace_ind];

                for (var kp = 0; kp < keyPath.length-1; kp++) {
                    var keyPathEl = keyPath[kp];

                    // Extend val_parent list if needed
                    if (Array.isArray(valParent)) {
                        if (typeof keyPathEl === 'number') {
                            while (valParent.length <= keyPathEl) {
                                valParent.push(null)
                            }
                        }
                    } else { // object
                        // Initialize child if needed
                        if (valParent[keyPathEl] === undefined) {
                            if (typeof keyPath[kp + 1] === 'number') {
                                valParent[keyPathEl] = []
                            } else {
                                valParent[keyPathEl] = {}
                            }
                        }
                    }
                    valParent = valParent[keyPathEl];
                }

                var lastKey = keyPath[keyPath.length-1];
                var trace_v = v[i % v.length];

                if (trace_v === undefined) {
                    // Nothing to do
                } else if (trace_v === null){
                    if(valParent.hasOwnProperty(lastKey)) {
                        delete valParent[lastKey];
                    }
                } else {
                    if (Array.isArray(valParent) && typeof lastKey === 'number') {
                        while (valParent.length <= lastKey) {
                            // Make sure array is long enough to assign into
                            valParent.push(null)
                        }
                    }
                    valParent[lastKey] = trace_v;
                }
            }
        }
    },

    do_relayout: function () {
        console.log('FigureModel: do_relayout');

        /** @type {Py2JsRelayoutMsg} */
        var msgData = this.get('_py2js_relayout');

        if (msgData !== null) {
            console.log(msgData);
            this._performRelayout(msgData.relayout_data);
            console.log(this.get('_layout'))
        }
    },

    _performRelayout: function (relayoutData) {
        this._performRelayoutLike(relayoutData, this.get('_layout'))
    },

    _performRelayoutLike: function (relayout_data, parent_data) {
        // Perform a relayout style operation on a given parent object
        for (var rawKey in relayout_data) {
            if (!relayout_data.hasOwnProperty(rawKey)) {
                continue
            }

            var v = relayout_data[rawKey];
            var keyPath = flattenedKeyToObjectPath(rawKey);

            var valParent = parent_data;

            for (var kp = 0; kp < keyPath.length-1; kp++) {
                var keyPathEl = keyPath[kp];

                // Extend val_parent list if needed
                if (Array.isArray(valParent)) {
                    if(typeof keyPathEl === 'number') {
                        while (valParent.length <= keyPathEl) {
                            valParent.push(null)
                        }
                    }
                } else {
                    // Initialize child if needed
                    if (valParent[keyPathEl] === undefined) {
                        if (typeof keyPath[kp + 1] === 'number') {
                            valParent[keyPathEl] = []
                        } else {
                            valParent[keyPathEl] = {}
                        }
                    }
                }
                valParent = valParent[keyPathEl];
            }

            var lastKey = keyPath[keyPath.length-1];

            if (v === undefined) {
                // Nothing to do
            } else if (v === null){
                if(valParent.hasOwnProperty(lastKey)) {
                    delete valParent[lastKey];
                }
            } else {
                if (Array.isArray(valParent) && typeof lastKey === 'number') {
                    while (valParent.length <= lastKey) {
                        // Make sure array is long enough to assign into
                        valParent.push(null)
                    }
                }
                valParent[lastKey] = v;
            }
        }
    },

    do_update: function() {
        console.log('FigureModel: do_update');

        /** @type {Py2JsUpdateMsg} */
        var msgData = this.get('_py2js_update');

        if (msgData !== null) {
            console.log(msgData);

            var style = msgData.style_data;
            var layout = msgData.layout_data;
            var trace_indexes = this._normalize_trace_indexes(msgData.style_traces);
            this._performRestyle(style, trace_indexes);
            this._performRelayout(layout);
        }
    },

    do_animate: function () {
        console.log('FigureModel: do_animate');

        /** @type {Py2JsAnimateMsg} */
        var msgData = this.get('_py2js_animate');
        if (msgData !== null) {
            console.log(msgData);

            var styles = msgData.style_data;
            var layout = msgData.layout_data;
            var trace_indexes = this._normalize_trace_indexes(msgData.style_traces);

            for (var i = 0; i < styles.length; i++) {
                var style = styles[i];
                var trace_index = trace_indexes[i];
                var trace = this.get('_data')[trace_index];
                this._performRelayoutLike(style, trace);
            }

            this._performRelayout(layout);
        }
    },

    // ### Remove props ###
    do_removeLayoutProps: function () {
        console.log('FigureModel:do_removeLayoutProps');

        /** @type {Py2JsRemoveLayoutPropsMsg} */
        var msgData = this.get('_py2js_removeLayoutProps');

        if (msgData !== null) {
            console.log(this.get('_layout'));
            var remove_props = msgData.remove_props;
            for(var i=0; i < remove_props.length; i++) {

                var keyPath = remove_props[i];
                var valParent = this.get('_layout');

                for (var kp = 0; kp < keyPath.length - 1; kp++) {
                    var keyPathEl = keyPath[kp];
                    if (valParent[keyPathEl] === undefined) {
                        valParent = null;
                        break
                    }
                    valParent = valParent[keyPathEl];
                }
                if (valParent !== null) {
                    var lastKey = keyPath[keyPath.length - 1];
                    if (valParent.hasOwnProperty(lastKey)) {
                        delete valParent[lastKey];
                        console.log('Removed ' + keyPath)
                    }
                }
            }
            console.log(this.get('_layout'));
        }
    },

    do_removeStyleProps: function () {
        console.log('FigureModel:do_removeTraceProps');

        /** @type {Py2JsRemoveTracePropsMsg} */
        var msgData = this.get('_py2js_removeTraceProps');
        if (msgData !== null) {
            console.log(msgData);
            var keyPaths = msgData.remove_props;
            var trace_index = msgData.remove_trace;

            for(var k=0; k < keyPaths.length; k++) {

                var keyPath = keyPaths[k];
                var valParent = this.get('_data')[trace_index];

                for (var kp = 0; kp < keyPath.length - 1; kp++) {
                    var keyPathEl = keyPath[kp];
                    if (valParent[keyPathEl] === undefined) {
                        valParent = null;
                        break
                    }
                    valParent = valParent[keyPathEl];
                }
                if (valParent !== null) {
                    var lastKey = keyPath[keyPath.length - 1];
                    if (valParent.hasOwnProperty(lastKey)) {
                        delete valParent[lastKey];
                        console.log('Removed ' + keyPath)
                    }
                }
            }
        }
    }
}, {
    serializers: _.extend({
        _data: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _layout: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_addTraces: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_deleteTraces: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_moveTraces: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_restyle: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_relayout: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_update: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_animate: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_removeLayoutProps: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _py2js_removeTraceProps: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _js2py_restyle: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _js2py_relayout: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _js2py_update: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _js2py_layoutDelta: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _js2py_traceDeltas: { deserialize: py2js_serializer, serialize: js2py_serializer},
        _js2py_pointsCallback: { deserialize: py2js_serializer, serialize: js2py_serializer},
    }, widgets.DOMWidgetModel.serializers)
});

var numpy_dtype_to_typedarray_type = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    float32: Float32Array,
    float64: Float64Array
};

function js2py_serializer(v, widgetManager) {
    var res;
    if (Array.isArray(v)) {
        res = new Array(v.length);
        for (var i = 0; i < v.length; i++) {
            res[i] = js2py_serializer(v[i]);
        }
    } else if (_.isPlainObject(v)) {
        res = {};
        for (var p in v) {
            if (v.hasOwnProperty(p)) {
                res[p] = js2py_serializer(v[p]);
            }
        }
    } else if (v === undefined) {
        res = '_undefined_';
    } else {
        res = v;
    }

    // TODO: Add js->py typed array support
    // Then points arrays can be sent back to Python as buffers
    return res
}

function py2js_serializer(v, widgetManager) {
    var res;
    if (Array.isArray(v)) {
        res = new Array(v.length);
        for (var i = 0; i < v.length; i++) {
            res[i] = py2js_serializer(v[i]);
        }
    } else if (_.isPlainObject(v)) {
        if (_.has(v, 'buffer') && _.has(v, 'dtype') && _.has(v, 'shape')) {
            var typedarray_type = numpy_dtype_to_typedarray_type[v.dtype];
            res = new typedarray_type(v.buffer.buffer);
        } else {
            res = {};
            for (var p in v) {
                if (v.hasOwnProperty(p)) {
                    res[p] = py2js_serializer(v[p]);
                }
            }
        }
    } else if (v === '_undefined_') {
        res = undefined;
    } else {
        res = v;
    }
    return res
}

function isTypedArray(a) {
    return ArrayBuffer.isView(a) && !(a instanceof DataView)
}

// Figure View
// ===========
var FigureView = widgets.DOMWidgetView.extend({

    render: function() {

        var that = this;

        // Wire up property callbacks
        // --------------------------
        // Python -> JS event properties
        this.model.on('change:_py2js_addTraces', this.do_addTraces, this);
        this.model.on('change:_py2js_deleteTraces', this.do_deleteTraces, this);
        this.model.on('change:_py2js_moveTraces', this.do_moveTraces, this);
        this.model.on('change:_py2js_restyle', this.do_restyle, this);
        this.model.on("change:_py2js_relayout", this.do_relayout, this);
        this.model.on("change:_py2js_update", this.do_update, this);
        this.model.on("change:_py2js_animate", this.do_animate, this);
        this.model.on("change:_py2js_svgRequest", this.do_svgRequest, this);

        // Increment message ids
        // ---------------------
        var layout_edit_id = this.model.get('_last_layout_edit_id') + 1;
        this.model.set('_last_layout_edit_id', layout_edit_id);
        var trace_edit_id = this.model.get('_last_trace_edit_id') + 1;
        this.model.set('_last_trace_edit_id', trace_edit_id);
        this.touch();

        // Set view UID
        // ------------
        this.viewID = randstr();
        console.log('Created view with id: ' + this.viewID);

        // Initialize figure
        // -----------------
        console.log('render');
        console.log(this.model.get('_data'));
        console.log(this.model.get('_layout'));

        // Clone traces and layout so plotly instances in the views don't mutate the model
        var initial_traces = _.cloneDeep(this.model.get('_data'));
        var initial_layout = _.cloneDeep(this.model.get('_layout'));

        Plotly.newPlot(this.el, initial_traces, initial_layout).then(function () {

            // ### Handle layout delta ###
            var layout_delta = that.create_delta_object(that.getFullLayout(), that.model.get('_layout'));

            /** @type{Js2PyLayoutDeltaMsg} */
            var layoutDeltaMsg = {
                layout_delta: layout_delta,
                layout_edit_id: layout_edit_id};

            that.model.set('_js2py_layoutDelta', layoutDeltaMsg);

            // ### Handle trace deltas ###
            var trace_deltas = new Array(initial_traces.length);
            var fullData = that.getFullData();
            for(var i=0; i < initial_traces.length; i++) {
                var fullTraceData = fullData[i];
                var traceData = initial_traces[i];
                trace_deltas[i] = that.create_delta_object(fullTraceData, traceData);
            }

            /** @type{Js2PyTraceDeltasMsg} */
            var traceDeltasMsg = {
                trace_deltas: trace_deltas,
                trace_edit_id: trace_edit_id};

            console.log(['fullData', fullData]);
            console.log(['traceDeltasMsg', traceDeltasMsg]);
            that.model.set('_js2py_traceDeltas', traceDeltasMsg);

            // sync any/all changes back to model
            that.touch();

            // Wire up plotly event callbacks
            that.el.on('plotly_restyle', function(update) {that.handle_plotly_restyle(update)});
            that.el.on('plotly_relayout', function(update) {that.handle_plotly_relayout(update)});
            that.el.on('plotly_update', function(update) {that.handle_plotly_update(update)});

            that.el.on('plotly_click', function(update) {that.handle_plotly_click(update)});
            that.el.on('plotly_hover', function(update) {that.handle_plotly_hover(update)});
            that.el.on('plotly_unhover', function(update) {that.handle_plotly_unhover(update)});
            that.el.on('plotly_selected', function(update) {that.handle_plotly_selected(update)});
            that.el.on('plotly_doubleclick', function(update) {that.handle_plotly_doubleclick(update)});
            that.el.on('plotly_afterplot', function(update) {that.handle_plotly_afterplot(update)});
        });
    },
    destroy: function() {
        Plotly.purge(this.el);
    },
    getFullData: function () {
        // Merge so that we use .data properties if available.
        // e.g. colorscales can be stored by name in this.el.data (Viridis) but by array in el._fullData. We want
        // the string in this case
        return _.mergeWith(this.el._fullData, this.el.data, fullMergeCustomizer)
    },

    getFullLayout: function () {
        return _.mergeWith(this.el._fullLayout, this.el.layout, fullMergeCustomizer);
    },

    /**
     * Build Points data structure from data supplied plotly_click, plotly_hover,
     * or plotly_select
     * @param {Object} data
     * @returns {null|Points}
     */
    buildPointsObject: function (data) {

        var pointsObject;
        if (data.hasOwnProperty('points')) {
            // Most cartesian plots
            var pointObjects = data['points'];
            var numPoints = pointObjects.length;
            pointsObject = {
                'trace_indexes': new Array(numPoints),
                'point_indexes': new Array(numPoints),
                'xs': new Array(numPoints),
                'ys': new Array(numPoints)};


                for (var p = 0; p < numPoints; p++) {
                pointsObject['trace_indexes'][p] = pointObjects[p]['curveNumber'];
                pointsObject['point_indexes'][p] = pointObjects[p]['pointNumber'];
                pointsObject['xs'][p] = pointObjects[p]['x'];
                pointsObject['ys'][p] = pointObjects[p]['y'];
            }

            // Add z if present
            var hasZ = pointObjects[0] !== undefined && pointObjects[0].hasOwnProperty('z');
            if (hasZ) {
                pointsObject['zs'] = new Array(numPoints);
                for (p = 0; p < numPoints; p++) {
                    pointsObject['zs'][p] = pointObjects[p]['z'];
                }
            }

            return pointsObject
        } else {
            return null
        }
    },

    /**
     * Build InputDeviceState data structure from data supplied
     * plotly_click, plotly_hover, or plotly_select
     * @param {Object} data
     * @returns {null|InputDeviceState}
     */
    buildInputDeviceStateObject: function (data) {
        var event = data['event'];
        if (event === undefined) {
            return null;
        } else {
            var inputDeviceState = {
                // Keyboard modifiers
                'alt': event['altKey'],
                'ctrl': event['ctrlKey'],
                'meta': event['metaKey'],
                'shift': event['shiftKey'],

                // Mouse buttons
                'button': event['button'],
                // Indicates which button was pressed on the mouse to trigger the event.
                //   0: Main button pressed, usually the left button or the un-initialized state
                //   1: Auxiliary button pressed, usually the wheel button or the middle button (if present)
                //   2: Secondary button pressed, usually the right button
                //   3: Fourth button, typically the Browser Back button
                //   4: Fifth button, typically the Browser Forward button
                'buttons': event['buttons']
                // Indicates which buttons are pressed on the mouse when the event is triggered.
                //   0  : No button or un-initialized
                //   1  : Primary button (usually left)
                //   2  : Secondary button (usually right)
                //   4  : Auxilary button (usually middle or mouse wheel button)
                //   8  : 4th button (typically the "Browser Back" button)
                //   16 : 5th button (typically the "Browser Forward" button)
            };
            return inputDeviceState
        }
    },

    /**
     * Build SelectorState data structure from data supplied by plotly_select
     * @param data
     * @returns {null|SelectorState}
     */
    buildSelectorObject: function(data) {
        var selectorObject;

        // Test for box select
        if (data.hasOwnProperty('range')) {
            selectorObject = {
                type: 'box',
                selector_state: {
                    xrange: data['range']['x'],
                    yrange: data['range']['y']
                }
            };
        } else if (data.hasOwnProperty('lassoPoints')) {
            selectorObject = {
                type: 'lasso',
                selector_state: {
                    xs: data['lassoPoints']['x'],
                    ys: data['lassoPoints']['y'],
                }
            };
        } else {
            selectorObject = null;
        }
        return selectorObject
    },

    handle_plotly_restyle: function (data) {
        if (data !== null && data !== undefined && data[0].hasOwnProperty('_doNotReportToPy')) {
            // Restyle originated on the Python side
            return
        }

        // Work around some plotly bugs/limitations
        if (data === null || data === undefined) {

            data = new Array(this.el.data.length);

            for (var t = 0; t < this.el.data.length; t++) {
                var traceData = this.el.data[t];
                data[t] = {'uid': traceData['uid']};
                if (traceData['type'] === 'parcoords') {

                    // Parallel coordinate diagram 'constraintrange' property not provided
                    for (var d = 0; d < traceData.dimensions.length; d++) {
                        var constraintrange = traceData.dimensions[d]['constraintrange'];
                        if (constraintrange !== undefined) {
                            data[t]['dimensions[' + d + '].constraintrange'] = [constraintrange];
                        }
                    }
                }
            }
        }

        /** @type {Js2PyRestyleMsg} */
        var restyleMsg = {
            style_data: data[0],
            style_traces: data[1],
            source_view_id: this.viewID
        };

        // Log message
        console.log("plotly_restyle");
        console.log(restyleMsg);

        this.model.set('_js2py_restyle', restyleMsg);
        this.touch();
    },

    handle_plotly_relayout: function (data) {
        if (data !== null && data !== undefined && data.hasOwnProperty('_doNotReportToPy')) {
            // Relayout originated on the Python side
            return
        }

        // Work around some plotly bugs/limitations

        // Sometimes (in scatterGL at least) axis range isn't wrapped in range
        // TODO: check if this is still needed with regl scattergl
        if ('xaxis' in data && Array.isArray(data['xaxis'])) {
            data['xaxis'] = {'range': data['xaxis']}
        }

        if ('yaxis' in data && Array.isArray(data['yaxis'])) {
            data['yaxis'] = {'range': data['yaxis']}
        }

        /** @type {Js2PyRelayoutMsg} */
        var relayoutMsg = {
            relayout_data: data,
            source_view_id: this.viewID
        };

        // Log message
        console.log("plotly_relayout");
        console.log(relayoutMsg);

        this.model.set('_js2py_relayout', relayoutMsg);
        this.touch();
    },

    handle_plotly_update: function (data) {
        if (data !== null && data !== undefined &&
            data['data'][0].hasOwnProperty('_doNotReportToPy')) {
            // Update originated on the Python side
            return
        }

        /** @type {Js2PyUpdateMsg} */
        var updateMsg = {
            style_data: data['data'][0],
            style_traces: data['data'][1],
            layout_data: data['layout'],
            source_view_id: this.viewID
        };

        // Log message
        console.log("plotly_update");
        console.log(updateMsg);

        this.model.set('_js2py_update', updateMsg);
        this.touch();
    },

    handle_plotly_click: function (data) {
        console.log("plotly_click");

        if (data === null || data === undefined) return;

        var pyData = {
            'event_type': 'plotly_click',
            'points': this.buildPointsObject(data),
            'device_state': this.buildInputDeviceStateObject(data),
            'selector': null
        };

        if (pyData['points'] !== null) {
            console.log(data);
            console.log(pyData);
            this.model.set('_js2py_pointsCallback', pyData);
            this.touch();
        }
    },

    handle_plotly_hover: function (data) {
        console.log("plotly_hover");

        if (data === null || data === undefined) return;

        var pyData = {
            'event_type': 'plotly_hover',
            'points': this.buildPointsObject(data),
            'device_state': this.buildInputDeviceStateObject(data),
            'selector': null
        };

        if (pyData['points'] !== null && pyData['points'] !== undefined) {
            console.log(data);
            console.log(pyData);
            this.model.set('_js2py_pointsCallback', pyData);
            this.touch();
        }
    },

    handle_plotly_unhover: function (data) {
        console.log("plotly_unhover");

        if (data === null || data === undefined) return;

        var pyData = {
            'event_type': 'plotly_unhover',
            'points': this.buildPointsObject(data),
            'device_state': this.buildInputDeviceStateObject(data),
            'selector': null
        };

        if (pyData['points'] !== null) {
            console.log(data);
            console.log(pyData);
            this.model.set('_js2py_pointsCallback', pyData);
            this.touch();
        }
    },

    handle_plotly_selected: function (data) {
        console.log("plotly_selected");

        if (data === null ||
            data === undefined) return;

        var pyData = {
            'event_type': 'plotly_selected',
            'points': this.buildPointsObject(data),
            'device_state': this.buildInputDeviceStateObject(data),
            'selector': this.buildSelectorObject(data),
        };

        if (pyData['points'] !== null) {
            console.log(data);
            console.log(pyData);
            this.model.set('_js2py_pointsCallback', pyData);
            this.touch();
        }
    },

    handle_plotly_doubleclick: function (data) {
        // console.log("plotly_doubleclick");
        // console.log(data);
    },

    handle_plotly_afterplot: function (data) {
        // console.log("plotly_afterplot");
        // console.log(data);
    },

    do_addTraces: function () {
        // add trace to plot

        /** @type {Py2JsAddTracesMsg} */
        var msgData = this.model.get('_py2js_addTraces');

        console.log('Figure View: do_addTraces');

        if (msgData !== null) {
            console.log(msgData);
            var prevNumTraces = this.el.data.length;
            var newTraces = msgData.trace_data;
            var that = this;
            Plotly.addTraces(this.el, newTraces).then(function () {

                // ### Handle trace deltas ###
                var trace_deltas = new Array(newTraces.length);
                var tracesData = that.model.get('_data');
                var fullData = that.getFullData();
                var trace_edit_id = msgData.trace_edit_id;

                for(var i=0; i < newTraces.length; i++) {
                    var fullTraceData = fullData[i + prevNumTraces];
                    var traceData = tracesData[i + prevNumTraces];
                    trace_deltas[i] = that.create_delta_object(fullTraceData, traceData);
                }

                /** @type{Js2PyTraceDeltasMsg} */
                var traceDeltasMsg = {
                    trace_deltas: trace_deltas,
                    trace_edit_id: trace_edit_id};

                that.model.set('_js2py_traceDeltas', traceDeltasMsg);

                // ### Handle layout delta ###
                var layout_edit_id = msgData.layout_edit_id;
                var layout_delta = that.create_delta_object(that.getFullLayout(), that.model.get('_layout'));

                /** @type{Js2PyLayoutDeltaMsg} */
                var layoutDeltaMsg = {
                    layout_delta: layout_delta,
                    layout_edit_id: layout_edit_id};

                that.model.set('_js2py_layoutDelta', layoutDeltaMsg);

                // ### Send changes to Python model ###
                that.touch();
            });
        }
    },

    do_deleteTraces: function () {

        /** @type {Py2JsDeleteTracesMsg} */
        var msgData = this.model.get('_py2js_deleteTraces');

        console.log('do_deleteTraces');
        if (msgData  !== null){
            var delete_inds = msgData.delete_inds;
            var layout_edit_id = msgData.layout_edit_id;

            var that = this;
            Plotly.deleteTraces(this.el, delete_inds).then(function () {

                // ### Handle layout delta ###
                var layout_delta = that.create_delta_object(that.getFullLayout(), that.model.get('_layout'));

                /** @type{Js2PyLayoutDeltaMsg} */
                var layoutDeltaMsg = {
                    layout_delta: layout_delta,
                    layout_edit_id: layout_edit_id};

                that.model.set('_js2py_layoutDelta', layoutDeltaMsg);
                that.touch();
            });
        }
    },

    do_moveTraces: function () {

        /** @type {Py2JsMoveTracesMsg} */
        var msgData = this.model.get('_py2js_moveTraces');
        console.log('do_moveTraces');

        if (msgData !== null){
            var currentInds = msgData.current_trace_inds;
            var newInds = msgData.new_trace_inds;

            var inds_equal = currentInds.length===newInds.length &&
                currentInds.every(function(v,i) { return v === newInds[i]});

            if (!inds_equal) {
                console.log(currentInds + "->" + newInds);
                Plotly.moveTraces(this.el, currentInds, newInds)
            }
        }
    },

    do_restyle: function () {
        console.log('do_restyle');

        /** @type {Py2JsRestyleMsg} */
        var msgData = this.model.get('_py2js_restyle');
        console.log(msgData);
        if (msgData !== null) {
            var restyleData = msgData.restyle_data;
            var traceIndexes = this.model._normalize_trace_indexes(msgData.restyle_traces);

            if (msgData.source_view_id === this.viewID) {
                // Operation originated from this view, don't re-apply it
                console.log('Skipping restyle for view ' + this.viewID);
                return
            } else {
                console.log('Applying restyle for view ' + this.viewID)
            }

            restyleData['_doNotReportToPy'] = true;
            Plotly.restyle(this.el, restyleData, traceIndexes);

            // ### Handle trace deltas ###
            var trace_edit_id = msgData.trace_edit_id;
            var trace_deltas = new Array(traceIndexes.length);
            var trace_data = this.model.get('_data');
            var fullData = this.getFullData();
            for (var i = 0; i < traceIndexes.length; i++) {
                trace_deltas[i] = this.create_delta_object(fullData[traceIndexes[i]], trace_data[traceIndexes[i]]);
            }

            /** @type{Js2PyTraceDeltasMsg} */
            var traceDeltasMsg = {
                trace_deltas: trace_deltas,
                trace_edit_id: trace_edit_id};

            console.log(['traceDeltasMsg', traceDeltasMsg]);
            this.model.set('_js2py_traceDeltas', traceDeltasMsg);

            // ### Handle layout delta ###
            var layout_edit_id = msgData.layout_edit_id;
            var layout_delta = this.create_delta_object(this.getFullLayout(), this.model.get('_layout'));

            /** @type{Js2PyLayoutDeltaMsg} */
            var layoutDeltaMsg = {
                layout_delta: layout_delta,
                layout_edit_id: layout_edit_id};

            this.model.set('_js2py_layoutDelta', layoutDeltaMsg);

            this.touch();
        }
    },

    do_relayout: function () {
        console.log('FigureView: do_relayout');

        /** @type {Py2JsRelayoutMsg} */
        var msgData = this.model.get('_py2js_relayout');
        if (msgData !== null) {

            if (msgData.source_view_id === this.viewID) {
                // Operation originated from this view, don't re-apply it
                console.log('Skipping relayout for view ' + this.viewID);
                return
            } else {
                console.log('Applying relayout for view ' + this.viewID);
            }

            var relayoutData = msgData.relayout_data;

            relayoutData['_doNotReportToPy'] = true;
            Plotly.relayout(this.el, msgData.relayout_data);

            // ### Handle layout delta ###
            var layout_edit_id = msgData.layout_edit_id;
            var layout_delta = this.create_delta_object(this.getFullLayout(), this.model.get('_layout'));

            /** @type{Js2PyLayoutDeltaMsg} */
            var layoutDeltaMsg = {
                layout_delta: layout_delta,
                layout_edit_id: layout_edit_id};

            this.model.set('_js2py_layoutDelta', layoutDeltaMsg );

            // ### Update Python model ###
            this.touch();
        }
    },

    do_update: function () {
        console.log('FigureView: do_update');

        /** @type {Py2JsUpdateMsg} */
        var msgData = this.model.get('_py2js_update');

        if (msgData !== null) {
            var style = msgData.style_data;
            var layout = msgData.layout_data;
            var trace_indexes = this.model._normalize_trace_indexes(msgData.style_traces);

            if (msgData.source_view_id === this.viewID) {
                // Operation originated from this view, don't re-apply it
                console.log('Skipping update for view ' + this.viewID);
                return
            } else {
                console.log('Applying update for view ' + this.viewID)
            }

            style['_doNotReportToPy'] = true;
            Plotly.update(this.el, style, layout, trace_indexes);

            // ### Handle trace deltas ###
            var trace_edit_id = msgData.trace_edit_id;
            var trace_deltas = new Array(trace_indexes.length);
            var trace_data = this.model.get('_data');
            var fullData = this.getFullData();
            for (var i = 0; i < trace_indexes.length; i++) {
                trace_deltas[i] = this.create_delta_object(fullData[trace_indexes[i]], trace_data[trace_indexes[i]]);
            }

            /** @type{Js2PyTraceDeltasMsg} */
            var traceDeltasMsg = {
                trace_deltas: trace_deltas,
                trace_edit_id: trace_edit_id};

            this.model.set('_js2py_traceDeltas', traceDeltasMsg);

            // ### Handle layout delta ###
            var layout_edit_id = msgData.layout_edit_id;
            var layout_delta = this.create_delta_object(this.getFullLayout(), this.model.get('_layout'));

            /** @type{Js2PyLayoutDeltaMsg} */
            var layoutDeltaMsg = {
                layout_delta: layout_delta,
                layout_edit_id: layout_edit_id};

            this.model.set('_js2py_layoutDelta', layoutDeltaMsg);

            // ### Update Python model ###
            this.touch();
        }
    },

    do_animate: function() {
        console.log('FigureView: do_animate');

        /** @type {Py2JsAnimateMsg} */
        var msgData = this.model.get('_py2js_animate');

        if (msgData !== null) {

            // Unpack params
            // var animationData = msgData[0];
            var animationOpts = msgData.animation_opts;

            var styles = msgData.style_data;
            var layout = msgData.layout_data;
            var trace_indexes = this.model._normalize_trace_indexes(msgData.style_traces);

            var animationData = {
                data: styles,
                layout: layout,
                traces: trace_indexes
            };

            if (msgData.source_view_id === this.viewID) {
                // Operation originated from this view, don't re-apply it
                console.log('Skipping animate for view ' + this.viewID);
                return
            } else {
                console.log('Applying animate for view ' + this.viewID)
            }

            animationData['_doNotReportToPy'] = true;
            var that = this;

            Plotly.animate(this.el, animationData, animationOpts).then(function () {

                // ### Handle trace deltas ###
                var trace_edit_id = msgData.trace_edit_id;
                var trace_deltas = new Array(trace_indexes.length);
                var trace_data = that.model.get('_data');
                var fullData = that.getFullData();
                for (var i = 0; i < trace_indexes.length; i++) {
                    trace_deltas[i] = that.create_delta_object(fullData[trace_indexes[i]], trace_data[trace_indexes[i]]);
                }

                /** @type{Js2PyTraceDeltasMsg} */
                var traceDeltasMsg = {
                    trace_deltas: trace_deltas,
                    trace_edit_id: trace_edit_id
                };

                that.model.set('_js2py_traceDeltas', traceDeltasMsg);

                // ### Handle layout delta ###
                var layout_edit_id = msgData.layout_edit_id;
                var layout_delta = that.create_delta_object(that.getFullLayout(), that.model.get('_layout'));

                /** @type{Js2PyLayoutDeltaMsg} */
                var layoutDeltaMsg = {
                    layout_delta: layout_delta,
                    layout_edit_id: layout_edit_id};

                that.model.set('_js2py_layoutDelta', layoutDeltaMsg);

                // ### Update Python model ###
                that.touch();
            });
        }
    },

    do_svgRequest: function() {
        console.log('FigureView: do_svgRequest');

        /** @type {Py2JsSvgRequestMsg} */
        var msgData = this.model.get('_py2js_svgRequest');
        var that = this;
        if (msgData !== null) {
            var req_id = msgData.request_id;
            Plotly.toImage(this.el, {format:'svg'}).then(function (svg_uri) {
                console.log([msgData, svg_uri]);

                /** @type {Js2PySvgResponseMsg} */
                var responseMsg = {
                    request_id: req_id,
                    svg_uri: svg_uri
                };
                that.model.set('_js2py_svgResponse', responseMsg);
                that.touch();
            });
        }
    },

    /**
     * Return object that contains all properties in fullObj that are not
     * identical to corresponding properties in removeObj
     *
     * Properties of fullObj and removeObj may be object arrays
     *
     * Returned object is a deep clone of the properties of the input objects
     *
     * @param {Object} fullObj
     * @param {Object} removeObj
     */
    create_delta_object: function (fullObj, removeObj) {

        // Initialize result as object or array
        var res;
        if(Array.isArray(fullObj)) {
            res = new Array(fullObj.length);
        } else {
            res = {};
        }

        // Initialize removeObj to empty object if not specified
        if (removeObj === null || removeObj === undefined) {
            removeObj = {};
        }

        // Iterate over object properties or array indices
        for (var p in fullObj) {
            if (p[0] !== '_' &&  // Don't consider private properties
                fullObj.hasOwnProperty(p) &&  // Exclude parent properties
                fullObj[p] !== null  // Exclude cases where fullObj doesn't
                                     // have the property
            ) {
                // Compute object equality
                var props_equal;
                props_equal = _.isEqual(removeObj[p], fullObj[p]);

                // Perform recursive comparison if props are not equal
                if (!props_equal || p === 'uid') {  // Let uids through

                    // property has non-null value in fullObj that doesn't
                    // match the value in removeObj
                    var fullVal = fullObj[p];
                    if (removeObj.hasOwnProperty(p) && typeof fullVal === 'object') {
                        // Recurse over object properties
                        if(Array.isArray(fullVal)) {

                            if (fullVal.length > 0 && typeof(fullVal[0]) === 'object') {
                                // We have an object array
                                res[p] = new Array(fullVal.length);
                                for (var i = 0; i < fullVal.length; i++) {
                                    if (!Array.isArray(removeObj[p]) || removeObj[p].length <= i) {
                                        res[p][i] = fullVal[i]
                                    } else {
                                        res[p][i] = this.create_delta_object(fullVal[i], removeObj[p][i]);
                                    }
                                }
                            } else {
                                // We have a primitive array or typed array
                                res[p] = fullVal;
                            }
                        } else { // object
                            var full_obj = this.create_delta_object(fullVal, removeObj[p]);
                            if (Object.keys(full_obj).length > 0) {
                                // new object is not empty
                                res[p] = full_obj;
                            }
                        }
                    } else if (typeof fullVal === 'object' && !Array.isArray(fullVal)) {
                        // Return 'clone' of fullVal
                        // We don't use a standard clone method so that we keep
                        // the special case handling of this method
                        res[p] = this.create_delta_object(fullVal, {});

                    } else if (fullVal !== undefined) {
                        // No recursion necessary, Just keep value from fullObj
                        res[p] = fullVal;
                    }
                }
            }
        }
        return res
    }
});

// Copied from Plotly src/lib/index.js (How can we call it?)
// random string generator
function randstr(existing, bits, base) {
    /*
     * Include number of bits, the base of the string you want
     * and an optional array of existing strings to avoid.
     */
    if(!base) base = 16;
    if(bits === undefined) bits = 24;
    if(bits <= 0) return '0';

    var digits = Math.log(Math.pow(2, bits)) / Math.log(base),
        res = '',
        i,
        b,
        x;

    for(i = 2; digits === Infinity; i *= 2) {
        digits = Math.log(Math.pow(2, bits / i)) / Math.log(base) * i;
    }

    var rem = digits - Math.floor(digits);

    for(i = 0; i < Math.floor(digits); i++) {
        x = Math.floor(Math.random() * base).toString(base);
        res = x + res;
    }

    if(rem) {
        b = Math.pow(base, rem);
        x = Math.floor(Math.random() * b).toString(base);
        res = x + res;
    }

    var parsed = parseInt(res, base);
    if((existing && (existing.indexOf(res) > -1)) ||
         (parsed !== Infinity && parsed >= Math.pow(2, bits))) {
        return randstr(existing, bits, base);
    }
    else return res;
}

/**
 * Customizer for use with lodash's mergeWith function
 *
 * See: https://lodash.com/docs/latest#mergeWith
 */
function fullMergeCustomizer(objValue, srcValue) {
    if (isTypedArray(srcValue)) {
        // Return typed arrays directly, don't recurse inside
        return srcValue
    }
}


/**
 * Convert a potentially flattened restyle/relayout-style key into an Array of
 * object keys and/or array indexes
 *
 * Example:  'foo.bar[0]' -> ['foo', 'bar', 0]
 */
function flattenedKeyToObjectPath(rawKey) {

    // Split string on periods. e.g. 'foo.bar[0]' -> ['foo', 'bar[0]']
    var keyPath = rawKey.split('.');

    // Split out bracket indexes. e.g. ['foo', 'bar[0]'] -> ['foo', 'bar', '0']
    var regex = /(.*)\[(\d+)\]/;
    var keyPath2 = [];
    for (var k = 0; k < keyPath.length; k++) {
        var key = keyPath[k];
        var match = regex.exec(key);
        if (match === null) {
            keyPath2.push(key);
        } else {
            keyPath2.push(match[1]);
            keyPath2.push(match[2]);
        }
    }

    // Convert elements to ints if possible. e.g. ['foo', 'bar', '0'] -> ['foo', 'bar', 0]
    for (k = 0; k < keyPath2.length; k++) {
        key = keyPath2[k];
        var potentialInt = parseInt(key);
        if (!isNaN(potentialInt)) {
            keyPath2[k] = potentialInt;
        }
    }
    return keyPath2
}

module.exports = {
    FigureView : FigureView,
    FigureModel: FigureModel,
};