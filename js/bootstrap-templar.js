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
     * TEMPALR PUBLIC CLASS DEFINITION
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
                if (val === (val = input.val())) {
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

            $(this).bind('keyup keydown blur update', check);

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

        listen: function () {
            // tokenize and build from existing template
            if (this.options.data) {
                var tplStr, tokens, match, d = this.options.data, slices = [], idx, pos = 0,
                tagValue;
                for (var key in this.options.tags) {
                    for (var i = 0; i < this.options.tags[key].length; i++) {
                        tagValue = key + '.' + this.options.tags[key][i];
                        tplStr = this.options.template.replace(/value/, tagValue);
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

                // find remaining intervals, this must be text
                slices = slices.sort(function(a, b) {
                    if (a.start > b.start) {
                        return 1;
                    } else if (a.start < b.start) {
                        return -1;
                    } else if (a.start == b.start) {
                        return 0;
                    }
                });

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

                newSlices.sort(function(a, b) {
                    if (a.start > b.start) {
                        return 1;
                    } else if (a.start < b.start) {
                        return -1;
                    } else if (a.start == b.start) {
                        return 0;
                    }
                });
console.log(newSlices);
                var last = null
                for (var i = 0; i < newSlices.length; i++) {
                    if (newSlices[i].tag) {
                        last = this._addTag(last, newSlices[i].actualValue)                        
                    } else {
                        last = this._addInput(last, newSlices[i].value);
                        last.templarCursorPosSet(newSlices[i].value.length);
                    }                    
                }
            } else {
                // Add a preliminary input field
                this._addInput();
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
                        computedData += self.options.template.replace(/value/, tplData)
                    }
                }
            });

            this.$element.attr('data-template', computedData);
            return computedData;
        },

        _lastFocusLength : 0,

        /**
         *
         */
        inputKeyup : function(ev) {
            var src = $(ev.currentTarget), prev;

            if (this.options.keyEvent(ev)) {
                this._addTag(src);

            // backspace
            } else if (ev.keyCode == 8) {
                // we don't want to drop the tag when lenght 0,
                // just when they hit backspace twice on a button group edge
                this._lastFocusLength--;
                if ((src.templarCursorPosGet() == 0 && src.val() != '') ||
                    (src.val() == '' && this._lastFocusLength < 0)) {

                    // check if there are any previous tags
                    prev = src.prevAll('div.btn-group:first');
                    this._removeTag(prev);
                }

            // end
            } else if (ev.keyCode == 35) {
                src.nextAll('input:last').focus();
                src.templarCursorPosSet(src.val().length);
            // home
            } else if (ev.keyCode == 36) {
                src.prevAll('input:last').focus();
                src.templarCursorPosSet(0);
            }

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

            return html;
        },

        _activeTag : null,

        _addTag : function(after, initValue) {
            var self = this, el, prev, next, pos, initVal;

            if (!initValue && null !== this._activeTag) {
//                this._removeTag(this._activeTag);
                this._activeTag = null;
                return;
            }

            var activeTag = $(this._addTagHtml(initValue));

            if (after) {
                // if cursor position != length of input, then splice the input
                pos = after.templarCursorPosGet();
                if (pos != after.val().length) {
                    initVal = after.val().substring(pos, after.val().length);
                    after.val(after.val().substring(0, pos - 1));
                }
                el = after.after(this._activeTag);
            } else {
                el = this.$element.append(this._activeTag);
            }

            this._tagOpen = true;

            if (!initValue) {
                self._addInput(this._activeTag, initVal);
            }

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

                    //el.nextAll('input:first').focus();
                    src.nextAll('input:first').focus();
                }

                self._activeTag = null;
            });

            $('.input-search', activeTag).focus();
            
            this._activeTag = activeTag;
            return activeTag;
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
            }
        },

        _addTagHtml : function(initValue) {
            var tagHtml = '',
            opts = this.options

            tagHtml += '<div class="btn-group ' + (initValue ? '' : 'open') + '">';
            tagHtml += '    <button class="btn btn-small btn-primary dropdown-toggle" data-toggle="dropdown">';
            tagHtml += '        <span data-selected-tag="' + (initValue || '') + '" class="templar-select-label">' + (initValue ? initValue.split('.')[1] : 'Select' ) + '</span>';
            tagHtml += '        <span class="caret"></span>';
            tagHtml += '    </button>';
            tagHtml += '    <ul class="dropdown-menu" role="menu">';
            tagHtml += '        <li><div class="input-prepend" style="padding:3px;"><span class="add-on"><i class="icon-search"></i></span><input class="input-search" type="search" placeholder="Search"></div></li>';
            tagHtml += '        <li class="divider"></li>';

            for (var key in opts.tags) {
                tagHtml += '            <li>' + key + '</li>';
                for (var i = 0; i < opts.tags[key].length; i++) {
                    tagHtml += '                <li><a data-tag="' + key + '.' + opts.tags[key][i] + '" href=""><i class="icon-chevron-right"></i> ' + opts.tags[key][i] + '</a></li>';
                }
            }

            tagHtml += '    </ul>';
            tagHtml += '</div>';

            return tagHtml;
        }
    }

    /*
     * TEMPALR PLUGIN DEFINITION
     */
    var old = $.fn.typeahead

    $.fn.templar = function (option) {
        return this.each(function () {
            var $this = $(this),
            data = $this.data('templar'),
            options = typeof option == 'object' && option;

            if (!data) $this.data('templar', (data = new Templar(this, options)));

            if (typeof option == 'string') data[option]();
        });
    }

    $.fn.templar.defaults = {
        tags: [],
        template : 'value',
        // delimiter key event, default "["
        character : '[',
        keyEvent : function(ev) {
            return ev.keyCode === 219;
        }
    }

    $.fn.templar.Constructor = Templar

    /*
     * TEMPALR NO CONFLICT
     */
    $.fn.templar.noConflict = function () {
        $.fn.templar = old
        return this
    }

}(window.jQuery);