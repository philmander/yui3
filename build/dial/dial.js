YUI.add('dial', function(Y) {

/**
 * Create a circular dial value range input visualized as a draggable handle on a
 * background element.
 * 
 * @module dial
 */
	var supportsVML = false;
	if(Y.config.doc.namespaces && Y.config.doc.namespaces.add){
		Y.config.doc.namespaces.add(
			'v', // vml namespace
			'urn:schemas-microsoft-com:vml',
			'#default#VML' // required for IE8
		);	
		if(Y.config.doc.createElement('v:oval').strokeColor){
			supportsVML = true;
		}
	}

    var Lang = Y.Lang,
        Widget = Y.Widget,
        Node = Y.Node;

	/**
	 * Create a dial to represent an input control capable of representing a
	 * series of intermediate states based on the position of the Dial's handle.
	 * These states are typically aligned to a value algorithm whereby the angle of the handle's
	 * position corresponds to a given value.
	 *
	 * @class Dial
	 * @extends Widget
	 * @param config {Object} Configuration object
	 * @constructor
	 */
    function Dial(config) {
        Dial.superclass.constructor.apply(this, arguments);
    }

    // static properties

    /**
     * The identity of the widget.
     *
     * @property Dial.NAME
     * @type String
     * @default 'dial'
     * @readOnly
     * @protected
     * @static
     */
    Dial.NAME = "dial";

    /**
     * Static property used to define the default attribute configuration of
     * the Widget.
     *
     * @property Dial.ATTRS
     * @type {Object}
     * @protected
     * @static
     */
    Dial.ATTRS = {

		/**
         * minimum value allowed
         *
         * @attribute min
         * @type {Number}
         * @default -220
         */
        min : {
            value:-220
        },

		/**
         * maximum value allowed
         *
         * @attribute max
         * @type {Number}
         * @default 220
         */
        max : {
            value:220
        },

		/**
         * diameter of the circular background object
		 * other objects scale accordingly
         *
         * @attribute diameter
         * @type {Number} the number of px in diameter
         * @default 100
         */
		diameter : {
			value:100
		},

		/**
		 * initial value of the Dial
         *
         * @attribute value
         * @type {Number}
         * @default 0
         */
        value : {
            value:0,
            validator: function(val) {
                return this._validateValue(val);
            }
        },
		
		/**
		 * amount to increment/decrement the dial value
		 * when the arrow up/down/left/right keys are pressed
         *
         * @attribute minorStep
         * @type {Number}
         * @default 1
         */
        minorStep : {
            value:1
        },

		/**
		 * amount to increment/decrement the dial value
		 * when the page up/down keys are pressed
         *
         * @attribute majorStep
         * @type {Number}
         * @default 10
         */
        majorStep : {
            value:10
        },

		/**
		 * number of value increments in one 360 degree revolution 
		 * of the handle around the dial
         *
         * @attribute stepsPerRev
         * @type {Number}
         * @default 100
         */
		stepsPerRev : {
			value:100
		},

		/**
		 * visible strings for the dial UI. This attribute is 
		 * defined by the base Widget class but has an empty value. The
		 * Dial is simply providing a default value for the attribute.
         *
         * @attribute strings
         * @type {Object}
         * @default {label: 'My label', resetStr: 'Reset', tooltipHandle: 'Press the ... for reset.'}
         */
        strings: {
			value: {label: 'My label',
				resetStr: 'Reset',
				tooltipHandle: 'Press the arrow up/down/left/right keys for minor increments, page up/down for major increments, home for reset.'
			}
        },
		
		/**
		 * distance from the center of the dial to the 
		 * resting place of the center of the handle and marker. 
		 * The value is a percent of the radius of the dial.
         *
         * @attribute handleDist
         * @type {number}
         * @default 0.75
         */
		handleDist:{
			value:0.75
		}
    };

	/**
	 * returns a properly formed yui class name
	 *
	 * @function
	 * @param {String} string to be appended at the end of class name
	 * @return
	 * @private
	 */
	function makeClassName(str) {
		return Y.ClassNameManager.getClassName(Dial.NAME, str);
	}
	
    /**
	 * array of static constants used to identify the classname applied to the Dial DOM objects 
	 *
     * @property Dial.CSS_CLASSES
     * @type {Array}
	 * @private
     * @static
	 */
	Dial.CSS_CLASSES = {
		input : Dial.INPUT_CLASS = makeClassName("value"),
		label : Dial.LABEL_CLASS = makeClassName("label"),
		labelString : Dial.LABEL_CLASS = makeClassName("label-string"),
		valueString : Dial.LABEL_CLASS = makeClassName("value-string"),
		northMark : Dial.NORTH_MARK_CLASS = makeClassName("north-mark"),
		ring : Dial.RING_CLASS = makeClassName('ring'),
		ringVml : Dial.RING_CLASS = makeClassName('ring-vml'),
		marker : Dial.MARKER_CLASS = makeClassName("marker"),
		markerUser : Dial.MARKER_USER_CLASS = makeClassName("marker-user"),
		centerButton : Dial.CENTER_BUTTON_CLASS = makeClassName("center-button"),
		centerButtonVml : Dial.RING_CLASS = makeClassName('center-button-vml'),
		resetString : Dial.RESET_STRING_CLASS = makeClassName("reset-str"),
		handle : Dial.HANDLE_CLASS = makeClassName("handle"),
		handleUser : Dial.HANDLE_USER_CLASS = makeClassName("handle-user")
	};
    
	
    /* Static constants used to define the markup templates used to create Dial DOM elements */
	//var strs = this.get('strings');
	var strs = Dial.ATTRS.strings.value, //('strings');
	labelId = Dial.CSS_CLASSES.label + Y.guid();

    /**
     * template that will contain the Dial's label.
     *
     * @property Dial.LABEL_TEMPLATE
     * @type {String}
     * @default &lt;div>...&lt;/div>
	 * @private
     */
	Dial.LABEL_TEMPLATE = '<div id="' + labelId + '" class="' + Dial.CSS_CLASSES.label + '"><span class="' + Dial.CSS_CLASSES.labelString + '">{label}</span><span class="' + Dial.CSS_CLASSES.valueString + '"></span></div>';

	/**
     * template that will contain the Dial's text input field.
     *
     * @property Dial.INPUT_TEMPLATE
     * @type {String}
     * @default &lt;input type="text" class="..."/>
	 * @private
     */
    Dial.INPUT_TEMPLATE = '<input type="text" class="' + Dial.CSS_CLASSES.input + '">';



	if(supportsVML === false){
		/**
		 * template that will contain the Dial's background ring.
		 *
		 * @property Dial.RING_TEMPLATE
		 * @type {String}
		 * @default &lt;div class="[...-ring]">&lt;div class="[...-northMark]">&lt;/div>&lt;/div>
		 * @private
		 */
		Dial.RING_TEMPLATE = '<div class="' + Dial.CSS_CLASSES.ring + '"><div class="' + Dial.CSS_CLASSES.northMark + '"></div></div>';

		/**
		 * template that will contain the Dial's current angle marker.
		 *
		 * @property Dial.MARKER_TEMPLATE
		 * @type {String}
		 * @default &lt;div class="[...-marker] marker-hidden">&lt;div class="[...-markerUser]">&lt;/div>&lt;/div>
		 * @private
		 */
		Dial.MARKER_TEMPLATE = '<div class="' + Dial.CSS_CLASSES.marker + ' marker-hidden"><div class="' + Dial.CSS_CLASSES.markerUser + '"></div></div>';

		/**
		 * template that will contain the Dial's center button.
		 *
		 * @property Dial.CENTER_BUTTON_TEMPLATE
		 * @type {String}
		 * @default &lt;div class="[...-centerButton]">&lt;div class="[...-resetString]">' + Y.substitute('{resetStr}', Dial.ATTRS.strings.value) + '&lt;/div>&lt;/div>
		 * @private
		 */
		Dial.CENTER_BUTTON_TEMPLATE = '<div class="' + Dial.CSS_CLASSES.centerButton + '"><div class="' + Dial.CSS_CLASSES.resetString + '">{resetStr}</div></div>';

		/**
		 * template that will contain the Dial's handle.
		 *
		 * @property Dial.HANDLE_TEMPLATE
		 * @type {String}
		 * @default &lt;div class="[...-handle]">&lt;div class="[...-handleUser]" aria-labelledby="' + labelId + '" aria-valuetext="" aria-valuemax="" aria-valuemin="" aria-valuenow="" role="slider"  tabindex="0">&lt;/div>&lt;/div>';// title="{tooltipHandle}"
		 * @private
		 */
		Dial.HANDLE_TEMPLATE = '<div class="' + Dial.CSS_CLASSES.handle + '"><div class="' + Dial.CSS_CLASSES.handleUser + '" aria-labelledby="' + labelId + '" aria-valuetext="" aria-valuemax="" aria-valuemin="" aria-valuenow="" role="slider"  tabindex="0" title="{tooltipHandle}"></div></div>';// title="{tooltipHandle}"
	
	}else{ // VML case
		Dial.RING_TEMPLATE = '<div class="' + Dial.CSS_CLASSES.ring + '">'+
								'<div class="' + Dial.CSS_CLASSES.northMark + '"></div>'+
									'<v:oval strokecolor="#ceccc0" strokeweight="1px" class="' + Dial.CSS_CLASSES.ringVml + '"><v:fill type=gradient color="#8B8A7F" color2="#EDEDEB" angle="45"/></v:oval>'+
									'<v:oval></v:oval>'+
								'</div>'+
								'';
		Dial.MARKER_TEMPLATE = '<div class="' + Dial.CSS_CLASSES.marker + ' marker-hidden">'+
									'<v:oval stroked="false" class="' + Dial.CSS_CLASSES.markerUser + '">'+
										'<v:fill opacity="20%" color="#000"/>'+
									'</v:oval>'+
									'<v:oval></v:oval>'+
								'</div>'+
								'';
		Dial.CENTER_BUTTON_TEMPLATE = '<div class="' + Dial.CSS_CLASSES.centerButton + '">'+
											'<v:oval strokecolor="#ceccc0" strokeweight="1px" class="' + Dial.CSS_CLASSES.centerButtonVml + '">'+
												'<v:fill type=gradient color="#C7C5B9" color2="#fefcf6" colors="35% #d9d7cb, 65% #fefcf6" angle="45"/>'+
												'<v:shadow on="True" color="#000" opacity="10%" offset="2px, 2px"/>'+
											'</v:oval>'+
											'<v:oval></v:oval>'+
											'<div class="' + Dial.CSS_CLASSES.resetString + '">{resetStr}</div>'+
									'</div>'+
									'';
		Dial.HANDLE_TEMPLATE = '<div class="' + Dial.CSS_CLASSES.handle + '">'+
									'<v:oval stroked="false" class="' + Dial.CSS_CLASSES.handleUser + '"'+
									' aria-labelledby="' + labelId + '" aria-valuetext="" aria-valuemax="" aria-valuemin="" aria-valuenow="" role="slider"  tabindex="0" title="{tooltipHandle}">'+ //title="{tooltipHandle}"
										'<v:fill opacity="20%" color="#6C3A3A"/>'+
									'</v:oval>'+
									'<v:oval></v:oval>'+
								'</div>'+
								'';
	}

    /**
     * The HTML_PARSER static constant is used by the Widget base class to populate 
     * the configuration for the dial instance from markup already on the page.
     *
     * The Dial class attempts to set the value of the dial widget if it
     * finds the appropriate input element on the page.
     */
    Dial.HTML_PARSER = {
        value: function (srcNode) {
            var val = parseInt(srcNode.get("value"),10); 
            return Y.Lang.isNumber(val) ? val : null;
        }
    };

    /* Dial extends the base Widget class */
    Y.extend(Dial, Widget, {

		/**
		 * creates the DOM structure for the Dial.
		 *
		 * @method renderUI
		 * @private
		 */
        renderUI : function() {
			this._renderLabel();
			this._renderInput();
			this._renderRing();
			this._renderMarker();
			this._renderCenterButton();
			this._renderHandle();


			// object handles
			this.contentBox = this.get("contentBox");
			
			// constants
			this._centerX = this.get('diameter') / 2;
			this._centerY = this.get('diameter') / 2;
			this._centerYOnPage = (this._ringNode.getY() + this._centerY);
			this._centerXOnPage = (this._ringNode.getX() + this._centerX);
			this._handleDist = this._centerX * this.get('handleDist');
			this._originalValue = this.get('value');

			// variables
			this._timesWrapped = 0;
			this._angle = 0;
			this._setTimesWrapedFromValue(this.get('value'));
			
			// init Aria
			this._handleUserNode.set('aria-valuemin', this.get('min'));
			this._handleUserNode.set('aria-valuemax', this.get('max'));

        },

		/**
		 * Creates the Y.DD.Drag instance used for the handle movement and
		 * binds Dial interaction to the configured value model.
		 *
		 * @method bindUI
		 * @private
		 */
        bindUI : function() {
            this.after("valueChange", this._afterValueChange);

            var boundingBox = this.get("boundingBox"),

            // Looking for a key event which will fire continously across browsers while the key is held down.  
			// 37 , 39 = arrow left/right, 38, 40 = arrow up/down, 33, 34 = page up/down,  35 , 36 = end/home
            keyEventSpec = (!Y.UA.opera) ? "down:" : "press:";
            keyEventSpec += "37, 39, 38, 40, 33, 34, 35, 36";

            Y.on("key", Y.bind(this._onDirectionKey, this), boundingBox, keyEventSpec);
            Y.on("keyup", Y.bind(this._numberKey, this), this._inputNode);

			Y.on('mouseenter', Y.bind(this._dialCenterOver, this), this._centerButtonNode);
			Y.on('mouseleave', Y.bind(this._dialCenterOut, this), this._centerButtonNode);
			Y.on('click', Y.bind(this._resetDial, this), this._centerButtonNode);			
			
			var dd1 = new Y.DD.Drag({
				node: this._handleNode,
				on : {
					'drag:drag' : Y.bind(this._handleDrag, this),
					'drag:start' : Y.bind(this._handleDragStart, this),
					'drag:end' : Y.bind(this._handleDragEnd, this)
				}
			});
		},

		/**
		 * Sets _timesWrapped based on Dial value
		 * to net integer revolutions the user dragged the handle around the Dial
		 *
		 * @method _setTimesWrapedFromValue
		 * @param val {Number} current value of the Dial
		 * @private
		 */
		_setTimesWrapedFromValue : function(val){
			if(val % this.get('stepsPerRev') === 0){
				this._timesWrapped = (val / this.get('stepsPerRev')) -1;
			}else{
				this._timesWrapped = Math.floor(val / this.get('stepsPerRev'));
			}
		},
		
		/**
		 * Sets the string in the object the user clicks to reset the Dial value
		 * 
		 * @method _dialCenterOver
		 * @private
		 */
		_dialCenterOver : function(e){
			this._resetString.setContent(Y.substitute('{resetStr}', this.get('strings')));
		},
		
		/**
		 * Sets the string in the object the user clicks to reset the Dial value
		 * 
		 * @method _dialCenterOut
		 * @private
		 */
		_dialCenterOut : function(e){
			this._resetString.setContent(''); 
		},
		
		/**
		 * resets Dial value to zero. Stores the handle X location required for future drag starts.
		 *
		 * @method _resetDial
		 * @private
		 */
		_resetDial : function(){
			this.set('value', this._originalValue);
			this._setTimesWrapedFromValue(this.get('value'));
			this._prevX = this._handleNode.getX();
			//this._inputNode.focus();
		},
		
		/**
		 * handles the user dragging the handle around the Dial, calculates the angle, 
		 * checks for wrapping around top center, handles exceeding min or max values 
		 *
		 * @method _handleDrag
		 * @private
		 */
		_handleDrag : function(e){
			var ang = Math.atan( (this._centerYOnPage - e.pageY)  /  (this._centerXOnPage - e.pageX)  ) * (180 / Math.PI), 
			deltaX = (this._centerXOnPage - e.pageX);
			if(deltaX < 0){
				ang = (ang + 90);
			}else{
				ang = (ang - 90);
			}
			// check for need to set timesWrapped
			if(e.pageY < this._centerYOnPage){ //if handle is above the middle of the dial...
				if((this._prevX <= this._centerXOnPage) && (e.pageX > this._centerXOnPage)){ // If wrapping, clockwise
					this._timesWrapped = (this._timesWrapped + 1);
				}else if((this._prevX > this._centerXOnPage) && (e.pageX <= this._centerXOnPage)){ // if un-wrapping, counter-clockwise
					this._timesWrapped = (this._timesWrapped - 1);
				}
			}
			this._prevX = e.pageX;
			var newValue = this._getValueFromAngle(ang); // This function needs the current _timesWrapped value
			// handle hitting max and min and going beyond, stops at max or min 
			//if((newValue > this.get('min')) && (newValue < this.get('max'))) {
			if((newValue > this.get('min')) && (newValue < this.get('max'))) {
				this.set('value', newValue);
			}else if(newValue > this.get('max')){
				this.set('value', this.get('max'));
			}else if(newValue < this.get('min')){
				this.set('value', this.get('min'));
			}
		},

		/**
		 * handles the user starting to drag the handle around the Dial
		 *
		 * @method _handleDragStart
		 * @private
		 */
		_handleDragStart : function(e){
			this._markerNode.removeClass('marker-hidden');
			if(!this._prevX){
				this._prevX = this._handleNode.getX();
			}
		},

		/*
		 * When handle is handleDragEnd, this animates the return to the fixed dial
		 */		

		/**
		 * handles the end of a user dragging the handle, animates the handle returning to
		 * resting position.
		 *
		 * @method _handleDragEnd
		 * @private
		 */
		_handleDragEnd : function(){
			var node = this._handleNode;			
				node.transition({
					duration: 0.08, // seconds
					easing: 'ease-in',
					left: this._setNodeToFixedRadius()[0] + 'px',
					top: this._setNodeToFixedRadius()[1] + 'px'
				}, Y.bind(function(){
						this._markerNode.addClass('marker-hidden');
						this._prevX = this._handleNode.getX(); //makes us ready for next drag.
					}, this)
				);
			this._setTimesWrapedFromValue(this.get('value'));
//			this._inputNode.focus();
//			this._inputNode.select();
		},

		/**
		 * returns the XY of the fixed position, handleDist, from the center of the Dial (resting position)
		 * The XY also represents the angle related to the current value
		 * If no param is passed, [X,Y] is returned.
		 * If param is passed, the XY of the node passed is set.
		 *
		 * @method _setNodeToFixedRadius
		 * @param obj {Node}
		 * @private
		 * @return {Array} an array of [XY] is optionally returned
		 */
		 _setNodeToFixedRadius : function(obj){
			var thisAngle = (this._angle - 90),
			rad = (Math.PI / 180);
			var newY = Math.round(Math.sin(thisAngle * rad) * this._handleDist);
			var newX = Math.round(Math.cos(thisAngle * rad) * this._handleDist);
			if(obj){
				obj.setXY([(this._ringNode.getX() + this._centerX + newX), (this._ringNode.getY() + this._centerY + newY)]);
			}else{ // just need the style for css transform left and top to animate the handle drag:end
				return [this._centerX + newX, this._centerX + newY];
			}
		 },

		/**
		 * Synchronizes the DOM state with the attribute settings.
		 *
		 * @method syncUI
		 * @private
		 */
        syncUI : function() {
            this._uiSetValue(this.get("value"));
        },

		/**
		 * renders the DOM object for the Dial's text input
		 *
		 * @method _renderInput
		 * @private
		 */
        _renderInput : function() {
            var contentBox = this.get("contentBox"),
                input = contentBox.one("." + Dial.CSS_CLASSES.input);
            if (!input) {
                input = Node.create(Dial.INPUT_TEMPLATE);
                contentBox.append(input);
            }
            this._inputNode = input;
        },

		/**
		 * renders the DOM object for the Dial's label
		 *
		 * @method _renderLabel
		 * @private
		 */
        _renderLabel : function() {
            var contentBox = this.get("contentBox"),
                label = contentBox.one("." + Dial.CSS_CLASSES.label);
            if (!label) {
				label = Node.create(Y.substitute(Dial.LABEL_TEMPLATE, this.get('strings')));
				contentBox.append(label);
            }
            this._labelNode = label;
			this._valueStringNode = this._labelNode.one("." + Dial.CSS_CLASSES.valueString);
        },

		/**
		 * renders the DOM object for the Dial's background ring
		 *
		 * @method _renderRing
		 * @private
		 */
        _renderRing : function() {
            var contentBox = this.get("contentBox"),
                ring = contentBox.one("." + Dial.CSS_CLASSES.ring);
            if (!ring) {
                ring = Node.create(Dial.RING_TEMPLATE);
                contentBox.append(ring);
				ring.setStyles({width:this.get('diameter') + 'px', height:this.get('diameter') + 'px'});
            }
            this._ringNode = ring;
        },

		/**
		 * renders the DOM object for the Dial's background marker which 
		 * tracks the angle of the user dragging the handle
		 *
		 * @method _renderMarker
		 * @private
		 */
        _renderMarker : function() {
            var contentBox = this.get("contentBox"),
			marker = contentBox.one("." + Dial.CSS_CLASSES.marker);
            if (!marker) {
                marker = Node.create(Dial.MARKER_TEMPLATE);
                contentBox.one('.' + Dial.CSS_CLASSES.ring).append(marker);
            }
            this._markerNode = marker;
			this._markerUserNode = this._markerNode.one('.' + Dial.CSS_CLASSES.markerUser);

        },
		
		/**
		 * places the centerbutton's reset string in the center of the button
		 * based on the size of the string object 
		 *
		 * @method _setXYResetString
		 * @private
		 */
		_setXYResetString : function(){
			this._resetString.setStyle('top', (this._centerButtonNode.get('region').height / 2) - (this._resetString.get('region').height / 2) + 'px');
			this._resetString.setStyle('left', (this._centerButtonNode.get('region').width / 2) - (this._resetString.get('region').width / 2) + 'px');
		},

		/**
		 * renders the DOM object for the Dial's center
		 *
		 * @method _renderCenterButton
		 * @private
		 */
        _renderCenterButton : function() {
            var contentBox = this.get("contentBox"),
                centerButton = contentBox.one("." + Dial.CSS_CLASSES.centerButton);
            if (!centerButton) {
				centerButton = Node.create(Y.substitute(Dial.CENTER_BUTTON_TEMPLATE, this.get('strings')));
                contentBox.one('.' + Dial.CSS_CLASSES.ring).append(centerButton);
            }
            this._centerButtonNode = centerButton;
			this._resetString = this._centerButtonNode.one('.' + Dial.CSS_CLASSES.resetString);
			this._setXYResetString(); // centering the reset string in the button
			this._resetString.setContent('');
			var offset = (this._ringNode.get('region').width - this._centerButtonNode.get('region').width) / 2;
			this._centerButtonNode.setXY([(this._ringNode.getX() + offset), (this._ringNode.getY() + offset)]);
        },

		/**
		 * renders the DOM object for the Dial's user draggable handle
		 *
		 * @method _renderHandle
		 * @private
		 */
        _renderHandle : function() {
            var contentBox = this.get("contentBox"),
                handle = contentBox.one("." + Dial.CSS_CLASSES.handle);
            if (!handle) {
                handle = Node.create(Y.substitute(Dial.HANDLE_TEMPLATE, this.get('strings')));
                contentBox.one('.' + Dial.CSS_CLASSES.ring).append(handle);
            }
            this._handleNode = handle;
			this._handleUserNode = this._handleNode.one('.' + Dial.CSS_CLASSES.handleUser);
        },

        /**
         * sets the visible UI label string
		 *
		 * @method setLabelString
		 * @param str {String}
		 * @private
		 */
        setLabelString : function(str) {
            this.get("contentBox").one("." + Dial.CSS_CLASSES.labelString).setContent(str);
        },

        /**
         * sets the visible UI label string
		 *
		 * @method setResetString
		 * @param str {String}
		 * @private
		 */
        setResetString : function(str) {
			this.set('strings.resetStr', str);
            this.get("contentBox").one("." + Dial.CSS_CLASSES.resetString).setContent(str);
			this._setXYResetString(); // recenters the string in the button
			this._resetString.setContent('');
        },

        /**
         * sets the tooltip string in the Dial's handle
		 *
		 * @method setTooltipString
		 * @param str {String}
		 * @private
		 */
        setTooltipString : function(str) {
            this.get("contentBox").one("." + Dial.CSS_CLASSES.handleUser).set('title', str);
        },

        /**
         * Override the default content box value, since we don't want the srcNode
         * to be the content box for dial.
		 *
		 * @method _defaultCB
		 * @private
		 */
        _defaultCB : function() {
            return null;
        },

		/**
		 * sets the Dial's value in response to key events
		 *
		 * @method _onDirectionKey
		 * @param e {Event}
		 * @private
		 */
        _onDirectionKey : function(e) {
            e.preventDefault();
            var currVal = this.get("value"),
                newVal = currVal,
                minorStep = this.get("minorStep"),
                majorStep = this.get("majorStep");

            switch (e.charCode) { //37 , 39 = arrow left/right, 38, 40 = arrow up/down, 33, 34 = page up/down,  35 , 36 = end/home
                case 38: // up
                    newVal += minorStep;
                    newVal = Math.min(newVal, this.get("max"));
                    break;
                case 40: // down
                    newVal -= minorStep;
                    newVal = Math.max(newVal, this.get("min"));
                    break;
                case 37: // left
                    newVal -= minorStep;
                    newVal = Math.max(newVal, this.get("min"));
                    break;
                case 39: // right
                    newVal += minorStep;
                    newVal = Math.min(newVal, this.get("max"));
                    break;
                case 36: // home
                    newVal = this._originalValue;
                    break;
                case 35: // end
                    newVal = this.get('max');
                    break;
                case 33: // page up
                    newVal += majorStep;
                    newVal = Math.min(newVal, this.get("max"));
                    break;
                case 34: // page down
                    newVal -= majorStep;
                    newVal = Math.max(newVal, this.get("min"));
                    break;
            }

            if (newVal !== currVal) {
				this.set('value', newVal);
				this._prevX = this._handleNode.getX();
				this._setTimesWrapedFromValue(this.get('value'));
            }
//			also IE seems to require 2 tab keystrokes to start responding to arrow keys etc. to modify value
//			screen reader having trouble with IE6?
//			alert("aria-valuenow: " + Y.one('.' + Dial.CSS_CLASSES.handleUser).get('aria-valuenow'));
//			alert("aria-valuetext: " + Y.one('.' + Dial.CSS_CLASSES.handleUser).get('aria-valuetext'));
        },

		/**
		 * returns the handle angle associated with the current value of the Dial
		 *
		 * @method _getAngleFromValue
		 * @param newVal {Number} the current value of the Dial
		 * @return {Number} the angle associated with the current Dial value
		 */
		_getAngleFromValue : function(newVal){
			var nonWrapedPartOfValue = newVal % this.get('stepsPerRev');
			var angleFromValue = nonWrapedPartOfValue / this.get('stepsPerRev') * 360;
			return angleFromValue; 
		},

		/**
		 * returns the value of the Dial calculated from the current handle angle
		 *
		 * @method _getValueFromAngle
		 * @param angle {Number} the current angle of the Dial's handle
		 * @return {Number} the current Dial value corresponding to the handle position
		 */
		_getValueFromAngle : function(angle){
			if(angle < 0){
				angle = (360 + angle);
			}else if(angle === 0){
				angle = 360;
			}
			var value = Math.round((angle / 360) * this.get('stepsPerRev'));
			return (value + (this._timesWrapped * this.get('stepsPerRev'))  );
		},

		/**
		 * sets the value of the Dial equal to the value of the text input field
		 *
		 * @method _numberKey
		 * @param e {Event}
		 * @private
		 */
		_numberKey : function(e){
			var val = parseInt(e.target.get('value'),10);
			if(this._validateValue(val)){
				this.set('value', Math.round(val));
			}
		},

		/**
		 * calls the method to update the UI whenever the Dial value changes
		 *
		 * @method _afterValueChange
		 * @param e {Event}
		 * @private
		 */
        _afterValueChange : function(e) {
            this._uiSetValue(e.newVal);
        },

		/**
         * Updates the value of the input box to reflect 
         * the value passed in.
		 * Makes all other needed UI display changes
		 *
		 * @method _uiSetValue
		 * @param val {Number} value of the Dial
		 * @protected
		 */
        _uiSetValue : function(val) {
            this._inputNode.set("value", val);
			this._valueStringNode.setContent(val); 
			this._angle = this._getAngleFromValue(val);
			this._handleUserNode.set('aria-valuenow', val);
			this._handleUserNode.set('aria-valuetext', val);
			this._setNodeToFixedRadius(this._handleNode);
			this._setNodeToFixedRadius(this._markerNode);
			if((val === this.get('max')) || (val === this.get('min'))){
				if(this._markerUserNode.hasClass('marker-max-min') === false){
					this._markerUserNode.addClass('marker-max-min');
					if(supportsVML === true){
						this._markerUserNode.one('fill').set('color', '#AB3232');
					}
				}
			}else{
				if(supportsVML === true){
					this._markerUserNode.one('fill').set('color', '#000');
				}
				if(this._markerUserNode.hasClass('marker-max-min') === true){
					this._markerUserNode.removeClass('marker-max-min');
				}
			}
        },

		/**
         * value attribute default validator. Verifies that
         * the value being set lies between the min/max value
		 *
		 * @method _validateValue
		 * @param val {Number} value of the Dial
		 * @private
		 */
        _validateValue: function(val) {
            var min = this.get("min"),
                max = this.get("max");
            return (Lang.isNumber(val) && val >= min && val <= max);
        }
    });
	Y.Dial = Dial;



}, '@VERSION@' ,{requires:['widget', 'dd-drag', 'substitute', 'event-mouseenter', 'transition'], skinnable:true });
