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

  /**
     *
     */
  Templar.prototype = {
    constructor: Templar,

    _templateKey : null,

    _getType : function(typeFor) {
      return Object.prototype.toString.call(typeFor);
    },

    _isObject : function(what) {
      return (this._getType(what)  == '[object Object]');
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

    _escapeRegExp: function(string){
      return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    },

    getSelection : function() {
      var savedRange;
      if(window.getSelection && window.getSelection().rangeCount > 0) //FF,Chrome,Opera,Safari,IE9+
      {
        savedRange = window.getSelection().getRangeAt(0).cloneRange();
      }
      else if(document.selection)//IE 8 and lower
      {
        savedRange = document.selection.createRange();
      }
      return savedRange;
    },

    // http://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
    updateFocus : function(t) {
      var range = document.createRange();
      var sel = window.getSelection();
      range.setStart(t, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    },

    getSelect : function(defaultOpt) {
      var opts = this.options, label, value,
      sSpan = '<span class="templar-select" contenteditable="false">' +
      '<select>' +
      '<option value=""></option>';

      for (var key in opts.tags) {
        sSpan += '<optgroup data-index="' + key + '" label="' + (opts.tags[key].label ? opts.tags[key].label : key.label) + '">';
        for (var i = 0; i < opts.tags[key].data.length; i++) {
          label = this._isObject(opts.tags[key].data[i]) ? opts.tags[key].data[i]['label'] : opts.tags[key].data[i];
          value = this._isObject(opts.tags[key].data[i]) ? opts.tags[key].data[i]['value'] : opts.tags[key].data[i];
          value = key + opts.delimiter + value;
          sSpan += '<option ' + (defaultOpt === value ? 'selected="selected"' : '') + ' value="' + value + '">' + label + '</option>';
        }
        sSpan += '</optgroup>';
      }

      sSpan += '</select></span>';

      return sSpan;
    },

    // setup
    listen: function () {
      var tplStr,
      tplRegex,
      template = this.options.data,
      tagValue,
      self = this;

      if (!this.$element.hasClass('templar')) {
        this.$element.addClass('templar');
      }

      this.$element.attr('contenteditable', 'plaintext-only');

      this._templateKey = new RegExp(this.options.templateKey);

      for (var key in this.options.tags) {
        for (var i = 0; i < this.options.tags[key].data.length; i++) {
          tagValue = key + this.options.delimiter +
          (this._isObject(this.options.tags[key].data[i]) ?
            this.options.tags[key].data[i].value :
            this.options.tags[key].data[i]
            );

          tplStr = this._escapeRegExp(this.options.template.replace(this._templateKey, tagValue));

          tplRegex = new RegExp(tplStr, 'g');

          template = template.replace(tplRegex, this.getSelect(tagValue));
        }
      }

      this.$element.html(template);

      this._addTag($('.templar-select select'));

      this.$element.on('keydown', function(ev) {
        var s = self.getSelection(), $spanNode, $this = $(this);
        if (self.options.keyEvent(ev)) {
          ev.stopPropagation();

          $spanNode = $(self.getSelect());
          s.insertNode($spanNode[0]);

          var $selectNode = $('select', $spanNode);
          var focusInto = document.createTextNode('\u00a0');

          self._addTag($selectNode, focusInto);

          s.setStartAfter($spanNode[0]);
          s.insertNode(focusInto);

          $selectNode.select2('open');
        } else if (ev.keyCode === 13) {
          ev.stopPropagation();
          ev.preventDefault();
        }

        setTimeout(function() {
          self._emit($this);
        }, 10);

      });

      this._emit(this.$element);
    },

    _addTag : function($el, focusInto) {
      var self = this;
      (function($el, focusInto) {
        $el.select2(self.options.select2).on('change', function() {
          if (focusInto) {
            self.updateFocus(focusInto);
          }
          self.$element.focus();
          self._emit(self.$element);
        }).on('select2-close', function() {
          if ('' === $(':selected', $el).val()) {
            $el.parent().remove()
            if (focusInto) {
              self.updateFocus(focusInto);
            }
          }

          self._emit(self.$element);
        });
      })($el, focusInto);
    },

    _emit : function($el) {
      $el[0].normalize();
      this.computeTemplate();
      this.$element.trigger('templar-template');
    },

    computeTemplate : function() {
      var computedData = '',
      tplData = '',
      self = this,
      contents = this.$element.contents();

      $.each(contents, function(idx, el) {
        if (el.nodeName == '#text') {
          computedData += $(el).text();
        } else {
          tplData = $('select', el).val();
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
    buttonClass : 'btn-primary',
    keyEvent : function(ev) {
      return (ev.keyCode === 73 && ev.ctrlKey);
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