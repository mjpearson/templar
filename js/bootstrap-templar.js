/*
 * bootstrap-templar.js 1.0.0
 * 
 * Inline tagged templating and template compliation for text inputs
 *
 * Thanks for using bootstrap-templar, it's distributed under the MIT License (MIT)
 *
 * Copyright (c) 2013 Michael Pearson <npm@m.bip.io>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
!function($){

    "use strict"; // jshint ;_;

    /*
     * TEMPALR PUBLIC CLASS DEFINITION
     */
    var Templar = function (element, options) {
        this.$element = $(element)
        this.options = $.extend({}, $.fn.templar.defaults, options)
        this.tokens = 0;
        this.listen();
    }

    /**
     *
     */
    Templar.prototype = {
        constructor: Templar,

        listen: function () {
            
            // add scratch zone for caluclating input width
           
            
            // Add a preliminary input field
            this._addInput();

            if (this.eventSupported('keydown')) {
                this.$element.children(':input').on('keydown', $.proxy(this.keydown, this))
            }
            /*
            this.$element.on('focus',    $.proxy(this.focus, this)).
            on('blur',     $.proxy(this.blur, this)).
            on('keypress', $.proxy(this.keypress, this)).
            on('keyup',    $.proxy(this.inputKeyup, this));
            */
            
        },

        eventSupported: function(eventName) {
            var isSupported = eventName in this.$element.children(':input');
            if (!isSupported) {
                this.$element.setAttribute(eventName, 'return;')
                isSupported = typeof this.$element[eventName] === 'function'
            }
            return isSupported
        },

        _computeTemplate : function() {
            // deprecate
            return;
            var computedData = '',
            children = this.$element.children();

            $.each(children, function(idx, el) {
                if (el.localName == 'input') {
                    computedData += $(el).val();
                }
            });

            this.$element.attr('data-computed', computedData);
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
                if (this._lastFocusLength < 0) {
                    // check if there are any previous tags
                    prev = src.prevAll('div.btn-group:first');
                    this._removeTag(prev);
                }
            }
            
            this._lastFocusLength = src.val().length;
        },

        _addInput : function() {
            var html = $('<input type="text" autocomplete="off" value="" />');
            var el = this.$element.append(html);

            html.focus();
            html.autoGrowInput({
                comfortZone : 8,
                minWidth : 10
            });
            
            html.on('focus',    $.proxy(this.focus, this)).
                on('blur',     $.proxy(this.blur, this)).
                on('keypress', $.proxy(this.keypress, this)).
                on('keyup',    $.proxy(this.inputKeyup, this));
        },
       
        _activeTag : null,

        _addTag : function(after) {
            var self = this, el, prev, next;

            if (null !== this._activeTag) {
                this._removeTag(this._activeTag);
                this._activeTag = null;
                return;
            }

            this._activeTag = $(this._addTagHtml());

            if (after) {
                el = after.after(this._activeTag);                
            } else {
                el = this.$element.append(this._activeTag);
            }

            this._tagOpen = true;

            self._addInput();

            next = this._activeTag.next();
            prev = this._activeTag.prev();

            this._activeTag.find('li a').click(function(ev) {
                var src = $(this);
                ev.preventDefault();                
                $('.templar-select-label', self._activeTag).html(src.text());                                
                $('.templar-select-label', self._activeTag).attr('data-selected-tag', src.attr('data-tag'));
                self._tagOpen = false;
            });

            // closed without a selection, then back it out
            this._activeTag.on('click', function(ev) {                
                var src = $(this);
                ev.preventDefault();
                
                if ('' == $('.templar-select-label', src).attr('data-selected-tag')) {
                    self._removeTag(src);
                } else {
                    el.nextAll('input:first').focus();
                }

                self._activeTag = null;
            });

            $('.input-search', this._activeTag).focus();
        },

        /**
         * Removes a tag and merges the nearest adjacent inputs
         */
        _removeTag : function(el) {
            var prev = el.prev('input:first'),
            next = el.nextAll('input:first');

            el.remove();

            if (prev.length === 1 && next.length === 1) {
                var val = prev.val() + ' ' + next.val();
                prev.val(val);
                next.remove();
                prev.focus();
                this._lastFocusLength = prev.val().length;
            }

            this._computeTemplate();
        },

        _addTagHtml : function() {
            var tagHtml = '',
            opts = this.options

            tagHtml += '<div class="btn-group open">';
            tagHtml += '    <button class="btn btn-mini btn-primary dropdown-toggle" data-toggle="dropdown"><span data-selected-tag="" class="templar-select-label">Select</span> <span class="caret"></span></button>';
            tagHtml += '    <ul class="dropdown-menu" role="menu">';
            tagHtml += '        <li><div class="input-prepend" style="padding:3px;"><span class="add-on"><i class="icon-search"></i></span><input class="input-search" type="search" placeholder="Search"></div></li>';
            tagHtml += '        <li class="divider"></li>';

            for (var key in opts.tags) {
                tagHtml += '            <li>' + key + '</li>';
                for (var i = 0; i < opts.tags[key].length; i++) {
                    tagHtml += '                <li><a data-tag="' + opts.tags[key][i] + '" href=""><i class="icon-chevron-right"></i> ' + opts.tags[key][i] + '</a></li>';
                }
            }

            tagHtml += '    </ul>';
            tagHtml += '</div>';

            return tagHtml;
        },

        next: function (event) {
            var active = this.$menu.find('.active').removeClass('active')
            , next = active.next()

            if (!next.length) {
                next = $(this.$menu.find('li')[0])
            }

            next.addClass('active')
        },

        prev: function (event) {
            var active = this.$menu.find('.active').removeClass('active')
            , prev = active.prev()

            if (!prev.length) {
                prev = this.$menu.find('li').last()
            }

            prev.addClass('active')
        }
    }

    /*
     * TEMPALR PLUGIN DEFINITION
     */
    var old = $.fn.typeahead

    $.fn.templar = function (option) {
        return this.each(function () {
            var $this = $(this)
            , data = $this.data('templar')
            , options = typeof option == 'object' && option
            if (!data) $this.data('templar', (data = new Templar(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.templar.defaults = {
        tags: [],

        // delimiter key event, default "["
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