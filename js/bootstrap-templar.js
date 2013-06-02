/*
 * bootstrap-templar.js 1.0.0
 *
 * Inline tagged templating and template compliation for text inputs
 *
 * Thanks for using bootstrap-templar, it's distributed under the MIT License (MIT)
 *
 * http://opensource.org/licenses/MIT
 *
 * Michael Pearson <npm@m.bip.io>
 */
!function($){

    "use strict"; // jshint ;_;

    /*
     * TEMPLAR PUBLIC CLASS DEFINITION
     */
    var Templar = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, $.fn.templar.defaults, options);
        this.tokens = 0;
        this.listen();
    }

    // via http://stackoverflow.com/questions/931207/is-there-a-jquery-autogrow-plugin-for-text-fields
    $.fn.templarInputScale = function(o) {

        o = $.extend({
            maxWidth: 1000,
            minWidth: 0,
            comfortZone: 0
        }, o);

        this.filter('input:text').each(function(){
            var minWidth = o.minWidth || $(this).width(),
            val = '',
            input = $(this),
            testSubject = $('<tester/>').css({
                position: 'absolute',
                top: -9999,
                left: -9999,
                width: 'auto',
                fontSize: input.css('fontSize'),
                fontFamily: input.css('fontFamily'),
                fontWeight: input.css('fontWeight'),
                letterSpacing: input.css('letterSpacing'),
                whiteSpace: 'nowrap'
            }),
            check = function(ev) {
                if (ev.type != 'templar-force-scale' && val === (val = input.val())) {
                    return;
                }

                // Enter new content into testSubject
                var escaped = val.replace(/&/g, '&amp;').replace(/\s/g,'&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                testSubject.html(escaped);

                // Calculate new width + whether to change
                var testerWidth = testSubject.width(),
                newWidth = (testerWidth + o.comfortZone) >= minWidth ? testerWidth + o.comfortZone : minWidth,
                currentWidth = input.width(),
                isValidWidthChange = (newWidth < currentWidth && newWidth >= minWidth)
                || (newWidth > minWidth && newWidth < o.maxWidth);

                // Animate width
                if (isValidWidthChange) {
                    input.width(newWidth);
                }
            };

            testSubject.insertAfter(input);

            $(this).bind('keyup keydown blur update templar-force-scale', check);
        });

        return this;
    };

    $.fn.templarCursorPosGet = function() {
        var el = $(this).get(0);
        var pos = 0;
        if('selectionStart' in el) {
            pos = el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }

    $.fn.templarCursorPosSet = function(pos) {
        if ($(this).get(0).setSelectionRange) {
            $(this).get(0).setSelectionRange(pos, pos);
        } else if ($(this).get(0).createTextRange) {
            var range = $(this).get(0).createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
    }

    /**
     *
     */
    Templar.prototype = {
        constructor: Templar,

        _templateKey : null,

        _getType : function(typeFor) {
            return Object.prototype.toString.call(typeFor);
        },

        _isArray : function(what) {
            return (this._getType(what)  == '[object Array]');
        },

        _sortSlice : function(a, b) {
            if (a.start > b.start) {
                return 1;
            } else if (a.start < b.start) {
                return -1;
            } else if (a.start == b.start) {
                return 0;
            }
        },

        // setup
        listen: function () {
            if (!this.$element.hasClass('templar')) {
                this.$element.addClass('templar');
            }

            // precompile the template key
            this._templateKey = new RegExp(this.options.templateKey);

            // Add a preliminary input field
            var txt = this._addInput();

            // tokenize and build from existing template
            if (this.options.data) {
                var tplStr, tokens, match, d = this.options.data, slices = [], idx, pos = 0,
                tagValue;

                for (var key in this.options.tags) {
                    for (var i = 0; i < this.options.tags[key].length; i++) {
                        tagValue = key + this.options.delimiter + this.options.tags[key][i];
                        tplStr = this.options.template.replace(this._templateKey, tagValue);
                        var startIndex = 0, searchStrLen = tplStr.length;
                        var index;

                        while ((index = d.indexOf(tplStr, startIndex)) > -1) {
                            slices.push({
                                tag : true,
                                value : tplStr,
                                actualValue : tagValue,
                                start : index,
                                end : index + searchStrLen - 1
                            });

                            startIndex = index + searchStrLen;
                        }
                    }
                }

                // enforce natural token ordering
                slices = slices.sort(this._sortSlice);

                // find remaining intervals, this must be text
                var newSlices = [];
                var start = 0, slice;
                i = 0;
                while (i < d.length) {
                    slice = slices.shift();
                    if (slice) {
                        newSlices.push(slice);
                        if (slice.start > i) {
                            newSlices.push({
                                tag : false,
                                value : d.substr(i, slice.start - i),
                                start : i,
                                end : slice.start
                            }
                            );
                        }

                        i = slice.end;
                    } else {
                        newSlices.push({
                            tag : false,
                            value : d.substr(i, d.length - i),
                            start : i,
                            end : d.length
                        }
                        );
                        i = d.length;
                    }

                    i++;
                }

                // enforce natural token ordering
                newSlices.sort(this._sortSlice);

                // iterate over slice chain and create denormalized representation
                var last = txt, lastTxt = last, lastTag,
                    lastInput = this.$element;

                for (var i = 0; i < newSlices.length; i++) {
                    if (newSlices[i].tag) {
                        last = this._addTag(last, newSlices[i].actualValue);
                        lastTag = last.tag;
                        lastTxt = last.txt;
                    } else {
                        lastTxt.val(newSlices[i].value);
                        lastTxt.templarCursorPosSet(newSlices[i].value.length);
                    }

                    last = lastTxt;
                }
            }

            if (this.eventSupported('keydown')) {
                this.$element.children(':input').on('keydown', $.proxy(this.keydown, this))
            }
        },

        eventSupported: function(eventName) {
            var isSupported = eventName in this.$element.children(':input');
            if (!isSupported) {
                this.$element.setAttribute(eventName, 'return;')
                isSupported = typeof this.$element[eventName] === 'function'
            }
            return isSupported
        },

        _emit : function() {
            this.computeTemplate();
            this.$element.trigger('templar-template');
        },

        computeTemplate : function() {
            var computedData = '',
            tplData = '',
            self = this,
            children = this.$element.children();

            $.each(children, function(idx, el) {
                if (el.localName == 'input') {
                    computedData += $(el).val();
                } else {
                    tplData = $(el).find('span.templar-select-label').attr('data-selected-tag');
                    if (tplData) {
                        computedData += self.options.template.replace(
                            self._templateKey,
                            tplData
                        );
                    }
                }
            });

            this.$element.attr('data-template', computedData);
            return computedData;
        },

        /**
         * key event
         */
        _lastFocusLength : 0,
        _lastCursorPos : 0,

        inputKeyup : function(ev, dropdown) {
            var src = $(ev.currentTarget), prev, next;
            dropdown = dropdown || false;

            if (this.options.keyEvent(ev)) {
                this._addTag(src);

            // backspace
            } else if (ev.keyCode == 8) {
                // we don't want to drop the tag when length 0,
                // just when they hit backspace twice on a button group edge
                this._lastFocusLength--;
                if ((src.templarCursorPosGet() == 0 && src.val() != '') ||
                    (src.val() == '' && this._lastFocusLength < 0)) {

                    // check if there are any previous tags
                    prev = src.prevAll('div.btn-group:first');
                    this._removeTag(prev);
                }
                this._emit();

            // delete
            } else if (ev.keyCode == 46) {
                // delete on an input edge is a special case
                if (src.templarCursorPosGet() == src.val().length && this._lastFocusLength > 0) {
                    next = src.nextAll('div.btn-group:first');
                    this._removeTag(next);
                }
                
            // end
            } else if (ev.keyCode == 35 && !ev.shiftKey) {
                src.nextAll('input:last').focus();
                src.templarCursorPosSet(src.val().length);

            // home
            } else if (ev.keyCode == 36 && !ev.shiftKey) {
                src.prevAll('input:last').focus();
                src.templarCursorPosSet(0);
                
            // left
            } else if (ev.keyCode == 37) {

                // keyed via dropdown
                if (dropdown) {
                    src.prevAll('input:first').focus();
                    // close
                    src.dropdown('toggle');
                } else {
                    // edge
                    if (this._lastCursorPos == src.templarCursorPosGet()) {
                        src.prevAll('div.btn-group:first').find('button').focus().dropdown('toggle');
                    }    
                }
                
            // right
            } else if (ev.keyCode == 39) {
                // keyed via dropdown
                if (dropdown) {
                    src.nextAll('input:first').focus().templarCursorPosSet(0);
                    
                    // close
                    src.dropdown('toggle');
                } else {
                    // edge
                    if (this._lastCursorPos == src.templarCursorPosGet()) {
                        src.nextAll('div.btn-group:first').
                            find('button').
                            focus().
                            dropdown('toggle');
                    }
                }
                

            } else {
                this._emit();
            }

            this._lastCursorPos = src.templarCursorPosGet();
            this._lastFocusLength = src.val().length;
        },

        _addInput : function(after, initValue) {
            var html = $('<input type="text" autocomplete="off" value="' + (initValue || '') + '" />');

            if (after) {
                after.after(html);
            } else {
                var el = this.$element.append(html);
            }

            html.focus();
            html.templarInputScale({
                comfortZone : 8,
                minWidth : 10
            });

            html.on('focus',    $.proxy(this.focus, this)).
                on('blur',     $.proxy(this.blur, this)).
                on('keypress', $.proxy(this.keypress, this)).
                on('keyup',    $.proxy(this.inputKeyup, this));

            this._emit();
            return html;
        },

        _addTag : function(after, initValue) {
            var self = this, el, prev, next, pos, initVal, lastTxt, nextInput;

            var activeTag = $(this._addTagHtml(initValue));

            // if cursor position != length of input, then splice the input
            pos = after.templarCursorPosGet();
            if (pos != after.val().length) {
                initVal = after.val().substring(pos, after.val().length);
                after.val(after.val().substring(0, pos - 1));
            }
            el = after.after(activeTag);

            this._tagOpen = true;

            // add an input after this tag
            nextInput = self._addInput(activeTag, initVal);
            nextInput.trigger('templar-force-scale');

            next = activeTag.next();
            prev = activeTag.prev();

            activeTag.find('li a').click(function(ev) {
                var src = $(this);
                ev.preventDefault();
                $('.templar-select-label', activeTag).html(src.text());
                $('.templar-select-label', activeTag).attr('data-selected-tag', src.attr('data-tag'));
                self._tagOpen = false;
            });

            // closed without a selection, then back it out
            activeTag.on('click', function(ev) {
                var src = $(this), val;
                ev.preventDefault();

                if ('' == $('.templar-select-label', src).attr('data-selected-tag')) {
                    self._removeTag(src);
                } else {
                    // drop delimiter in previous. buggy, doesn't let users wrap
                    // template arguments in delimiter.  eg: [[%something%%]] vs
                    // [%something%]
                    val = $(this).prev().val();
                    val = val.replace(new RegExp('\\' + self.options.character + '$'), '');
                    $(this).prev().val(val);

                    src.nextAll('input:first').focus();
                    self._emit();
                }

                self._activeTag = null;
            });

            activeTag.on('keydown.dropdown.data-api', function(ev) {
                self.inputKeyup(ev, true);
            });

            activeTag.find('button').focus();

            return {
                tag : activeTag,
                txt : nextInput
            }
        },

        /**
         * Removes a tag and merges the nearest adjacent inputs
         */
        _removeTag : function(el) {
            var prev = el.prevAll('input:first'),
            next = el.nextAll('input:first'),
            prevLen = prev.val().length;

            el.remove();

            if (prev.length === 1 && next.length === 1) {
                var val = prev.val() + next.val();
                prev.val(val);
                next.remove();

                prev.trigger('keyup');
                prev.focus();
                prev.templarCursorPosSet(prevLen);

                this._lastFocusLength = prev.val().length;
                this._emit();
            }
        },

        _addTagHtml : function(initValue) {
            var tagHtml = '',
            opts = this.options

            tagHtml += '<div class="btn-group ' + (initValue ? '' : 'open') + '">';
            tagHtml += '    <button class="btn btn-small btn-inverse dropdown-toggle" data-toggle="dropdown">';
            tagHtml += '        <span data-selected-tag="' + (initValue || '') + '" class="templar-select-label">' + (initValue ? initValue.split(opts.delimiter)[1] : 'Select' ) + '</span>';
            tagHtml += '        <span class="caret"></span>';
            tagHtml += '    </button>';
            tagHtml += '    <ul class="dropdown-menu" role="menu">';
            //tagHtml += '        <li><div class="input-prepend" style="padding:3px;"><span class="add-on"><i class="icon-search"></i></span><input class="input-search" type="search" placeholder="Search"></div></li>';
            //tagHtml += '        <li class="divider"></li>';

            for (var key in opts.tags) {
                if (this._isArray(opts.tags[key])) {
                    tagHtml += '            <li>' + key + '</li>';
                    for (var i = 0; i < opts.tags[key].length; i++) {
                        tagHtml += '                <li><a data-tag="' + key + opts.delimiter + opts.tags[key][i] + '" href=""><i class="icon-chevron-right"></i> ' + opts.tags[key][i] + '</a></li>';
                    }
                } else {
                    tagHtml += '                <li><a data-tag="' + opts.tags[key] + '" href=""><i class="icon-chevron-right"></i> ' + opts.tags[key] + '</a></li>';
                }
            }

            tagHtml += '    </ul>';
            tagHtml += '</div>';

            return tagHtml;
        }
    }

    /*
     * TEMPLAR PLUGIN DEFINITION
     */
    var old = $.fn.templar

    $.fn.templar = function (option) {
        return this.each(function () {
            var $this = $(this),
            data = $this.data('templar'),
            options = typeof option == 'object' && option;

            if (!data) $this.data('templar', (data = new Templar(this, options)));

            if (typeof option == 'string') data[option]();
        });
    }

    // setup defaults
    $.fn.templar.defaults = {
        tags: [],
        templateKey : 'value',
        template : '',
        delimiter : '.',
        // delimiter key event, default "["
        character : '[',
        keyEvent : function(ev) {
            return ev.keyCode === 219;
        }
    }

    $.fn.templar.defaults.template = $.fn.templar.defaults.templateKey;

    $.fn.templar.Constructor = Templar

    /*
     * TEMPLAR NO CONFLICT
     */
    $.fn.templar.noConflict = function () {
        $.fn.templar = old
        return this
    }

}(window.jQuery);